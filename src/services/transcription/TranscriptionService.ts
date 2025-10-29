export class TranscriptionService {
  async transcribe(localVideoPath: string): Promise<string> {
    return `Transcrição placeholder para: ${localVideoPath}`;
  }
}
