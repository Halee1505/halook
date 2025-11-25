import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ShareTarget, shareImageToTarget } from '@/src/services/shareService';
import { Colors } from '@/constants/theme';

type Props = {
  imageUri?: string | null;
};

const targets: { target: ShareTarget; label: string }[] = [
  { target: 'instagram', label: 'Instagram' },
  { target: 'facebook', label: 'Facebook' },
  { target: 'threads', label: 'Threads' },
  { target: 'system', label: 'Khác' },
];

export const ShareOptions = ({ imageUri }: Props) => {
  const handleShare = async (target: ShareTarget) => {
    if (!imageUri) {
      Alert.alert('Chưa có ảnh', 'Hãy lưu ảnh trước khi chia sẻ.');
      return;
    }

    try {
      await shareImageToTarget(imageUri, target);
    } catch (error) {
      Alert.alert('Không thể chia sẻ', error instanceof Error ? error.message : 'Vui lòng thử lại');
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.heading}>Chia sẻ nhanh</Text>
      <View style={styles.grid}>
        {targets.map((item) => (
          <TouchableOpacity key={item.target} style={styles.shareButton} onPress={() => handleShare(item.target)}>
            <Text style={styles.shareLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const palette = Colors.light;

const styles = StyleSheet.create({
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
  shareButton: {
    backgroundColor: palette.tint,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: '45%',
  },
  shareLabel: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
});
