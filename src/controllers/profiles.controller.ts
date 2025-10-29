import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { MediaIngestService } from '../services/media/MediaIngestService.js';

const createProfileSchema = z.object({
  handle: z.string().min(1),
  profileUrl: z.string().url(),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export async function createProfile(req, res, next) {
  try {
    const data = createProfileSchema.parse(req.body);
    const created = await prisma.profile.create({ data });
    return res.status(201).json(created);
  } catch (err) { next(err); }
}

export async function listProfiles(_req, res, next) {
  try {
    const items = await prisma.profile.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json({ items });
  } catch (err) { next(err); }
}

export async function getProfileById(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ error: 'profile_not_found' });
    return res.json(profile);
  } catch (err) { next(err); }
}

export async function deleteProfile(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.media.deleteMany({ where: { profileId: id } });
    await prisma.profile.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) { next(err); }
}

export async function refreshProfileMedia(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ error: 'profile_not_found' });

    const svc = new MediaIngestService();
    const result = await svc.ingestLatestForProfile(profile);

    return res.json(result);
  } catch (err) { next(err); }
}
