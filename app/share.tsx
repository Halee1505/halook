import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ShareOptions } from '@/src/components/ShareOptions';
import { Colors } from '@/constants/theme';

export default function ShareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string }>();
  const incomingUri = Array.isArray(params.uri) ? params.uri[0] : params.uri;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ gap: 8 }}>
        <Text style={styles.title}>Chia sẻ</Text>
        <Text style={styles.subtitle}>Gửi khoảnh khắc của bạn lên các mạng xã hội yêu thích.</Text>
      </View>

      <Image
        source={incomingUri ? { uri: incomingUri } : require('../assets/images/icon.png')}
        style={styles.preview}
      />

      <ShareOptions imageUri={incomingUri} />

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryLabel}>Quay lại</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const palette = Colors.light;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
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
  preview: {
    width: '100%',
    height: 320,
    borderRadius: 32,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 14,
  },
  secondaryLabel: {
    color: palette.text,
    fontWeight: '700',
    textAlign: 'center',
  },
});
