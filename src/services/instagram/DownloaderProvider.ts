import { InstagramProvider, RawMedia } from './InstagramProvider.js';
import { env } from '../../env.js';

export class DownloaderProvider implements InstagramProvider {
  async resolveHandle(handleOrUrl: string): Promise<string> {
    return handleOrUrl
      .replace(/^https?:\/\/www\.instagram\.com\//, '')
      .replace(/\/?$/, '');
  }

  async fetchLatestByProfile(handleOrUrl: string, limit = 12): Promise<RawMedia[]> {
    if (!env.DOWNLOADER_API_BASE) {
      return [];
    }
    // TODO: implementar chamada HTTP ao serviço externo
    return [];
  }
}
