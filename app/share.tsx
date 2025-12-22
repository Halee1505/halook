import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { ShareOptions } from '@/src/components/ShareOptions';
import { shareImageToTarget } from '@/src/services/shareService';

const palette = Colors.light;

export default function ShareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string }>();
  const incomingUri = Array.isArray(params.uri) ? params.uri[0] : params.uri;

  const handleSaveToDevice = useCallback(async () => {
    if (!incomingUri) {
      Alert.alert('Chưa có ảnh', 'Hãy xuất ảnh trước khi lưu.');
      return;
    }

    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Thiếu quyền', 'Halook cần quyền truy cập thư viện để lưu ảnh.');
      return;
    }

    await MediaLibrary.saveToLibraryAsync(incomingUri);
    Alert.alert('Đã lưu', 'Ảnh Halook của bạn đã có trong Camera Roll.');
  }, [incomingUri]);

  const handleShareStory = useCallback(async () => {
    if (!incomingUri) {
      Alert.alert('Chưa có ảnh', 'Hãy xuất ảnh trước khi chia sẻ.');
      return;
    }

    await shareImageToTarget(incomingUri, 'instagram');
  }, [incomingUri]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.background}>
        <View style={styles.blobTopRight} />
        <View style={styles.blobBottomLeft} />
      </View>
      <View style={styles.toast}>
        <MaterialIcons name="check-circle" size={18} color="#1c4532" />
        <Text style={styles.toastLabel}>Đã lưu ảnh thành công</Text>
      </View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.roundButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios-new" size={18} color="#065f46" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.qualityButton}>
          <MaterialIcons name="tune" size={18} color={palette.tint} />
          <Text style={styles.qualityLabel}>Chất lượng</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.previewWrapper}>
        <View style={styles.previewCard}>
          <Image
            source={incomingUri ? { uri: incomingUri } : require('../assets/images/icon.png')}
            style={styles.previewImage}
          />
          <View style={styles.previewOverlay} />
        </View>
      </View>
      <View style={styles.sheet}>
        <View style={styles.primaryActions}>
          <TouchableOpacity style={styles.secondaryAction} onPress={handleSaveToDevice}>
            <MaterialIcons name="download" size={22} color="#065f46" />
            <Text style={styles.secondaryLabel}>Lưu về máy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryAction} onPress={handleShareStory}>
            <MaterialIcons name="add-circle" size={24} color="#022c22" />
            <Text style={styles.primaryLabel}>Tin của bạn</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerLabel}>Hoặc chia sẻ qua</Text>
          <View style={styles.divider} />
        </View>
        <ShareOptions imageUri={incomingUri} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ecfdf5',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ecfdf5',
  },
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(48,232,119,0.3)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: 80,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  toast: {
    position: 'absolute',
    top: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 252, 231, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: palette.tint,
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  toastLabel: {
    fontWeight: '700',
    color: '#022c22',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 64,
    marginBottom: 12,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  qualityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  qualityLabel: {
    fontWeight: '600',
    color: '#0f172a',
  },
  previewWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  previewCard: {
    width: '100%',
    maxWidth: 380,
    aspectRatio: 3 / 4,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: palette.tint,
    shadowOpacity: 0.25,
    shadowRadius: 35,
    shadowOffset: { width: 0, height: 20 },
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,120,87,0.1)',
  },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 16,
  },
  secondaryAction: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
    backgroundColor: 'rgba(220,252,231,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryLabel: {
    fontWeight: '700',
    color: '#064e3b',
  },
  primaryAction: {
    flex: 1.4,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#30e877',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: palette.tint,
    shadowOpacity: 0.35,
    shadowRadius: 28,
  },
  primaryLabel: {
    fontWeight: '800',
    color: '#022c22',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(15,23,42,0.1)',
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 2,
  },
});
