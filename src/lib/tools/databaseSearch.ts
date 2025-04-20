/**
 * Database Search Tool for Earth Engine Agent
 * 
 * This module provides functions for searching the Google Earth Engine dataset catalog.
 */

// Import necessary modules
import axios from 'axios';

// Define the catalog URL
const CATALOG_URL = 'https://raw.githubusercontent.com/samapriya/Earth-Engine-Datasets-List/master/gee_catalog.json';

// Define interface for GEE catalog dataset entry
export interface DatasetEntry {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  tags?: string[];
  provider?: string;
  documentation_url?: string;
  type?: string;
  asset_url?: string;
  start_date?: string;
  end_date?: string;
  startyear?: string;
  endyear?: string;
  thumbnail_url?: string;
}

// Cached catalog to avoid multiple network requests
let cachedCatalog: DatasetEntry[] | null = null;

/**
 * Fetch the Earth Engine catalog from GitHub
 */
async function fetchCatalog(): Promise<DatasetEntry[]> {
  if (cachedCatalog) {
    return cachedCatalog;
  }
  
  try {
    const response = await axios.get(CATALOG_URL);
    const catalog: DatasetEntry[] = response.data;
    cachedCatalog = catalog;
    console.log(`Fetched ${catalog.length} datasets from GEE catalog`);
    return catalog;
  } catch (error) {
    console.error('Error fetching Earth Engine catalog:', error);
    // Return the sample catalog as fallback
    return getSampleCatalog();
  }
}

/**
 * Get a sample catalog as fallback
 */
function getSampleCatalog(): DatasetEntry[] {
  return [
    {
      "id": "USGS/SRTMGL1_003",
      "title": "SRTM Global 1 arc second elevation",
      "description": "Shuttle Radar Topography Mission (SRTM) digital elevation data is a worldwide elevation dataset.",
      "tags": ["elevation", "topography", "dem", "srtm"],
      "provider": "USGS",
      "documentation_url": "https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003",
      "type": "image"
    },
    {
      "id": "MODIS/006/MOD13Q1",
      "title": "MODIS Terra Vegetation Indices 16-Day Global 250m",
      "description": "Vegetation indices designed to provide consistent spatial and temporal comparisons of vegetation conditions.",
      "tags": ["modis", "vegetation", "ndvi", "evi"],
      "provider": "NASA",
      "documentation_url": "https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MOD13Q1",
      "type": "image_collection"
    },
    {
      "id": "COPERNICUS/S2",
      "title": "Sentinel-2 MSI: MultiSpectral Instrument, Level-1C",
      "description": "Sentinel-2 is a wide-swath, high-resolution, multi-spectral imaging mission supporting Copernicus Land Monitoring studies.",
      "tags": ["sentinel", "satellite", "esa", "copernicus"],
      "provider": "ESA",
      "documentation_url": "https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2",
      "type": "image_collection"
    },
    {
      "id": "LANDSAT/LC08/C01/T1_SR",
      "title": "USGS Landsat 8 Surface Reflectance Tier 1",
      "description": "Landsat 8 SR is atmospherically corrected surface reflectance from the Landsat 8 OLI/TIRS sensors.",
      "tags": ["landsat", "usgs", "sr", "surface reflectance"],
      "provider": "USGS",
      "documentation_url": "https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C01_T1_SR",
      "type": "image_collection"
    },
    {
      "id": "NASA/GPM_L3/IMERG_V06",
      "title": "GPM: Global Precipitation Measurement (GPM) v6",
      "description": "Global Precipitation Measurement (GPM) IMERG precipitation data.",
      "tags": ["precipitation", "rainfall", "gpm", "nasa"],
      "provider": "NASA",
      "documentation_url": "https://developers.google.com/earth-engine/datasets/catalog/NASA_GPM_L3_IMERG_V06",
      "type": "image_collection"
    }
  ];
}

/**
 * Search the Earth Engine catalog for datasets matching the query
 */
export async function searchEarthEngineDatabase(query: string): Promise<DatasetEntry[]> {
  console.log('Searching Earth Engine database for:', query);
  
  try {
    // Fetch the full catalog
    const fullCatalog = await fetchCatalog();
    
    const normalizedQuery = query.toLowerCase();
    const keywords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
    
    // Find datasets that match any of the keywords in their metadata
    const matchingDatasets = fullCatalog.filter(dataset => {
      // Create a single text string from all dataset fields for searching
      const datasetText = `${dataset.id} ${dataset.title || dataset.name || ''} ${dataset.description || ''} ${dataset.tags?.join(' ') || ''}`.toLowerCase();
      return keywords.some(keyword => datasetText.includes(keyword));
    });
    
    // Sort by relevance (number of keyword matches)
    return matchingDatasets
      .map(dataset => {
        // Calculate a relevance score
        const datasetText = `${dataset.id} ${dataset.title || dataset.name || ''} ${dataset.description || ''} ${dataset.tags?.join(' ') || ''}`.toLowerCase();
        const score = keywords.reduce((acc, keyword) => {
          return acc + (datasetText.split(keyword).length - 1);
        }, 0);
        
        return { dataset, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.dataset)
      .slice(0, 20); // Limit to 20 most relevant results
  } catch (error) {
    console.error('Error searching Earth Engine database:', error);
    
    // Return a fallback list of common datasets in case of error
    return getSampleCatalog();
  }
} 