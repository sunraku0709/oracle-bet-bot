import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription, PLAN_LABELS, PlanId } from '../../hooks/useSubscription';
import { useAnalyses } from '../../hooks/useAnalyses';
import { QuotaBar } from '../../components/QuotaBar';
import { AnalysisCard } from '../../components/AnalysisCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Colors, PLAN_COLORS } from '../../constants/colors';

export default function HomeScreen() {
  const { user } = useAuth();
  const { subscription, planId, loading: subLoading, remaining, isActive, refresh: refreshSub } = useSubscription(user?.id);
  const { analyses, loading: analysesLoading, refresh: refreshAnalyses } = useAnalyses(user?.id);

  const loading = subLoading || analysesLoading;
  const recent = analyses.slice(0, 3);
  const planColor = PLAN_COLORS[planId] ?? Colors.gold;
  const planLabel = PLAN_LABELS[planId as PlanId];

  const onRefresh = async () => {
    await Promise.all([refreshSub(), refreshAnalyses()]);
  };

  const emailLabel = user?.email
    ? user.email.length > 24
      ? user.email.slice(0, 24) + '…'
      : user.email
    : 'Utilisateur';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour 👋</Text>
            <Text style={styles.email}>{emailLabel}</Text>
          </View>
          <View style={[styles.planBadge, { borderColor: planColor, backgroundColor: `${planColor}15` }]}>
            <Text style={[styles.planBadgeText, { color: planColor }]}>{planLabel}</Text>
          </View>
        </View>

        {/* Quick action CTA */}
        <TouchableOpacity
          style={styles.ctaCard}
          onPress={() => router.push('/(tabs)/analyze')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.goldDark, Colors.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaContent}>
              <View>
                <Text style={styles.ctaTitle}>Nouvelle Analyse</Text>
                <Text style={styles.ctaSubtitle}>
                  {remaining === null
                    ? 'Analyses illimitées disponibles'
                    : remaining === 0
                    ? 'Quota journalier atteint'
                    : `${remaining} analyse${remaining > 1 ? 's' : ''} disponible${remaining > 1 ? 's' : ''}`}
                </Text>
              </View>
              <Ionicons name="flash" size={32} color={Colors.bgPrimary} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quota */}
        {isActive && (
          <View style={styles.section}>
            <QuotaBar
              planId={planId as PlanId}
              used={subscription?.analyses_used ?? 0}
              isActive={isActive}
            />
          </View>
        )}

        {/* No subscription warning */}
        {!subLoading && !isActive && (
          <TouchableOpacity
            style={styles.noSubCard}
            onPress={() => router.push('/(tabs)/subscription')}
          >
            <Text style={styles.noSubTitle}>⚠️ Aucun abonnement actif</Text>
            <Text style={styles.noSubText}>
              Souscrivez à un abonnement pour accéder aux analyses IA
            </Text>
            <Text style={styles.noSubLink}>Voir les abonnements →</Text>
          </TouchableOpacity>
        )}

        {/* Recent analyses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Analyses récentes</Text>
            {analyses.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            )}
          </View>

          {analysesLoading ? (
            <LoadingSpinner message="Chargement..." />
          ) : recent.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyTitle}>Aucune analyse pour l'instant</Text>
              <Text style={styles.emptyText}>
                Lancez votre première analyse pour obtenir un rapport complet
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/analyze')}
              >
                <Text style={styles.emptyBtnText}>Lancer une analyse</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recent.map((a) => (
              <AnalysisCard key={a.id} analysis={a} compact />
            ))
          )}
        </View>

        {/* Stats row */}
        {analyses.length > 0 && (
          <View style={styles.statsRow}>
            {[
              { label: 'Total', value: analyses.length },
              { label: 'GOLD', value: analyses.filter(a => a.badge === 'GOLD').length, color: Colors.badgeGold },
              { label: 'SILVER', value: analyses.filter(a => a.badge === 'SILVER').length, color: Colors.badgeSilver },
              { label: 'NO BET', value: analyses.filter(a => a.badge === 'NO BET').length, color: Colors.badgeNoBet },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={[styles.statValue, stat.color ? { color: stat.color } : null]}>
                  {stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  greeting: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  email: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ctaCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  ctaGradient: {
    padding: 20,
  },
  ctaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaTitle: {
    color: Colors.bgPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  ctaSubtitle: {
    color: Colors.bgPrimary,
    fontSize: 13,
    opacity: 0.8,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  seeAll: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600',
  },
  noSubCard: {
    backgroundColor: '#F59E0B15',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 6,
  },
  noSubTitle: {
    color: Colors.warning,
    fontSize: 15,
    fontWeight: '700',
  },
  noSubText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  noSubLink: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  emptyBtnText: {
    color: Colors.bgPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
