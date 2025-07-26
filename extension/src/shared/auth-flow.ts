import { edgeFetch, authenticateWithPasskey, type TokenData } from "./edge-fetch";

interface AuthFlowOptions {
  redirectUrl?: string;
  usePasskey?: boolean;
  extensionId?: string;
}

interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
  tokenData?: TokenData;
}

// Platform detection
const isExtension = typeof chrome !== "undefined" && chrome.storage;
const isWeb = typeof window !== "undefined" && !isExtension;

// Cross-platform authentication flow manager
export class EdgeAuthFlow {
  private baseUrl: string;
  private options: AuthFlowOptions;

  constructor(baseUrl?: string, options: AuthFlowOptions = {}) {
    this.baseUrl = baseUrl || process.env.VITE_EDGE_API_URL || "http://localhost:8787";
    this.options = {
      usePasskey: true,
      ...options,
    };
  }

  // Initiate login flow based on platform
  async login(credentials?: { email?: string; password?: string }): Promise<AuthResult> {
    try {
      if (isExtension) {
        return await this.extensionLogin(credentials);
      } else if (isWeb) {
        return await this.webLogin(credentials);
      } else {
        throw new Error("Unsupported platform");
      }
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  }

  // Extension-specific login flow
  private async extensionLogin(credentials?: { email?: string; password?: string }): Promise<AuthResult> {
    // Try passkey authentication first if enabled
    if (this.options.usePasskey) {
      try {
        const passkeyResult = await this.attemptPasskeyAuth();
        if (passkeyResult.success) {
          return passkeyResult;
        }
      } catch (error) {
        console.log("Passkey auth failed, falling back to web flow:", error);
      }
    }

    // Fall back to opening web app for authentication
    return await this.openWebAuthFlow();
  }

  // Web-specific login flow
  private async webLogin(credentials?: { email?: string; password?: string }): Promise<AuthResult> {
    // Try passkey authentication first if enabled and no credentials provided
    if (this.options.usePasskey && !credentials) {
      try {
        return await this.attemptPasskeyAuth();
      } catch (error) {
        console.log("Passkey auth failed, falling back to credentials:", error);
      }
    }

    // Use traditional credential authentication
    if (credentials) {
      return await this.credentialAuth(credentials);
    }

    // No credentials and passkey failed
    throw new Error("No authentication method available");
  }

  // Attempt WebAuthn/passkey authentication
  private async attemptPasskeyAuth(): Promise<AuthResult> {
    try {
      const credential = await authenticateWithPasskey();
      
      // Get user data after successful authentication
      const userResponse = await edgeFetch("/api/auth/session");
      
      if (!userResponse.ok) {
        throw new Error("Failed to get user session after passkey auth");
      }

      const user = await userResponse.json();

      return {
        success: true,
        user,
      };
    } catch (error) {
      throw new Error(`Passkey authentication failed: ${error}`);
    }
  }

  // Traditional credential authentication
  private async credentialAuth(credentials: { email: string; password: string }): Promise<AuthResult> {
    const response = await edgeFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Login failed");
    }

    const result = await response.json();
    
    return {
      success: true,
      user: result.user,
      tokenData: result.tokenData,
    };
  }

  // Open web app authentication flow for extensions
  private async openWebAuthFlow(): Promise<AuthResult> {
    return new Promise((resolve) => {
      const authUrl = `${this.baseUrl}/auth/extension?extensionId=${this.options.extensionId || 'unknown'}`;
      
      // Open authentication page
      chrome.tabs.create({ url: authUrl }, (tab) => {
        if (!tab.id) {
          resolve({
            success: false,
            error: "Failed to open authentication tab",
          });
          return;
        }

        // Listen for tab updates to detect completion
        const tabUpdateListener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, updatedTab: chrome.tabs.Tab) => {
          if (tabId !== tab.id) return;

          // Check for success callback URL
          if (changeInfo.url?.includes("/auth/extension/success")) {
            chrome.tabs.onUpdated.removeListener(tabUpdateListener);
            chrome.tabs.remove(tabId);
            
            // Extract auth data from URL or storage
            this.handleAuthSuccess().then(resolve);
          }
          
          // Check for error callback URL
          else if (changeInfo.url?.includes("/auth/extension/error")) {
            chrome.tabs.onUpdated.removeListener(tabUpdateListener);
            chrome.tabs.remove(tabId);
            
            resolve({
              success: false,
              error: "Authentication failed in web flow",
            });
          }
          
          // Check if tab was closed by user
          else if (changeInfo.status === "complete" && updatedTab.url === "chrome://newtab/") {
            chrome.tabs.onUpdated.removeListener(tabUpdateListener);
            resolve({
              success: false,
              error: "Authentication cancelled by user",
            });
          }
        };

        chrome.tabs.onUpdated.addListener(tabUpdateListener);

        // Set timeout for authentication
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(tabUpdateListener);
          chrome.tabs.remove(tab.id!);
          resolve({
            success: false,
            error: "Authentication timeout",
          });
        }, 300000); // 5 minutes timeout
      });
    });
  }

  // Handle successful authentication from web flow
  private async handleAuthSuccess(): Promise<AuthResult> {
    try {
      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch user session
      const response = await edgeFetch("/api/auth/session");
      
      if (!response.ok) {
        throw new Error("Failed to establish session");
      }

      const user = await response.json();

      return {
        success: true,
        user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Session establishment failed",
      };
    }
  }

  // Logout from both platforms
  async logout(): Promise<void> {
    try {
      // Call server logout
      await edgeFetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Server logout failed:", error);
    }

    // Clear local storage
    if (isExtension) {
      await chrome.storage.local.clear();
      await chrome.storage.sync.remove(["edgeSession"]);
    } else if (isWeb) {
      localStorage.removeItem("edgeSession");
      localStorage.removeItem("tokenData");
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await edgeFetch("/api/auth/session");
      return response.ok;
    } catch {
      return false;
    }
  }

  // Register a new user (web only)
  async register(userData: {
    email: string;
    password?: string;
    name?: string;
    usePasskey?: boolean;
  }): Promise<AuthResult> {
    if (isExtension) {
      // Redirect to web app for registration
      const registerUrl = `${this.baseUrl}/auth/register?extensionId=${this.options.extensionId || 'unknown'}`;
      chrome.tabs.create({ url: registerUrl });
      
      return {
        success: false,
        error: "Registration must be completed in web browser",
      };
    }

    try {
      const response = await edgeFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Registration failed");
      }

      const result = await response.json();
      
      return {
        success: true,
        user: result.user,
        tokenData: result.tokenData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  }
}

// Create default instance
export const authFlow = new EdgeAuthFlow();

// Export for custom configurations
export { EdgeAuthFlow };