import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ShareTarget, shareImageToTarget } from '@/src/services/shareService';
type Props = {
  imageUri?: string | null;
};

const targets: { target: ShareTarget; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { target: 'instagram', label: 'Instagram', icon: 'camera-alt' },
  { target: 'facebook', label: 'Facebook', icon: 'public' },
  { target: 'threads', label: 'Threads', icon: 'chat-bubble' },
  { target: 'system', label: 'Zalo', icon: 'forum' },
  { target: 'system', label: 'Twitter', icon: 'close' },
  { target: 'system', label: 'Sao chép', icon: 'link' },
  { target: 'system', label: 'Thêm', icon: 'more-horiz' },
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {targets.map((item, index) => (
        <TouchableOpacity key={`${item.label}-${index}`} style={styles.option} onPress={() => handleShare(item.target)}>
          <View style={styles.optionIcon}>
            <MaterialIcons name={item.icon} size={26} color={shareAccent} />
          </View>
          <Text style={styles.optionLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const shareAccent = '#d6a472';

const styles = StyleSheet.create({
  scrollContent: {
    gap: 18,
    paddingRight: 24,
  },
  option: {
    width: 72,
    alignItems: 'center',
    gap: 8,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 12,
    color: '#f0ede6',
    fontWeight: '600',
  },
});
