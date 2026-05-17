import { create } from 'zustand';
import { Device, DeviceStatus } from './types';

interface DeviceStore {
  devices: Record<string, Device>;
  setDevices: (devices: Device[]) => void;
  updateDevice: (id: string, data: Partial<Device>) => void;
  updateDeviceStatus: (id: string, status: Partial<DeviceStatus>) => void;
  setDeviceOnline: (id: string, online: boolean) => void;
  removeDevice: (id: string) => void;
  getDeviceList: () => Device[];
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  devices: {},

  setDevices: (devices) => {
    const map: Record<string, Device> = {};
    devices.forEach((d) => {
      map[d.id] = d;
    });
    set({ devices: map });
  },

  updateDevice: (id, data) => {
    set((state) => ({
      devices: {
        ...state.devices,
        [id]: { ...state.devices[id], ...data },
      },
    }));
  },

  updateDeviceStatus: (id, status) => {
    set((state) => {
      const device = state.devices[id];
      if (!device) return state;
      return {
        devices: {
          ...state.devices,
          [id]: {
            ...device,
            status: { ...device.status, ...status } as DeviceStatus,
          },
        },
      };
    });
  },

  setDeviceOnline: (id, online) => {
    set((state) => {
      const device = state.devices[id];
      if (!device) return state;
      return {
        devices: {
          ...state.devices,
          [id]: {
            ...device,
            is_online: online,
            last_seen: online ? new Date().toISOString() : device.last_seen,
          },
        },
      };
    });
  },

  removeDevice: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.devices;
      return { devices: rest };
    });
  },

  getDeviceList: () => {
    return Object.values(get().devices).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
}));
