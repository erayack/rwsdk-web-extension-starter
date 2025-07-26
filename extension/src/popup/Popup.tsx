import React from "react";
import { useEdgeSession } from "../shared/useEdgeSession";

export const Popup: React.FC = () => {
  const { user, isAuthenticated, isLoading, error, login, logout } = useEdgeSession();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h1>RedwoodSDK Extension</h1>
      </div>
      
      <div className="popup-content">
        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
          </div>
        )}
        
        {isAuthenticated ? (
          <div className="authenticated-state">
            <div className="user-info">
              <p>Welcome back{user?.name ? `, ${user.name}` : ''}!</p>
              {user?.email && <p className="user-email">{user.email}</p>}
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        ) : (
          <div className="unauthenticated-state">
            <p>Please log in to continue</p>
            <button onClick={handleLogin} className="btn btn-primary">
              Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};