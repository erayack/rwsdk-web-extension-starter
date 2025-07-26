console.log("RedwoodSDK Extension content script loaded");

// Content script that runs on web pages
class ExtensionContentScript {
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      this.setup();
    }
    
    this.initialized = true;
  }

  private setup() {
    console.log("Content script setup on:", window.location.href);
    
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open
    });
    
    // Add extension-specific functionality
    this.injectExtensionFeatures();
  }

  private handleMessage(message: any, sender: any, sendResponse: Function) {
    console.log("Content script received message:", message);
    
    switch (message.type) {
      case "GET_PAGE_DATA":
        sendResponse({
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString(),
        });
        break;
        
      case "EXTRACT_DATA":
        const extractedData = this.extractPageData();
        sendResponse(extractedData);
        break;
        
      default:
        console.warn("Unknown message type:", message.type);
    }
  }

  private injectExtensionFeatures() {
    // Add a small indicator that the extension is active (optional)
    if (this.shouldShowIndicator()) {
      this.addExtensionIndicator();
    }
    
    // Listen for specific page events
    this.setupPageListeners();
  }

  private shouldShowIndicator(): boolean {
    // Only show on localhost or your app's domain
    return window.location.hostname === "localhost" || 
           window.location.hostname.includes("workers.dev");
  }

  private addExtensionIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "rwsdk-extension-indicator";
    indicator.innerHTML = "🚀 RedwoodSDK Extension Active";
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #007bff;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      cursor: pointer;
    `;
    
    // Remove after 3 seconds
    setTimeout(() => {
      indicator.remove();
    }, 3000);
    
    document.body.appendChild(indicator);
  }

  private setupPageListeners() {
    // Listen for form submissions, clicks, etc.
    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      
      // Example: Track clicks on specific elements
      if (target.matches("[data-track]")) {
        this.trackEvent("click", {
          element: target.tagName,
          dataTrack: target.getAttribute("data-track"),
          url: window.location.href,
        });
      }
    });
  }

  private extractPageData() {
    return {
      url: window.location.href,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent),
      forms: Array.from(document.querySelectorAll('form')).length,
      timestamp: new Date().toISOString(),
    };
  }

  private trackEvent(eventType: string, data: any) {
    // Send tracking data to background script
    chrome.runtime.sendMessage({
      type: "TRACK_EVENT",
      eventType,
      data,
    });
  }
}

// Initialize content script
new ExtensionContentScript();