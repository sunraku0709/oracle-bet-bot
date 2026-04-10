import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { analyze, detectBadge, ApiError } from '../../lib/api';
import { BetBadge } from '../../components/BetBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Colors } from '../../constants/colors';

type Sport = 'football' | 'basketball' | 'tennis';

const SPORTS: { id: Sport; label: string; emoji: string }[] = [
  { id: 'football', label: 'Football', emoji: '⚽' },
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'tennis', label: 'Tennis', emoji: '🎾' },
];

type Step = 'form' | 'loading' | 'result';

export default function AnalyzeScreen() {
  const { user } = useAuth();
  const { isActive, quotaReached, planId, remaining, refresh: refreshSub } = useSubscription(user?.id);

  // Form state
  const [sport, setSport] = useState<Sport>('football');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [competition, setCompetition] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [oddsHome, setOddsHome] = useState('');
  const [oddsDraw, setOddsDraw] = useState('');
  const [oddsAway, setOddsAway] = useState('');
  const [showOdds, setShowOdds] = useState(false);

  // Result state
  const [step, setStep] = useState<Step>('form');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!homeTeam.trim() || !awayTeam.trim()) {
      setError('Veuillez renseigner les deux équipes');
      return;
    }
    if (!isActive) {
      Alert.alert('Abonnement requis', 'Souscrivez à un abonnement pour lancer des analyses.');
      return;
    }
    if (quotaReached) {
      Alert.alert(
        'Quota atteint',
        `Vous avez atteint votre limite d'analyses journalières. Passez à un plan supérieur pour continuer.`,
      );
      return;
    }

    setError('');
    setStep('loading');

    try {
      const res = await analyze({
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        sport,
        competition: competition.trim() || undefined,
        matchDate: matchDate.trim() || undefined,
        oddsHome: oddsHome.trim() || undefined,
        oddsDraw: oddsDraw.trim() || undefined,
        oddsAway: oddsAway.trim() || undefined,
      });
      setResult(res.result);
      setStep('result');
      refreshSub();
    } catch (err: unknown) {
      setStep('form');
      if (err instanceof ApiError) {
        if (err.isQuotaError) {
          Alert.alert('Quota atteint', err.message);
        } else if (err.isAuthError) {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter.');
        } else {
          setError(err.message);
        }
      } else {
        setError("Une erreur est survenue. Vérifiez votre connexion.");
      }
    }
  };

  const handleReset = () => {
    setStep('form');
    setResult('');
    setError('');
    setHomeTeam('');
    setAwayTeam('');
    setCompetition('');
    setMatchDate('');
    setOddsHome('');
    setOddsDraw('');
    setOddsAway('');
    setShowOdds(false);
  };

  if (step === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LoadingSpinner
          fullScreen
          message={`Analyse en cours…\n${homeTeam} vs ${awayTeam}\n\nL'IA génère un rapport complet en 10 points.`}
        />
      </SafeAreaView>
    );
  }

  if (step === 'result') {
    const badge = detectBadge(result);
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>
            {homeTeam} <Text style={styles.vsText}>vs</Text> {awayTeam}
          </Text>
          <BetBadge badge={badge} size="lg" />
        </View>
        <ScrollView
          style={styles.resultScroll}
          contentContainerStyle={styles.resultContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.resultText}>{result}</Text>

          <TouchableOpacity style={styles.newAnalysisBtn} onPress={handleReset}>
            <Ionicons name="flash" size={18} color={Colors.bgPrimary} />
            <Text style={styles.newAnalysisBtnText}>Nouvelle analyse</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Nouvelle Analyse</Text>
          <Text style={styles.pageSubtitle}>
            {remaining === null
              ? 'Analyses illimitées'
              : `${remaining ?? 0} analyse${(remaining ?? 0) !== 1 ? 's' : ''} restante${(remaining ?? 0) !== 1 ? 's' : ''} aujourd'hui`}
          </Text>

          {/* Sport selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Sport</Text>
            <View style={styles.sportRow}>
              {SPORTS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.sportBtn,
                    sport === s.id && styles.sportBtnActive,
                  ]}
                  onPress={() => setSport(s.id)}
                >
                  <Text style={styles.sportEmoji}>{s.emoji}</Text>
                  <Text
                    style={[
                      styles.sportLabel,
                      sport === s.id && styles.sportLabelActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Teams */}
          <View style={styles.section}>
            <Text style={styles.label}>Équipe domicile</Text>
            <TextInput
              style={styles.input}
              value={homeTeam}
              onChangeText={setHomeTeam}
              placeholder="Ex: Paris Saint-Germain"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Équipe extérieure</Text>
            <TextInput
              style={styles.input}
              value={awayTeam}
              onChangeText={setAwayTeam}
              placeholder="Ex: Olympique de Marseille"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Competition */}
          <View style={styles.section}>
            <Text style={styles.label}>Compétition (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={competition}
              onChangeText={setCompetition}
              placeholder="Ex: Ligue 1, Champions League…"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Match date */}
          <View style={styles.section}>
            <Text style={styles.label}>Date du match (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={matchDate}
              onChangeText={setMatchDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Odds toggle */}
          <TouchableOpacity
            style={styles.oddsToggle}
            onPress={() => setShowOdds(!showOdds)}
          >
            <Ionicons
              name={showOdds ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.gold}
            />
            <Text style={styles.oddsToggleText}>
              {showOdds ? 'Masquer les cotes' : 'Ajouter les cotes (optionnel)'}
            </Text>
          </TouchableOpacity>

          {showOdds && (
            <View style={styles.oddsRow}>
              {[
                { label: 'Domicile', value: oddsHome, setter: setOddsHome, placeholder: '1.85' },
                { label: 'Nul', value: oddsDraw, setter: setOddsDraw, placeholder: '3.40' },
                { label: 'Extérieur', value: oddsAway, setter: setOddsAway, placeholder: '4.20' },
              ].map((f) => (
                <View key={f.label} style={styles.oddsField}>
                  <Text style={styles.oddsLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.oddsInput}
                    value={f.value}
                    onChangeText={f.setter}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.analyzeBtn,
              (!isActive || quotaReached) && styles.analyzeBtnDisabled,
            ]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!isActive || quotaReached}
          >
            <Ionicons name="flash" size={20} color={Colors.bgPrimary} />
            <Text style={styles.analyzeBtnText}>
              {!isActive
                ? 'Abonnement requis'
                : quotaReached
                ? 'Quota journalier atteint'
                : 'Lancer l\'analyse IA'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  pageSubtitle: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  sportRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sportBtn: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  sportBtnActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldMuted,
  },
  sportEmoji: {
    fontSize: 22,
  },
  sportLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  sportLabelActive: {
    color: Colors.gold,
  },
  oddsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  oddsToggleText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '600',
  },
  oddsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  oddsField: {
    flex: 1,
    gap: 6,
  },
  oddsLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  oddsInput: {
    backgroundColor: Colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: Colors.badgeNoBet,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.badgeNoBet,
    fontSize: 13,
    textAlign: 'center',
  },
  analyzeBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  analyzeBtnDisabled: {
    opacity: 0.45,
  },
  analyzeBtnText: {
    color: Colors.bgPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Result styles
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 12,
  },
  resultTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    lineHeight: 24,
  },
  vsText: {
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    padding: 16,
    paddingBottom: 40,
  },
  resultText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 32,
  },
  newAnalysisBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newAnalysisBtnText: {
    color: Colors.bgPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
});
