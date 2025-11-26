import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';

export default function Index() {
  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ChiriTsumo</Text>
        <Text style={styles.subtitle}>間隔反復学習アプリ</Text>
        <Link href="/(tabs)/quest" style={styles.link}>
          <Text style={styles.linkText}>開始</Text>
        </Link>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 18,
    color: '#94A3B8',
  },
  link: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#00F260',
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
});
