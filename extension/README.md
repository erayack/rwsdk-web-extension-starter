# RedwoodSDK Chrome Extension Starter

A Chrome extension starter template designed as a companion to RedwoodSDK web applications. This extension integrates seamlessly with your RedwoodSDK backend to extend your web app's functionality directly into the browser.

## Features

- 🚀 Built with React and TypeScript
- ⚡ Vite development server with HMR
- 🔧 Chrome Extension Manifest v3
- 🌐 Pre-configured API integration with RedwoodSDK backend
- 📱 Complete extension structure (popup, background, content, options)
- 🛠️ Edge API fetch helpers with shared authentication
- 🔄 Session synchronization with companion web app

## Companion Web Application

This extension is designed to work with the **Standard RedwoodSDK Starter** web application. Together they provide:

- **Shared Authentication**: Users log in once and access both web app and extension
- **Synchronized Data**: Settings and user data sync between platforms  
- **Unified API**: Both use the same RedwoodSDK backend endpoints
- **Cross-Platform Features**: Extend web app functionality into browser tabs

To set up the complete system, you'll need both:
1. **Web App**: Use the `standard/` folder for your main application
2. **Extension**: Use the `extension/` folder for the browser extension

## Getting Started

### Prerequisites

- Node.js (>=22)
- Chrome browser for testing

### Installation

**Note**: Ensure your companion web app (Standard RedwoodSDK Starter) is running first.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to configure your RedwoodSDK API URL (same as your web app).

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Load extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Building for Production

```bash
npm run build
npm run zip
```

This creates an `extension.zip` file ready for Chrome Web Store submission.

## Project Structure

```
src/
├── popup/          # Extension popup UI
├── background/     # Background service worker
├── content/        # Content scripts for web pages
├── options/        # Extension options page
└── shared/         # Shared utilities and helpers
```

## API Integration

The extension includes pre-built helpers for connecting to your RedwoodSDK backend:

```typescript
import { edgeFetch, edgeFetchJson } from '@/shared/edge-fetch';

// Authenticated API calls
const response = await edgeFetch('/api/user/profile');
const userData = await edgeFetchJson('/api/user/profile');
```

## Configuration

Extension settings can be configured through:
- Environment variables (`.env`)
- Chrome extension options page
- Chrome storage API

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript checks
- `npm run clean` - Clean build artifacts
- `npm run zip` - Create distribution zip

### Chrome Extension APIs

The extension has permissions for:
- `storage` - Local and sync storage
- `activeTab` - Access to current tab
- `scripting` - Content script injection

## Deployment

1. Build the extension: `npm run build`
2. Create zip file: `npm run zip`
3. Upload `extension.zip` to Chrome Web Store

## Integration with RedwoodSDK Web App

This extension is designed to work seamlessly with your Standard RedwoodSDK web application:

- **Authentication**: Shares session tokens with your web app
- **API Calls**: Uses the same edge API endpoints as your web app
- **Real-time**: Ready for WebSocket integration across platforms
- **Storage**: Syncs settings and data between extension and web app
- **User Experience**: Seamless transition between browser extension and web interface

### Setup Both Applications

1. **Create your web app:**
   ```bash
   npx create-rwsdk my-project-name --template=standard
   cd my-project-name
   npm install
   npm run dev
   ```

2. **Create companion extension:**
   ```bash
   npx create-rwsdk my-project-extension --template=extension
   cd my-project-extension
   npm install
   # Configure same API URL as web app in .env
   npm run dev
   ```

## Learn More

- [RedwoodSDK Documentation](https://docs.redwoodjs.com/sdk)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Vite Documentation](https://vitejs.dev/)