import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  validateEduEmail,
  checkPasswordStrength,
  validatePasswordMatch,
  validateRequired,
} from '@/utils/validation';
import { useResponsive } from '@/hooks/useResponsive';

export default function SignupScreen() {
  const { signup, isLoading, error, clearError } = useAuth();
  const { isMobile } = useResponsive();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [university, setUniversity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordStrength = useMemo(
    () => checkPasswordStrength(password),
    [password]
  );

  const handleSignup = async () => {
    // Clear previous errors
    setErrors({});
    clearError();

    // Validate inputs
    const newErrors: Record<string, string> = {};

    if (!validateRequired(name)) {
      newErrors.name = 'Name is required';
    }

    if (!validateRequired(email)) {
      newErrors.email = 'Email is required';
    } else if (!validateEduEmail(email)) {
      newErrors.email = 'Please use a valid .edu email address';
    }

    if (!validateRequired(university)) {
      newErrors.university = 'University is required';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!passwordStrength.isValid) {
      newErrors.password = 'Password does not meet all requirements';
    }

    if (!validatePasswordMatch(password, confirmPassword)) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Attempt signup
    const success = await signup({
      name,
      email,
      university,
      password,
      confirmPassword,
      acceptedTerms,
    });

    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isMobile && styles.scrollContentMobile,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>🎓</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Universify today</Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="John Doe"
              // To modify placeholder opacity/color manually, use placeholderTextColor prop
              // Use a hex color with lower opacity or a lighter gray
              placeholderTextColor="#9CA3AF" // Example: Tailwind gray-400
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors((prev) => ({ ...prev, name: '' }));
              }}
              autoCapitalize="words"
              editable={!isLoading}
            />
            {errors.name ? (
              <Text style={styles.fieldError}>{errors.name}</Text>
            ) : null}
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>University Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="your.email@university.edu"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors((prev) => ({ ...prev, email: '' }));
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isLoading}
            />
            {errors.email ? (
              <Text style={styles.fieldError}>{errors.email}</Text>
            ) : null}
          </View>

          {/* University Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>University</Text>
            <TextInput
              style={[styles.input, errors.university && styles.inputError]}
              placeholder="Carnegie Mellon University"
              placeholderTextColor="#9CA3AF"
              value={university}
              onChangeText={(text) => {
                setUniversity(text);
                setErrors((prev) => ({ ...prev, university: '' }));
              }}
              autoCapitalize="words"
              editable={!isLoading}
            />
            {errors.university ? (
              <Text style={styles.fieldError}>{errors.university}</Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Create a strong password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors((prev) => ({ ...prev, password: '' }));
              }}
              secureTextEntry
              autoComplete="password-new"
              editable={!isLoading}
            />
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password}</Text>
            ) : null}

            {/* Password Strength Indicators */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <PasswordRequirement
                  met={passwordStrength.hasMinLength}
                  text="At least 8 characters"
                />
                <PasswordRequirement
                  met={passwordStrength.hasUppercase}
                  text="One uppercase letter"
                />
                <PasswordRequirement
                  met={passwordStrength.hasNumber}
                  text="One number"
                />
                <PasswordRequirement
                  met={passwordStrength.hasSpecialChar}
                  text="One special character"
                />
              </View>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="Re-enter your password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              secureTextEntry
              autoComplete="password-new"
              editable={!isLoading}
            />
            {errors.confirmPassword ? (
              <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Terms and Conditions */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => {
              setAcceptedTerms(!acceptedTerms);
              setErrors((prev) => ({ ...prev, terms: '' }));
            }}
            disabled={isLoading}
          >
            <View
              style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
            >
              {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I accept the{' '}
              <Text style={styles.link}>Terms and Conditions</Text>
            </Text>
          </TouchableOpacity>
          {errors.terms ? (
            <Text style={[styles.fieldError, { marginTop: 4 }]}>
              {errors.terms}
            </Text>
          ) : null}

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.button,
              isLoading && styles.buttonDisabled,
              { marginTop: 24 },
            ]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.signinContainer}>
            <Text style={styles.signinText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity disabled={isLoading}>
                <Text style={styles.signinLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PasswordRequirement: React.FC<{ met: boolean; text: string }> = ({
  met,
  text,
}) => {
  const [animation] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.spring(animation, {
      toValue: met ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [met]);

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <View style={styles.requirementRow}>
      <Animated.View
        style={[
          styles.requirementIcon,
          met && styles.requirementIconMet,
          { transform: [{ scale }] },
        ]}
      >
        {met && <Text style={styles.requirementCheck}>✓</Text>}
      </Animated.View>
      <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 40,
  },
  scrollContentMobile: {
    padding: 16,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardMobile: {
    padding: 24,
    borderRadius: 12,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  fieldError: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  strengthContainer: {
    marginTop: 12,
    gap: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementIconMet: {
    backgroundColor: '#6BCF7F',
    borderColor: '#6BCF7F',
  },
  requirementCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requirementText: {
    fontSize: 13,
    color: '#6B7280',
  },
  requirementTextMet: {
    color: '#374151',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  link: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  button: {
    height: 48,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signinLink: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
