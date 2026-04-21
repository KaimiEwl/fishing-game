export const MIN_WITHDRAW_MON = 1;
export const MON_HOLD_DAYS = 7;

export const normalizeMonAmount = (value: number) => Math.round(value * 1e8) / 1e8;

export const formatMonAmount = (value: number) => {
  const normalized = normalizeMonAmount(value);
  return normalized.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
};
