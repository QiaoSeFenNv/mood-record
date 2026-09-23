export enum MoodBand {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  CALM = 'CALM',
  HAPPY = 'HAPPY',
  VERY_HAPPY = 'VERY_HAPPY',
}

export const MOOD_BAND_NAMES: Readonly<Record<MoodBand, string>> = {
  [MoodBand.VERY_LOW]: '很低落',
  [MoodBand.LOW]: '有点低落',
  [MoodBand.CALM]: '平静',
  [MoodBand.HAPPY]: '比较愉快',
  [MoodBand.VERY_HAPPY]: '很愉快',
};

export const MOOD_BANDS: readonly MoodBand[] = Object.values(MoodBand);

/** 将完整精度的心情扭矩映射到唯一的五段心情。 */
export function torqueToMoodBand(torque: number): MoodBand {
  if (!Number.isInteger(torque) || torque < -100 || torque > 100) {
    throw new RangeError('心情扭矩必须是 -100 到 100 之间的整数');
  }
  if (torque <= -61) return MoodBand.VERY_LOW;
  if (torque <= -21) return MoodBand.LOW;
  if (torque <= 20) return MoodBand.CALM;
  if (torque <= 60) return MoodBand.HAPPY;
  return MoodBand.VERY_HAPPY;
}

export function moodBandName(band: MoodBand): string {
  return MOOD_BAND_NAMES[band];
}
