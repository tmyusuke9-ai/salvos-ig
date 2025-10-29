import { InstagramProvider, RawMedia } from './InstagramProvider.js';
import { env } from '../../env.js';

export class GraphApiProvider implements InstagramProvider {
  async resolveHandle(handleOrUrl: string): Promise<string> {
    return handleOrUrl.replace(/^https?:\/\/www\.instagram\.com\//, '').replace(/\/?$/, '');
  }

  async fetchLatestByProfile(handleOrUrl: string, limit = 12): Promise<RawMedia[]> {
    if (!env.IG_GRAPH_ACCESS_TOKEN || !env.IG_GRAPH_USER_ID) {
      throw new Error('Graph API not configured');
    }
    // TODO: implementar chamadas à Graph API
    return [];
  }
}
