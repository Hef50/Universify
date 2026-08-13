import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';
import { Radii, Spacing, TouchTarget, Typography } from '@/constants/design';
import { useAuth } from '@/contexts/AuthContext';
import { useEventMessages } from '@/hooks/useEventMessages';
import { EventMessage, canParticipate } from '@/utils/eventMessages';
import { Event, RSVPStatus } from '@/types/event';

interface EventThreadProps {
  event: Event;
  /** The signed-in user's RSVP, used to gate the thread. */
  rsvpStatus: RSVPStatus;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * The conversation attached to an event: host announcements pinned at the top,
 * then everyone else's messages in order.
 *
 * Only people going (or maybe) and the host can read or post — the same rule
 * the database enforces — so the thread stays a room for people who are
 * actually coming rather than a public comment section.
 */
export const EventThread: React.FC<EventThreadProps> = ({ event, rsvpStatus }) => {
  const { colors, type } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, type), [colors, type]);
  const { currentUser } = useAuth();

  const isHost = Boolean(currentUser && event.organizer.id === currentUser.id);
  const allowed = Boolean(currentUser) && canParticipate(rsvpStatus, isHost);

  const { messages, isLoading, error, post, remove, isDeviceOnly } = useEventMessages({
    eventId: event.id,
    userId: currentUser?.id,
    authorName: currentUser?.name ?? 'Someone',
    enabled: allowed,
  });

  const [draft, setDraft] = useState('');
  const [asAnnouncement, setAsAnnouncement] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const send = async () => {
    if (!draft.trim() || isSending) return;
    setIsSending(true);
    const ok = await post(draft, asAnnouncement ? 'announcement' : 'message');
    setIsSending(false);
    if (ok) setDraft('');
  };

  const announcements = messages.filter((m) => m.kind === 'announcement');
  const chat = messages.filter((m) => m.kind === 'message');

  if (!allowed) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendee chat</Text>
        <View style={styles.lockedCard}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
          <Text style={styles.lockedText}>
            {currentUser
              ? 'Register for this event to see announcements and talk to the people going.'
              : 'Sign in and register to join the conversation for this event.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {isHost ? 'Announcements & chat' : 'Announcements & chat'}
        </Text>
        <Text style={styles.count}>
          {messages.length} {messages.length === 1 ? 'post' : 'posts'}
        </Text>
      </View>

      {announcements.length > 0 && (
        <View style={styles.announcements}>
          {announcements.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={message.userId === currentUser?.id}
              onDelete={() => remove(message.id)}
              styles={styles}
              colors={colors}
            />
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : chat.length === 0 && announcements.length === 0 ? (
        <Text style={styles.emptyText}>
          {isHost
            ? 'Nothing posted yet — send an announcement so everyone going hears it.'
            : 'No messages yet. Say hi to the people going.'}
        </Text>
      ) : (
        <View style={styles.messages}>
          {chat.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={message.userId === currentUser?.id}
              onDelete={() => remove(message.id)}
              styles={styles}
              colors={colors}
            />
          ))}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={
            asAnnouncement ? 'Announce something to everyone going…' : 'Message the group…'
          }
          placeholderTextColor={colors.textTertiary}
          multiline
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim() || isSending}
          style={[styles.sendButton, (!draft.trim() || isSending) && styles.sendButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Send"
        >
          <Ionicons name="arrow-up" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>

      {isHost && (
        <Pressable
          onPress={() => setAsAnnouncement((prev) => !prev)}
          style={styles.announceToggle}
          accessibilityRole="switch"
          accessibilityState={{ checked: asAnnouncement }}
        >
          <Ionicons
            name={asAnnouncement ? 'megaphone' : 'megaphone-outline'}
            size={15}
            color={asAnnouncement ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.announceText, asAnnouncement && styles.announceTextActive]}>
            Post as announcement
          </Text>
        </Pressable>
      )}

      {isDeviceOnly && (
        <Text style={styles.deviceNote}>
          Saved on this device — connect a Supabase project to sync the thread
          between everyone going.
        </Text>
      )}
    </View>
  );
};

function MessageBubble({
  message,
  isMine,
  onDelete,
  styles,
  colors,
}: {
  message: EventMessage;
  isMine: boolean;
  onDelete: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: AppPalette;
}) {
  const isAnnouncement = message.kind === 'announcement';
  return (
    <View style={[styles.bubble, isAnnouncement && styles.bubbleAnnouncement]}>
      <View style={[styles.avatar, isAnnouncement && styles.avatarAnnouncement]}>
        {isAnnouncement ? (
          <Ionicons name="megaphone" size={14} color={colors.onPrimary} />
        ) : (
          <Text style={styles.avatarText}>{initials(message.authorName)}</Text>
        )}
      </View>
      <View style={styles.bubbleBody}>
        <View style={styles.bubbleTop}>
          <Text style={styles.author} numberOfLines={1}>
            {message.authorName}
            {isAnnouncement ? ' · Host' : ''}
          </Text>
          <Text style={styles.time}>{timeAgo(message.createdAt)}</Text>
        </View>
        <Text style={styles.body}>{message.body}</Text>
        {isMine && (
          <Pressable onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: AppPalette, type: Typography) =>
  StyleSheet.create({
    section: {
      gap: Spacing.md,
      paddingTop: Spacing.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      ...type.title3,
      color: colors.textPrimary,
    },
    count: {
      ...type.footnote,
      color: colors.textTertiary,
    },
    lockedCard: {
      flexDirection: 'row',
      gap: Spacing.md,
      alignItems: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radii.md,
      padding: Spacing.lg,
    },
    lockedText: {
      ...type.callout,
      color: colors.textSecondary,
      flex: 1,
    },
    announcements: {
      gap: Spacing.md,
    },
    messages: {
      gap: Spacing.md,
    },
    loading: {
      paddingVertical: Spacing.xl,
    },
    emptyText: {
      ...type.callout,
      color: colors.textTertiary,
    },
    error: {
      ...type.footnote,
      color: colors.danger,
    },
    bubble: {
      flexDirection: 'row',
      gap: Spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radii.md,
      padding: Spacing.md,
    },
    bubbleAnnouncement: {
      backgroundColor: colors.infoSoft,
      borderColor: 'transparent',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: Radii.pill,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarAnnouncement: {
      backgroundColor: colors.primary,
    },
    avatarText: {
      ...type.caption,
      color: colors.textSecondary,
    },
    bubbleBody: {
      flex: 1,
      gap: Spacing.xxs,
    },
    bubbleTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: Spacing.sm,
    },
    author: {
      ...type.subhead,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    time: {
      ...type.caption,
      fontWeight: '400',
      color: colors.textTertiary,
    },
    body: {
      ...type.callout,
      color: colors.textPrimary,
    },
    deleteButton: {
      alignSelf: 'flex-start',
      paddingVertical: Spacing.xs,
    },
    deleteText: {
      ...type.caption,
      color: colors.textTertiary,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.sm,
    },
    input: {
      flex: 1,
      ...type.callout,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radii.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      minHeight: TouchTarget,
      maxHeight: 140,
    },
    sendButton: {
      width: TouchTarget,
      height: TouchTarget,
      borderRadius: Radii.pill,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    announceToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      alignSelf: 'flex-start',
      minHeight: TouchTarget - 12,
    },
    announceText: {
      ...type.footnote,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    announceTextActive: {
      color: colors.primary,
    },
    deviceNote: {
      ...type.caption,
      fontWeight: '400',
      color: colors.textTertiary,
    },
  });
