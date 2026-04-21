export type DailyTaskId = 'check_in' | 'catch_10' | 'rare_1' | 'grill_1' | 'spend_1000';
export type SpecialTaskId = 'invite_friend' | 'wallet_check_in';
export type SocialTaskId =
  | 'twitter_follow'
  | 'twitter_repost'
  | 'twitter_like'
  | 'discord_join'
  | 'telegram_join';
export type TaskId = DailyTaskId | SpecialTaskId | SocialTaskId;

export type SocialTaskStatus = 'available' | 'pending_verification' | 'verified' | 'claimed';

export interface TaskDefinition {
  id: TaskId;
  title: string;
  target: number;
  rewardCoins?: number;
  rewardBait?: number;
  verificationMode?: 'automatic' | 'manual';
}

export const DAILY_TASKS: ReadonlyArray<TaskDefinition> = [
  { id: 'check_in', title: 'Daily check-in', target: 1, rewardCoins: 100 },
  { id: 'catch_10', title: 'Catch 10 fish', target: 10, rewardCoins: 100 },
  { id: 'rare_1', title: 'Catch 1 rare fish', target: 1, rewardCoins: 100 },
  { id: 'grill_1', title: 'Cook 1 dish', target: 1, rewardCoins: 100 },
  { id: 'spend_1000', title: 'Spend 1000 gold', target: 1000, rewardBait: 10 },
] as const;

export const SPECIAL_TASKS: ReadonlyArray<TaskDefinition> = [
  { id: 'wallet_check_in', title: 'Wallet streak check-in', target: 1, rewardBait: 10 },
  { id: 'invite_friend', title: 'Invite a friend', target: 1, rewardBait: 10 },
] as const;

export const SOCIAL_TASKS: ReadonlyArray<TaskDefinition> = [
  { id: 'twitter_follow', title: 'Follow on X', target: 1, rewardCoins: 0, verificationMode: 'manual' },
  { id: 'twitter_repost', title: 'Repost on X', target: 1, rewardCoins: 0, verificationMode: 'manual' },
  { id: 'twitter_like', title: 'Like on X', target: 1, rewardCoins: 0, verificationMode: 'manual' },
  { id: 'discord_join', title: 'Join Discord', target: 1, rewardCoins: 0, verificationMode: 'manual' },
  { id: 'telegram_join', title: 'Join Telegram', target: 1, rewardCoins: 0, verificationMode: 'manual' },
] as const;

export const DAILY_TASK_IDS = DAILY_TASKS.map((task) => task.id) as DailyTaskId[];
export const SPECIAL_TASK_IDS = SPECIAL_TASKS.map((task) => task.id) as SpecialTaskId[];
export const SOCIAL_TASK_IDS = SOCIAL_TASKS.map((task) => task.id) as SocialTaskId[];

const TASK_REGISTRY = new Map<TaskId, TaskDefinition>(
  [...DAILY_TASKS, ...SPECIAL_TASKS, ...SOCIAL_TASKS].map((task) => [task.id, task]),
);

export const getTaskDefinition = (taskId: string) => TASK_REGISTRY.get(taskId as TaskId) ?? null;
