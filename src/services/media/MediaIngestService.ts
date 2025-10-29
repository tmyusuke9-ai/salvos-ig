import { prisma } from '../../db/prisma.js';
import { MediaType } from '@prisma/client';
import { MediaTypeDetector } from './MediaTypeDetector.js';
import { GraphApiProvider } from '../instagram/GraphApiProvider.js';
import { DownloaderProvider } from '../instagram/DownloaderProvider.js';

export class MediaIngestService {
  private provider;

  constructor(providerName: 'graph'|'downloader' = (process.env.IG_GRAPH_ACCESS_TOKEN ? 'graph' : 'downloader')) {
    this.provider = providerName === 'graph' ? new GraphApiProvider() : new DownloaderProvider();
  }

  async ingestLatestForProfile(profile: { id: string; handle: string; profileUrl: string; category: string; tags: string[]; }) {
    const raw = await this.provider.fetchLatestByProfile(profile.profileUrl);

    const toCreate = [] as any[];
    for (const r of raw) {
      const exists = await prisma.media.findFirst({ where: { mediaUrl: r.mediaUrl } });
      if (exists) continue;

      const type = MediaTypeDetector.detect(r.typeHint);
      toCreate.push({
        profileId: profile.id,
        mediaUrl: r.mediaUrl,
        caption: r.caption,
        publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
        type: type ?? MediaType.DESCONHECIDO,
        category: profile.category,
        tags: profile.tags,
        thumbnailUrl: r.thumbnailUrl ?? null,
      });
    }

    if (toCreate.length) {
      await prisma.media.createMany({ data: toCreate, skipDuplicates: true });
    }

    const count = toCreate.length;
    return { ingested: count };
  }
}
