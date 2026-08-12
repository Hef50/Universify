import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { EventFormData, EventCategory } from '@/types/event';
import {
  validateEventTitle,
  validateEventDescription,
  validateLocation,
  validateTimeRange,
} from '@/utils/validation';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

// TOGGLE FOR AUTO-FILL BUTTON
const SHOW_AUTO_FILL = true;

interface CreateEventFormProps {
  onSubmit: (eventData: EventFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const ALL_CATEGORIES: EventCategory[] = [
  'Career',
  'Food',
  'Fun',
  'Afternoon',
  'Events',
  'Academic',
  'Networking',
  'Social',
  'Sports',
  'Arts',
  'Tech',
  'Wellness',
];

const COLOR_OPTIONS = [
  '#FF6B6B',
  '#8B7FFF',
  '#FF6BA8',
  '#FFA07A',
  '#FFD93D',
  '#6BCF7F',
  '#4ECDC4',
  '#FF8C94',
  '#95E1D3',
  '#C7A4FF',
  '#5B9BD5',
  '#A8E6CF',
];

export const CreateEventForm: React.FC<CreateEventFormProps> = ({
  onSubmit,
  isSubmitting = false,
}) => {
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [isClubEvent, setIsClubEvent] = useState(false);
  const [isSocialEvent, setIsSocialEvent] = useState(true);
  const [capacity, setCapacity] = useState('');
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [attendeeVisibility, setAttendeeVisibility] = useState<'public' | 'private'>('public');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState<
    'none' | 'daily' | 'weekly' | 'monthly'
  >('none');
  const [recurringInterval, setRecurringInterval] = useState('1');
  const [recurringEndDate, setRecurringEndDate] = useState('');

  const autoFillForm = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setTitle('Demo Event: React Workshop');
    setDescription('Join us for an interactive workshop on React Native development. Free pizza provided!');
    setStartDate(today.toISOString().split('T')[0]);
    setStartTime('18:00');
    setEndDate(today.toISOString().split('T')[0]);
    setEndTime('20:00');
    setLocation('Gates Hillman 4401');
    setSelectedCategories(['Tech', 'Academic', 'Food']);
    setIsClubEvent(true);
    setIsSocialEvent(true);
    setCapacity('50');
    setRsvpEnabled(true);
    setAttendeeVisibility('public');
    setSelectedColor('#FF6B6B');
    setTags('coding, react, workshop');
    setErrors({});
  };

  const toggleCategory = (category: EventCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const titleValidation = validateEventTitle(title);
    if (!titleValidation.valid) {
      newErrors.title = titleValidation.error!;
    }

    const descriptionValidation = validateEventDescription(description);
    if (!descriptionValidation.valid) {
      newErrors.description = descriptionValidation.error!;
    }

    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!startTime) newErrors.startTime = 'Start time is required';
    if (!endDate) newErrors.endDate = 'End date is required';
    if (!endTime) newErrors.endTime = 'End time is required';

    if (startDate && startTime && endDate && endTime) {
      if (!validateTimeRange(startDate, startTime, endDate, endTime)) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    const locationValidation = validateLocation(location);
    if (!locationValidation.valid) {
      newErrors.location = locationValidation.error!;
    }

    if (selectedCategories.length === 0) {
      newErrors.categories = 'Select at least one category';
    }

    if (capacity && (isNaN(Number(capacity)) || Number(capacity) <= 0)) {
      newErrors.capacity = 'Capacity must be a positive number';
    }

    if (imageUrl && !/^https?:\/\/.+/.test(imageUrl.trim())) {
      newErrors.imageUrl = 'Image must be an http(s) URL';
    }

    if (recurringFrequency !== 'none') {
      const interval = Number(recurringInterval);
      if (isNaN(interval) || interval < 1 || !Number.isInteger(interval)) {
        newErrors.recurringInterval = 'Repeat interval must be a whole number ≥ 1';
      }
      if (recurringEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(recurringEndDate)) {
        newErrors.recurringEndDate = 'Use YYYY-MM-DD';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const eventData: EventFormData = {
      title,
      description,
      startDate,
      startTime,
      endDate,
      endTime,
      location,
      categories: selectedCategories,
      isClubEvent,
      isSocialEvent,
      capacity: capacity ? Number(capacity) : undefined,
      rsvpEnabled,
      attendeeVisibility,
      color: selectedColor,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      imageUrl: imageUrl.trim() || undefined,
      recurring:
        recurringFrequency !== 'none'
          ? {
              frequency: recurringFrequency,
              interval: Number(recurringInterval) || 1,
              endDate: recurringEndDate || undefined,
            }
          : undefined,
    };

    await onSubmit(eventData);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Event</Text>
        {SHOW_AUTO_FILL && (
          <TouchableOpacity onPress={autoFillForm} style={styles.autoFillButton}>
            <Text style={styles.autoFillText}>Auto-fill (Demo)</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Basic Info Section */}
        <View style={[styles.section, styles.shadow]}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Input
            label="Event Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Poker Night @ Wiegand"
            error={errors.title}
            style={styles.input}
          />

          <Input
            label="Description *"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your event..."
            multiline
            numberOfLines={4}
            style={[styles.input, styles.textArea]}
            error={errors.description}
          />
        </View>

        {/* Date & Time Section */}
        <View style={[styles.section, styles.shadow]}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <DateTimePicker
                label="Start Date *"
                type="date"
                value={startDate}
                onChange={setStartDate}
                placeholder="YYYY-MM-DD"
                error={errors.startDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateTimePicker
                label="Start Time *"
                type="time"
                value={startTime}
                onChange={setStartTime}
                placeholder="HH:MM"
                error={errors.startTime}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <DateTimePicker
                label="End Date *"
                type="date"
                value={endDate}
                onChange={setEndDate}
                placeholder="YYYY-MM-DD"
                error={errors.endDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateTimePicker
                label="End Time *"
                type="time"
                value={endTime}
                onChange={setEndTime}
                placeholder="HH:MM"
                error={errors.endTime}
              />
            </View>
          </View>
        </View>

        {/* Repeat Section */}
        <View style={[styles.section, styles.shadow]}>
          <Text style={styles.sectionTitle}>Repeat</Text>
          <View style={styles.recurringOptions}>
            {(
              [
                { id: 'none', label: 'Does not repeat' },
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ] as const
            ).map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.recurringOption,
                  recurringFrequency === option.id && styles.recurringOptionActive,
                ]}
                onPress={() => setRecurringFrequency(option.id)}
              >
                <Text
                  style={[
                    styles.recurringOptionText,
                    recurringFrequency === option.id && styles.recurringOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {recurringFrequency !== 'none' && (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input
                  label={`Every N ${
                    recurringFrequency === 'daily'
                      ? 'days'
                      : recurringFrequency === 'weekly'
                        ? 'weeks'
                        : 'months'
                  }`}
                  value={recurringInterval}
                  onChangeText={setRecurringInterval}
                  placeholder="1"
                  keyboardType="number-pad"
                  error={errors.recurringInterval}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimePicker
                  label="Repeat Until (Optional)"
                  type="date"
                  value={recurringEndDate}
                  onChange={setRecurringEndDate}
                  placeholder="YYYY-MM-DD"
                  error={errors.recurringEndDate}
                />
              </View>
            </View>
          )}
        </View>

        {/* Location Section */}
        <View style={[styles.section, styles.shadow]}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Input
            label="Location *"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g., Wiegand Gym Lounge"
            error={errors.location}
            style={styles.input}
          />
        </View>

        {/* Image Section */}
        <View style={[styles.section, styles.shadow]}>
          <Text style={styles.sectionTitle}>Event Image</Text>
          <Input
            label="Image URL (Optional)"
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://example.com/flyer.png"
            error={errors.imageUrl}
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        {/* Categories Section */}
        <View style={[styles.section, styles.shadow]}>
          <Text style={styles.sectionTitle}>Categories *</Text>
          <View style={styles.categoryGrid}>
            {ALL_CATEGORIES.map((category) => (
              <CategoryPill
                key={category}
                category={category}
                active={selectedCategories.includes(category)}
                onPress={() => toggleCategory(category)}
                size="medium"
              />
            ))}
          </View>
          {errors.categories && (
            <Text style={styles.errorText}>{errors.categories}</Text>
          )}
        </View>

        {/* Event Type & Settings */}
        <View style={[styles.section, styles.shadow]}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchText}>Club Event</Text>
              <Text style={styles.switchSubtext}>Official event organized by a club</Text>
            </View>
            <Switch
              value={isClubEvent}
              onValueChange={setIsClubEvent}
              trackColor={{ false: colors.border, true: colors.primary }} // Changed false to lighter gray
              thumbColor={colors.onPrimary} // Explicitly white to fix "green on orange"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchText}>Social Event</Text>
              <Text style={styles.switchSubtext}>Casual event open to everyone</Text>
            </View>
            <Switch
              value={isSocialEvent}
              onValueChange={setIsSocialEvent}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.onPrimary}
            />
          </View>

          <Input
            label="Capacity (Optional)"
            value={capacity}
            onChangeText={setCapacity}
            placeholder="Leave empty for unlimited"
            keyboardType="numeric"
            error={errors.capacity}
            containerStyle={{ marginTop: 16 }}
          />
        </View>

        {/* Color Section */}
        <View style={[styles.section, styles.shadow]}>
          <Text style={styles.sectionTitle}>Event Color</Text>
          <View style={styles.colorGrid}>
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && (
                  <Text style={styles.colorCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.footer}>
          <Button
            title="Create Event"
            onPress={handleSubmit}
            variant="primary"
            size="large"
            loading={isSubmitting}
            style={styles.submitButton}
          />
        </View>
        
        <View style={{ height: 40 }} /> 
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    title: {
      fontSize: 28 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    autoFillButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
    },
    autoFillText: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    scrollContent: {
      paddingBottom: 40,
    },
    section: {
      marginBottom: 32,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.surfaceAlt,
    },
    shadow: {
      // Soft shadow for professional look
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 18 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 20,
    },
    recurringOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    recurringOption: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    recurringOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    recurringOptionText: {
      fontSize: 14 * fontScale,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    recurringOptionTextActive: {
      color: colors.onPrimary,
    },
    input: {
      backgroundColor: colors.surface,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: 16,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    errorText: {
      fontSize: 12 * fontScale,
      color: colors.danger,
      marginTop: 4,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceAlt,
    },
    switchLabel: {
      flex: 1,
      marginRight: 12,
    },
    switchText: {
      fontSize: 16 * fontScale,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    switchSubtext: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
      marginTop: 4,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    colorOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorOptionSelected: {
      borderColor: colors.textPrimary,
      transform: [{ scale: 1.1 }],
    },
    colorCheckmark: {
      fontSize: 22 * fontScale,
      color: colors.onPrimary,
      fontWeight: 'bold',
    },
    footer: {
      marginTop: 24,
    },
    submitButton: {
      width: '100%',
      height: 56,
      borderRadius: 12,
    },
  });
