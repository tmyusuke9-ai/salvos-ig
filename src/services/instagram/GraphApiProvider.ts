import { InstagramProvider, RawMedia } from './InstagramProvider.js';
import { env } from '../../env.js';

// Instagram Graph API docs (v20):
// Business Discovery: GET /{ig_user_id}?fields=business_discovery.username({username}){media.limit(N){caption,media_type,media_url,permalink,thumbnail_url,timestamp}}
// https://developers.facebook.com/docs/instagram-api/reference/ig-user/business_discovery

function mapType(t?: string): RawMedia['typeHint'] {
  switch ((t ?? '').toUpperCase()) {
    case 'REEL':
    case 'VIDEO':
      return 'REEL';
    case 'CAROUSEL_ALBUM':
      return 'CARROSSEL';
    case 'IMAGE':
      return 'ESTATICO';
    default:
      return 'DESCONHECIDO';
  }
}

export class GraphApiProvider implements InstagramProvider {
  async resolveHandle(handleOrUrl: string): Promise<string> {
    return handleOrUrl
      .replace(/^https?:\/\/www\.instagram\.com\//, '')
      .replace(/\/?$/, '');
  }

  private get base() {
    return `https://graph.facebook.com/v20.0`;
  }

  async fetchLatestByProfile(handleOrUrl: string, limit = 12): Promise<RawMedia[]> {
    const token = env.IG_GRAPH_ACCESS_TOKEN;
    const igUserId = env.IG_GRAPH_USER_ID;
    if (!token || !igUserId) throw new Error('Graph API not configured');

    const username = await this.resolveHandle(handleOrUrl);
    // Fields to request for each media
    const mediaFields = ['caption','media_type','media_url','permalink','thumbnail_url','timestamp'].join(',');

    // Note: Business Discovery requires that the IG user (igUserId) is a Business/Creator and that the app has permissions.
    const url = `${this.base}/${igUserId}?fields=business_discovery.username(${encodeURIComponent(username)}){media.limit(${limit}){${mediaFields}}}&access_token=${encodeURIComponent(token)}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Graph API error: ${resp.status} ${text}`);
    }
    const json: any = await resp.json();

    const media = json?.business_discovery?.media?.data ?? [];
    const items: RawMedia[] = media.map((m: any) => ({
      mediaUrl: m.permalink,
      caption: m.caption ?? undefined,
      publishedAt: m.timestamp ?? undefined,
      thumbnailUrl: m.thumbnail_url ?? undefined,
      typeHint: mapType(m.media_type),
    }));

    return items;
  }
}
