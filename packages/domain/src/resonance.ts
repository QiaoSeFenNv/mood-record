export interface ResonanceEstimate {
  baseCount: number;
  coefficient: number;
  displayCount: number | null;
  estimated: true;
}

/** 依据已确认的匿名趋势规则计算展示人数，同时保留可审计的基础人数与系数。 */
export function estimateResonance(baseCount: number): ResonanceEstimate {
  if (!Number.isSafeInteger(baseCount) || baseCount < 0) {
    throw new RangeError('基础人数必须是非负安全整数');
  }

  if (baseCount === 0) {
    return { baseCount, coefficient: 10, displayCount: null, estimated: true };
  }

  const coefficient = baseCount <= 10 ? 10 : baseCount < 1000 ? Math.sqrt(1000 / baseCount) : 1;
  return {
    baseCount,
    coefficient,
    displayCount: Math.round(baseCount * coefficient),
    estimated: true,
  };
}
