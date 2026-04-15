import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BetBadge } from './BetBadge';
import { Colors } from '../constants/colors';
import { Analysis } from '../hooks/useAnalyses';

type Props = {
  analysis: Analysis;
  onPress?: () => void;
  compact?: boolean;
};

const SPORT_ICONS: Record<string, string> = {
  football: '⚽',
  basketball: '🏀',
  tennis: '🎾',
};

export function AnalysisCard({ analysis, onPress, compact = false }: Props) {
  const icon = SPORT_ICONS[analysis.sport.toLowerCase()] ?? '🏆';
  const date = new Date(analysis.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.header}>
        <View style={styles.sportRow}>
          <Text style={styles.sportIcon}>{icon}</Text>
          <Text style={styles.competition} numberOfLines={1}>
            {analysis.competition}
          </Text>
        </View>
        <BetBadge badge={analysis.badge} size="sm" />
      </View>

      <Text style={styles.matchup} numberOfLines={1}>
        {analysis.home_team}
        <Text style={styles.vs}> vs </Text>
        {analysis.away_team}
      </Text>

      {!compact && (
        <View style={styles.footer}>
          <Text style={styles.date}>{date}</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        </View>
      )}
      {compact && (
        <Text style={styles.date}>{date}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  sportIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  competition: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  matchup: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  vs: {
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});
