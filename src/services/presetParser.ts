import axios from 'axios';

import type { PresetAdjustment } from '@/src/models/presets';
import { deriveAdjustmentsFromSeed, normalizeAdjustments } from '@/src/engine/presetMath';

const XMP_KEYS: Record<keyof PresetAdjustment, string[]> = {
  exposure: ['crs:Exposure2012', 'Exposure'],
  contrast: ['crs:Contrast2012', 'Contrast'],
  highlights: ['crs:Highlights2012', 'Highlights'],
  shadows: ['crs:Shadows2012', 'Shadows'],
  saturation: ['crs:Saturation', 'Saturation'],
  vibrance: ['crs:Vibrance', 'Vibrance'],
};

export const fetchPresetPayload = async (fileUrl?: string): Promise<string | null> => {
  if (!fileUrl) {
    return null;
  }

  try {
    const response = await axios.get<string>(fileUrl);
    return response.data ?? null;
  } catch {
    return null;
  }
};

const parseJsonPreset = (payload: string): PresetAdjustment | null => {
  try {
    const parsed = JSON.parse(payload);
    if (parsed?.adjustments) {
      return normalizeAdjustments(parsed.adjustments);
    }

    const hasDirectKeys = Object.keys(XMP_KEYS).every((key) => key in parsed);
    if (hasDirectKeys) {
      return normalizeAdjustments(parsed as PresetAdjustment);
    }
  } catch {
    // ignore non JSON payload
  }
  return null;
};

const parseKeyValuePreset = (payload: string): Partial<PresetAdjustment> | null => {
  const lines = payload.split('\n');
  const adjustments: Partial<PresetAdjustment> = {};

  lines.forEach((line) => {
    const [rawKey, rawValue] = line.split('=').map((token) => token.trim());
    if (!rawKey || !rawValue) {
      return;
    }

    Object.entries(XMP_KEYS).forEach(([adjustmentKey, keys]) => {
      if (keys.some((key) => rawKey.includes(key))) {
        const value = Number(rawValue.replace(/"|>/g, ''));
        if (Number.isFinite(value)) {
          (adjustments as Record<string, number>)[adjustmentKey] = value;
        }
      }
    });
  });

  return Object.keys(adjustments).length ? adjustments : null;
};

export const parsePresetPayload = (payload: string, fallbackSeed = ''): PresetAdjustment => {
  const fromJson = parseJsonPreset(payload);
  if (fromJson) {
    return fromJson;
  }

  const fromKeyValue = parseKeyValuePreset(payload);
  if (fromKeyValue) {
    return normalizeAdjustments(fromKeyValue);
  }

  return deriveAdjustmentsFromSeed(fallbackSeed);
};

export const loadPresetAdjustments = async (fileUrl?: string, fallbackSeed = '') => {
  const payload = await fetchPresetPayload(fileUrl);
  if (!payload) {
    return deriveAdjustmentsFromSeed(fallbackSeed);
  }

  return parsePresetPayload(payload, fallbackSeed);
};
