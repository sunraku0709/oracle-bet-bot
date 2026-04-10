import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useAnalyses, Analysis } from '../../hooks/useAnalyses';
import { AnalysisCard } from '../../components/AnalysisCard';
import { BetBadge } from '../../components/BetBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Colors } from '../../constants/colors';
import { BadgeType } from '../../lib/api';

type Filter = 'all' | BadgeType | 'football' | 'basketball' | 'tennis';

const BADGE_FILTERS: { id: BadgeType | 'all'; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'GOLD', label: 'GOLD' },
  { id: 'SILVER', label: 'SILVER' },
  { id: 'NO BET', label: 'NO BET' },
];

export default function HistoryScreen() {
  const { user } = useAuth();
  const { analyses, loading, refresh } = useAnalyses(user?.id);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Analysis | null>(null);

  const filtered = analyses.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'GOLD' || filter === 'SILVER' || filter === 'NO BET') {
      return a.badge === filter;
    }
    return a.sport.toLowerCase() === filter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        <Text style={styles.count}>{analyses.length} analyse{analyses.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
      >
        {BADGE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.filterBtn,
              filter === f.id && styles.filterBtnActive,
            ]}
            onPress={() => setFilter(f.id as Filter)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.id && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        {(['football', 'basketball', 'tennis'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.filterBtn,
              filter === s && styles.filterBtnActive,
            ]}
            onPress={() => setFilter(s)}
          >
            <Text
              style={[
                styles.filterText,
                filter === s && styles.filterTextActive,
              ]}
            >
              {s === 'football' ? '⚽' : s === 'basketball' ? '🏀' : '🎾'}{' '}
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <LoadingSpinner message="Chargement..." />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>
            {filter === 'all' ? 'Aucune analyse' : 'Aucun résultat pour ce filtre'}
          </Text>
          <Text style={styles.emptyText}>
            {filter !== 'all' && 'Essayez un autre filtre'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AnalysisCard
              analysis={item}
              onPress={() => setSelected(item)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={Colors.gold}
              colors={[Colors.gold]}
            />
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selected.home_team} vs {selected.away_team}
                </Text>
                <BetBadge badge={selected.badge} size="md" />
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelected(null)}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalMeta}>
              <Text style={styles.metaItem}>
                {selected.sport === 'football' ? '⚽' : selected.sport === 'basketball' ? '🏀' : '🎾'} {selected.competition}
              </Text>
              <Text style={styles.metaItem}>
                📅 {new Date(selected.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
              {(selected.odds_home || selected.odds_draw || selected.odds_away) && (
                <Text style={styles.metaItem}>
                  📊 {selected.odds_home ?? '—'} / {selected.odds_draw ?? '—'} / {selected.odds_away ?? '—'}
                </Text>
              )}
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.resultText}>{selected.result}</Text>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  count: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  filtersScroll: {
    maxHeight: 52,
  },
  filters: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.bgCard,
  },
  filterBtnActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldMuted,
  },
  filterText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.gold,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 12,
  },
  modalTitleRow: {
    flex: 1,
    gap: 8,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  closeBtn: {
    padding: 4,
  },
  modalMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  metaItem: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  resultText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
});
