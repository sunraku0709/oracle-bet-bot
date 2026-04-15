import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { signUp } from '../../hooks/useAuth';
import { Colors } from '../../constants/colors';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirm) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { user } = await signUp(email.trim().toLowerCase(), password);
      if (user && !user.confirmed_at) {
        setSuccess(true);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'inscription';
      if (msg.includes('already registered') || msg.includes('User already exists')) {
        setError('Un compte existe déjà avec cet email');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient
          colors={[Colors.bgPrimary, Colors.bgSecondary]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.successContent}>
          <Text style={styles.successEmoji}>📧</Text>
          <Text style={styles.successTitle}>Vérifiez votre email</Text>
          <Text style={styles.successText}>
            Un lien de confirmation a été envoyé à{' '}
            <Text style={styles.emailHighlight}>{email}</Text>.
            {'\n\n'}Cliquez sur le lien pour activer votre compte, puis revenez vous connecter.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.backBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[Colors.bgPrimary, Colors.bgSecondary]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </View>
          <Text style={styles.brand}>ORACLE BET</Text>
          <Text style={styles.subtitle}>Créer votre compte</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 caractères"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Répétez le mot de passe"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              editable={!loading}
              onSubmitEditing={handleRegister}
            />
          </View>

          <View style={styles.planInfo}>
            <Text style={styles.planInfoText}>
              🎁 Démarrez avec un essai gratuit et choisissez votre abonnement après l'inscription
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace('/(auth)/login')}
            disabled={loading}
          >
            <Text style={styles.loginLinkText}>
              Déjà un compte ?{' '}
              <Text style={styles.loginLinkHighlight}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backLinkText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.goldMuted,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 32,
  },
  brand: {
    color: Colors.gold,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  form: {
    gap: 16,
  },
  errorBox: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: Colors.badgeNoBet,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: Colors.badgeNoBet,
    fontSize: 13,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  planInfo: {
    backgroundColor: Colors.goldMuted,
    borderWidth: 1,
    borderColor: Colors.borderGold,
    borderRadius: 10,
    padding: 12,
  },
  planInfoText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  registerBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    color: Colors.bgPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginLinkText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  loginLinkHighlight: {
    color: Colors.gold,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  successTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  emailHighlight: {
    color: Colors.gold,
    fontWeight: '700',
  },
  backBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 36,
  },
  backBtnText: {
    color: Colors.bgPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
});
