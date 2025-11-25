export type PresetScope = 'free' | 'pro' | 'elite';

export interface PresetAdjustment {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturation: number;
  vibrance: number;
}

export interface Preset {
  _id: string;
  name: string;
  previewUrl?: string;
  fileUrl?: string;
  scope: PresetScope;
  createdAt: string;
  updatedAt: string;
  adjustments?: PresetAdjustment;
}

export interface GetPresetsResponse {
  data: Preset[];
  error: string | null;
}
