import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function AccountSettingsScreen() {
  const { currentUser, updateUser, logout } = useAuth();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [university, setUniversity] = useState(currentUser?.university ?? '');
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setUniversity(currentUser.university);
    }
  }, [currentUser?.name, currentUser?.university]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
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

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Done', 'Your password has been updated.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
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

        <Text style={styles.sectionTitle}>Change Password</Text>
        <Input
          label="New Password"
          placeholder="Enter new password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <Input
          label="Confirm New Password"
          placeholder="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <Button
          title={updatingPassword ? 'Updating…' : 'Update Password'}
          onPress={handleUpdatePassword}
          variant="primary"
          size="large"
          fullWidth
          style={{ marginTop: 16 }}
          disabled={updatingPassword}
        />

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Button
            title={deleting ? 'Deleting…' : 'Delete Account'}
            onPress={handleDeleteAccount}
            variant="outline"
            size="large"
            fullWidth
            style={{ borderColor: '#DC2626' }}
            textStyle={{ color: '#DC2626' }}
            disabled={deleting}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 24,
    color: '#FF6B6B',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 16,
  },
  dangerZone: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 12,
  },
});

