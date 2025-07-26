import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Popup } from '../Popup';

// Mock the useEdgeSession hook
const mockUseEdgeSession = vi.fn();
vi.mock('../../shared/useEdgeSession', () => ({
  useEdgeSession: () => mockUseEdgeSession(),
}));

describe('Popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    mockUseEdgeSession.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<Popup />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show login button when unauthenticated', async () => {
    const mockLogin = vi.fn();
    
    mockUseEdgeSession.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: mockLogin,
      logout: vi.fn(),
      refresh: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText('Please log in to continue')).toBeInTheDocument();
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    // Click login button
    const loginButton = screen.getByText('Login');
    loginButton.click();

    expect(mockLogin).toHaveBeenCalled();
  });

  it('should show user info when authenticated', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    };
    
    const mockLogout = vi.fn();

    mockUseEdgeSession.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: mockLogout,
      refresh: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText('Welcome back, Test User!')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    // Click logout button
    const logoutButton = screen.getByText('Logout');
    logoutButton.click();

    expect(mockLogout).toHaveBeenCalled();
  });

  it('should show user info without name when name is not provided', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
    };

    mockUseEdgeSession.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('should display error messages', async () => {
    const errorMessage = 'Authentication failed';

    mockUseEdgeSession.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: errorMessage,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('should handle login errors gracefully', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Login failed'));
    
    // Mock console.error to avoid test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockUseEdgeSession.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: mockLogin,
      logout: vi.fn(),
      refresh: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<Popup />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Login failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle logout errors gracefully', async () => {
    const mockLogout = vi.fn().mockRejectedValue(new Error('Logout failed'));
    
    // Mock console.error to avoid test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockUseEdgeSession.mockReturnValue({
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: mockLogout,
      refresh: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<Popup />);

    const logoutButton = screen.getByText('Logout');
    logoutButton.click();

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Logout failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should have correct CSS classes applied', async () => {
    mockUseEdgeSession.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<Popup />);

    const container = document.querySelector('.popup-container');
    const header = document.querySelector('.popup-header');
    const content = document.querySelector('.popup-content');

    expect(container).toBeInTheDocument();
    expect(header).toBeInTheDocument();
    expect(content).toBeInTheDocument();
  });
});