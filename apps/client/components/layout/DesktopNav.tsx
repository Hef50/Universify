import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Re-using the SpinningPetalLogo from index.tsx (or a smaller version)
// Ideally this should be in a shared component file, but for now:
const SmallPetalLogo = () => (
  <View style={styles.logoContainer}>
     <View style={[styles.petal, styles.petalVertical]} />
     <View style={[styles.petal, styles.petalRotated1]} />
     <View style={[styles.petal, styles.petalRotated2]} />
  </View>
);

export const DesktopNav = () => {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();

  const navItems = [
    { path: '/(tabs)/calendar', label: 'Calendar', icon: 'calendar-outline', activeIcon: 'calendar' },
    { path: '/(tabs)/find', label: 'Find Activities', icon: 'search-outline', activeIcon: 'search' },
    { path: '/(tabs)/create', label: 'Create Event', icon: 'add-circle-outline', activeIcon: 'add-circle' },
    { path: '/(tabs)/profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
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
          <SmallPetalLogo />
          <Text style={styles.brandName}>Universify</Text>
        </TouchableOpacity>

        {/* Navigation Items */}
        <View style={styles.navItems}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
            <TouchableOpacity
              key={item.path}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={active ? item.activeIcon as any : item.icon as any} 
                size={20} 
                color={active ? '#FF6B6B' : '#6B7280'} 
              />
              <Text
                style={[
                  styles.navLabel,
                  active && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )})}
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
            <Ionicons name="log-out-outline" size={20} color="#6B7280" />
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
    gap: 12,
    marginRight: 48,
  },
  // Logo Styles
  logoContainer: {
    width: 32,
    height: 32,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petal: {
    position: 'absolute',
    width: 10,
    height: 32,
    backgroundColor: '#FF6B6B',
    borderRadius: 50,
    opacity: 0.9,
  },
  petalVertical: {
    transform: [{ rotate: '0deg' }],
  },
  petalRotated1: {
    transform: [{ rotate: '60deg' }],
  },
  petalRotated2: {
    transform: [{ rotate: '-60deg' }],
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    // transition: 'all 0.2s ease', // Transition not supported in native styles
  },
  navItemActive: {
    backgroundColor: '#FFF1F1', // Lighter red/orange background
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
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});
