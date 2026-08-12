import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...textInputProps
}) => {
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            style,
          ]}
          placeholderTextColor={textInputProps.placeholderTextColor || colors.textTertiary}
          {...textInputProps}
        />

        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
};

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    inputContainerError: {
      borderColor: colors.danger,
    },
    input: {
      flex: 1,
      height: 48,
      paddingHorizontal: 16,
      fontSize: 16 * fontScale,
      color: colors.textPrimary,
    },
    inputWithLeftIcon: {
      paddingLeft: 8,
    },
    inputWithRightIcon: {
      paddingRight: 8,
    },
    leftIcon: {
      paddingLeft: 12,
    },
    rightIcon: {
      paddingRight: 12,
    },
    errorText: {
      fontSize: 12 * fontScale,
      color: colors.danger,
      marginTop: 4,
    },
    helperText: {
      fontSize: 12 * fontScale,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
