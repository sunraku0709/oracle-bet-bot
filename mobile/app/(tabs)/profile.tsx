import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, signOut } from '../../hooks/useAuth';
import { useSubscription, PLAN_LABELS, PlanId } from '../../hooks/useSubscription';
import { Colors, PLAN_COLORS } from '../../constants/colors';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://oracle-bet.fr';

type MenuRow = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
  value?: string;
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const { planId, isActive, subscription } = useSubscription(user?.id);
  const [signingOut, setSigningOut] = useState(false);

  const planColor = PLAN_COLORS[planId as PlanId] ?? Colors.gold;

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('Erreur', 'Impossible de se déconnecter');
              setSigningOut(false);
            }
          },
        },
      ],
    );
  };

  const menuSections: { title: string; rows: MenuRow[] }[] = [
    {
      title: 'Compte',
      rows: [
        {
          icon: 'mail-outline',
          label: 'Email',
          value: user?.email ?? '—',
          onPress: () => {},
        },
        {
          icon: 'calendar-outline',
          label: 'Membre depuis',
          value: user?.created_at
            ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })
            : '—',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Abonnement',
      rows: [
        {
          icon: 'star-outline',
          label: 'Plan actuel',
          value: isActive ? PLAN_LABELS[planId as PlanId] : 'Aucun',
          onPress: () => router.push('/(tabs)/subscription'),
        },
        {
          icon: 'card-outline',
          label: 'Gérer mon abonnement',
          sublabel: 'Modifier, annuler ou upgrader',
          onPress: () => Linking.openURL(`${API_URL}/abonnement`),
        },
      ],
    },
    {
      title: 'Support',
      rows: [
        {
          icon: 'globe-outline',
          label: 'Site web oracle-bet.fr',
          onPress: () => Linking.openURL(API_URL),
        },
        {
          icon: 'help-circle-outline',
          label: 'Aide & FAQ',
          onPress: () => Linking.openURL(`${API_URL}/#faq`),
        },
      ],
    },
    {
      title: 'Session',
      rows: [
        {
          icon: 'log-out-outline',
          label: signingOut ? 'Déconnexion...' : 'Se déconnecter',
          onPress: handleSignOut,
          destructive: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar / Header */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { borderColor: planColor }]}>
            <Text style={styles.avatarText}>
              {(user?.email ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.emailText}>{user?.email ?? ''}</Text>
          <View style={[styles.planTag, { backgroundColor: `${planColor}20`, borderColor: planColor }]}>
            <Text style={[styles.planTagText, { color: planColor }]}>
              {isActive ? PLAN_LABELS[planId as PlanId] : 'Aucun abonnement'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{subscription?.analyses_used ?? 0}</Text>
            <Text style={styles.statLabel}>Analyses totales</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: planColor }]}>
              {isActive ? PLAN_LABELS[planId as PlanId] : '—'}
            </Text>
            <Text style={styles.statLabel}>Plan actif</Text>
          </View>
        </View>

        {/* Menu sections */}
        {menuSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, index) => (
                <TouchableOpacity
                  key={row.label}
                  style={[
                    styles.row,
                    index < section.rows.length - 1 && styles.rowBorder,
                  ]}
                  onPress={row.onPress}
                  disabled={!row.sublabel && !!row.value && !row.destructive}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rowIcon, row.destructive && styles.rowIconDestructive]}>
                    <Ionicons
                      name={row.icon}
                      size={18}
                      color={row.destructive ? Colors.badgeNoBet : Colors.textSecondary}
                    />
                  </View>
                  <View style={styles.rowContent}>
                    <Text
                      style={[
                        styles.rowLabel,
                        row.destructive && styles.rowLabelDestructive,
                      ]}
                    >
                      {row.label}
                    </Text>
                    {row.sublabel && (
                      <Text style={styles.rowSublabel}>{row.sublabel}</Text>
                    )}
                  </View>
                  {row.value ? (
                    <Text style={styles.rowValue} numberOfLines={1}>{row.value}</Text>
                  ) : (
                    !row.destructive && (
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    )
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.version}>Oracle Bet Mobile v1.0</Text>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    color: Colors.gold,
    fontSize: 28,
    fontWeight: '800',
  },
  emailText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  planTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  planTagText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDestructive: {
    backgroundColor: '#EF444415',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  rowLabelDestructive: {
    color: Colors.badgeNoBet,
  },
  rowSublabel: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  rowValue: {
    color: Colors.textMuted,
    fontSize: 13,
    maxWidth: 140,
    textAlign: 'right',
  },
  version: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
