export const MIN_WITHDRAW_MON = 1;
export const MON_HOLD_DAYS = 7;
const ACTIVE_WITHDRAW_STATUSES = new Set(['pending', 'approved']);

export interface MonRewardRow {
  amount_mon: string | number | null;
  hold_until: string | null;
}

export interface WithdrawRequestRow {
  amount_mon: string | number | null;
  status: string | null;
}

export interface MonBalanceSummary {
  totalEarnedMon: number;
  pendingHoldMon: number;
  withdrawableMon: number;
  pendingRequestMon: number;
  minWithdrawMon: number;
  holdDays: number;
}

const roundMonAmount = (value: number) => Math.round(value * 1e8) / 1e8;

export const toMonAmount = (value: string | number | null | undefined) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return roundMonAmount(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return roundMonAmount(parsed);
    }
  }

  return 0;
};

export const getMonHoldUntilIso = (date = new Date(), holdDays = MON_HOLD_DAYS) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + holdDays);
  return next.toISOString();
};

export const computeMonBalanceSummary = (
  rewardRows: MonRewardRow[],
  withdrawRows: WithdrawRequestRow[],
  now = new Date(),
): MonBalanceSummary => {
  const nowTime = now.getTime();

  let totalEarnedMon = 0;
  let pendingHoldMon = 0;
  let maturedMon = 0;
  let pendingRequestMon = 0;
  let paidMon = 0;

  for (const reward of rewardRows) {
    const amount = toMonAmount(reward.amount_mon);
    totalEarnedMon += amount;

    const holdUntilTime = reward.hold_until ? new Date(reward.hold_until).getTime() : Number.NaN;
    if (Number.isFinite(holdUntilTime) && holdUntilTime > nowTime) {
      pendingHoldMon += amount;
    } else {
      maturedMon += amount;
    }
  }

  for (const withdraw of withdrawRows) {
    const amount = toMonAmount(withdraw.amount_mon);
    if (ACTIVE_WITHDRAW_STATUSES.has(withdraw.status ?? '')) {
      pendingRequestMon += amount;
    } else if (withdraw.status === 'paid') {
      paidMon += amount;
    }
  }

  return {
    totalEarnedMon: roundMonAmount(totalEarnedMon),
    pendingHoldMon: roundMonAmount(pendingHoldMon),
    withdrawableMon: roundMonAmount(Math.max(0, maturedMon - pendingRequestMon - paidMon)),
    pendingRequestMon: roundMonAmount(pendingRequestMon),
    minWithdrawMon: MIN_WITHDRAW_MON,
    holdDays: MON_HOLD_DAYS,
  };
};
