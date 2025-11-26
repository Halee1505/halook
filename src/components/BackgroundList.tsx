import type { ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BACKGROUND_OVERLAYS } from '@/src/services/imageLoader';
import { Colors } from '@/constants/theme';

type Props = {
  selected?: ImageSourcePropType | null;
  onSelect: (source: ImageSourcePropType | null) => void;
};

export const BackgroundList = ({ selected, onSelect }: Props) => (
  <View style={styles.container}>
    <Text style={styles.heading}>Editor background</Text>
    <View style={styles.grid}>
      <Pressable onPress={() => onSelect(null)}>
        <View style={[styles.item, !selected && styles.itemSelected]}>
          <Text style={styles.noneLabel}>None</Text>
        </View>
      </Pressable>
      {BACKGROUND_OVERLAYS.map((source, index) => {
        const isSelected = selected === source;
        return (
          <Pressable key={`bg-${index}`} onPress={() => onSelect(source)}>
            <View style={[styles.preview, isSelected && styles.previewSelected]}>
              <Image source={source} style={styles.previewImage} />
            </View>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const palette = Colors.light;

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  heading: {
    fontWeight: '700',
    color: palette.text,
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  item: {
    width: 80,
    height: 80,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  itemSelected: {
    borderColor: palette.tint,
    backgroundColor: palette.background,
  },
  noneLabel: {
    color: palette.text,
    fontWeight: '600',
  },
  preview: {
    width: 80,
    height: 80,
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: palette.border,
  },
  previewSelected: {
    borderColor: palette.tint,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
});
