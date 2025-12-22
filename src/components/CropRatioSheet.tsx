import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { CROP_OPTIONS, type CropOption } from '@/src/constants/cropOptions';

type Props = {
  visible: boolean;
  selectedId?: string;
  onClose: () => void;
  onApply: (option: CropOption) => void;
};

export const CropRatioSheet = ({
  visible,
  selectedId = CROP_OPTIONS[0].id,
  onClose,
  onApply,
}: Props) => {
  const [pendingId, setPendingId] = useState(selectedId);

  useEffect(() => {
    setPendingId(selectedId);
  }, [selectedId, visible]);

  const handleApply = () => {
    const next = CROP_OPTIONS.find((option) => option.id === pendingId) ?? CROP_OPTIONS[0];
    onApply(next);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Crop Ratio</Text>
            <TouchableOpacity style={styles.resetButton} onPress={() => setPendingId(CROP_OPTIONS[0].id)}>
              <MaterialIcons name="restart-alt" size={20} color="#f1f5f9" />
            </TouchableOpacity>
          </View>
          <View style={styles.grid}>
            {CROP_OPTIONS.map((option) => {
              const isActive = option.id === pendingId;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.tile, isActive && styles.tileActive]}
                  onPress={() => setPendingId(option.id)}
                >
                  <MaterialIcons
                    name={option.icon}
                    size={28}
                    color={isActive ? palette.background : 'rgba(255,255,255,0.7)'}
                  />
                  <Text style={[styles.tileLabel, isActive && styles.tileLabelActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondary} onPress={onClose}>
              <MaterialIcons name="close" size={18} color="#f5f5f5" />
              <Text style={styles.secondaryLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primary} onPress={handleApply}>
              <MaterialIcons name="check-circle" size={18} color={palette.background} />
              <Text style={styles.primaryLabel}>Apply Crop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const palette = {
  surface: 'rgba(18, 32, 23, 0.95)',
  background: Colors.light.background,
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  tile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tileActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
  },
  tileLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    fontSize: 12,
  },
  tileLabelActive: {
    color: palette.background,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondary: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  primary: {
    flex: 1.5,
    height: 50,
    borderRadius: 16,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 22,
  },
  primaryLabel: {
    color: palette.background,
    fontWeight: '700',
  },
});
