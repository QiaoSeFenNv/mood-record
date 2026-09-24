import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MoodRepository } from './mood.repository.js';
import { ReceiptCleanupService } from './receipt-cleanup.service.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('ReceiptCleanupService', () => {
  it('sweeps on startup and hourly, then stops on shutdown', async () => {
    vi.useFakeTimers();
    const pruneExpiredReceipts = vi.fn().mockResolvedValue(0);
    const service = new ReceiptCleanupService({
      pruneExpiredReceipts,
    } as unknown as MoodRepository);

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(pruneExpiredReceipts).toHaveBeenCalledTimes(1);
    expect(pruneExpiredReceipts).toHaveBeenCalledWith(expect.any(Date));

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(pruneExpiredReceipts).toHaveBeenCalledTimes(2);
    service.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(pruneExpiredReceipts).toHaveBeenCalledTimes(2);
  });
});
