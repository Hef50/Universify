import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export const DesktopNav = () => {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();

  const navItems = [
    { path: '/(tabs)', label: 'Home', icon: '🏠' },
    { path: '/(tabs)/calendar', label: 'Calendar', icon: '📅' },
    { path: '/(tabs)/find', label: 'Find Activities', icon: '🔍' },
    { path: '/(tabs)/create', label: 'Create Event', icon: '➕' },
    { path: '/(tabs)/profile', label: 'Profile', icon: '👤' },
  ];

  const isActive = (path: string) => {
    if (path === '/(tabs)') {
      return pathname === '/(tabs)' || pathname === '/(tabs)/';
    }
    return pathname.startsWith(path);
  };

  return (
    <View style={styles.container}>
      <View style={styles.navContent}>
        {/* Logo/Brand */}
        <TouchableOpacity
          style={styles.brand}
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.7}
        >
          <Text style={styles.brandEmoji}>🎓</Text>
          <Text style={styles.brandName}>Universify</Text>
        </TouchableOpacity>

        {/* Navigation Items */}
        <View style={styles.navItems}>
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.path}
              style={[styles.navItem, isActive(item.path) && styles.navItemActive]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.navLabel,
                  isActive(item.path) && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* User Menu */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>
                {currentUser?.name?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>
                {currentUser?.name || 'User'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {currentUser?.email || ''}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 70,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      default: {
        elevation: 2,
      },
    }),
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 32,
    maxWidth: 1600,
    alignSelf: 'center',
    width: '100%',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 48,
  },
  brandEmoji: {
    fontSize: 28,
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  navItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    transition: 'all 0.2s ease',
  },
  navItemActive: {
    backgroundColor: '#FEF2F2',
  },
  navIcon: {
    fontSize: 18,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  navLabelActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginLeft: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    maxWidth: 150,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  logoutIcon: {
    fontSize: 16,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});

