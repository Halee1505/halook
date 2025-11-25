import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { usePresetList } from '@/src/hooks/usePresets';
import { useEditorState } from '@/src/hooks/useEditorState';
import type { PresetScope } from '@/src/models/presets';
import { Colors } from '@/constants/theme';

const scopeFilters: { label: string; value: 'all' | PresetScope }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Free', value: 'free' },
  { label: 'Pro', value: 'pro' },
  { label: 'Elite', value: 'elite' },
];

export default function PresetsScreen() {
  const router = useRouter();
  const { presets, loading } = usePresetList();
  const applyPreset = useEditorState((state) => state.applyPreset);
  const [filter, setFilter] = useState<'all' | PresetScope>('all');

  const filteredPresets = useMemo(
    () => presets.filter((preset) => (filter === 'all' ? true : preset.scope === filter)),
    [filter, presets],
  );

  const handleApply = (presetId: string) => {
    const preset = presets.find((item) => item._id === presetId);
    if (preset) {
      applyPreset(preset);
      router.push('/editor');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ gap: 8 }}>
        <Text style={styles.title}>Bộ Preset</Text>
        <Text style={styles.subtitle}>Bộ sưu tập màu Halook. Chạm để áp dụng ngay trên ảnh của bạn.</Text>
      </View>

      <View style={styles.filterRow}>
        {scopeFilters.map((scope) => {
          const isActive = filter === scope.value;
          return (
            <TouchableOpacity
              key={scope.value}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFilter(scope.value)}>
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{scope.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ gap: 16 }}>
        {filteredPresets.map((preset) => (
          <View key={preset._id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Image
                source={preset.previewUrl ? { uri: preset.previewUrl } : require('../assets/images/icon.png')}
                style={styles.cardImage}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{preset.name}</Text>
                <Text style={styles.cardSubtitle}>{preset.scope.toUpperCase()} preset</Text>
              </View>
              <TouchableOpacity style={styles.applyButton} onPress={() => handleApply(preset._id)}>
                <Text style={styles.applyLabel}>Dùng</Text>
              </TouchableOpacity>
            </View>
            {preset.adjustments && (
              <View style={styles.adjustmentsRow}>
                {Object.entries(preset.adjustments).map(([key, value]) => (
                  <View key={key} style={{ alignItems: 'center' }}>
                    <Text style={styles.adjustKey}>{key}</Text>
                    <Text style={styles.adjustValue}>{value.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        {!filteredPresets.length && !loading && (
          <Text style={styles.subtitle}>Không có preset nào trong danh mục này.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const palette = Colors.light;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.text,
  },
  subtitle: {
    color: palette.text,
    opacity: 0.7,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
  },
  filterChipActive: {
    backgroundColor: palette.tint,
    borderColor: palette.tint,
  },
  filterText: {
    color: palette.text,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  card: {
    borderRadius: 28,
    backgroundColor: palette.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 24,
  },
  cardTitle: {
    fontWeight: '700',
    color: palette.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: palette.icon,
  },
  applyButton: {
    backgroundColor: palette.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  applyLabel: {
    color: palette.text,
    fontWeight: '700',
  },
  adjustmentsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  adjustKey: {
    fontSize: 11,
    color: palette.icon,
    textTransform: 'capitalize',
  },
  adjustValue: {
    fontWeight: '700',
    color: palette.text,
  },
});
