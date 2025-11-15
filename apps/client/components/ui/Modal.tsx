import React from 'react';
import {
  Modal as RNModal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  fullScreen?: boolean;
  containerStyle?: ViewStyle;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  footer,
  fullScreen = false,
  containerStyle,
}) => {
  const { isMobile } = useResponsive();
  const shouldBeFullScreen = fullScreen || isMobile;

  return (
    <RNModal
      visible={visible}
      transparent={!shouldBeFullScreen}
      animationType={shouldBeFullScreen ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.modalContainer,
              shouldBeFullScreen && styles.modalContainerFullScreen,
              containerStyle,
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {children}
            </ScrollView>

            {/* Footer */}
            {footer && <View style={styles.footer}>{footer}</View>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  modalContainerFullScreen: {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

