import axios from 'axios';

import type {
  GetPresetsResponse,
  Preset,
  PresetCategoryGroup,
} from '@/src/models/presets';
import { loadPresetAdjustments } from '@/src/services/presetParser';

const PRESETS_ENDPOINT = 'https://halook-dashboard.vercel.app/api/client/presets';

let cachedPresets: Preset[] | null = null;
let inflightPromise: Promise<Preset[]> | null = null;

const flattenPresetGroups = (groups: PresetCategoryGroup[] = []): Preset[] =>
  groups.flatMap((group) =>
    (group.presets ?? []).map((preset) => ({
      ...preset,
      category: group.category ?? null,
    })),
  );

const hydratePresets = async (presets: Preset[]) =>
  Promise.all(
    presets.map(async (preset) => {
      // Always prefer the source file (XMP/JSON) so presets stay in sync with Lightroom
      if (preset.fileUrl) {
        const adjustments = await loadPresetAdjustments(preset.fileUrl, preset._id);
        return { ...preset, adjustments };
      }

      if (preset.adjustments) {
        return { ...preset, adjustments: preset.adjustments };
      }

      const adjustments = await loadPresetAdjustments(undefined, preset._id);
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
    .then((response) => flattenPresetGroups(response.data.data ?? []))
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
