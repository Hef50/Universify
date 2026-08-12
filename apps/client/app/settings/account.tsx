import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

export default function AccountSettingsScreen() {
  const { currentUser, updateUser, logout } = useAuth();
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const [name, setName] = useState(currentUser?.name ?? '');
  const [university, setUniversity] = useState(currentUser?.university ?? '');
  const currentName = currentUser?.name;
  const currentUniversity = currentUser?.university;
  useEffect(() => {
    if (currentName != null) setName(currentName);
    if (currentUniversity != null) setUniversity(currentUniversity);
  }, [currentName, currentUniversity]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!currentUser) return null;

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      await updateUser({ name, university });
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) throw error;
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token || !supabaseUrl) {
                Alert.alert('Error', 'Unable to delete account. Please sign out and contact support.');
                return;
              }
              const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
              });
              if (!res.ok) {
                const body = await res.text();
                throw new Error(body || res.statusText);
              }
              await logout();
              router.replace('/(auth)/login');
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete account. You may need to contact support.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Account Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <Input
          label="Full Name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
        />
        <Input
          label="Email"
          value={currentUser.email}
          editable={false}
        />
        <Input
          label="University"
          value={university}
          onChangeText={setUniversity}
          placeholder="Your university"
        />
        <Button
          title={savingProfile ? 'Saving…' : 'Save profile'}
          onPress={handleSaveProfile}
          variant="primary"
          size="large"
          fullWidth
          style={{ marginTop: 16 }}
          disabled={savingProfile}
        />

        <Text style={styles.sectionTitle}>Sign-in Method</Text>
        <View style={styles.signInInfo}>
          <Text style={styles.signInText}>
            You sign in with your CMU Google account. There is no separate
            password for Universify — manage your credentials through Google.
          </Text>
        </View>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Button
            title={deleting ? 'Deleting…' : 'Delete Account'}
            onPress={handleDeleteAccount}
            variant="outline"
            size="large"
            fullWidth
            style={{ borderColor: colors.danger }}
            textStyle={{ color: colors.danger }}
            disabled={deleting}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      fontSize: 24 * fontScale,
      color: colors.primary,
      marginRight: 12,
    },
    title: {
      fontSize: 20 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 24,
      marginBottom: 16,
    },
    signInInfo: {
      padding: 16,
      backgroundColor: colors.infoSoft,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    signInText: {
      fontSize: 14 * fontScale,
      lineHeight: 20,
      color: colors.infoText,
    },
    dangerZone: {
      marginTop: 40,
      padding: 16,
      backgroundColor: colors.dangerSoft,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    dangerTitle: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.danger,
      marginBottom: 12,
    },
  });

