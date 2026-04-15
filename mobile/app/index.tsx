import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

export default function SplashEntry() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();

    const timer = setTimeout(async () => {
      try {
        const onboardingDone = await AsyncStorage.getItem('onboarding_done');
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          router.replace('/(tabs)');
        } else if (onboardingDone) {
          router.replace('/(auth)/login');
        } else {
          router.replace('/onboarding');
        }
      } catch {
        router.replace('/onboarding');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Animated.View
          style={[
            styles.glow,
            { opacity: glowAnim },
          ]}
        />
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>⚡</Text>
        </View>
        <Text style={styles.logoText}>ORACLE BET</Text>
        <Text style={styles.tagline}>Analyses sportives IA</Text>
      </Animated.View>

      <Animated.Text style={[styles.version, { opacity: fadeAnim }]}>
        v1.0
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.gold,
    opacity: 0.08,
    top: -30,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.goldMuted,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 40,
  },
  logoText: {
    color: Colors.gold,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  version: {
    position: 'absolute',
    bottom: 40,
    color: Colors.textMuted,
    fontSize: 12,
  },
});
