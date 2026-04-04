import * as fs from 'fs';
import * as path from 'path';

// ─── Types ──────────────────────────────────────────────────────────────

export interface Integration {
  type: 'slack' | 'discord' | 'email' | 'website';
  label: string;
  url?: string;
  channelId?: string;
  serverId?: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  password?: string;
  integrations: Integration[];
  memberIds: string[];
  adminIds: string[];
  createdAt: string;
}

interface ClubStore {
  clubs: Club[];
}

// ─── Persistence ────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'clubs.json');

function loadStore(): ClubStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as ClubStore;
    }
  } catch (err) {
    console.error('[ClubStore] Error loading clubs.json, seeding fresh:', err);
  }
  const store = { clubs: seedClubs() };
  saveStore(store);
  return store;
}

function saveStore(store: ClubStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

let store: ClubStore = loadStore();

// ─── Seed data ──────────────────────────────────────────────────────────

function seedClubs(): Club[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'club-scottylabs',
      name: 'ScottyLabs',
      description:
        'CMU\'s premier student-run tech organization. We run TartanHacks, build open-source tools for campus, and host workshops on web dev, systems, and more.',
      integrations: [
        { type: 'slack', label: '#scottylabs', channelId: 'C0SCOTTY01' },
        { type: 'discord', label: 'ScottyLabs Discord', url: 'https://discord.gg/scottylabs' },
        { type: 'email', label: 'hello@scottylabs.org' },
        { type: 'website', label: 'scottylabs.org', url: 'https://scottylabs.org' },
      ],
      memberIds: ['user-demo-001', 'user-demo-002'],
      adminIds: ['admin-demo', 'user-demo-004'],
      createdAt: now,
    },
    {
      id: 'club-tricking',
      name: 'CMU Tricking Club',
      description:
        'Flips, kicks, and combos! Learn martial arts tricking in a supportive community. All skill levels welcome — from beginners to advanced.',
      integrations: [
        { type: 'discord', label: 'Tricking Discord', url: 'https://discord.gg/cmutricking' },
        { type: 'email', label: 'tricking@andrew.cmu.edu' },
      ],
      memberIds: [],
      adminIds: ['admin-demo', 'user-demo-004'],
      createdAt: now,
    },
    {
      id: 'club-kpdc',
      name: 'KPDC (K-Pop Dance Club)',
      description:
        'CMU\'s K-Pop dance crew. Weekly practices, cover videos, and performances at campus events. No prior dance experience needed!',
      password: 'kpdc2026',
      integrations: [
        { type: 'discord', label: 'KPDC Discord', url: 'https://discord.gg/cmukpdc' },
        { type: 'email', label: 'kpdc@andrew.cmu.edu' },
        { type: 'website', label: 'cmukpdc.com', url: 'https://cmukpdc.com' },
      ],
      memberIds: ['user-demo-002'],
      adminIds: ['admin-demo', 'user-demo-004'],
      createdAt: now,
    },
    {
      id: 'club-hksa',
      name: 'HKSA (Hong Kong Student Association)',
      description:
        'Connecting students from Hong Kong and those interested in HK culture. Social events, dim sum nights, cultural celebrations, and networking.',
      integrations: [
        { type: 'slack', label: '#hksa-general', channelId: 'C0HKSA01' },
        { type: 'discord', label: 'HKSA Discord', url: 'https://discord.gg/cmuhksa' },
        { type: 'email', label: 'hksa@andrew.cmu.edu' },
      ],
      memberIds: ['user-demo-001', 'user-001'],
      adminIds: ['admin-demo', 'user-demo-004'],
      createdAt: now,
    },
    {
      id: 'club-acm',
      name: 'ACM@CMU',
      description:
        'The CMU chapter of the Association for Computing Machinery. Competitive programming, tech talks, interview prep, and hackathon teams.',
      password: 'acmcmu',
      integrations: [
        { type: 'slack', label: '#acm-general', channelId: 'C0ACM01' },
        { type: 'discord', label: 'ACM Discord', url: 'https://discord.gg/cmuacm' },
        { type: 'email', label: 'acm@cmu.edu' },
        { type: 'website', label: 'cmuacm.org', url: 'https://cmuacm.org' },
      ],
      memberIds: ['user-demo-001'],
      adminIds: ['admin-demo', 'user-demo-004'],
      createdAt: now,
    },
    {
      id: 'club-buggy',
      name: 'Buggy / Sweepstakes',
      description:
        'CMU\'s iconic tradition! Design, build, and race human-powered vehicles around Flagstaff Hill during Carnival. Join an org or just come watch.',
      integrations: [
        { type: 'website', label: 'cmubuggy.org', url: 'https://cmubuggy.org' },
        { type: 'email', label: 'sweepstakes@andrew.cmu.edu' },
      ],
      memberIds: ['user-001'],
      adminIds: ['admin-demo', 'user-demo-004'],
      createdAt: now,
    },
    {
      id: 'club-thebridge',
      name: 'The Bridge (CMU Consulting)',
      description:
        'Pro-bono consulting for Pittsburgh nonprofits. Gain real consulting experience while making an impact in the local community.',
      password: 'bridge2026',
      integrations: [
        { type: 'slack', label: '#the-bridge', channelId: 'C0BRG01' },
        { type: 'email', label: 'thebridge@andrew.cmu.edu' },
        { type: 'website', label: 'cmuthebridge.com', url: 'https://cmuthebridge.com' },
      ],
      memberIds: [],
      adminIds: ['admin-demo', 'user-demo-004'],
      createdAt: now,
    },
    {
      id: 'club-abcarpets',
      name: 'AB Carpets (Activities Board)',
      description:
        'We plan the big campus events — concerts, comedians, movie nights, and more. Help bring entertainment to CMU!',
      integrations: [
        { type: 'discord', label: 'AB Discord', url: 'https://discord.gg/cmuab' },
        { type: 'email', label: 'ab@andrew.cmu.edu' },
        { type: 'website', label: 'cmuab.org', url: 'https://cmuab.org' },
      ],
      memberIds: ['user-demo-002', 'user-demo-003'],
      adminIds: ['admin-demo', 'user-demo-004'],
      createdAt: now,
    },
  ];
}

// ─── Public API ─────────────────────────────────────────────────────────

export function getClubs(): Club[] {
  return store.clubs;
}

export function getClub(id: string): Club | undefined {
  return store.clubs.find((c) => c.id === id);
}

export function createClub(data: Omit<Club, 'id' | 'createdAt' | 'memberIds'>): Club {
  const club: Club = {
    ...data,
    id: `club-${Date.now()}`,
    memberIds: [],
    createdAt: new Date().toISOString(),
  };
  store.clubs.push(club);
  saveStore(store);
  return club;
}

export function joinClub(
  clubId: string,
  userId: string,
  password?: string
): { ok: boolean; error?: string } {
  const club = getClub(clubId);
  if (!club) return { ok: false, error: 'Club not found' };
  if (club.password && club.password !== password) {
    return { ok: false, error: 'Incorrect password' };
  }
  if (club.memberIds.includes(userId)) {
    return { ok: false, error: 'Already a member' };
  }
  club.memberIds.push(userId);
  saveStore(store);
  return { ok: true };
}

export function leaveClub(
  clubId: string,
  userId: string
): { ok: boolean; error?: string } {
  const club = getClub(clubId);
  if (!club) return { ok: false, error: 'Club not found' };
  const idx = club.memberIds.indexOf(userId);
  if (idx === -1) return { ok: false, error: 'Not a member' };
  club.memberIds.splice(idx, 1);
  saveStore(store);
  return { ok: true };
}

export function getClubMembers(clubId: string): string[] | null {
  const club = getClub(clubId);
  if (!club) return null;
  return club.memberIds;
}

export function getAllMemberships(): Array<{
  clubId: string;
  clubName: string;
  memberIds: string[];
}> {
  return store.clubs.map((c) => ({
    clubId: c.id,
    clubName: c.name,
    memberIds: c.memberIds,
  }));
}

export function isClubAdmin(clubId: string, userId: string): boolean {
  const club = getClub(clubId);
  if (!club) return false;
  return club.adminIds.includes(userId);
}
