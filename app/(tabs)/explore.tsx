import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';

import { Colors } from '@/constants/theme';

const articles = [
  {
    title: 'Cảm hứng Tropical',
    excerpt: 'Giữ màu lá và ánh sáng vàng dịu để phù hợp overlay nước.',
    image: require('../../assets/background/img3.jpg'),
  },
  {
    title: 'Story ratio 9:16',
    excerpt: 'Xuất ảnh với viền mềm, dễ đăng lên Instagram và Threads.',
    image: require('../../assets/background/img5.jpg'),
  },
];

export default function MoodboardScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ gap: 8 }}>
        <Text style={styles.title}>Moodboard Xanh</Text>
        <Text style={styles.subtitle}>
          Bộ cảm hứng cho preset Halook. Tập trung vào ánh sáng mềm, màu xanh và chất liệu nước.
        </Text>
      </View>

      {articles.map((article) => (
        <View key={article.title} style={styles.card}>
          <Image source={article.image} style={styles.cardImage} />
          <Text style={styles.cardTitle}>{article.title}</Text>
          <Text style={styles.cardText}>{article.excerpt}</Text>
          <Link href="/presets" style={styles.cardLink}>
            Khám phá preset liên quan →
          </Link>
        </View>
      ))}
    </ScrollView>
  );
}

const palette = Colors.light;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 20,
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
  card: {
    borderRadius: 28,
    backgroundColor: palette.card,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderRadius: 28,
  },
  cardTitle: {
    fontWeight: '700',
    color: palette.text,
    fontSize: 18,
  },
  cardText: {
    color: palette.text,
    opacity: 0.7,
    lineHeight: 20,
  },
  cardLink: {
    color: palette.tint,
    fontWeight: '600',
  },
});
