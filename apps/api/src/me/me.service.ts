import { Inject, Injectable } from '@nestjs/common';

import { MoodRepository } from '../repositories/mood.repository.js';
import { recordsToCsv } from './csv.js';

@Injectable()
export class MeService {
  constructor(@Inject(MoodRepository) private readonly moods: MoodRepository) {}

  async exportCsv(userId: string): Promise<string> {
    return recordsToCsv(await this.moods.findAllForUser(userId));
  }

  clear(userId: string): Promise<void> {
    return this.moods.clearForUser(userId);
  }

  deleteAccount(userId: string): Promise<void> {
    return this.moods.deleteAccount(userId);
  }
}
