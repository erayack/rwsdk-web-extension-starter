interface EdgeFetchOptions extends RequestInit {
  skipAuth?: boolean;
  skipRetry?: boolean;
}

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface WebAuthnCredential {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorAssertionResponse;
  type: 'public-key';
}

class EdgeFetchClient {
  private baseUrl: string;
  private tokenData: TokenData | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.baseUrl = this.getEdgeApiUrl();
    this.loadTokenData();
  }

  private getEdgeApiUrl(): string {
    // Try to get from environment variables first
    if (typeof process !== 'undefined' && process.env.VITE_EDGE_API_URL) {
      return process.env.VITE_EDGE_API_URL;
    }
    
    // Fallback to stored settings
    return "http://localhost:8787";
  }

  private async loadTokenData(): Promise<void> {
    try {
      const result = await chrome.storage.local.get("tokenData");
      this.tokenData = result.tokenData || null;
    } catch (error) {
      console.error("Failed to load token data:", error);
    }
  }

  private async saveTokenData(tokenData: TokenData): Promise<void> {
    try {
      await chrome.storage.local.set({ tokenData });
      this.tokenData = tokenData;
    } catch (error) {
      console.error("Failed to save token data:", error);
    }
  }

  private async clearTokenData(): Promise<void> {
    try {
      await chrome.storage.local.remove(["tokenData", "authToken"]);
      this.tokenData = null;
    } catch (error) {
      console.error("Failed to clear token data:", error);
    }
  }

  private isTokenExpired(): boolean {
    if (!this.tokenData?.expiresAt) return false;
    return Date.now() >= this.tokenData.expiresAt - 60000; // Refresh 1 minute before expiry
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.tokenData?.refreshToken) {
      throw new Error("No refresh token available");
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken: this.tokenData?.refreshToken,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const newTokenData = await response.json();
      await this.saveTokenData({
        accessToken: newTokenData.accessToken,
        refreshToken: newTokenData.refreshToken || this.tokenData?.refreshToken,
        expiresAt: newTokenData.expiresAt ? new Date(newTokenData.expiresAt).getTime() : undefined,
      });
    } catch (error) {
      console.error("Token refresh failed:", error);
      await this.clearTokenData();
      throw error;
    }
  }

  // WebAuthn authentication support
  async authenticateWithPasskey(options?: {
    challenge?: string;
    rpId?: string;
    userHandle?: ArrayBuffer;
  }): Promise<WebAuthnCredential> {
    if (!navigator.credentials?.get) {
      throw new Error("WebAuthn not supported");
    }

    try {
      // Get authentication challenge from server if not provided
      let challenge = options?.challenge;
      if (!challenge) {
        const challengeResponse = await this.fetch("/api/auth/webauthn/challenge", {
          skipAuth: true,
        });
        const challengeData = await challengeResponse.json();
        challenge = challengeData.challenge;
      }

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new TextEncoder().encode(challenge),
          rpId: options?.rpId || new URL(this.baseUrl).hostname,
          userVerification: "preferred",
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("WebAuthn authentication failed");
      }

      // Format credential for server
      const webauthnCredential: WebAuthnCredential = {
        id: credential.id,
        rawId: credential.rawId,
        response: credential.response as AuthenticatorAssertionResponse,
        type: credential.type as 'public-key',
      };

      // Verify credential with server
      const verifyResponse = await this.fetch("/api/auth/webauthn/verify", {
        method: "POST",
        body: JSON.stringify({
          credential: {
            id: webauthnCredential.id,
            rawId: Array.from(new Uint8Array(webauthnCredential.rawId)),
            response: {
              authenticatorData: Array.from(new Uint8Array(webauthnCredential.response.authenticatorData)),
              clientDataJSON: Array.from(new Uint8Array(webauthnCredential.response.clientDataJSON)),
              signature: Array.from(new Uint8Array(webauthnCredential.response.signature)),
              userHandle: webauthnCredential.response.userHandle ? 
                Array.from(new Uint8Array(webauthnCredential.response.userHandle)) : null,
            },
            type: webauthnCredential.type,
          },
        }),
        skipAuth: true,
      });

      if (!verifyResponse.ok) {
        throw new Error("WebAuthn verification failed");
      }

      const authResult = await verifyResponse.json();
      if (authResult.accessToken) {
        await this.saveTokenData({
          accessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          expiresAt: authResult.expiresAt ? new Date(authResult.expiresAt).getTime() : undefined,
        });
      }

      return webauthnCredential;
    } catch (error) {
      console.error("WebAuthn authentication failed:", error);
      throw error;
    }
  }

  async fetch(endpoint: string, options: EdgeFetchOptions = {}): Promise<Response> {
    const { skipAuth = false, skipRetry = false, ...fetchOptions } = options;
    
    // Ensure we have the latest settings
    const settings = await chrome.storage.sync.get({ edgeApiUrl: this.baseUrl });
    this.baseUrl = settings.edgeApiUrl;
    
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    // Handle token refresh if needed
    if (!skipAuth && this.tokenData) {
      if (this.isTokenExpired() && this.tokenData.refreshToken) {
        try {
          await this.refreshAccessToken();
        } catch (error) {
          // Token refresh failed, clear tokens and continue without auth
          await this.clearTokenData();
        }
      }

      // Add authentication if available
      if (this.tokenData?.accessToken) {
        headers['Authorization'] = `Bearer ${this.tokenData.accessToken}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include', // Include cookies for session-based auth
      });

      // Handle authentication errors with retry logic
      if (response.status === 401 && !skipRetry && this.tokenData?.refreshToken) {
        try {
          // Try to refresh token and retry request
          await this.refreshAccessToken();
          
          // Retry the request with new token
          const retryHeaders = { ...headers };
          if (this.tokenData?.accessToken) {
            retryHeaders['Authorization'] = `Bearer ${this.tokenData.accessToken}`;
          }
          
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers: retryHeaders,
            credentials: 'include',
          });
          
          if (retryResponse.status !== 401) {
            return retryResponse;
          }
        } catch (refreshError) {
          console.error('Token refresh retry failed:', refreshError);
        }
        
        // If retry failed, clear tokens
        await this.clearTokenData();
        throw new Error('Authentication required');
      } else if (response.status === 401) {
        await this.clearTokenData();
        throw new Error('Authentication required');
      }

      // Extract and save new token data if provided
      const newAccessToken = response.headers.get('X-Access-Token');
      const newRefreshToken = response.headers.get('X-Refresh-Token');
      const expiresAt = response.headers.get('X-Token-Expires-At');
      
      if (newAccessToken) {
        await this.saveTokenData({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || this.tokenData?.refreshToken,
          expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
        });
      }

      return response;
    } catch (error) {
      console.error('Edge fetch error:', error);
      throw error;
    }
  }

  async get(endpoint: string, options?: EdgeFetchOptions): Promise<Response> {
    return this.fetch(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint: string, data?: any, options?: EdgeFetchOptions): Promise<Response> {
    return this.fetch(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any, options?: EdgeFetchOptions): Promise<Response> {
    return this.fetch(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string, options?: EdgeFetchOptions): Promise<Response> {
    return this.fetch(endpoint, { ...options, method: 'DELETE' });
  }

  // Helper method to get JSON response
  async fetchJson<T = any>(endpoint: string, options?: EdgeFetchOptions): Promise<T> {
    const response = await this.fetch(endpoint, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Update base URL (useful when settings change)
  updateBaseUrl(newUrl: string): void {
    this.baseUrl = newUrl;
  }

  // Get current auth status
  isAuthenticated(): boolean {
    return this.tokenData?.accessToken !== null && !this.isTokenExpired();
  }

  // Get current token data (for debugging/advanced usage)
  getTokenData(): TokenData | null {
    return this.tokenData;
  }

  // Manual token update (for external auth flows)
  async updateTokenData(tokenData: TokenData): Promise<void> {
    await this.saveTokenData(tokenData);
  }
}

// Create singleton instance
const edgeFetchClient = new EdgeFetchClient();

// Export the main fetch function
export const edgeFetch = edgeFetchClient.fetch.bind(edgeFetchClient);

// Export additional methods
export const edgeGet = edgeFetchClient.get.bind(edgeFetchClient);
export const edgePost = edgeFetchClient.post.bind(edgeFetchClient);
export const edgePut = edgeFetchClient.put.bind(edgeFetchClient);
export const edgeDelete = edgeFetchClient.delete.bind(edgeFetchClient);
export const edgeFetchJson = edgeFetchClient.fetchJson.bind(edgeFetchClient);

// Export WebAuthn authentication
export const authenticateWithPasskey = edgeFetchClient.authenticateWithPasskey.bind(edgeFetchClient);

// Export client for advanced usage
export { edgeFetchClient };

// Export types for external usage
export type { EdgeFetchOptions, TokenData, WebAuthnCredential };