export type IntegrationType = 'slack' | 'discord' | 'email' | 'website';

export interface ClubIntegration {
  type: IntegrationType;
  label: string;
  url?: string;
  channelId?: string;
  serverId?: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  requiresPassword: boolean;
  memberCount: number;
  isMember: boolean;
  integrations: ClubIntegration[];
  integrationTypes: IntegrationType[];
  createdAt: string;
}

export interface ClubMembership {
  clubId: string;
  clubName: string;
  memberIds: string[];
}
