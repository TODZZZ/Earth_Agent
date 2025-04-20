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

This project is currently in Phase 1 of development, which includes:

- Basic project setup and architecture
- Extension manifest and structure
- Sidebar UI with login and chat components
- Core agent framework with LangChain.js and LangGraph.js

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
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` directory

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