declare global {
  // Chrome Extension APIs
  const chrome: typeof import('@types/chrome');
  
  // Vite environment variables
  interface ImportMetaEnv {
    readonly VITE_EDGE_API_URL: string;
    readonly VITE_DEV_MODE?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
