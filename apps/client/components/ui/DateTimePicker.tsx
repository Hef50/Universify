import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DateTimePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type: 'date' | 'time';
  placeholder?: string;
  error?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  type,
  placeholder,
  error,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleManualChange = (text: string) => {
    setInputValue(text);
    onChange(text);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={inputValue}
          onChangeText={handleManualChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowPicker(true)}
        >
          <Ionicons
            name={type === 'date' ? 'calendar-outline' : 'time-outline'}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {showPicker && (
        <Modal
          visible={showPicker}
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <SafeAreaView style={styles.fullScreenContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.pickerHeaderTitle}>
                Select {type === 'date' ? 'Date' : 'Time'}
              </Text>
              <View style={styles.placeholderButton} />
            </View>
            
            <View style={styles.pickerContent}>
              {type === 'date' ? (
                <CalendarPicker
                  selectedDate={value}
                  onSelect={(date) => {
                    onChange(date);
                    setInputValue(date);
                    setShowPicker(false);
                  }}
                />
              ) : (
                <TimePicker
                  selectedTime={value}
                  onSelect={(time) => {
                    onChange(time);
                    setInputValue(time);
                    setShowPicker(false);
                  }}
                />
              )}
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
};

// Simple Calendar Component
const CalendarPicker = ({ selectedDate, onSelect }: { selectedDate: string; onSelect: (date: string) => void }) => {
  const [currentDate, setCurrentDate] = useState(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const handleDayPress = (day: number) => {
    const monthStr = (month + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    onSelect(`${year}-${monthStr}-${dayStr}`);
  };

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      days.push(
        <TouchableOpacity
          key={i}
          style={[styles.dayCell, isSelected && styles.dayCellSelected]}
          onPress={() => handleDayPress(i)}
        >
          <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{i}</Text>
        </TouchableOpacity>
      );
    }
    return days;
  };

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowButton}>
          <Ionicons name="chevron-forward" size={24} color="#374151" />
        </TouchableOpacity>
      </View>
      <View style={styles.weekDays}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <Text key={d} style={styles.weekDayText}>{d}</Text>
        ))}
      </View>
      <View style={styles.daysGrid}>{renderDays()}</View>
    </View>
  );
};

// Simple Time Picker Component (List of 15min intervals)
const TimePicker = ({ selectedTime, onSelect }: { selectedTime: string; onSelect: (time: string) => void }) => {
  const times = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 30) { // 30 min intervals
      const hour = i.toString().padStart(2, '0');
      const minute = j.toString().padStart(2, '0');
      times.push(`${hour}:${minute}`);
    }
  }

  return (
    <ScrollView style={styles.timePicker} contentContainerStyle={{ paddingBottom: 40 }}>
      {times.map((time) => (
        <TouchableOpacity
          key={time}
          style={[styles.timeOption, selectedTime === time && styles.timeOptionSelected]}
          onPress={() => onSelect(time)}
        >
          <Text style={[styles.timeText, selectedTime === time && styles.timeTextSelected]}>
            {time}
          </Text>
          {selectedTime === time && (
            <Ionicons name="checkmark" size={20} color="#FF6B6B" />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12, // Matching Input component
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  iconButton: {
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  
  // Full Screen Modal Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
  },
  placeholderButton: {
    width: 40, // Balance header
  },
  pickerContent: {
    flex: 1,
    padding: 24,
  },

  // Calendar Styles
  calendar: {
    width: '100%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  arrowButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayCellSelected: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
  },
  dayText: {
    fontSize: 16,
    color: '#374151',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Time Picker Styles
  timePicker: {
    flex: 1,
  },
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeOptionSelected: {
    backgroundColor: '#FFF1F1',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  timeText: {
    fontSize: 16,
    color: '#374151',
  },
  timeTextSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
