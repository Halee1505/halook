import type { AdjustmentKey, EditorAdjustments } from '@/src/models/editor';

export const adjustmentRanges: Record<
  AdjustmentKey,
  { min: number; max: number; step: number }
> = {
  exposure:   { min: -2, max: 2,   step: 0.1 },
  contrast:   { min: 0.5, max: 2,  step: 0.05 },
  highlights: { min: -1, max: 1,   step: 0.05 },
  shadows:    { min: -1, max: 1,   step: 0.05 },
  saturation: { min: 0.2, max: 2,  step: 0.05 },
  vibrance:   { min: -1, max: 1,   step: 0.05 },
};

export const defaultAdjustments: EditorAdjustments = {
  exposure: 0,
  contrast: 1,
  highlights: 0,
  shadows: 0,
  saturation: 1,
  vibrance: 0,
};

export const clampAdjustment = (key: AdjustmentKey, value: number) => {
  const range = adjustmentRanges[key];
  const safeValue = Number.isFinite(value) ? value : defaultAdjustments[key];
  return Math.min(range.max, Math.max(range.min, safeValue));
};

export const normalizeAdjustments = (
  adjustments?: Partial<EditorAdjustments>
): EditorAdjustments => {
  if (!adjustments) {
    return { ...defaultAdjustments };
  }

  return (Object.keys(defaultAdjustments) as AdjustmentKey[]).reduce(
    (acc, key) => {
      const value = adjustments[key];
      acc[key] = clampAdjustment(key, value ?? defaultAdjustments[key]);
      return acc;
    },
    {} as EditorAdjustments
  );
};

export const deriveAdjustmentsFromSeed = (seed: string): EditorAdjustments => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }

  const rangeToValue = (key: AdjustmentKey, offset: number) => {
    const { min, max } = adjustmentRanges[key];
    const normalized = (Math.sin(hash + offset) + 1) / 2; // 0..1
    const raw = min + normalized * (max - min);
    return clampAdjustment(key, raw);
  };

  return {
    exposure:   rangeToValue('exposure',   0.13),
    contrast:   rangeToValue('contrast',   0.35),
    highlights: rangeToValue('highlights', 0.57),
    shadows:    rangeToValue('shadows',    0.79),
    saturation: rangeToValue('saturation', 0.91),
    vibrance:   rangeToValue('vibrance',   1.11),
  };
};

export const buildShaderUniforms = (adjustments: EditorAdjustments) => ({
  uExposure: adjustments.exposure,
  uContrast: adjustments.contrast,
  uHighlights: adjustments.highlights,
  uShadows: adjustments.shadows,
  uSaturation: adjustments.saturation,
  uVibrance: adjustments.vibrance,
});
