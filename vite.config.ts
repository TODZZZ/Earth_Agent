import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    // Plugin to ensure HTML files are copied to dist root
    {
      name: 'copy-html-files',
      closeBundle() {
        // Manually copy necessary HTML files to dist root
        console.log('Copying HTML files to dist root...');
        try {
          copyFileSync(
            resolve(__dirname, 'dist/src/sidepanel/sidepanel.html'), 
            resolve(__dirname, 'dist/sidepanel.html')
          );
          console.log('Successfully copied sidepanel.html to dist root');
          
          // Copy other HTML files if needed
          copyFileSync(
            resolve(__dirname, 'dist/src/popup/popup.html'), 
            resolve(__dirname, 'dist/popup.html')
          );
          console.log('Successfully copied popup.html to dist root');
        } catch (error) {
          console.error('Error copying HTML files:', error);
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel/sidepanel.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        contentScript: resolve(__dirname, 'src/contentScript/contentScript.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
}); 