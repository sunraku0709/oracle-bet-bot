import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, PLAN_COLORS } from '../constants/colors';
import { PlanId, PLAN_LABELS, PLAN_LIMITS } from '../hooks/useSubscription';

type Props = {
  planId: PlanId;
  used: number;
  isActive: boolean;
};

export function QuotaBar({ planId, used, isActive }: Props) {
  const limit = PLAN_LIMITS[planId];
  const planColor = PLAN_COLORS[planId] ?? Colors.gold;
  const label = PLAN_LABELS[planId];

  if (!isActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.noSub}>Aucun abonnement actif</Text>
      </View>
    );
  }

  if (limit === null) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: `${planColor}20`, borderColor: planColor }]}>
            <Text style={[styles.badgeText, { color: planColor }]}>{label}</Text>
          </View>
          <Text style={styles.unlimited}>Analyses illimitées</Text>
        </View>
        <View style={[styles.bar, { backgroundColor: Colors.borderSubtle }]}>
          <View style={[styles.fill, { width: '100%', backgroundColor: planColor }]} />
        </View>
      </View>
    );
  }

  const percent = Math.min((used / limit) * 100, 100);
  const remaining = Math.max(0, limit - used);
  const isExhausted = remaining === 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: `${planColor}20`, borderColor: planColor }]}>
          <Text style={[styles.badgeText, { color: planColor }]}>{label}</Text>
        </View>
        <Text style={[styles.quota, isExhausted && styles.exhausted]}>
          {remaining} analyse{remaining !== 1 ? 's' : ''} restante{remaining !== 1 ? 's' : ''} aujourd'hui
        </Text>
      </View>
      <View style={[styles.bar, { backgroundColor: Colors.borderSubtle }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent}%`,
              backgroundColor: isExhausted ? Colors.badgeNoBet : planColor,
            },
          ]}
        />
      </View>
      <Text style={styles.sub}>
        {used}/{limit} utilisée{used !== 1 ? 's' : ''} aujourd'hui
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quota: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  unlimited: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  exhausted: {
    color: Colors.badgeNoBet,
  },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  sub: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  noSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
