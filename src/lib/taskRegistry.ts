import {
  DAILY_TASKS,
  SOCIAL_TASKS,
  SPECIAL_TASKS,
  type DailyTaskId,
  type SocialTaskId,
  type SocialTaskStatus,
  type SpecialTaskId,
} from '@/types/game';

export { DAILY_TASKS, SPECIAL_TASKS, SOCIAL_TASKS };
export type { DailyTaskId, SocialTaskId, SocialTaskStatus, SpecialTaskId };

export type TaskRegistryId = DailyTaskId | SpecialTaskId | SocialTaskId;

export interface SocialTaskVerificationState {
  taskId: SocialTaskId;
  status: SocialTaskStatus;
  proofUrl: string | null;
}

const registry = new Map(
  [...DAILY_TASKS, ...SPECIAL_TASKS, ...SOCIAL_TASKS].map((task) => [task.id, task]),
);

export const getTaskRegistryEntry = (taskId: TaskRegistryId) => registry.get(taskId) ?? null;
