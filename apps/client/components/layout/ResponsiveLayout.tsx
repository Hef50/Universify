import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

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
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const { isMobile, isTablet } = useResponsive();

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

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
  });
