import { MediaType } from '@prisma/client';

export class MediaTypeDetector {
  static detect(input?: string): MediaType {
    if (!input) return MediaType.DESCONHECIDO;
    const t = input.toLowerCase();
    if (t.includes('reel')) return MediaType.REEL;
    if (t.includes('carousel') || t.includes('carrossel')) return MediaType.CARROSSEL;
    if (t.includes('image') || t.includes('static') || t.includes('estatico')) return MediaType.ESTATICO;
    return MediaType.DESCONHECIDO;
  }
}
