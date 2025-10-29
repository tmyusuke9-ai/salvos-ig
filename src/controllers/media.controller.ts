import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { getPagination } from '../utils/pagination.js';
import { TranscriptionService } from '../services/transcription/TranscriptionService.js';

export async function listMedia(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where: any = {};

    if (req.query.category) where.category = String(req.query.category);
    if (req.query.type) where.type = String(req.query.type);
    if (req.query.tag) where.tags = { has: String(req.query.tag) };

    const [total, items] = await Promise.all([
      prisma.media.count({ where }),
      prisma.media.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit })
    ]);

    return res.json({ page, limit, total, items });
  } catch (err) { next(err); }
}

export async function getMediaById(req, res, next) {
  try {
    const { id } = req.params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return res.status(404).json({ error: 'media_not_found' });
    return res.json(media);
  } catch (err) { next(err); }
}

const updateSchema = z.object({
  type: z.enum(['REEL', 'CARROSSEL', 'ESTATICO', 'DESCONHECIDO']).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  caption: z.string().optional()
});

export async function updateMediaMeta(req, res, next) {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);
    const updated = await prisma.media.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) { next(err); }
}

export async function transcribeMedia(req, res, next) {
  try {
    const { id } = req.params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return res.status(404).json({ error: 'media_not_found' });
    if (!media.downloadPath) return res.status(400).json({ error: 'no_download_to_transcribe' });

    const svc = new TranscriptionService();
    const text = await svc.transcribe(media.downloadPath);

    const saved = await prisma.media.update({ where: { id }, data: { transcription: text } });
    return res.json(saved);
  } catch (err) { next(err); }
}
