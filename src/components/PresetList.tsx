import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import type { Preset } from '@/src/models/presets';
import { usePresetList } from '@/src/hooks/usePresets';
import { Colors } from '@/constants/theme';

type Props = {
  selectedId?: string;
  onSelect: (preset: Preset) => void;
  title?: string;
};

const cardWidth = 140;

export const PresetList = ({ selectedId, onSelect, title = 'Presets' }: Props) => {
  const { presets, loading, error, reload } = usePresetList();

  const content = useMemo(() => {
    if (loading && !presets.length) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={palette.tint} />
          <Text style={styles.infoText}>Đang tải preset...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.infoText}>Không thể tải preset. {error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={reload}>
            <Text style={styles.primaryLabel}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
        {presets.map((preset) => {
          const isSelected = preset._id === selectedId;
          return (
            <TouchableOpacity key={preset._id} onPress={() => onSelect(preset)}>
              <View style={[styles.card, isSelected ? styles.cardSelected : undefined]}>
                <Image
                  source={
                    preset.previewUrl ? { uri: preset.previewUrl } : require('../../assets/images/icon.png')
                  }
                  style={styles.cardImage}
                />
                <Text style={styles.cardTitle}>{preset.name}</Text>
                <Text style={styles.cardSubtitle}>{preset.scope.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }, [error, loading, onSelect, presets, reload, selectedId]);

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{presets.length} preset</Text>
      </View>
      {content}
    </View>
  );
};

const palette = Colors.light;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  headerSubtitle: {
    color: palette.text,
    opacity: 0.6,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  infoText: {
    color: palette.text,
    marginTop: 8,
  },
  errorCard: {
    backgroundColor: palette.background,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  primaryButton: {
    backgroundColor: palette.tint,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    width: cardWidth,
    borderRadius: 24,
    backgroundColor: '#fff',
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardSelected: {
    borderColor: palette.tint,
    shadowColor: palette.tint,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  cardImage: {
    width: '100%',
    height: 90,
    borderRadius: 20,
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: '600',
    color: palette.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: palette.icon,
  },
});
