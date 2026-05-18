import { ApiResponse, AuthTokens, CreateDeviceResult, Device, DeviceStatus, CommandLog, Group } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Get stored auth tokens from localStorage.
 */
function getTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('mdm_tokens');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save auth tokens to localStorage.
 */
export function saveTokens(tokens: AuthTokens) {
  localStorage.setItem('mdm_tokens', JSON.stringify(tokens));
}

/**
 * Clear auth tokens.
 */
export function clearTokens() {
  localStorage.removeItem('mdm_tokens');
}

/**
 * Get the current access token.
 */
export function getAccessToken(): string | null {
  return getTokens()?.access_token ?? null;
}

/**
 * Authenticated fetch wrapper with automated token refresh.
 */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  let token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized (except for the refresh call itself)
  if (res.status === 401 && !path.includes('/api/auth/refresh')) {
    const refreshRes = await refreshToken();
    
    if (refreshRes.success && refreshRes.data) {
      // Retry the original request with the new token
      const newToken = refreshRes.data.access_token;
      headers['Authorization'] = `Bearer ${newToken}`;
      
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
    } else {
      // Refresh failed, clear tokens and redirect to login
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return { success: false, error: 'Session expired' };
    }
  }

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || 'Request failed' };
  }

  return data as ApiResponse<T>;
}

// ── Auth ───────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<ApiResponse<AuthTokens>> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (data.success && data.data) {
    saveTokens(data.data);
  }
  return data;
}

export async function checkSetupStatus(): Promise<ApiResponse<{ requires_setup: boolean }>> {
  const res = await fetch(`${API_BASE}/api/auth/setup-status`);
  return res.json();
}

export async function setupAdmin(username: string, password: string): Promise<ApiResponse<AuthTokens>> {
  const res = await fetch(`${API_BASE}/api/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.success && data.data) {
    saveTokens(data.data);
  }
  return data;
}

export async function refreshToken(): Promise<ApiResponse<AuthTokens>> {
  const tokens = getTokens();
  if (!tokens?.refresh_token) {
    return { success: false, error: 'No refresh token' };
  }

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });

  const data = await res.json();
  if (data.success && data.data) {
    saveTokens(data.data);
  }
  return data;
}

// ── Devices ────────────────────────────────────────────────

export async function getDevices(): Promise<ApiResponse<Device[]>> {
  return apiFetch<Device[]>('/api/devices');
}

export async function getDevice(id: string): Promise<ApiResponse<Device & { status?: DeviceStatus }>> {
  return apiFetch(`/api/devices/${id}`);
}

export async function createDevice(deviceName: string): Promise<ApiResponse<CreateDeviceResult>> {
  return apiFetch<CreateDeviceResult>('/api/devices', {
    method: 'POST',
    body: JSON.stringify({ device_name: deviceName }),
  });
}

export async function deleteDevice(id: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/devices/${id}`, { method: 'DELETE' });
}

export async function updateDevice(
  id: string,
  deviceName: string,
  label?: string,
  notes?: string,
  groupId?: string
): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/devices/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ device_name: deviceName, label, notes, group_id: groupId }),
  });
}

// ── Groups ─────────────────────────────────────────────────

export async function getGroups(): Promise<ApiResponse<Group[]>> {
  return apiFetch<Group[]>('/api/groups');
}

export async function createGroup(name: string): Promise<ApiResponse<Group>> {
  return apiFetch<Group>('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteGroup(id: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/groups/${id}`, { method: 'DELETE' });
}

// ── Status ─────────────────────────────────────────────────

export async function getDeviceStatus(id: string): Promise<ApiResponse<DeviceStatus>> {
  return apiFetch<DeviceStatus>(`/api/devices/${id}/status`);
}

// ── Commands ───────────────────────────────────────────────

export async function sendCommand(
  deviceId: string,
  commandType: string,
  payload?: any
): Promise<ApiResponse<CommandLog>> {
  return apiFetch<CommandLog>(`/api/devices/${deviceId}/commands`, {
    method: 'POST',
    body: JSON.stringify({ command_type: commandType, payload }),
  });
}

export async function getCommandHistory(
  deviceId: string,
  limit = 50
): Promise<ApiResponse<CommandLog[]>> {
  return apiFetch<CommandLog[]>(`/api/devices/${deviceId}/commands?limit=${limit}`);
}

export async function sendGroupCommand(
  groupId: string,
  commandType: string,
  payload?: any
): Promise<ApiResponse<{ total: number; sent: number }>> {
  return apiFetch<{ total: number; sent: number }>(`/api/groups/${groupId}/commands`, {
    method: 'POST',
    body: JSON.stringify({ command_type: commandType, payload }),
  });
}
