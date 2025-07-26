import { edgeFetch } from "../shared/edge-fetch";

console.log("RedwoodSDK Extension background script loaded");

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason);
  
  if (details.reason === "install") {
    // Set default settings or perform initial setup
    chrome.storage.local.set({
      extensionVersion: chrome.runtime.getManifest().version,
      installDate: new Date().toISOString(),
    });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);
  
  switch (message.type) {
    case "GET_AUTH_STATUS":
      handleAuthStatus().then(sendResponse);
      return true; // Keep message channel open for async response
      
    case "SYNC_DATA":
      handleDataSync(message.data).then(sendResponse);
      return true;
      
    default:
      console.warn("Unknown message type:", message.type);
  }
});

// Check authentication status with edge API
async function handleAuthStatus(): Promise<{ authenticated: boolean }> {
  try {
    const response = await edgeFetch("/api/auth/session");
    return { authenticated: response.ok };
  } catch (error) {
    console.error("Auth status check failed:", error);
    return { authenticated: false };
  }
}

// Sync data with edge API
async function handleDataSync(data: any): Promise<{ success: boolean }> {
  try {
    const response = await edgeFetch("/api/extension/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    return { success: response.ok };
  } catch (error) {
    console.error("Data sync failed:", error);
    return { success: false };
  }
}

// Handle tab updates for potential content script injection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    // Only inject on specific domains if needed
    console.log("Tab updated:", tab.url);
  }
});

// Periodic background tasks (if needed)
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("Alarm triggered:", alarm.name);
  
  switch (alarm.name) {
    case "sync-data":
      // Perform periodic data sync
      break;
    default:
      break;
  }
});

// Create periodic alarm (optional)
chrome.alarms.create("sync-data", { 
  delayInMinutes: 1, 
  periodInMinutes: 30 
});