import React, { useState, useEffect } from "react";

interface ExtensionSettings {
  edgeApiUrl: string;
  enableTracking: boolean;
  syncInterval: number;
  debugMode: boolean;
}

const defaultSettings: ExtensionSettings = {
  edgeApiUrl: "http://localhost:8787",
  enableTracking: true,
  syncInterval: 30,
  debugMode: false,
};

export const Options: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(defaultSettings);
      setSettings(result as ExtensionSettings);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await chrome.storage.sync.set(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const handleInputChange = (key: keyof ExtensionSettings, value: string | boolean | number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  if (loading) {
    return (
      <div className="options-container">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="options-container">
      <div className="options-header">
        <h1>RedwoodSDK Extension Settings</h1>
      </div>

      <div className="options-content">
        <div className="settings-section">
          <h2>API Configuration</h2>
          
          <div className="setting-item">
            <label htmlFor="edgeApiUrl">Edge API URL:</label>
            <input
              id="edgeApiUrl"
              type="url"
              value={settings.edgeApiUrl}
              onChange={(e) => handleInputChange("edgeApiUrl", e.target.value)}
              placeholder="https://your-app.workers.dev"
            />
            <small>The URL of your RedwoodSDK edge application</small>
          </div>
        </div>

        <div className="settings-section">
          <h2>Features</h2>
          
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.enableTracking}
                onChange={(e) => handleInputChange("enableTracking", e.target.checked)}
              />
              Enable activity tracking
            </label>
            <small>Track page visits and interactions</small>
          </div>

          <div className="setting-item">
            <label htmlFor="syncInterval">Sync interval (minutes):</label>
            <input
              id="syncInterval"
              type="number"
              min="5"
              max="1440"
              value={settings.syncInterval}
              onChange={(e) => handleInputChange("syncInterval", parseInt(e.target.value))}
            />
            <small>How often to sync data with the server</small>
          </div>
        </div>

        <div className="settings-section">
          <h2>Development</h2>
          
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.debugMode}
                onChange={(e) => handleInputChange("debugMode", e.target.checked)}
              />
              Debug mode
            </label>
            <small>Enable detailed console logging</small>
          </div>
        </div>

        <div className="options-actions">
          <button onClick={saveSettings} className="btn btn-primary">
            Save Settings
          </button>
          <button onClick={resetSettings} className="btn btn-secondary">
            Reset to Defaults
          </button>
          {saved && <span className="save-indicator">Settings saved!</span>}
        </div>
      </div>
    </div>
  );
};