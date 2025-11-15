import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { EventFormData, EventCategory } from '@/types/event';
import {
  validateEventTitle,
  validateEventDescription,
  validateLocation,
  validateTimeRange,
} from '@/utils/validation';

interface CreateEventFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (eventData: EventFormData) => Promise<void>;
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
  visible,
  onClose,
  onSubmit,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setLocation('');
    setSelectedCategories([]);
    setIsClubEvent(false);
    setIsSocialEvent(true);
    setCapacity('');
    setRsvpEnabled(true);
    setAttendeeVisibility('public');
    setSelectedColor(COLOR_OPTIONS[0]);
    setTags('');
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

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (!endTime) {
      newErrors.endTime = 'End time is required';
    }

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
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
      };

      await onSubmit(eventData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Create Event"
      fullScreen
      footer={
        <View style={styles.footerButtons}>
          <Button
            title="Cancel"
            onPress={handleClose}
            variant="outline"
            size="large"
            style={{ flex: 1 }}
          />
          <Button
            title="Create Event"
            onPress={handleSubmit}
            variant="primary"
            size="large"
            loading={isSubmitting}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <View style={styles.form}>
        {/* Basic Info Section */}
        <Text style={styles.sectionTitle}>Basic Information</Text>

        <Input
          label="Event Title *"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Poker Night @ Wiegand"
          error={errors.title}
        />

        <Input
          label="Description *"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your event..."
          multiline
          numberOfLines={4}
          style={{ height: 100, textAlignVertical: 'top' }}
          error={errors.description}
        />

        {/* Date & Time Section */}
        <Text style={styles.sectionTitle}>Date & Time</Text>

        <View style={styles.row}>
          <Input
            label="Start Date *"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            containerStyle={{ flex: 1 }}
            error={errors.startDate}
          />
          <Input
            label="Start Time *"
            value={startTime}
            onChangeText={setStartTime}
            placeholder="HH:MM"
            containerStyle={{ flex: 1 }}
            error={errors.startTime}
          />
        </View>

        <View style={styles.row}>
          <Input
            label="End Date *"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            containerStyle={{ flex: 1 }}
            error={errors.endDate}
          />
          <Input
            label="End Time *"
            value={endTime}
            onChangeText={setEndTime}
            placeholder="HH:MM"
            containerStyle={{ flex: 1 }}
            error={errors.endTime}
          />
        </View>

        {/* Location Section */}
        <Text style={styles.sectionTitle}>Location</Text>

        <Input
          label="Location *"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g., Wiegand Gym Lounge"
          error={errors.location}
        />

        {/* Categories Section */}
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

        {/* Event Type Section */}
        <Text style={styles.sectionTitle}>Event Type</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchText}>Club Event</Text>
            <Text style={styles.switchSubtext}>
              Official event organized by a club
            </Text>
          </View>
          <Switch
            value={isClubEvent}
            onValueChange={setIsClubEvent}
            trackColor={{ false: '#D1D5DB', true: '#FF6B6B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchText}>Social Event</Text>
            <Text style={styles.switchSubtext}>
              Casual event open to everyone
            </Text>
          </View>
          <Switch
            value={isSocialEvent}
            onValueChange={setIsSocialEvent}
            trackColor={{ false: '#D1D5DB', true: '#FF6B6B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Capacity Section */}
        <Text style={styles.sectionTitle}>Capacity (Optional)</Text>

        <Input
          label="Maximum Attendees"
          value={capacity}
          onChangeText={setCapacity}
          placeholder="Leave empty for unlimited"
          keyboardType="numeric"
          error={errors.capacity}
        />

        {/* RSVP Settings Section */}
        <Text style={styles.sectionTitle}>RSVP Settings</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchText}>Enable RSVP</Text>
            <Text style={styles.switchSubtext}>
              Allow people to RSVP to your event
            </Text>
          </View>
          <Switch
            value={rsvpEnabled}
            onValueChange={setRsvpEnabled}
            trackColor={{ false: '#D1D5DB', true: '#FF6B6B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {rsvpEnabled && (
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchText}>Public Attendee List</Text>
              <Text style={styles.switchSubtext}>
                Show who's attending this event
              </Text>
            </View>
            <Switch
              value={attendeeVisibility === 'public'}
              onValueChange={(value) =>
                setAttendeeVisibility(value ? 'public' : 'private')
              }
              trackColor={{ false: '#D1D5DB', true: '#FF6B6B' }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}

        {/* Color Section */}
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

        {/* Tags Section */}
        <Text style={styles.sectionTitle}>Tags (Optional)</Text>

        <Input
          label="Tags"
          value={tags}
          onChangeText={setTags}
          placeholder="e.g., poker, games, social (comma-separated)"
          helperText="Separate tags with commas"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  switchText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  switchSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#1F2937',
    borderWidth: 3,
  },
  colorCheckmark: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});

