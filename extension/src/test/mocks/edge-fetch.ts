import { vi } from 'vitest';
import type { TokenData } from '../../shared/edge-fetch';

// Mock implementation of EdgeFetchClient
export const mockEdgeFetchClient = {
  fetch: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  fetchJson: vi.fn(),
  authenticateWithPasskey: vi.fn(),
  isAuthenticated: vi.fn().mockReturnValue(false),
  getTokenData: vi.fn().mockReturnValue(null),
  updateTokenData: vi.fn(),
  updateBaseUrl: vi.fn(),
};

// Mock edge-fetch module
vi.mock('../../shared/edge-fetch', () => ({
  edgeFetch: mockEdgeFetchClient.fetch,
  edgeGet: mockEdgeFetchClient.get,
  edgePost: mockEdgeFetchClient.post,
  edgePut: mockEdgeFetchClient.put,
  edgeDelete: mockEdgeFetchClient.delete,
  edgeFetchJson: mockEdgeFetchClient.fetchJson,
  authenticateWithPasskey: mockEdgeFetchClient.authenticateWithPasskey,
  edgeFetchClient: mockEdgeFetchClient,
}));

// Helper functions for tests
export const mockAuthenticatedState = (user: any = { id: '1', email: 'test@example.com' }) => {
  mockEdgeFetchClient.isAuthenticated.mockReturnValue(true);
  mockEdgeFetchClient.fetch.mockResolvedValue(
    new Response(JSON.stringify(user), { status: 200 })
  );
  mockEdgeFetchClient.fetchJson.mockResolvedValue(user);
};

export const mockUnauthenticatedState = () => {
  mockEdgeFetchClient.isAuthenticated.mockReturnValue(false);
  mockEdgeFetchClient.fetch.mockResolvedValue(
    new Response('Unauthorized', { status: 401 })
  );
  mockEdgeFetchClient.fetchJson.mockRejectedValue(new Error('Unauthorized'));
};

export const mockTokenData = (tokenData: Partial<TokenData> = {}) => {
  const defaultTokenData: TokenData = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + 3600000, // 1 hour from now
    ...tokenData,
  };
  
  mockEdgeFetchClient.getTokenData.mockReturnValue(defaultTokenData);
  return defaultTokenData;
};

export { mockEdgeFetchClient as default };