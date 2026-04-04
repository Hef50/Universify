import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useClubs } from '@/contexts/ClubContext';
import { useAuth } from '@/contexts/AuthContext';
import { Club, ClubIntegration, ClubMembership } from '@/types/club';

const INTEGRATION_META: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  slack: { icon: '#', color: '#4A154B', label: 'Slack' },
  discord: { icon: 'D', color: '#5865F2', label: 'Discord' },
  email: { icon: '@', color: '#EA4335', label: 'Email' },
  website: { icon: 'W', color: '#2563EB', label: 'Website' },
};

function IntegrationBadge({ type }: { type: string }) {
  const meta = INTEGRATION_META[type] || {
    icon: '?',
    color: '#6B7280',
    label: type,
  };
  return (
    <View style={[styles.integrationBadge, { backgroundColor: meta.color + '18' }]}>
      <View style={[styles.integrationDot, { backgroundColor: meta.color }]}>
        <Text style={styles.integrationDotText}>{meta.icon}</Text>
      </View>
      <Text style={[styles.integrationBadgeText, { color: meta.color }]}>
        {meta.label}
      </Text>
    </View>
  );
}

function IntegrationCard({
  integration,
}: {
  integration: ClubIntegration;
}) {
  const meta = INTEGRATION_META[integration.type] || {
    icon: '?',
    color: '#6B7280',
    label: integration.type,
  };

  const handlePress = () => {
    if (integration.url) {
      Linking.openURL(integration.url).catch(() => {});
    } else if (integration.type === 'email' && integration.label) {
      Linking.openURL(`mailto:${integration.label}`).catch(() => {});
    }
  };

  const hasLink =
    !!integration.url ||
    (integration.type === 'email' && !!integration.label);

  return (
    <TouchableOpacity
      style={[styles.integrationCard, { borderLeftColor: meta.color }]}
      onPress={handlePress}
      disabled={!hasLink}
      activeOpacity={hasLink ? 0.7 : 1}
    >
      <View style={[styles.integrationIconBox, { backgroundColor: meta.color }]}>
        <Text style={styles.integrationIconText}>{meta.icon}</Text>
      </View>
      <View style={styles.integrationCardContent}>
        <Text style={styles.integrationCardTitle}>{meta.label}</Text>
        <Text style={styles.integrationCardLabel} numberOfLines={1}>
          {integration.label}
        </Text>
      </View>
      {hasLink && <Text style={styles.integrationArrow}>{'>'}</Text>}
    </TouchableOpacity>
  );
}

function ClubCard({
  club,
  onJoin,
  onLeave,
  onViewDetail,
}: {
  club: Club;
  onJoin: (club: Club) => void;
  onLeave: (club: Club) => void;
  onViewDetail: (club: Club) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{club.name}</Text>
          <View style={styles.cardBadges}>
            {club.requiresPassword && !club.isMember && (
              <View style={styles.lockBadge}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            )}
            {club.isMember && (
              <View style={styles.joinedBadge}>
                <Text style={styles.joinedText}>Joined</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.cardDescription} numberOfLines={expanded ? undefined : 2}>
          {club.description}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.memberCount}>
            {club.memberCount} {club.memberCount === 1 ? 'member' : 'members'}
          </Text>
          {club.integrationTypes && club.integrationTypes.length > 0 && (
            <View style={styles.integrationBadges}>
              {club.integrationTypes.map((type) => (
                <IntegrationBadge key={type} type={type} />
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardExpanded}>
          <View style={styles.divider} />

          {club.isMember && club.integrations && club.integrations.length > 0 && (
            <View style={styles.integrationsSection}>
              <Text style={styles.sectionTitle}>Access Points</Text>
              {club.integrations.map((integration, idx) => (
                <IntegrationCard
                  key={`${integration.type}-${idx}`}
                  integration={integration}
                />
              ))}
            </View>
          )}

          {!club.isMember && (
            <View style={styles.joinPrompt}>
              <Text style={styles.joinPromptText}>
                Join this club to access all integrations
                {club.requiresPassword ? ' (password required)' : ''}
              </Text>
            </View>
          )}

          <View style={styles.actionRow}>
            {club.isMember ? (
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => onLeave(club)}
              >
                <Text style={styles.leaveButtonText}>Leave Club</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => onJoin(club)}
              >
                <Text style={styles.joinButtonText}>
                  {club.requiresPassword ? 'Join with Password' : 'Join Club'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const ADMIN_USER_IDS = ['admin-demo', 'user-demo-004'];

function AdminPanel({
  memberships,
  isLoading,
}: {
  memberships: ClubMembership[];
  isLoading: boolean;
}) {
  const [expandedClub, setExpandedClub] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.adminPanel}>
        <ActivityIndicator size="small" color="#4A154B" />
      </View>
    );
  }

  return (
    <View style={styles.adminPanel}>
      <View style={styles.adminHeader}>
        <Text style={styles.adminBadge}>ADMIN</Text>
        <Text style={styles.adminTitle}>All Club Memberships</Text>
      </View>
      {memberships.map((m) => (
        <View key={m.clubId} style={styles.adminClubRow}>
          <TouchableOpacity
            style={styles.adminClubHeader}
            onPress={() =>
              setExpandedClub(expandedClub === m.clubId ? null : m.clubId)
            }
          >
            <Text style={styles.adminClubName}>{m.clubName}</Text>
            <Text style={styles.adminMemberCount}>
              {m.memberIds.length} members
            </Text>
          </TouchableOpacity>
          {expandedClub === m.clubId && (
            <View style={styles.adminMemberList}>
              {m.memberIds.length === 0 ? (
                <Text style={styles.adminNoMembers}>No members yet</Text>
              ) : (
                m.memberIds.map((uid) => (
                  <Text key={uid} style={styles.adminMemberId}>
                    {uid}
                  </Text>
                ))
              )}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

export default function ClubsScreen() {
  const {
    clubs,
    isLoading,
    error,
    refreshClubs,
    joinClub,
    leaveClub,
    memberships,
    isLoadingMemberships,
    refreshMemberships,
  } = useClubs();
  const { currentUser } = useAuth();

  const isAdmin = currentUser
    ? ADMIN_USER_IDS.includes(currentUser.id)
    : false;

  useEffect(() => {
    if (isAdmin) {
      refreshMemberships();
    }
  }, [isAdmin]);

  const [passwordModalClub, setPasswordModalClub] = useState<Club | null>(null);
  const [password, setPassword] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = useCallback(
    (club: Club) => {
      if (club.requiresPassword) {
        setPasswordModalClub(club);
        setPassword('');
        setJoinError(null);
      } else {
        doJoin(club.id);
      }
    },
    [joinClub]
  );

  const doJoin = async (clubId: string, pw?: string) => {
    setIsJoining(true);
    setJoinError(null);
    try {
      await joinClub(clubId, pw);
      setPasswordModalClub(null);
      setPassword('');
    } catch (err: any) {
      const msg = err.message || 'Failed to join';
      setJoinError(msg);
      if (!passwordModalClub) {
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = useCallback(
    async (club: Club) => {
      const doLeave = async () => {
        try {
          await leaveClub(club.id);
        } catch (err: any) {
          const msg = err.message || 'Failed to leave';
          if (Platform.OS === 'web') {
            alert(msg);
          } else {
            Alert.alert('Error', msg);
          }
        }
      };

      if (Platform.OS === 'web') {
        if (confirm(`Leave ${club.name}?`)) {
          doLeave();
        }
      } else {
        Alert.alert('Leave Club', `Leave ${club.name}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: doLeave },
        ]);
      }
    },
    [leaveClub]
  );

  const joinedClubs = clubs.filter((c) => c.isMember);
  const availableClubs = clubs.filter((c) => !c.isMember);

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Clubs</Text>
        <Text style={styles.screenSubtitle}>
          {clubs.length} clubs available
        </Text>
      </View>

      {isLoading && clubs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshClubs}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[
            ...(isAdmin
              ? [{ type: 'admin' as const, title: '' }]
              : []),
            ...(joinedClubs.length > 0
              ? [{ type: 'header' as const, title: 'Your Clubs' }]
              : []),
            ...joinedClubs.map((c) => ({ type: 'club' as const, club: c, title: '' })),
            { type: 'header' as const, title: 'Available Clubs' },
            ...availableClubs.map((c) => ({ type: 'club' as const, club: c, title: '' })),
          ]}
          keyExtractor={(item, index) => {
            if (item.type === 'admin') return 'admin-panel';
            if (item.type === 'header') return `header-${item.title}`;
            return item.club!.id;
          }}
          renderItem={({ item }) => {
            if (item.type === 'admin') {
              return (
                <AdminPanel
                  memberships={memberships}
                  isLoading={isLoadingMemberships}
                />
              );
            }
            if (item.type === 'header') {
              return (
                <Text style={styles.sectionHeader}>{item.title}</Text>
              );
            }
            return (
              <ClubCard
                club={item.club!}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onViewDetail={() => {}}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshClubs} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏛️</Text>
              <Text style={styles.emptyTitle}>No clubs yet</Text>
              <Text style={styles.emptyText}>
                Clubs will appear here once the server is running
              </Text>
            </View>
          }
        />
      )}

      {/* Password Modal */}
      <Modal
        visible={!!passwordModalClub}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalClub(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPasswordModalClub(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Join {passwordModalClub?.name}
            </Text>
            <Text style={styles.modalSubtitle}>
              This club requires a password to join
            </Text>

            <TextInput
              style={styles.passwordInput}
              placeholder="Enter club password"
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setJoinError(null);
              }}
              autoFocus
            />

            {joinError && (
              <Text style={styles.errorMessage}>{joinError}</Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setPasswordModalClub(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!password || isJoining) && styles.submitButtonDisabled,
                ]}
                onPress={() =>
                  passwordModalClub && doJoin(passwordModalClub.id, password)
                }
                disabled={!password || isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  screenHeader: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  lockBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 14,
  },
  joinedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  integrationBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  integrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  integrationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  integrationDotText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  integrationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardExpanded: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  integrationsSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  integrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  integrationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  integrationIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  integrationCardContent: {
    flex: 1,
  },
  integrationCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  integrationCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  integrationArrow: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  joinPrompt: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 12,
  },
  joinPromptText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  joinButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  leaveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  leaveButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Admin Panel
  adminPanel: {
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  adminBadge: {
    backgroundColor: '#4A154B',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  adminClubRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  adminClubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  adminClubName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  adminMemberCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  adminMemberList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  adminMemberId: {
    fontSize: 13,
    color: '#4B5563',
    paddingVertical: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  adminNoMembers: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Password Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    minWidth: 80,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
