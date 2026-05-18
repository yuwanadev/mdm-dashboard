export interface Device {
  id: string;
  device_name: string;
  label?: string;
  notes?: string;
  group_id?: string;
  device_model?: string;
  android_version?: string;
  agent_version?: string;
  is_online: boolean;
  last_seen?: string;
  created_at: string;
  status?: DeviceStatus;
}

export interface Group {
  id: string;
  name: string;
  created_at: string;
}

export interface APK {
  id: string;
  package_name: string;
  version_name: string;
  version_code: number;
  file_path: string;
  file_size: number;
  created_at: string;
}

export interface DeviceStatus {
  device_id: string;
  battery?: number;
  temperature?: number;
  battery_health?: string;
  battery_status?: string;
  battery_technology?: string;
  battery_voltage?: number;
  ram_usage?: number;
  storage_total?: number;
  storage_used?: number;
  app_version?: string;
  network_info?: {
    ip?: string;
    type?: string;
    ssid?: string;
  };
  foreground_app?: string;
  network_strength?: number;
  location?: { lat: number; lon: number; acc: number };
  updated_at: string;
}

export interface CommandLog {
  id: string;
  device_id: string;
  command_type: string;
  payload?: any;
  status: "PENDING" | "SENT" | "SUCCESS" | "FAILED" | "TIMEOUT";
  message?: string;
  result?: any;
  created_at: string;
  completed_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateDeviceResult {
  device: Device;
  token: string;
  server_url: string;
}

export interface WSMessage {
  type: string;
  device_id?: string;
  payload?: any;
  timestamp: string;
}
