import axios from 'axios';

import type { GetPresetsResponse, Preset } from '@/src/models/presets';
import { loadPresetAdjustments } from '@/src/services/presetParser';

const PRESETS_ENDPOINT = 'https://halook-dashboard.vercel.app/api/client/presets';

let cachedPresets: Preset[] | null = null;
let inflightPromise: Promise<Preset[]> | null = null;

const hydratePresets = async (presets: Preset[]) =>
  Promise.all(
    presets.map(async (preset) => {
      if (preset.adjustments) {
        return preset;
      }

      const adjustments = await loadPresetAdjustments(preset.fileUrl, preset._id);
      return { ...preset, adjustments };
    }),
  );

export const fetchPresets = async (force = false): Promise<Preset[]> => {
  if (!force && cachedPresets) {
    return cachedPresets;
  }

  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = axios
    .get<GetPresetsResponse>(PRESETS_ENDPOINT)
    .then((response) => response.data.data ?? [])
    .then(hydratePresets)
    .then((presets) => {
      cachedPresets = presets;
      inflightPromise = null;
      return presets;
    })
    .catch((error) => {
      inflightPromise = null;
      throw error;
    });

  return inflightPromise;
};
