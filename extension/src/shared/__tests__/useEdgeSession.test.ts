import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEdgeSession } from '../useEdgeSession';
import { mockChrome } from '../../test/setup';
import { mockAuthenticatedState, mockUnauthenticatedState } from '../../test/mocks/edge-fetch';

describe('useEdgeSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useEdgeSession());
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should load authenticated session', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    mockAuthenticatedState(mockUser);
    
    // Mock cached session
    mockChrome.storage.sync.get.mockResolvedValue({
      edgeSession: {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
    });

    const { result } = renderHook(() => useEdgeSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBe(null);
  });

  it('should handle unauthenticated state', async () => {
    mockUnauthenticatedState();
    mockChrome.storage.sync.get.mockResolvedValue({});

    const { result } = renderHook(() => useEdgeSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
  });

  it('should handle login in extension environment', async () => {
    const { result } = renderHook(() => useEdgeSession());

    await act(async () => {
      await result.current.login();
    });

    // Should open a new tab for authentication
    expect(mockChrome.tabs.create).toHaveBeenCalledWith({
      url: expect.stringContaining('/login'),
    });
  });

  it('should handle logout', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    mockAuthenticatedState(mockUser);

    const { result } = renderHook(() => useEdgeSession());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(mockChrome.storage.sync.remove).toHaveBeenCalledWith('edgeSession');
  });

  it('should update user data optimistically', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    mockAuthenticatedState(mockUser);
    
    mockChrome.storage.sync.get.mockResolvedValue({
      edgeSession: {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
    });

    const { result } = renderHook(() => useEdgeSession());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    const updatedData = { name: 'Updated Name' };

    await act(async () => {
      result.current.updateUser(updatedData);
    });

    expect(result.current.user).toEqual({
      ...mockUser,
      ...updatedData,
    });

    expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
      edgeSession: expect.objectContaining({
        user: expect.objectContaining(updatedData),
      }),
    });
  });

  it('should handle session refresh', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    mockAuthenticatedState(mockUser);

    const { result } = renderHook(() => useEdgeSession());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockChrome.storage.sync.get.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useEdgeSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should listen for storage changes', async () => {
    const { result } = renderHook(() => useEdgeSession());
    
    expect(mockChrome.storage.onChanged.addListener).toHaveBeenCalled();
    
    // Simulate storage change
    const listener = mockChrome.storage.onChanged.addListener.mock.calls[0][0];
    const mockSession = {
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };

    act(() => {
      listener({ edgeSession: mockSession });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockSession.user);
  });
});