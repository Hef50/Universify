import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  mobileStyle?: ViewStyle;
  tabletStyle?: ViewStyle;
  desktopStyle?: ViewStyle;
  style?: ViewStyle;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  mobileStyle,
  tabletStyle,
  desktopStyle,
  style,
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const responsiveStyle = isMobile
    ? mobileStyle
    : isTablet
    ? tabletStyle
    : desktopStyle;

  return (
    <View style={[styles.container, responsiveStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

