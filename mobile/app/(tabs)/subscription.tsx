import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription, PlanId, PLAN_LABELS, PLAN_PRICES } from '../../hooks/useSubscription';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Colors, PLAN_COLORS } from '../../constants/colors';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://oracle-bet.fr';

type PlanFeatures = {
  id: PlanId;
  emoji: string;
  analyses: string;
  features: string[];
};

const PLAN_DETAILS: PlanFeatures[] = [
  {
    id: 'starter',
    emoji: '🌱',
    analyses: '1 analyse / jour',
    features: [
      'Rapport structuré en 10 points',
      'Classification GOLD / SILVER / NO BET',
      'Football, Basketball, Tennis',
      'Dashboard 24h/24',
    ],
  },
  {
    id: 'standard',
    emoji: '⚡',
    analyses: '3 analyses / jour',
    features: [
      'Tout Starter +',
      'Historique complet',
      'Analyse des cotes en temps réel',
      'Support prioritaire',
    ],
  },
  {
    id: 'premium',
    emoji: '👑',
    analyses: 'Analyses illimitées',
    features: [
      'Tout Standard +',
      'Analyses illimitées',
      'Détection value bets',
      'Support VIP',
    ],
  },
];

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const { subscription, planId, loading, isActive, refresh } = useSubscription(user?.id);

  const openUpgrade = (plan: PlanId) => {
    Alert.alert(
      'Gérer votre abonnement',
      'Vous allez être redirigé vers oracle-bet.fr pour gérer votre abonnement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          onPress: () => Linking.openURL(`${API_URL}/abonnement`),
        },
      ],
    );
  };

  const openManage = () => {
    Linking.openURL(`${API_URL}/abonnement`);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

  const currentPlanId = planId as PlanId;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Abonnement</Text>

        {/* Current plan banner */}
        {isActive ? (
          <View style={[styles.currentBanner, { borderColor: PLAN_COLORS[currentPlanId] }]}>
            <LinearGradient
              colors={[`${PLAN_COLORS[currentPlanId]}15`, 'transparent']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.bannerRow}>
              <View>
                <Text style={styles.bannerLabel}>Plan actuel</Text>
                <Text style={[styles.bannerPlan, { color: PLAN_COLORS[currentPlanId] }]}>
                  {PLAN_LABELS[currentPlanId]}
                </Text>
                {subscription?.current_period_end && (
                  <Text style={styles.bannerExpiry}>
                    Renouvellement :{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                )}
              </View>
              <View style={[styles.activeBadge, { backgroundColor: `${PLAN_COLORS[currentPlanId]}20`, borderColor: PLAN_COLORS[currentPlanId] }]}>
                <Text style={[styles.activeBadgeText, { color: PLAN_COLORS[currentPlanId] }]}>ACTIF</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.manageBtn} onPress={openManage}>
              <Text style={styles.manageBtnText}>Gérer sur oracle-bet.fr →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noPlanBanner}>
            <Text style={styles.noPlanTitle}>⚠️ Aucun abonnement actif</Text>
            <Text style={styles.noPlanText}>
              Choisissez un plan ci-dessous pour accéder aux analyses IA
            </Text>
          </View>
        )}

        {/* Plans */}
        <Text style={styles.sectionTitle}>Nos offres</Text>

        {PLAN_DETAILS.map((plan) => {
          const isCurrent = isActive && currentPlanId === plan.id;
          const planColor = PLAN_COLORS[plan.id];
          const isUpgrade =
            !isActive ||
            (currentPlanId === 'starter' && (plan.id === 'standard' || plan.id === 'premium')) ||
            (currentPlanId === 'standard' && plan.id === 'premium');

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                isCurrent && [styles.planCardActive, { borderColor: planColor }],
              ]}
            >
              {isCurrent && (
                <View style={[styles.currentTag, { backgroundColor: planColor }]}>
                  <Text style={styles.currentTagText}>Plan actuel</Text>
                </View>
              )}
              {plan.id === 'standard' && !isCurrent && (
                <View style={styles.popularTag}>
                  <Text style={styles.popularTagText}>POPULAIRE</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={styles.planEmoji}>{plan.emoji}</Text>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, { color: planColor }]}>
                    {PLAN_LABELS[plan.id]}
                  </Text>
                  <Text style={styles.planAnalyses}>{plan.analyses}</Text>
                </View>
                <Text style={styles.planPrice}>{PLAN_PRICES[plan.id]}</Text>
              </View>

              <View style={styles.featuresList}>
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={planColor} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              {!isCurrent && (
                <TouchableOpacity
                  style={[
                    styles.planBtn,
                    isUpgrade
                      ? { backgroundColor: planColor }
                      : styles.planBtnOutline,
                  ]}
                  onPress={() => openUpgrade(plan.id)}
                >
                  <Text
                    style={[
                      styles.planBtnText,
                      !isUpgrade && { color: Colors.textSecondary },
                    ]}
                  >
                    {isUpgrade ? `Passer au ${PLAN_LABELS[plan.id]}` : `Choisir ${PLAN_LABELS[plan.id]}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <Text style={styles.disclaimer}>
          Les paiements sont gérés de façon sécurisée via Stripe sur oracle-bet.fr.
          Les abonnements se renouvellent automatiquement et peuvent être annulés à tout moment.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  currentBanner: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bannerPlan: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerExpiry: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  manageBtn: {
    paddingVertical: 2,
  },
  manageBtnText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600',
  },
  noPlanBanner: {
    backgroundColor: '#F59E0B15',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 6,
  },
  noPlanTitle: {
    color: Colors.warning,
    fontSize: 15,
    fontWeight: '700',
  },
  noPlanText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  planCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  planCardActive: {
    borderWidth: 2,
  },
  currentTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  currentTagText: {
    color: Colors.bgPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  popularTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.gold,
    borderBottomLeftRadius: 10,
  },
  popularTagText: {
    color: Colors.bgPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingTop: 4,
  },
  planEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  planAnalyses: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  planPrice: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  featuresList: {
    gap: 8,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  planBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  planBtnOutline: {
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  planBtnText: {
    color: Colors.bgPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 12,
  },
});
