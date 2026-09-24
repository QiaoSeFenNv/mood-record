import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';

import { MoodRepository } from './mood.repository.js';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class ReceiptCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReceiptCleanupService.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(@Inject(MoodRepository) private readonly moods: MoodRepository) {}

  onModuleInit(): void {
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** 只清理超过幂等保护期的回执，不读取或记录心情内容。 */
  private async sweep(): Promise<void> {
    try {
      const removed = await this.moods.pruneExpiredReceipts(new Date());
      if (removed > 0) this.logger.log(`Pruned ${removed} expired mutation receipts`);
    } catch (error) {
      this.logger.error('Expired mutation receipt cleanup failed', error);
    }
  }
}
