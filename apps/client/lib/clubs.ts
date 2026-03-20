import { Club, ClubMembership } from '@/types/club';

const API_BASE = 'http://localhost:3001';

async function safeFetch(url: string, opts?: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, opts);
  } catch (err: any) {
    throw new Error(
      'Cannot reach club server. Make sure the slack-bot is running on port 3001.'
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Club server returned non-JSON response. Is the slack-bot running on port 3001?'
    );
  }

  return res.json();
}

export async function fetchClubs(userId?: string): Promise<Club[]> {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const data = await safeFetch(`${API_BASE}/api/clubs${params}`);
  if (!data.ok) throw new Error(data.error || 'Failed to fetch clubs');
  return data.clubs;
}

export async function fetchClubDetail(
  clubId: string,
  userId?: string
): Promise<Club> {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const data = await safeFetch(`${API_BASE}/api/clubs/${clubId}${params}`);
  if (!data.ok) throw new Error(data.error || 'Club not found');
  return data.club;
}

export async function joinClub(
  clubId: string,
  userId: string,
  password?: string
): Promise<Club> {
  const data = await safeFetch(`${API_BASE}/api/clubs/${clubId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password }),
  });
  if (!data.ok) throw new Error(data.error || 'Failed to join club');
  return data.club;
}

export async function leaveClub(
  clubId: string,
  userId: string
): Promise<void> {
  const data = await safeFetch(`${API_BASE}/api/clubs/${clubId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!data.ok) throw new Error(data.error || 'Failed to leave club');
}

export async function fetchClubMembers(
  clubId: string,
  adminUserId: string
): Promise<string[]> {
  const data = await safeFetch(
    `${API_BASE}/api/clubs/${clubId}/members?userId=${encodeURIComponent(adminUserId)}`
  );
  if (!data.ok) throw new Error(data.error || 'Failed to fetch members');
  return data.members;
}

export async function fetchAllMemberships(): Promise<ClubMembership[]> {
  const data = await safeFetch(`${API_BASE}/api/clubs/admin/memberships`);
  if (!data.ok) throw new Error(data.error || 'Failed to fetch memberships');
  return data.memberships;
}
