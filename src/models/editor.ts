import type { ImageSourcePropType } from 'react-native';

import type { Preset, PresetAdjustment } from '@/src/models/presets';

export const adjustmentKeys = [
  'exposure',
  'contrast',
  'highlights',
  'shadows',
  'saturation',
  'vibrance',
  'temperature',
  'tint',
  'mixerHue',
  'mixerSaturation',
  'mixerLuminance',
  'gradingShadows',
  'gradingMidtones',
  'gradingHighlights',
] as const;

export type AdjustmentKey = (typeof adjustmentKeys)[number];

export type EditorAdjustments = Record<AdjustmentKey, number>;

export type CropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export interface EditorStateShape {
  imageUri: string | null;
  backgroundSource: ImageSourcePropType | null;
  preset?: Preset;
  adjustments: EditorAdjustments;
  cropAspectRatio: number | null;
  cropModeId: string;
  presetIntensity: number;
  cropRectNormalized: CropRect;
}

export interface EditorStateActions {
  setImageUri: (uri: string | null) => void;
  applyPreset: (preset?: Preset, adjustments?: PresetAdjustment) => void;
  updateAdjustment: (key: AdjustmentKey, value: number) => void;
  resetAdjustments: () => void;
  setBackgroundSource: (source: ImageSourcePropType | null) => void;
  setCropAspectRatio: (ratio: number | null, modeId?: string) => void;
  setPresetIntensity: (value: number) => void;
  setCropRectNormalized: (rect: CropRect) => void;
  resetCrop: () => void;
  updateCropByDelta: (
    delta: Partial<CropRect>,
    anchor?: "tl" | "tr" | "bl" | "br" | "l" | "r" | "t" | "b" | "move"
  ) => void;
  setCropState: (rect: CropRect, aspectRatio: number | null, modeId: string) => void;
}

export type EditorStore = EditorStateShape & EditorStateActions;
