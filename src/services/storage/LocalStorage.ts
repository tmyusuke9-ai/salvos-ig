import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../env.js';

export class LocalStorage {
  base = env.STORAGE_DIR;

  async ensureBase() {
    await fs.mkdir(this.base, { recursive: true });
  }

  async saveBuffer(relPath: string, buf: Buffer) {
    await this.ensureBase();
    const p = path.join(this.base, relPath);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, buf);
    return p;
  }
}
