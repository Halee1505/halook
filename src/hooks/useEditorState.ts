import { create } from "zustand";

import {
  buildEditorAdjustmentsFromPreset,
  clampAdjustment,
  defaultAdjustments,
} from "@/src/engine/presetMath";
import { CROP_OPTIONS } from "@/src/constants/cropOptions";
import type { EditorStore } from "@/src/models/editor";
import type { Preset, PresetAdjustment } from "@/src/models/presets";

const normalizePreset = (preset?: Preset, adjustments?: PresetAdjustment) => {
  const presetAdjustments = adjustments ?? preset?.adjustments;
  if (presetAdjustments) {
    return buildEditorAdjustmentsFromPreset(presetAdjustments);
  }

  return { ...defaultAdjustments };
};

export const useEditorState = create<EditorStore>((set, get) => ({
  imageUri: null,
  backgroundSource: null,
  preset: undefined,
  adjustments: { ...defaultAdjustments },
  cropAspectRatio: null,
  cropModeId: CROP_OPTIONS[0].id,
  presetIntensity: 1,
  setImageUri: (uri) => set({ imageUri: uri }),
  applyPreset: (preset, adjustments) => {
    set({
      preset,
      adjustments: normalizePreset(preset, adjustments),
    });
  },
  updateAdjustment: (key, value) =>
    set({
      adjustments: {
        ...get().adjustments,
        [key]: clampAdjustment(key, value),
      },
    }),
  resetAdjustments: () =>
    set({
      adjustments: { ...defaultAdjustments },
      preset: undefined,
      backgroundSource: null,
      presetIntensity: 1,
    }),
  setBackgroundSource: (source) => set({ backgroundSource: source }),
  setCropAspectRatio: (ratio, modeId) =>
    set((state) => {
      if (modeId) {
        return { cropAspectRatio: ratio, cropModeId: modeId };
      }
      if (typeof ratio === "number") {
        const match = CROP_OPTIONS.find((option) => option.ratio === ratio);
        return {
          cropAspectRatio: ratio,
          cropModeId: match?.id ?? state.cropModeId,
        };
      }
      return { cropAspectRatio: null };
    }),
  setPresetIntensity: (value) =>
    set({
      presetIntensity: Math.min(1, Math.max(0, value)),
    }),
}));

export const useEditorImage = () => useEditorState((state) => state.imageUri);
export const useEditorAdjustments = () =>
  useEditorState((state) => state.adjustments);
export const useEditorPreset = () => useEditorState((state) => state.preset);
export const useEditorBackground = () =>
  useEditorState((state) => state.backgroundSource);
export const useEditorCropAspect = () =>
  useEditorState((state) => state.cropAspectRatio);
export const usePresetIntensity = () =>
  useEditorState((state) => state.presetIntensity);
