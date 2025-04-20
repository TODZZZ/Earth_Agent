/**
 * Google Earth Engine API Documentation Tool
 * 
 * This module provides a Retrieval-Augmented Generation (RAG) system
 * for accessing Earth Engine API documentation.
 */

// Interface for documentation snippets
export interface DocumentationSnippet {
  title: string;
  content: string;
  url: string;
  category: string;
  apiClass?: string;
  apiFunction?: string;
  examples?: string[];
}

// Sample documentation data
// In a production system, this would be replaced with a proper vector database
const documentationData: DocumentationSnippet[] = [
  {
    title: "ee.Image - Constructor",
    content: "Creates an earth engine image. The Image constructor accepts a variety of arguments: constant value, EE object, asset ID, array, array of arrays.",
    url: "https://developers.google.com/earth-engine/apidocs/ee-image",
    category: "Core",
    apiClass: "ee.Image",
    examples: [
      "// Create a constant image.",
      "var image = ee.Image(1);",
      "// Create an image from an asset ID.",
      "var image = ee.Image('LANDSAT/LC08/C02/T1_L2/LC08_044034_20210508');"
    ]
  },
  {
    title: "ee.ImageCollection - Constructor",
    content: "Creates an earth engine image collection. The constructor accepts a variety of arguments: filter, list, asset ID, etc.",
    url: "https://developers.google.com/earth-engine/apidocs/ee-imagecollection",
    category: "Core",
    apiClass: "ee.ImageCollection",
    examples: [
      "// Create an ImageCollection from an asset ID.",
      "var collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2');"
    ]
  },
  {
    title: "ee.ImageCollection.filterDate",
    content: "Filter an image collection by date range. Accepts start and end dates as arguments.",
    url: "https://developers.google.com/earth-engine/apidocs/ee-imagecollection-filterdate",
    category: "Filtering",
    apiClass: "ee.ImageCollection",
    apiFunction: "filterDate",
    examples: [
      "// Filter a collection by date.",
      "var filtered = collection.filterDate('2021-01-01', '2021-12-31');"
    ]
  },
  {
    title: "ee.Image.clip",
    content: "Clip an image to a geometry. Accepts a feature, feature collection, or geometry as an argument.",
    url: "https://developers.google.com/earth-engine/apidocs/ee-image-clip",
    category: "Image Processing",
    apiClass: "ee.Image",
    apiFunction: "clip",
    examples: [
      "// Clip an image to a geometry.",
      "var clipped = image.clip(geometry);"
    ]
  },
  {
    title: "ee.Image.normalizedDifference",
    content: "Compute the normalized difference between two bands. This is often used for indices like NDVI.",
    url: "https://developers.google.com/earth-engine/apidocs/ee-image-normalizeddifference",
    category: "Image Processing",
    apiClass: "ee.Image",
    apiFunction: "normalizedDifference",
    examples: [
      "// Compute NDVI from NIR and red bands.",
      "var ndvi = image.normalizedDifference(['NIR', 'RED']);"
    ]
  },
  {
    title: "ee.Reducer.mean",
    content: "Create a reducer that computes the mean of values. This is commonly used with reduceRegion or reduceNeighborhood.",
    url: "https://developers.google.com/earth-engine/apidocs/ee-reducer-mean",
    category: "Reducers",
    apiClass: "ee.Reducer",
    apiFunction: "mean",
    examples: [
      "// Compute the mean value in a region.",
      "var mean = image.reduceRegion({",
      "  reducer: ee.Reducer.mean(),",
      "  geometry: region,",
      "  scale: 30",
      "});"
    ]
  },
  {
    title: "ee.Feature - Constructor",
    content: "Creates a feature with geometry and properties. Accepts various inputs, including a geometry and a property dictionary.",
    url: "https://developers.google.com/earth-engine/apidocs/ee-feature",
    category: "Vectors",
    apiClass: "ee.Feature",
    examples: [
      "// Create a feature with a point geometry and properties.",
      "var feature = ee.Feature(",
      "  ee.Geometry.Point([-122.4, 37.8]),",
      "  {name: 'San Francisco', population: 881000}",
      ");"
    ]
  },
  {
    title: "ee.FeatureCollection - Constructor",
    content: "Creates a feature collection. Accepts a list of features, a geometry, a computed object, or an asset ID.",
    url: "https://developers.google.com/earth-engine/apidocs/ee-featurecollection",
    category: "Vectors",
    apiClass: "ee.FeatureCollection",
    examples: [
      "// Create a FeatureCollection from an asset ID.",
      "var fc = ee.FeatureCollection('TIGER/2018/Counties');",
      "// Filter the collection.",
      "var filtered = fc.filter(ee.Filter.eq('STATEFP', '06'));"
    ]
  },
  {
    title: "ee.Terrain.slope",
    content: "Compute the slope of a DEM image. Returns an image with the slope in degrees.",
    url: "https://developers.google.com/earth-engine/apidocs/ee-terrain-slope",
    category: "Terrain",
    apiClass: "ee.Terrain",
    apiFunction: "slope",
    examples: [
      "// Load SRTM digital elevation model data.",
      "var dem = ee.Image('USGS/SRTMGL1_003');",
      "// Calculate slope.",
      "var slope = ee.Terrain.slope(dem);",
      "// Display the slope.",
      "Map.addLayer(slope, {min: 0, max: 60}, 'slope');"
    ]
  },
  {
    title: "ui.Map.addLayer",
    content: "Adds a layer to the map. Accepts an image, feature collection, or geometry, along with visualization parameters and a name.",
    url: "https://developers.google.com/earth-engine/apidocs/map-addlayer",
    category: "Visualization",
    apiClass: "ui.Map",
    apiFunction: "addLayer",
    examples: [
      "// Add an image to the map.",
      "Map.addLayer(image, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'Landsat');"
    ]
  },
  {
    title: "ui.Chart.image.series",
    content: "Creates a chart from an image collection. Useful for time series analysis of image collections.",
    url: "https://developers.google.com/earth-engine/apidocs/ui-chart-image-series",
    category: "Visualization",
    apiClass: "ui.Chart.image",
    apiFunction: "series",
    examples: [
      "// Create a time series chart of NDVI.",
      "var chart = ui.Chart.image.series({",
      "  imageCollection: ndviCollection,",
      "  region: geometry,",
      "  reducer: ee.Reducer.mean(),",
      "  scale: 30",
      "});"
    ]
  }
];

/**
 * Calculates the relevance score between a query and a document.
 * This is a simple TF-IDF like scoring mechanism.
 */
function calculateRelevance(query: string, doc: DocumentationSnippet): number {
  // Normalize query
  const normalizedQuery = query.toLowerCase();
  const queryTerms = normalizedQuery.split(/\W+/).filter(term => term.length > 2);
  
  // Calculate a basic relevance score
  let score = 0;
  
  // Check title match (highest weight)
  if (doc.title.toLowerCase().includes(normalizedQuery)) {
    score += 10;
  }
  
  // Check for API class match (high weight)
  if (doc.apiClass && normalizedQuery.includes(doc.apiClass.toLowerCase())) {
    score += 8;
  }
  
  // Check for API function match (high weight)
  if (doc.apiFunction && normalizedQuery.includes(doc.apiFunction.toLowerCase())) {
    score += 8;
  }
  
  // Check for term frequency in content (medium weight)
  const contentLower = doc.content.toLowerCase();
  for (const term of queryTerms) {
    const regex = new RegExp(term, 'g');
    const matches = contentLower.match(regex);
    if (matches) {
      score += matches.length * 0.5;
    }
  }
  
  // Check for examples (low weight)
  if (doc.examples) {
    const examplesText = doc.examples.join(' ').toLowerCase();
    for (const term of queryTerms) {
      if (examplesText.includes(term)) {
        score += 0.3;
      }
    }
  }
  
  return score;
}

/**
 * Searches for relevant Earth Engine API documentation based on a query.
 */
export function searchDocumentation(query: string, limit: number = 5): DocumentationSnippet[] {
  // Score each document based on relevance to the query
  const scoredDocs = documentationData.map(doc => ({
    doc,
    score: calculateRelevance(query, doc)
  }));
  
  // Sort by score (descending) and take the top results
  return scoredDocs
    .sort((a, b) => b.score - a.score)
    .filter(item => item.score > 0) // Only return relevant results
    .slice(0, limit)
    .map(item => item.doc);
}

/**
 * Get documentation for a specific API class or function.
 */
export function getDocumentation(apiClass: string, apiFunction?: string): DocumentationSnippet | null {
  const docs = documentationData.filter(doc => 
    doc.apiClass === apiClass && 
    (!apiFunction || doc.apiFunction === apiFunction)
  );
  
  return docs.length > 0 ? docs[0] : null;
}

/**
 * Get example code for a specific API class or function.
 */
export function getExamples(apiClass: string, apiFunction?: string): string[] {
  const doc = getDocumentation(apiClass, apiFunction);
  return doc?.examples || [];
}

/**
 * Generate code snippet using the Earth Engine API based on description.
 */
export function generateCodeSnippet(description: string): string {
  // In a full implementation, this would use an LLM to generate code
  // based on the description and relevant documentation.
  // For now, we'll use a simple pattern matching approach.
  
  const desc = description.toLowerCase();
  
  if (desc.includes('ndvi') || desc.includes('vegetation index')) {
    return `// Load Landsat 8 imagery
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate('2020-01-01', '2020-12-31')
  .filterBounds(geometry);

// Select the least cloudy image
var image = ee.Image(landsat.sort('CLOUD_COVER').first());

// Calculate NDVI
var nir = image.select('SR_B5');
var red = image.select('SR_B4');
var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');

// Display the result
Map.centerObject(geometry, 10);
Map.addLayer(ndvi, {min: -0.2, max: 0.8, palette: ['brown', 'yellow', 'green']}, 'NDVI');`;
  }
  
  if (desc.includes('water') || desc.includes('flood')) {
    return `// Load Sentinel-1 SAR imagery
var sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterDate('2020-01-01', '2020-12-31')
  .filterBounds(geometry)
  .filter(ee.Filter.eq('instrumentMode', 'IW'));

// Create a water mask using thresholding on VV band
var vvImage = sentinel1.select('VV').median();
var waterMask = vvImage.lt(-15);

// Add the layers to the map
Map.centerObject(geometry, 11);
Map.addLayer(vvImage, {min: -25, max: 0}, 'Sentinel-1 VV');
Map.addLayer(waterMask.mask(waterMask), {palette: ['blue']}, 'Water Mask');`;
  }
  
  if (desc.includes('land cover') || desc.includes('landcover')) {
    return `// Load ESA WorldCover data
var worldcover = ee.ImageCollection('ESA/WorldCover/v100').first();

// Define visualization parameters
var visParams = {
  bands: ['Map'],
  min: 10,
  max: 110,
  palette: [
    '006400', '96ED69', 'FFBB22', 'F096FF', 'FA0000',
    'B4B4B4', 'F0F0F0', '0064C8', '0096A0', '00CF75',
    'FAE6A0'
  ]
};

// Add the layer to the map
Map.centerObject(geometry, 10);
Map.addLayer(worldcover, visParams, 'Land Cover');`;
  }
  
  if (desc.includes('time series') || desc.includes('chart')) {
    return `// Load Landsat 8 imagery for a time series
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate('2018-01-01', '2022-12-31')
  .filterBounds(geometry);

// Create an NDVI collection
var ndviCollection = landsat.map(function(image) {
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  return image.addBands(ndvi);
});

// Create a time series chart
var chart = ui.Chart.image.series({
  imageCollection: ndviCollection.select('NDVI'),
  region: geometry,
  reducer: ee.Reducer.mean(),
  scale: 30
}).setOptions({
  title: 'NDVI Time Series',
  vAxis: {title: 'NDVI'},
  hAxis: {title: 'Date', format: 'yyyy-MM-dd', gridlines: {count: 7}}
});

// Display the chart
print(chart);`;
  }
  
  // Default code snippet for general Earth Engine analysis
  return `// Load Landsat 8 imagery
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate('2020-01-01', '2020-12-31')
  .filterBounds(geometry)
  .sort('CLOUD_COVER')
  .first();

// Display true color image
var trueColor = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 7000,
  max: 30000
};

Map.centerObject(geometry, 10);
Map.addLayer(landsat, trueColor, 'Landsat True Color');`;
}

// Export the main search function in a named object
export const GEEDocumentation = {
  search: searchDocumentation,
  getDocumentation,
  getExamples,
  generateCodeSnippet
}; 