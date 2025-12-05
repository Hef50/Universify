import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';

// Re-using the SpinningPetalLogo from index.tsx (or a smaller version)
// Ideally this should be in a shared component file, but for now:
const SmallPetalLogo = () => (
  <View style={styles.logoPetalContainer}>
     <View style={[styles.petal, styles.petalVertical]} />
     <View style={[styles.petal, styles.petalRotated1]} />
     <View style={[styles.petal, styles.petalRotated2]} />
  </View>
);

interface HeaderProps {
  title?: string;
  leftAction?: {
    icon: string;
    onPress: () => void;
  };
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
  showSearch?: boolean;
  onSearchPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  leftAction,
  rightAction,
  showSearch = false,
  onSearchPress,
}) => {
  const { isMobile } = useResponsive();

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {/* Left Action */}
      <View style={styles.leftSection}>
        {leftAction ? (
          <TouchableOpacity style={styles.iconButton} onPress={leftAction.onPress}>
            <Ionicons name={leftAction.icon as any} size={24} color="#374151" />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoContainer}>
            <SmallPetalLogo />
            {!isMobile && <Text style={styles.logoText}>Universify</Text>}
          </View>
        )}
      </View>

      {/* Title */}
      {title && (
        <View style={styles.centerSection}>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}

      {/* Right Actions */}
      <View style={styles.rightSection}>
        {showSearch && onSearchPress && (
          <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
            <Ionicons name="search" size={20} color="#374151" />
          </TouchableOpacity>
        )}
        {rightAction && (
          <TouchableOpacity style={styles.iconButton} onPress={rightAction.onPress}>
             <Ionicons name={rightAction.icon as any} size={20} color="#374151" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      default: {
        elevation: 2,
      },
    }),
  },
  containerMobile: {
    height: 56,
    paddingHorizontal: 16,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoPetalContainer: {
    width: 28,
    height: 28,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petal: {
    position: 'absolute',
    width: 8,
    height: 28,
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
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
});
