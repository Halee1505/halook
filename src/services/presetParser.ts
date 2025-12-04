import axios from 'axios';

import type { PresetAdjustment } from '@/src/models/presets';
import {
  deriveAdjustmentsFromSeed,
  mapXmpToAdjustments,
  normalizeAdjustments,
  type XmpBasicSettings,
} from '@/src/engine/presetMath';

const XMP_FIELDS: Record<keyof XmpBasicSettings, string[]> = {
  Exposure2012: ['crs:Exposure2012', 'Exposure2012', 'Exposure'],
  Contrast2012: ['crs:Contrast2012', 'Contrast2012', 'Contrast'],
  Highlights2012: ['crs:Highlights2012', 'Highlights2012', 'Highlights'],
  Shadows2012: ['crs:Shadows2012', 'Shadows2012', 'Shadows'],
  Saturation: ['crs:Saturation', 'Saturation'],
  Vibrance: ['crs:Vibrance', 'Vibrance'],
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

    // Already in our adjustment shape
    if (parsed?.adjustments) {
      return normalizeAdjustments(parsed.adjustments);
    }

    const hasKnownXmpKey = (Object.keys(XMP_FIELDS) as (keyof XmpBasicSettings)[])
      .some((key) => key in parsed);
    if (hasKnownXmpKey) {
      return mapXmpToAdjustments(parsed as XmpBasicSettings);
    }
  } catch {
    // ignore non JSON payload
  }
  return null;
};

const parseKeyValuePreset = (payload: string): PresetAdjustment | null => {
  const xmp: XmpBasicSettings = {};

  const applyIfMatch = (rawKey: string, rawValue: string) => {
    (Object.entries(XMP_FIELDS) as [keyof XmpBasicSettings, string[]][])
      .forEach(([fieldKey, keys]) => {
        if (keys.some((key) => rawKey.includes(key))) {
          const value = Number(rawValue.replace(/"|>/g, ''));
          if (Number.isFinite(value)) {
            xmp[fieldKey] = value;
          }
        }
      });
  };

  const attrRegex = /([a-zA-Z0-9:]+)\s*=\s*"([^"]+)"/g;
  const matches = Array.from(payload.matchAll(attrRegex));

  if (matches.length) {
    matches.forEach((match) => {
      const rawKey = match[1];
      const rawValue = match[2];
      applyIfMatch(rawKey, rawValue);
    });
  } else {
    // Fallback to line-based parsing for non-XML formats
    const lines = payload.split('\n');
    lines.forEach((line) => {
      const [rawKey, rawValue] = line.split('=').map((token) => token.trim());
      if (!rawKey || !rawValue) {
        return;
      }
      applyIfMatch(rawKey, rawValue);
    });
  }

  return Object.keys(xmp).length ? mapXmpToAdjustments(xmp) : null;
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
