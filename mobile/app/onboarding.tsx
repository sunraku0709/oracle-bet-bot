import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🤖',
    title: 'IA Ultra-Précise',
    subtitle: 'Analyses sportives',
    description:
      'Notre IA analyse des dizaines de paramètres — forme, H2H, statistiques avancées — pour générer un rapport en 10 points.',
    accent: Colors.gold,
  },
  {
    id: '2',
    emoji: '🏆',
    title: 'Classification Expert',
    subtitle: 'GOLD · SILVER · NO BET',
    description:
      'Chaque analyse reçoit un verdict clair. GOLD (75%+), SILVER (65–74%) ou NO BET selon la fiabilité estimée.',
    accent: Colors.planStandard,
  },
  {
    id: '3',
    emoji: '⚡',
    title: 'Football · Basket · Tennis',
    subtitle: 'Tous les sports',
    description:
      'Lancez une analyse en 30 secondes. Entrez les équipes, la compétition, les cotes optionnelles et obtenez un rapport complet.',
    accent: '#AAFF00',
  },
];

type Slide = typeof SLIDES[0];

function SlideItem({ item }: { item: Slide }) {
  return (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.emojiContainer, { borderColor: item.accent, shadowColor: item.accent }]}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={[styles.subtitle, { color: item.accent }]}>{item.subtitle}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );
}

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    router.replace('/(auth)/login');
  };

  const isLast = currentIndex === SLIDES.length - 1;
  const accent = SLIDES[currentIndex].accent;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.bgPrimary, Colors.bgSecondary]}
        style={StyleSheet.absoluteFillObject}
      />

      <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
        <Text style={styles.skipText}>Passer</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item }) => <SlideItem item={item} />}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex
                  ? [styles.dotActive, { backgroundColor: accent }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: accent }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>
            {isLast ? 'Commencer →' : 'Suivant →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emojiContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: Colors.bgCard,
  },
  emoji: {
    fontSize: 52,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 6,
    backgroundColor: Colors.borderSubtle,
  },
  nextBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextText: {
    color: Colors.bgPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
