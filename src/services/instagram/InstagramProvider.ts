export type RawMedia = {
  mediaUrl: string;
  caption?: string;
  publishedAt?: string;     // ISO
  thumbnailUrl?: string;
  typeHint?: 'REEL'|'CARROSSEL'|'ESTATICO'|'DESCONHECIDO';
};

export interface InstagramProvider {
  fetchLatestByProfile(handleOrUrl: string, limit?: number): Promise<RawMedia[]>;
  resolveHandle(handleOrUrl: string): Promise<string>;
}
