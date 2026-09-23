import { describe, expect, it } from 'vitest';

import { MoodBand, estimateResonance, localDayUtcWindow, torqueToMoodBand } from './index.js';

describe('torqueToMoodBand', () => {
  it.each([
    [-100, MoodBand.VERY_LOW],
    [-61, MoodBand.VERY_LOW],
    [-60, MoodBand.LOW],
    [-21, MoodBand.LOW],
    [-20, MoodBand.CALM],
    [20, MoodBand.CALM],
    [21, MoodBand.HAPPY],
    [60, MoodBand.HAPPY],
    [61, MoodBand.VERY_HAPPY],
    [100, MoodBand.VERY_HAPPY],
  ])('maps %i to %s', (torque, expected) => {
    expect(torqueToMoodBand(torque)).toBe(expected);
  });

  it('covers every valid integer exactly once', () => {
    expect(Array.from({ length: 201 }, (_, index) => torqueToMoodBand(index - 100))).toHaveLength(
      201,
    );
  });
});

describe('estimateResonance', () => {
  it.each([
    [0, null, 10],
    [1, 10, 10],
    [10, 100, 10],
    [11, 105, Math.sqrt(1000 / 11)],
    [999, 999, Math.sqrt(1000 / 999)],
    [1000, 1000, 1],
  ])('calculates N=%i', (baseCount, displayCount, coefficient) => {
    const result = estimateResonance(baseCount);
    expect(result.displayCount).toBe(displayCount);
    expect(result.coefficient).toBeCloseTo(coefficient);
  });

  it('is monotonic and keeps coefficient inside the disclosed range', () => {
    let previous = 0;
    for (let baseCount = 1; baseCount <= 5000; baseCount += 1) {
      const result = estimateResonance(baseCount);
      expect(result.displayCount).not.toBeNull();
      const displayCount = result.displayCount ?? 0;
      expect(displayCount).toBeGreaterThanOrEqual(previous);
      expect(result.coefficient).toBeGreaterThanOrEqual(1);
      expect(result.coefficient).toBeLessThanOrEqual(10);
      previous = displayCount;
    }
  });
});

describe('localDayUtcWindow', () => {
  it('calculates the China local day with JavaScript offset semantics', () => {
    const result = localDayUtcWindow(new Date('2026-09-22T12:00:00.000Z'), -480);
    expect(result.startUtc.toISOString()).toBe('2026-09-21T16:00:00.000Z');
    expect(result.endUtc.toISOString()).toBe('2026-09-22T16:00:00.000Z');
  });

  it('uses a half-open 24 hour range', () => {
    const result = localDayUtcWindow(new Date('2026-09-22T23:59:59.999Z'), 300);
    expect(result.endUtc.getTime() - result.startUtc.getTime()).toBe(86_400_000);
  });
});
