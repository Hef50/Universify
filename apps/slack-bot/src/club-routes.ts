import { Router, Request, Response } from 'express';
import {
  getClubs,
  getClub,
  joinClub,
  leaveClub,
  getClubMembers,
  getAllMemberships,
  isClubAdmin,
  createClub,
} from './club-store';

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function queryUserId(req: Request): string | undefined {
  const v = req.query.userId;
  if (!v) return undefined;
  return Array.isArray(v) ? String(v[0]) : String(v);
}

export function createClubRouter(): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const userId = queryUserId(req);
    const clubs = getClubs().map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      requiresPassword: !!c.password,
      memberCount: c.memberIds.length,
      isMember: userId ? c.memberIds.includes(userId) : false,
      integrationTypes: c.integrations.map((i) => i.type),
      createdAt: c.createdAt,
    }));
    res.json({ ok: true, clubs });
  });

  router.get('/admin/memberships', (_req: Request, res: Response) => {
    const memberships = getAllMemberships();
    res.json({ ok: true, memberships });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const userId = queryUserId(req);
    const club = getClub(paramId(req));
    if (!club) {
      res.status(404).json({ ok: false, error: 'Club not found' });
      return;
    }

    const isMember = userId ? club.memberIds.includes(userId) : false;

    res.json({
      ok: true,
      club: {
        id: club.id,
        name: club.name,
        description: club.description,
        requiresPassword: !!club.password,
        memberCount: club.memberIds.length,
        isMember,
        integrations: isMember ? club.integrations : [],
        createdAt: club.createdAt,
      },
    });
  });

  router.post('/:id/join', (req: Request, res: Response) => {
    const { userId, password } = req.body || {};
    if (!userId) {
      res.status(400).json({ ok: false, error: 'userId is required' });
      return;
    }

    const id = paramId(req);
    const result = joinClub(id, userId, password);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }

    const club = getClub(id)!;
    res.json({
      ok: true,
      club: {
        id: club.id,
        name: club.name,
        description: club.description,
        requiresPassword: !!club.password,
        memberCount: club.memberIds.length,
        isMember: true,
        integrations: club.integrations,
        createdAt: club.createdAt,
      },
    });
  });

  router.post('/:id/leave', (req: Request, res: Response) => {
    const { userId } = req.body || {};
    if (!userId) {
      res.status(400).json({ ok: false, error: 'userId is required' });
      return;
    }

    const result = leaveClub(paramId(req), userId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json({ ok: true });
  });

  router.get('/:id/members', (req: Request, res: Response) => {
    const userId = queryUserId(req);
    const id = paramId(req);
    if (!userId || !isClubAdmin(id, userId)) {
      res.status(403).json({ ok: false, error: 'Admin access required' });
      return;
    }

    const members = getClubMembers(id);
    if (members === null) {
      res.status(404).json({ ok: false, error: 'Club not found' });
      return;
    }
    res.json({ ok: true, members });
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, description, password, integrations, adminIds } = req.body || {};
    if (!name) {
      res.status(400).json({ ok: false, error: 'name is required' });
      return;
    }
    const club = createClub({
      name,
      description: description || '',
      password: password || undefined,
      integrations: integrations || [],
      adminIds: adminIds || [],
    });
    res.json({ ok: true, club });
  });

  return router;
}
