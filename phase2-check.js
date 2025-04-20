/**
 * Phase 2 Check - Earth Agent
 * 
 * This script checks that all required files and components for Phase 2 exist.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Required files for Phase 2, in addition to Phase 1 files
const requiredFiles = [
  // Core agent files
  'src/lib/agents/planner.ts',
  'src/lib/agents/databaseSelector.ts',
  'src/lib/agents/codeGenerator.ts',
  
  // Enhanced tools
  'src/lib/tools/databaseSearch.ts',
  'src/lib/tools/gee_catalog_sample.json',
  
  // Tests
  'src/lib/agents/__tests__/agents.test.ts',
];

// Check if all required files exist
console.log('Checking required files for Phase 2...');

let allFilesExist = true;
const missingFiles = [];

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    allFilesExist = false;
    missingFiles.push(file);
  }
}

if (allFilesExist) {
  console.log('✅ All required Phase 2 files exist.');
} else {
  console.log('❌ Some required Phase 2 files are missing:');
  for (const file of missingFiles) {
    console.log(`   - ${file}`);
  }
}

// Check file contents for key components
console.log('\nChecking for key Phase 2 components...');

const componentsToCheck = [
  {
    file: 'src/lib/agents/planner.ts',
    patterns: ['createPlannerAgent', 'PLANNER_PROMPT'],
    description: 'Planner Agent'
  },
  {
    file: 'src/lib/agents/databaseSelector.ts',
    patterns: ['createDatabaseSelectorAgent', 'DATABASE_SELECTOR_PROMPT'],
    description: 'Database Selector Agent'
  },
  {
    file: 'src/lib/agents/codeGenerator.ts',
    patterns: ['createCodeGeneratorAgent', 'CODE_GENERATOR_PROMPT'],
    description: 'Code Generator Agent'
  },
  {
    file: 'src/lib/tools/databaseSearch.ts',
    patterns: ['searchEarthEngineDatabase', 'DatasetEntry'],
    description: 'Database Search Tool'
  },
  {
    file: 'src/components/ChatInterface.tsx',
    patterns: ['initializeAgentSystem', 'handleRunCode', 'chrome.tabs.sendMessage'],
    description: 'Chat Interface with Agent Integration'
  },
  {
    file: 'src/contentScript/contentScript.ts',
    patterns: ['findAceEditor', 'runCode', 'inspectMap', 'checkConsole'],
    description: 'Content Script Functionality'
  }
];

let allComponentsPresent = true;

for (const component of componentsToCheck) {
  try {
    const filePath = path.join(__dirname, component.file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const missingPatterns = component.patterns.filter(pattern => !content.includes(pattern));
    
    if (missingPatterns.length === 0) {
      console.log(`✅ ${component.description} is properly implemented.`);
    } else {
      console.log(`❌ ${component.description} is missing required components: ${missingPatterns.join(', ')}`);
      allComponentsPresent = false;
    }
  } catch (error) {
    console.log(`❌ Could not check ${component.description}: ${error.message}`);
    allComponentsPresent = false;
  }
}

console.log('\nPhase 2 Summary:');
if (allFilesExist && allComponentsPresent) {
  console.log('✅ Phase 2 is complete. The agent system and core functionality are implemented.');
  console.log('   Ready to proceed to Phase 3: Full Agent System Development.');
} else {
  console.log('❌ Phase 2 is incomplete. Please fix the missing components before proceeding.');
} 