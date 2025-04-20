# Earth Agent - Google Earth Engine Assistant

Earth Agent is a Chrome extension that provides an AI-powered assistant for the Google Earth Engine Code Editor. It helps users interact with Google Earth Engine by generating code, selecting appropriate datasets, and analyzing map data.

## Features

- **AI-powered chatbot interface** to help with Earth Engine tasks
- **Database selection** from the Google Earth Engine catalog
- **Code generation** for maps and visualizations
- **Code execution** directly in the Earth Engine editor
- **Error debugging** to fix issues with generated code
- **Data inspection** to analyze points on the map

## Development Status

This project is currently in Phase 2 of development, which includes:

- ✅ Basic chat interface implementation
- ✅ Core agent framework with Planner
- ✅ Database Search tool to access GEE catalog  
- ✅ Code Generation agent with basic functionality
- ✅ Content script integration with GEE code editor

Next steps (Phase 3):
- Full agent implementation (Code Debugger and Summarizer)
- Enhanced code execution and inspection
- RAG system for GEE API documentation
- Improved error handling

## Agent System

Earth Agent uses a multi-agent architecture powered by LangChain.js and LangGraph:

1. **Planner Agent**: Analyzes user requests and determines if they can be accomplished with Google Earth Engine
2. **Database Selector Agent**: Identifies relevant datasets from the Earth Engine catalog
3. **Code Generator Agent**: Produces JavaScript code for the Earth Engine editor
4. **Content Script**: Communicates with the Earth Engine page to run code and inspect results

## Project Structure

```
earth-agent/
├── public/               # Static assets and manifest
├── src/
│   ├── background/       # Extension background script
│   ├── components/       # React components
│   ├── contentScript/    # Script injected into Earth Engine page
│   ├── lib/              # Core libraries
│   │   ├── agents/       # Agent system implementation
│   │   └── tools/        # Tools for agents
│   ├── popup/            # Extension popup
│   ├── sidepanel/        # Sidepanel interface
│   └── styles/           # CSS styles
├── package.json          # Dependencies and scripts
└── vite.config.ts        # Build configuration
```

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Build the extension: `npm run build`

## Loading the Extension in Chrome

1. Build the extension: `npm run build`
2. Copy the manifest file to the dist directory: `copy public\manifest.json dist\`
3. Create placeholder icons in dist/icons/
4. Open Chrome and navigate to `chrome://extensions`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the `dist` directory

## Testing the Extension

1. Navigate to the Google Earth Engine Code Editor: [https://code.earthengine.google.com/](https://code.earthengine.google.com/)
2. Click the Earth Agent icon in the toolbar
3. Use the chat interface to ask Earth Agent to create maps or analyze data
4. Click "Run Code" to execute generated code in the Earth Engine editor

## Technologies Used

- **Vite.js** for fast builds and development
- **React** for UI components
- **TypeScript** for type safety
- **TailwindCSS** for styling
- **LangChain.js** and **LangGraph.js** for agent development

## License

MIT

## Contributors

- Your Name 