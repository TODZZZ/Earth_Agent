/**
 * Earth Engine Agent Tools
 * 
 * This module exports the tools that can be used by agents.
 */

import { DatasetEntry } from './databaseSearch';
import { GEEDocumentation, DocumentationSnippet } from './geeDocumentation';

// Define interfaces for tool responses
interface RunCodeResponse {
  success: boolean;
  message: string;
  executionTime?: number;
}

interface InspectionResult {
  success: boolean;
  data: any;
  error?: string;
}

interface ConsoleCheckResult {
  success: boolean;
  errors: Array<{
    level: string;
    message: string;
    timestamp?: string;
  }>;
}

interface TaskResult {
  success: boolean;
  tasks: Array<{
    id: string;
    name: string;
    state: string;
    created: string;
    type: string;
  }>;
  error?: string;
}

interface ScriptEditResult {
  success: boolean;
  message: string;
  error?: string;
}

interface ProblemAssessmentResult {
  feasible: boolean;
  explanation: string;
  suggestedApproach?: string;
  relevantAPIs?: string[];
}

interface DocumentationSearchResult {
  results: DocumentationSnippet[];
  suggestedCode?: string;
}

/**
 * Sends a message to the content script to execute in Earth Engine
 */
const sendMessageToContentScript = async (action: string, data: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        reject(new Error("No active tab found. Make sure you are on the Earth Engine Code Editor page."));
        return;
      }
      
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: action, ...data },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 
              "Could not communicate with Earth Engine. Make sure you are on the Earth Engine Code Editor page."));
            return;
          }
          
          resolve(response);
        }
      );
    });
  });
};

/**
 * Search for datasets in Earth Engine database
 */
export const databaseSearch = async (
  searchTerm: string,
  timeframe?: { start?: string; end?: string }
): Promise<any[]> => {
  console.log(`Searching for datasets matching: ${searchTerm}`);
  if (timeframe) {
    console.log(`With timeframe filter: ${timeframe.start || 'any'} to ${timeframe.end || 'present'}`);
  }
  
  try {
    // First try to search in the comprehensive dataset catalog from GitHub
    try {
      const response = await fetch('https://raw.githubusercontent.com/samapriya/Earth-Engine-Datasets-List/refs/heads/master/gee_catalog.json');
      if (response.ok) {
        const data = await response.json();
        console.log(`Loaded ${data.length} datasets from GitHub catalog`);
        
        // Find datasets that match the search term (case insensitive)
        const searchTermLower = searchTerm.toLowerCase();
        let matchingDatasets = data.filter((dataset: any) => {
          const id = (dataset.id || '').toLowerCase();
          const title = (dataset.title || '').toLowerCase();
          const description = (dataset.description || '').toLowerCase();
          const type = (dataset.type || '').toLowerCase();
          
          return (
            id.includes(searchTermLower) ||
            title.includes(searchTermLower) ||
            description.includes(searchTermLower) ||
            type.includes(searchTermLower)
          );
        });
        
        // Score and sort datasets by timeframe relevance
        matchingDatasets = scoreAndSortDatasetsByTime(matchingDatasets, timeframe);
        
        console.log(`Found ${matchingDatasets.length} matching datasets in GitHub catalog`);
        
        if (matchingDatasets.length > 0) {
          // Map to a consistent format
          return matchingDatasets.map((dataset: any) => ({
            name: dataset.id,
            description: dataset.title || 'No description available',
            type: dataset.type || 'Unknown',
            startDate: dataset.start_date || '',
            endDate: dataset.end_date || '',
            updateFrequency: dataset.update_frequency || '',
            provider: dataset.provider || '',
            gsd: dataset.gsd || '',
            source: 'GitHub Catalog',
            timeScore: dataset.timeScore // Include the score for debugging
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching from GitHub catalog:', error);
    }
    
    // Fall back to the original Earth Engine search
    console.log('Falling back to Earth Engine API search');
    await sendMessageToContentScript('SEARCH_DATASETS', {
      search: searchTerm
    });
    
    // Wait for the search results
    const searchResults = await new Promise<any[]>((resolve) => {
      const timeout = setTimeout(() => {
        resolve([]);
      }, 5000);
      
      const handleSearchResults = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SEARCH_RESULTS') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleSearchResults);
          resolve(event.data.results || []);
        }
      };
      
      window.addEventListener('message', handleSearchResults);
    });
    
    console.log(`Received ${searchResults.length} datasets from Earth Engine search`);
    
    // Process and sort by timeframe relevance if available
    const processedResults = searchResults.map((result: any) => ({
      name: result.id,
      description: result.description || 'No description available',
      type: result.type || 'Unknown',
      startDate: result.startDate || '',
      endDate: result.endDate || '',
      updateFrequency: result.updateFrequency || '',
      provider: result.provider || '',
      gsd: result.gsd || '',
      source: 'Earth Engine API'
    }));
    
    return scoreAndSortDatasetsByTime(processedResults, timeframe);
  } catch (error) {
    console.error('Error searching for datasets:', error);
    return [];
  }
};

/**
 * Score and sort datasets based on their relevance to the requested timeframe
 * If no timeframe is provided, prioritize the most recent datasets
 */
const scoreAndSortDatasetsByTime = (datasets: any[], timeframe?: { start?: string; end?: string }): any[] => {
  // Return datasets as-is if there's no timeframe to consider
  if (!timeframe) {
    return datasets.sort((a, b) => {
      // If no timeframe specified, prioritize datasets with more recent end dates
      const aEndDate = a.endDate || a.end_date || '';
      const bEndDate = b.endDate || b.end_date || '';
      if (aEndDate === 'present' || aEndDate.includes('now')) return -1;
      if (bEndDate === 'present' || bEndDate.includes('now')) return 1;
      return aEndDate > bEndDate ? -1 : aEndDate < bEndDate ? 1 : 0;
    });
  }
  
  const currentYear = new Date().getFullYear().toString();
  const scoredDatasets = datasets.map(dataset => {
    // Get dataset date information
    const startDate = dataset.startDate || dataset.start_date || '';
    const endDate = dataset.endDate || dataset.end_date || '';
    
    let score = 0;
    
    // Extract years from dates for comparison
    const datasetStartYear = startDate ? startDate.substring(0, 4) : '';
    const datasetEndYear = endDate && !endDate.includes('present') && !endDate.includes('now') 
      ? endDate.substring(0, 4) 
      : currentYear;
    
    const requestStartYear = timeframe.start ? timeframe.start.substring(0, 4) : '';
    const requestEndYear = timeframe.end ? timeframe.end.substring(0, 4) : currentYear;
    
    // Score based on overlap with requested timeframe
    if (requestStartYear && requestEndYear) {
      // Full timeframe specified
      if (datasetStartYear && datasetEndYear) {
        // Check for overlap
        if (
          (datasetStartYear <= requestEndYear && datasetEndYear >= requestStartYear) ||
          endDate === 'present' || 
          endDate.includes('now')
        ) {
          // Dataset overlaps with requested timeframe
          score += 100;
          
          // Bonus points for datasets that fully contain the requested period
          if (datasetStartYear <= requestStartYear && 
             (datasetEndYear >= requestEndYear || endDate === 'present' || endDate.includes('now'))) {
            score += 50;
          }
          
          // Bonus for datasets that are ongoing/current
          if (endDate === 'present' || endDate.includes('now')) {
            score += 20;
          }
        }
      }
    } else if (requestStartYear) {
      // Only start year specified (looking for data since a specific time)
      if (datasetStartYear && datasetStartYear <= requestStartYear &&
         (datasetEndYear >= requestStartYear || endDate === 'present' || endDate.includes('now'))) {
        score += 100;
        
        // Bonus for datasets that are ongoing/current
        if (endDate === 'present' || endDate.includes('now')) {
          score += 30;
        }
      }
    } else {
      // No specific timeframe, prioritize recent and ongoing datasets
      if (endDate === 'present' || endDate.includes('now')) {
        score += 100;
        
        // Higher score for longer running datasets (more historical context)
        if (datasetStartYear) {
          const yearsRunning = parseInt(currentYear) - parseInt(datasetStartYear);
          score += Math.min(yearsRunning, 30); // Cap at 30 years
        }
      } else if (datasetEndYear) {
        // Score based on recency
        const yearsAgo = parseInt(currentYear) - parseInt(datasetEndYear);
        score += Math.max(0, 100 - yearsAgo * 10); // Decrease score by 10 for each year old
      }
    }
    
    // Add the score to the dataset for debugging
    return {
      ...dataset,
      timeScore: score
    };
  });
  
  // Sort by score (highest first)
  return scoredDatasets.sort((a, b) => b.timeScore - a.timeScore);
};

// Export the Earth Engine tools
export const EarthEngineTools = {
  /**
   * Search Earth Engine Database catalog
   */
  databaseSearch: async (query: string, timeframe?: { start?: string; end?: string }): Promise<DatasetEntry[]> => {
    console.log('Searching Earth Engine database for:', query);
    if (timeframe) {
      console.log('With timeframe:', timeframe);
    }
    return databaseSearch(query, timeframe);
  },

  /**
   * Run code in Earth Engine editor
   */
  runCode: async (code: string): Promise<RunCodeResponse> => {
    console.log('Running code in Earth Engine:', code);
    try {
      const response = await sendMessageToContentScript('RUN_CODE', { code });
      return {
        success: response?.success || false,
        message: response?.message || 'Code execution completed',
        executionTime: response?.executionTime
      };
    } catch (error) {
      console.error('Error running code:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error running code'
      };
    }
  },

  /**
   * Inspect map at a point
   */
  inspectMap: async (coordinates: { lat: number, lng: number }): Promise<InspectionResult> => {
    console.log('Inspecting map at:', coordinates);
    try {
      const response = await sendMessageToContentScript('INSPECT_MAP', { coordinates });
      return {
        success: response?.success || false,
        data: response?.data || null,
        error: response?.error
      };
    } catch (error) {
      console.error('Error inspecting map:', error);
    return { 
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error inspecting map'
      };
    }
  },

  /**
   * Check console for errors
   */
  checkConsole: async (): Promise<ConsoleCheckResult> => {
    console.log('Checking Earth Engine console');
    try {
      const response = await sendMessageToContentScript('CHECK_CONSOLE', {});
      return {
        success: response?.success || false,
        errors: response?.errors || []
      };
    } catch (error) {
      console.error('Error checking console:', error);
      return {
        success: false,
        errors: [{
          level: 'error',
          message: error instanceof Error ? error.message : 'Unknown error checking console'
        }]
      };
    }
  },

  /**
   * Access tasks in Earth Engine
   */
  getTasks: async (): Promise<TaskResult> => {
    console.log('Accessing Earth Engine tasks');
    try {
      const response = await sendMessageToContentScript('GET_TASKS', {});
      return {
        success: response?.success || false,
        tasks: response?.tasks || [],
        error: response?.error
      };
    } catch (error) {
      console.error('Error accessing tasks:', error);
      return {
        success: false,
        tasks: [],
        error: error instanceof Error ? error.message : 'Unknown error accessing tasks'
      };
    }
  },

  /**
   * Edit script in Earth Engine
   */
  editScript: async (scriptId: string, content: string): Promise<ScriptEditResult> => {
    console.log('Editing script in Earth Engine:', scriptId);
    try {
      const response = await sendMessageToContentScript('EDIT_SCRIPT', { scriptId, content });
      return {
        success: response?.success || false,
        message: response?.message || 'Script edited successfully',
        error: response?.error
      };
    } catch (error) {
      console.error('Error editing script:', error);
      return {
        success: false,
        message: 'Failed to edit script',
        error: error instanceof Error ? error.message : 'Unknown error editing script'
      };
    }
  },

  /**
   * Search Earth Engine API documentation
   */
  searchDocumentation: async (query: string, generateCode: boolean = false): Promise<DocumentationSearchResult> => {
    console.log('Searching Earth Engine API documentation for:', query);
    try {
      // Search documentation
      const results = GEEDocumentation.search(query);
      
      // Generate code if requested
      const suggestedCode = generateCode ? GEEDocumentation.generateCodeSnippet(query) : undefined;
      
      return {
        results,
        suggestedCode
      };
    } catch (error) {
      console.error('Error searching documentation:', error);
      return {
        results: []
      };
    }
  },

  /**
   * Get examples for a specific Earth Engine API
   */
  getAPIExamples: async (apiClass: string, apiFunction?: string): Promise<string[]> => {
    console.log(`Getting examples for ${apiClass}${apiFunction ? '.' + apiFunction : ''}`);
    return GEEDocumentation.getExamples(apiClass, apiFunction);
  },

  /**
   * Assess problem feasibility with RAG integration for GEE API documentation
   */
  assessProblem: async (query: string): Promise<ProblemAssessmentResult> => {
    console.log('Assessing problem feasibility:', query);
    
    // Guard against null or undefined query
    if (!query) {
      return { 
        feasible: false, 
        explanation: 'No query was provided. Please enter a valid request to analyze.'
      };
    }
    
    // Enhance assessment with API documentation
    const docs = GEEDocumentation.search(query);
    
    // Extract relevant APIs from documentation search results
    const relevantAPIs: string[] = [];
    docs.forEach(doc => {
      if (doc.apiClass) {
        const apiRef = doc.apiFunction 
          ? `${doc.apiClass}.${doc.apiFunction}` 
          : doc.apiClass;
        relevantAPIs.push(apiRef);
      }
    });
    
    // In Phase 3, we'll enhance this with RAG for GEE API documentation
    // For now, we'll use the keyword approach and add suggested APIs
    const lowercasedQuery = query.toLowerCase();
    
    // Keywords that suggest Earth Engine can be used
    const positiveKeywords = [
      'map', 'satellite', 'image', 'elevation', 'terrain', 'landsat', 'sentinel',
      'modis', 'ndvi', 'vegetation', 'forest', 'water', 'land cover', 'temperature',
      'climate', 'flood', 'drought', 'fire', 'urban', 'agriculture', 'time series',
      'change', 'detection', 'glacier', 'snow', 'rainfall', 'precipitation',
      'landslide', 'erosion', 'deforestation', 'reforestation', 'cropland'
    ];
    
    // Keywords that suggest Earth Engine is not suitable
    const negativeKeywords = [
      'indoor', 'indoor map', 'street view', 'navigation', 'driving directions',
      'traffic', 'restaurant', 'hotel', 'booking', 'flight', 'weather forecast',
      'stock', 'market', 'exchange rate', 'currency', 'news', 'social media'
    ];
    
    // Map keywords to relevant GEE APIs
    const keywordToAPI: Record<string, string[]> = {
      'image': ['ee.Image', 'ee.ImageCollection'],
      'satellite': ['ee.ImageCollection', 'ee.Image.visualize'],
      'landsat': ['ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")', 'ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")'],
      'sentinel': ['ee.ImageCollection("COPERNICUS/S2_SR")', 'ee.ImageCollection("COPERNICUS/S2")'],
      'modis': ['ee.ImageCollection("MODIS/006/MOD13Q1")', 'ee.ImageCollection("MODIS/006/MCD12Q1")'],
      'ndvi': ['image.normalizedDifference()', 'image.expression()'],
      'vegetation': ['ee.ImageCollection("MODIS/006/MOD13Q1")', 'image.normalizedDifference()'],
      'forest': ['ee.ImageCollection("UMD/hansen/global_forest_change_2021_v1_9")', 'ee.ImageCollection("JAXA/ALOS/PALSAR/YEARLY/FNF")'],
      'water': ['ee.Image("JRC/GSW1_3/GlobalSurfaceWater")', 'ee.Image.normalizedDifference()'],
      'land cover': ['ee.ImageCollection("MODIS/006/MCD12Q1")', 'ee.ImageCollection("ESA/WorldCover/v100")'],
      'temperature': ['ee.ImageCollection("MODIS/006/MOD11A1")', 'ee.ImageCollection("NOAA/CFSV2/FOR6H")'],
      'elevation': ['ee.Image("USGS/SRTMGL1_003")', 'ee.Terrain.slope'],
      'terrain': ['ee.Terrain', 'ee.Image("USGS/SRTMGL1_003")'],
      'time series': ['ee.ImageCollection.filterDate()', 'ui.Chart.image.series']
    };
    
    // Add keyword-based APIs to our relevant APIs list
    Object.entries(keywordToAPI).forEach(([keyword, apis]) => {
      if (lowercasedQuery.includes(keyword)) {
        relevantAPIs.push(...apis);
      }
    });
    
    // Remove duplicates
    const uniqueAPIs = [...new Set(relevantAPIs)];
    
    const hasPositiveKeyword = positiveKeywords.some(keyword => 
      lowercasedQuery.includes(keyword)
    );
    
    const hasNegativeKeyword = negativeKeywords.some(keyword => 
      lowercasedQuery.includes(keyword)
    );
    
    // Determine feasibility based on keywords and documentation results
    const hasSufficientDocumentation = docs.length >= 2;
    
    if ((hasPositiveKeyword || hasSufficientDocumentation) && !hasNegativeKeyword) {
      return { 
        feasible: true, 
        explanation: 'This task can be accomplished with Google Earth Engine.',
        suggestedApproach: 'Use Earth Engine to analyze satellite imagery and geospatial data.',
        relevantAPIs: uniqueAPIs.length > 0 ? uniqueAPIs : undefined
      };
    } else if (hasNegativeKeyword) {
      return { 
        feasible: false, 
        explanation: 'This task is not suitable for Google Earth Engine. Earth Engine is designed for geospatial analysis, not for this type of request.'
      };
    } else {
      return { 
        feasible: true, 
        explanation: 'This task might be accomplishable with Google Earth Engine, but I\'m not completely sure based on your request.',
        suggestedApproach: 'Let\'s try using Earth Engine to analyze geospatial data related to your query.',
        relevantAPIs: uniqueAPIs.length > 0 ? uniqueAPIs : undefined
      };
    }
  }
}; 