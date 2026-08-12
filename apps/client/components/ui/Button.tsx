import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
}) => {
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[`${size}Button`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    (disabled || loading) && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.onPrimary : colors.primary}
          size={size === 'small' ? 'small' : 'small'}
        />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
      gap: 8,
    },
    fullWidth: {
      width: '100%',
    },
    // Variants
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: '#8B7FFF',
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    // Sizes
    smallButton: {
      height: 36,
      paddingHorizontal: 16,
    },
    mediumButton: {
      height: 44,
      paddingHorizontal: 20,
    },
    largeButton: {
      height: 52,
      paddingHorizontal: 24,
    },
    // Text styles
    text: {
      fontWeight: '600',
    },
    primaryText: {
      color: colors.onPrimary,
    },
    secondaryText: {
      color: colors.onPrimary,
    },
    outlineText: {
      color: colors.primary,
    },
    ghostText: {
      color: colors.primary,
    },
    smallText: {
      fontSize: 14 * fontScale,
    },
    mediumText: {
      fontSize: 16 * fontScale,
    },
    largeText: {
      fontSize: 18 * fontScale,
    },
    // States
    disabled: {
      backgroundColor: colors.surfaceAlt,
      opacity: 0.5,
    },
    disabledText: {
      color: colors.textTertiary,
      opacity: 0.7,
    },
  });
