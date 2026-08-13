import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { StarRating } from '@/components/events/StarRating';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';
import { Radii, Spacing, TouchTarget, Typography } from '@/constants/design';
import { EventRating, MAX_NOTE_LENGTH } from '@/utils/eventRatings';

interface RateEventRowProps {
  eventTitle: string;
  rating: EventRating | null;
  onRate: (stars: number, note?: string) => void;
  onClear: () => void;
}

/**
 * Rate an event you attended. Tapping a star saves immediately — the note is
 * optional and opens only after the first tap, so leaving a rating is one
 * gesture and elaborating is a choice.
 */
export const RateEventRow: React.FC<RateEventRowProps> = ({
  eventTitle,
  rating,
  onRate,
  onClear,
}) => {
  const { colors, type } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, type), [colors, type]);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [draft, setDraft] = useState(rating?.note ?? '');

  const stars = rating?.stars ?? 0;

  const handleStars = (next: number) => {
    onRate(next, rating?.note);
  };

  const saveNote = () => {
    if (!stars) return;
    onRate(stars, draft);
    setIsEditingNote(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>
          {stars ? 'Your rating' : 'How was it?'}
        </Text>
        <StarRating value={stars} onChange={handleStars} label={eventTitle} size={20} />
      </View>

      {stars > 0 && !isEditingNote && (
        <View style={styles.noteRow}>
          {rating?.note ? (
            <Text style={styles.note} numberOfLines={3}>
              “{rating.note}”
            </Text>
          ) : null}
          <View style={styles.noteActions}>
            <Pressable
              onPress={() => {
                setDraft(rating?.note ?? '');
                setIsEditingNote(true);
              }}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                {rating?.note ? 'Edit note' : 'Add a note'}
              </Text>
            </Pressable>
            <Pressable onPress={onClear} style={styles.linkButton}>
              <Text style={[styles.linkText, styles.clearText]}>Clear</Text>
            </Pressable>
          </View>
        </View>
      )}

      {isEditingNote && (
        <View style={styles.editor}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="What stood out? (optional)"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={MAX_NOTE_LENGTH}
            autoFocus
          />
          <View style={styles.editorActions}>
            <Pressable onPress={() => setIsEditingNote(false)} style={styles.linkButton}>
              <Text style={styles.linkText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={saveNote} style={styles.saveButton}>
              <Text style={styles.saveText}>Save note</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: AppPalette, type: Typography) =>
  StyleSheet.create({
    container: {
      gap: Spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    label: {
      ...type.subhead,
      color: colors.textSecondary,
    },
    noteRow: {
      gap: Spacing.sm,
    },
    note: {
      ...type.footnote,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    noteActions: {
      flexDirection: 'row',
      gap: Spacing.lg,
    },
    linkButton: {
      minHeight: TouchTarget - 12,
      justifyContent: 'center',
    },
    linkText: {
      ...type.footnote,
      fontWeight: '600',
      color: colors.primary,
    },
    clearText: {
      color: colors.textTertiary,
    },
    editor: {
      gap: Spacing.sm,
    },
    input: {
      ...type.callout,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radii.md,
      padding: Spacing.md,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    editorActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: Spacing.lg,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.lg,
      minHeight: TouchTarget - 8,
      justifyContent: 'center',
    },
    saveText: {
      ...type.subhead,
      color: colors.onPrimary,
    },
  });
