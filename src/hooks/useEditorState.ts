import { create } from 'zustand';

import type { EditorStore } from '@/src/models/editor';
import type { Preset, PresetAdjustment } from '@/src/models/presets';
import { defaultAdjustments, normalizeAdjustments, clampAdjustment } from '@/src/engine/presetMath';

const normalizePreset = (preset?: Preset, adjustments?: PresetAdjustment) => {
  if (adjustments) {
    return normalizeAdjustments(adjustments);
  }

  if (preset?.adjustments) {
    return normalizeAdjustments(preset.adjustments);
  }

  return { ...defaultAdjustments };
};

export const useEditorState = create<EditorStore>((set, get) => ({
  imageUri: null,
  backgroundSource: null,
  preset: undefined,
  adjustments: { ...defaultAdjustments },
  cropAspectRatio: null,
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
    }),
  setBackgroundSource: (source) => set({ backgroundSource: source }),
  setCropAspectRatio: (ratio) => set({ cropAspectRatio: ratio }),
}));

export const useEditorImage = () => useEditorState((state) => state.imageUri);
export const useEditorAdjustments = () => useEditorState((state) => state.adjustments);
export const useEditorPreset = () => useEditorState((state) => state.preset);
export const useEditorBackground = () => useEditorState((state) => state.backgroundSource);
export const useEditorCropAspect = () => useEditorState((state) => state.cropAspectRatio);
