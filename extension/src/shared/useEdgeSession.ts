import { useState, useEffect, useCallback } from "react";
import { edgeFetch, edgeFetchJson } from "./edge-fetch";

interface User {
  id: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

interface EdgeSession {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseEdgeSessionReturn extends EdgeSession {
  login: (credentials?: any) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

// Platform detection
const isExtension = typeof chrome !== "undefined" && chrome.storage;
const isWeb = typeof window !== "undefined" && !isExtension;

// Storage abstraction for cross-platform compatibility
class SessionStorage {
  async get(key: string): Promise<any> {
    if (isExtension) {
      const result = await chrome.storage.sync.get(key);
      return result[key];
    } else if (isWeb) {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
    return null;
  }

  async set(key: string, value: any): Promise<void> {
    if (isExtension) {
      await chrome.storage.sync.set({ [key]: value });
    } else if (isWeb) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  async remove(key: string): Promise<void> {
    if (isExtension) {
      await chrome.storage.sync.remove(key);
    } else if (isWeb) {
      localStorage.removeItem(key);
    }
  }

  // Listen for storage changes across the platform
  onChange(callback: (changes: { [key: string]: any }) => void): () => void {
    if (isExtension) {
      const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
        const formattedChanges: { [key: string]: any } = {};
        Object.keys(changes).forEach(key => {
          formattedChanges[key] = changes[key].newValue;
        });
        callback(formattedChanges);
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    } else if (isWeb) {
      const listener = (event: StorageEvent) => {
        if (event.key) {
          callback({ [event.key]: event.newValue ? JSON.parse(event.newValue) : null });
        }
      };
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    }
    return () => {};
  }
}

const sessionStorage = new SessionStorage();

export function useEdgeSession(): UseEdgeSessionReturn {
  const [session, setSession] = useState<EdgeSession>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Load session from storage and validate
  const loadSession = useCallback(async () => {
    try {
      setSession(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Try to get cached session first
      const cachedSession = await sessionStorage.get("edgeSession");
      if (cachedSession?.user) {
        setSession(prev => ({
          ...prev,
          user: cachedSession.user,
          isAuthenticated: true,
          isLoading: false,
        }));
      }

      // Validate session with server
      const response = await edgeFetch("/api/auth/session");
      
      if (response.ok) {
        const userData = await response.json();
        const newSession = {
          user: userData,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        };
        
        setSession(newSession);
        await sessionStorage.set("edgeSession", newSession);
      } else {
        // Session invalid, clear local state
        await clearSession();
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      setSession(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Session load failed",
      }));
    }
  }, []);

  // Clear session from all storage
  const clearSession = useCallback(async () => {
    setSession({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    await sessionStorage.remove("edgeSession");
    await sessionStorage.remove("authToken");
  }, []);

  // Login function with platform-specific handling
  const login = useCallback(async (credentials?: any) => {
    try {
      setSession(prev => ({ ...prev, isLoading: true, error: null }));

      if (isExtension) {
        // Extension-specific login: open web app login page
        const edgeUrl = process.env.VITE_EDGE_API_URL || "http://localhost:8787";
        chrome.tabs.create({ url: `${edgeUrl}/login` });
        
        // Listen for successful login from web app
        const cleanup = sessionStorage.onChange((changes) => {
          if (changes.edgeSession?.isAuthenticated) {
            setSession(changes.edgeSession);
            cleanup();
          }
        });
        
        return;
      } else {
        // Web app login
        const response = await edgeFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });

        if (response.ok) {
          const userData = await response.json();
          const newSession = {
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          };
          
          setSession(newSession);
          await sessionStorage.set("edgeSession", newSession);
        } else {
          throw new Error("Login failed");
        }
      }
    } catch (error) {
      setSession(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
      }));
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setSession(prev => ({ ...prev, isLoading: true }));
      
      // Call server logout endpoint
      await edgeFetch("/api/auth/logout", { method: "POST" });
      
      // Clear local session
      await clearSession();
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local session even if server call fails
      await clearSession();
    }
  }, [clearSession]);

  // Refresh session data
  const refresh = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  // Update user data optimistically
  const updateUser = useCallback(async (userData: Partial<User>) => {
    if (!session.user) return;
    
    const updatedUser = { ...session.user, ...userData };
    const newSession = {
      ...session,
      user: updatedUser,
    };
    
    setSession(newSession);
    await sessionStorage.set("edgeSession", newSession);
  }, [session]);

  // Initialize session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Listen for session changes across tabs/contexts
  useEffect(() => {
    const cleanup = sessionStorage.onChange((changes) => {
      if (changes.edgeSession) {
        setSession(changes.edgeSession);
      }
    });

    return cleanup;
  }, []);

  // Extension-specific: Listen for tab updates to detect login completion
  useEffect(() => {
    if (isExtension && !session.isAuthenticated) {
      const handleTabUpdate = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (changeInfo.status === "complete" && changeInfo.url?.includes("/login-success")) {
          // Login completed, refresh session
          loadSession();
        }
      };

      chrome.tabs?.onUpdated?.addListener(handleTabUpdate);
      return () => chrome.tabs?.onUpdated?.removeListener(handleTabUpdate);
    }
  }, [session.isAuthenticated, loadSession]);

  return {
    user: session.user,
    isAuthenticated: session.isAuthenticated,
    isLoading: session.isLoading,
    error: session.error,
    login,
    logout,
    refresh,
    updateUser,
  };
}