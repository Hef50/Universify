import { supabase } from '@/lib/supabase';
import { Club, ClubIntegration, ClubMembership, IntegrationType } from '@/types/club';

interface ClubRow {
  id: string;
  name: string;
  description: string | null;
  password: string | null;
  admin_ids: string[];
  member_ids: string[];
  integrations: ClubIntegration[];
  created_at: string;
  updated_at: string;
}

function transformRow(row: ClubRow, userId?: string): Club {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    requiresPassword: !!row.password,
    memberCount: (row.member_ids || []).length,
    isMember: userId ? (row.member_ids || []).includes(userId) : false,
    integrations: row.integrations || [],
    integrationTypes: ((row.integrations || []) as ClubIntegration[]).map(
      (i) => i.type as IntegrationType
    ),
    createdAt: row.created_at,
  };
}

export async function fetchClubs(userId?: string): Promise<Club[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => transformRow(row as ClubRow, userId));
}

export async function fetchClubDetail(
  clubId: string,
  userId?: string
): Promise<Club> {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .single();

  if (error) throw new Error(error.message || 'Club not found');
  return transformRow(data as ClubRow, userId);
}

export async function joinClub(
  clubId: string,
  userId: string,
  password?: string
): Promise<Club> {
  const { data: club, error: fetchErr } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .single();

  if (fetchErr || !club) throw new Error('Club not found');
  const row = club as ClubRow;

  if (row.password && row.password !== password) {
    throw new Error('Incorrect password');
  }
  if ((row.member_ids || []).includes(userId)) {
    throw new Error('Already a member');
  }

  const updatedMembers = [...(row.member_ids || []), userId];
  const { error: updateErr } = await supabase
    .from('clubs')
    .update({ member_ids: updatedMembers })
    .eq('id', clubId);

  if (updateErr) throw new Error(updateErr.message);
  return transformRow({ ...row, member_ids: updatedMembers }, userId);
}

export async function leaveClub(
  clubId: string,
  userId: string
): Promise<void> {
  const { data: club, error: fetchErr } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .single();

  if (fetchErr || !club) throw new Error('Club not found');
  const row = club as ClubRow;

  const updatedMembers = (row.member_ids || []).filter((id) => id !== userId);
  const { error: updateErr } = await supabase
    .from('clubs')
    .update({ member_ids: updatedMembers })
    .eq('id', clubId);

  if (updateErr) throw new Error(updateErr.message);
}

export async function fetchClubMembers(
  clubId: string,
  _adminUserId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select('member_ids')
    .eq('id', clubId)
    .single();

  if (error) throw new Error(error.message || 'Failed to fetch members');
  return (data as { member_ids: string[] }).member_ids || [];
}

export async function fetchAllMemberships(): Promise<ClubMembership[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, member_ids');

  if (error) throw new Error(error.message || 'Failed to fetch memberships');
  return (data || []).map((row) => ({
    clubId: (row as ClubRow).id,
    clubName: (row as ClubRow).name,
    memberIds: (row as ClubRow).member_ids || [],
  }));
}
