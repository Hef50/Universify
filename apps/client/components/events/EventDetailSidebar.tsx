import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { AnimatedDrawer } from '@/components/ui/AnimatedDrawer';
import { Button } from '@/components/ui/Button';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { Event, RSVPStatus } from '@/types/event';
import { formatFullDate, formatTimeRange } from '@/utils/dateHelpers';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';

interface EventDetailSidebarProps {
  event: Event | null;
  visible: boolean;
  onClose: () => void;
}

export const EventDetailSidebar: React.FC<EventDetailSidebarProps> = ({
  event,
  visible,
  onClose,
}) => {
  const { isMobile } = useResponsive();
  const { currentUser } = useAuth();
  const { updateRSVP, getRSVPStatus } = useEvents();
  const [isUpdatingRSVP, setIsUpdatingRSVP] = useState(false);

  if (!event) return null;

  const userRSVP = currentUser ? getRSVPStatus(event.id, currentUser.id) : null;

  const handleRSVP = async (status: RSVPStatus) => {
    if (!currentUser) return;
    
    setIsUpdatingRSVP(true);
    try {
      await updateRSVP(event.id, currentUser.id, status);
    } finally {
      setIsUpdatingRSVP(false);
    }
  };

  return (
    <AnimatedDrawer
      visible={visible}
      onClose={onClose}
      position={isMobile ? 'bottom' : 'right'}
      width={isMobile ? '100%' : 420}
      height={isMobile ? '90%' : '100%'}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: event.color }]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{event.title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date & Time */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🕒</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date & Time</Text>
                <Text style={styles.infoValue}>
                  {formatFullDate(event.startTime)}
                </Text>
                <Text style={styles.infoValue}>
                  {formatTimeRange(event.startTime, event.endTime)}
                </Text>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{event.location}</Text>
              </View>
            </View>
          </View>

          {/* Organizer */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👤</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Organized by</Text>
                <Text style={styles.infoValue}>{event.organizer.name}</Text>
                {event.isClubEvent && (
                  <Text style={styles.organizerType}>Official Club Event</Text>
                )}
                {event.isSocialEvent && (
                  <Text style={styles.organizerType}>Social Event</Text>
                )}
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categories}>
              {event.categories.map((category) => (
                <CategoryPill
                  key={category}
                  category={category}
                  size="medium"
                  color={event.color}
                  active
                />
              ))}
            </View>
          </View>

          {/* Capacity */}
          {event.capacity && (
            <View style={styles.section}>
              <View style={styles.capacityInfo}>
                <Text style={styles.capacityLabel}>Capacity</Text>
                <Text style={styles.capacityValue}>
                  {event.rsvpCounts.going + event.rsvpCounts.maybe} / {event.capacity}
                </Text>
              </View>
              <View style={styles.capacityBar}>
                <View
                  style={[
                    styles.capacityFill,
                    {
                      width: `${Math.min(
                        100,
                        ((event.rsvpCounts.going + event.rsvpCounts.maybe) /
                          event.capacity) *
                          100
                      )}%`,
                      backgroundColor: event.color,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* RSVP Stats */}
          {event.rsvpEnabled && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RSVPs</Text>
              <View style={styles.rsvpStats}>
                <View style={styles.rsvpStat}>
                  <Text style={styles.rsvpCount}>{event.rsvpCounts.going}</Text>
                  <Text style={styles.rsvpLabel}>Going</Text>
                </View>
                <View style={styles.rsvpStat}>
                  <Text style={styles.rsvpCount}>{event.rsvpCounts.maybe}</Text>
                  <Text style={styles.rsvpLabel}>Maybe</Text>
                </View>
                <View style={styles.rsvpStat}>
                  <Text style={styles.rsvpCount}>
                    {event.rsvpCounts.notGoing}
                  </Text>
                  <Text style={styles.rsvpLabel}>Not Going</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        {event.rsvpEnabled && (
          <View style={styles.footer}>
            <Button
              title="Going"
              onPress={() => handleRSVP(userRSVP === 'going' ? null : 'going')}
              variant={userRSVP === 'going' ? 'primary' : 'outline'}
              size="medium"
              loading={isUpdatingRSVP}
              style={{ flex: 1 }}
            />
            <Button
              title="Maybe"
              onPress={() => handleRSVP(userRSVP === 'maybe' ? null : 'maybe')}
              variant={userRSVP === 'maybe' ? 'primary' : 'outline'}
              size="medium"
              loading={isUpdatingRSVP}
              style={{ flex: 1 }}
            />
            <Button
              title="Not Going"
              onPress={() =>
                handleRSVP(userRSVP === 'not-going' ? null : 'not-going')
              }
              variant={userRSVP === 'not-going' ? 'secondary' : 'ghost'}
              size="medium"
              loading={isUpdatingRSVP}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>
    </AnimatedDrawer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 2,
  },
  organizerType: {
    fontSize: 12,
    color: '#8B7FFF',
    fontWeight: '600',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  capacityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  capacityLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  capacityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  capacityBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  rsvpStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rsvpStat: {
    alignItems: 'center',
  },
  rsvpCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  rsvpLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

