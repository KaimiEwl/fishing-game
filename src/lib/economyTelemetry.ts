export type EconomyTelemetryEventName =
  | 'weekly_mission_progressed'
  | 'weekly_mission_claimed'
  | 'cube_daily_unlock_progressed'
  | 'premium_session_completed';

export interface EconomyTelemetryEvent {
  event: EconomyTelemetryEventName;
  payload: Record<string, unknown>;
  createdAt: string;
}

declare global {
  interface Window {
    __hookLootTelemetryQueue?: EconomyTelemetryEvent[];
  }
}

export const pushEconomyTelemetryEvent = (
  event: EconomyTelemetryEventName,
  payload: Record<string, unknown> = {},
) => {
  if (typeof window === 'undefined') return;

  const entry: EconomyTelemetryEvent = {
    event,
    payload,
    createdAt: new Date().toISOString(),
  };

  window.__hookLootTelemetryQueue = window.__hookLootTelemetryQueue ?? [];
  window.__hookLootTelemetryQueue.push(entry);

  if (import.meta.env.DEV) {
    console.debug('[economy-telemetry]', entry);
  }
};
