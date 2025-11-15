import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AccountSettingsScreen() {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Account Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <Input
          label="Full Name"
          value={currentUser.name}
          editable={false}
        />

        <Input
          label="Email"
          value={currentUser.email}
          editable={false}
        />

        <Input
          label="University"
          value={currentUser.university}
          editable={false}
        />

        <Text style={styles.sectionTitle}>Change Password</Text>
        <Input
          label="Current Password"
          placeholder="Enter current password"
          secureTextEntry
        />
        <Input
          label="New Password"
          placeholder="Enter new password"
          secureTextEntry
        />
        <Input
          label="Confirm New Password"
          placeholder="Confirm new password"
          secureTextEntry
        />

        <Button
          title="Update Password"
          onPress={() => {}}
          variant="primary"
          size="large"
          fullWidth
          style={{ marginTop: 16 }}
        />

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Button
            title="Delete Account"
            onPress={() => {}}
            variant="outline"
            size="large"
            fullWidth
            style={{ borderColor: '#DC2626' }}
            textStyle={{ color: '#DC2626' }}
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

