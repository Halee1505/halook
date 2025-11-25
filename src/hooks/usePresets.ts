import { useEffect } from 'react';
import { create } from 'zustand';

import type { Preset } from '@/src/models/presets';
import { fetchPresets } from '@/src/api/presetsApi';

interface PresetStoreState {
  presets: Preset[];
  loading: boolean;
  error?: string;
  lastFetched?: number;
  loadPresets: (force?: boolean) => Promise<void>;
}

export const usePresetStore = create<PresetStoreState>((set) => ({
  presets: [],
  loading: false,
  error: undefined,
  loadPresets: async (force) => {
    set({ loading: true, error: undefined });
    try {
      const data = await fetchPresets(force);
      set({ presets: data, loading: false, lastFetched: Date.now() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load presets', loading: false });
    }
  },
}));

export const usePresetList = () => {
  const presets = usePresetStore((state) => state.presets);
  const loading = usePresetStore((state) => state.loading);
  const error = usePresetStore((state) => state.error);
  const loadPresets = usePresetStore((state) => state.loadPresets);

  useEffect(() => {
    if (!presets.length && !loading) {
      loadPresets();
    }
  }, [presets.length, loading, loadPresets]);

  return { presets, loading, error, reload: () => loadPresets(true) };
};

export const usePreset = (presetId?: string) =>
  usePresetStore((state) => state.presets.find((preset) => preset._id === presetId));
