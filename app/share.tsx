import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShareOptions } from '@/src/components/ShareOptions';
import { shareImageToTarget } from '@/src/services/shareService';

const shareAccent = '#d6a472';
const shareSurface = '#161618';
const shareBackground = '#0a0a0c';

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
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
      </View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.roundButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios-new" size={20} color="#f0ede6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.previewSection}>
        <View style={styles.previewCard}>
          <Image
            source={incomingUri ? { uri: incomingUri } : require('../assets/images/icon.png')}
            style={styles.previewImage}
          />
          <View style={styles.previewMaskTop}>
            <Text style={styles.previewMaskText}>System UI Area</Text>
          </View>
          <View style={styles.previewMaskBottom}>
            <Text style={styles.previewMaskText}>Reply & Action Area</Text>
          </View>
          <View style={styles.previewBadge}>
            <MaterialIcons name="verified" size={20} color={shareAccent} />
            <Text style={styles.previewBadgeLabel}>Image Saved</Text>
          </View>
        </View>
        <Text style={styles.previewHint}>Previewing Story Mode (9:16)</Text>
      </View>
      <View style={styles.sheet}>
        <TouchableOpacity style={styles.primaryAction} onPress={handleShareStory}>
          <MaterialIcons name="amp-stories" size={26} color={shareBackground} />
          <Text style={styles.primaryLabel}>Share to Story</Text>
        </TouchableOpacity>
        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.secondaryAction} onPress={handleSaveToDevice}>
            <MaterialIcons name="save-alt" size={22} color="#f0ede6" />
            <Text style={styles.secondaryLabel}>Save to Device</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => Alert.alert('Sắp ra mắt', 'Các tuỳ chọn khác đang được hoàn thiện.')}
          >
            <MaterialIcons name="more-horiz" size={26} color="#f0ede6" />
          </TouchableOpacity>
        </View>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerLabel}>More options</Text>
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
    backgroundColor: shareBackground,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: shareBackground,
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(214,164,114,0.2)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 12,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: '#f0ede6',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  previewSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  previewCard: {
    width: '100%',
    maxWidth: 380,
    aspectRatio: 9 / 16,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 20 },
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewMaskTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '16%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  previewMaskBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '18%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  previewMaskText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  previewBadge: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(26,26,28,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  previewBadgeLabel: {
    color: '#f0ede6',
    fontWeight: '600',
  },
  previewHint: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    letterSpacing: 1,
  },
  sheet: {
    backgroundColor: shareSurface,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
  },
  primaryAction: {
    height: 56,
    borderRadius: 18,
    backgroundColor: shareAccent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: shareAccent,
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  primaryLabel: {
    fontWeight: '700',
    fontSize: 16,
    color: shareBackground,
    letterSpacing: 0.5,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryLabel: {
    color: '#f0ede6',
    fontWeight: '600',
  },
  iconAction: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerLabel: {
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    fontSize: 11,
    textTransform: 'uppercase',
  },
});
