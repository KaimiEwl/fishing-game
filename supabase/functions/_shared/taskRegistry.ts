export type DailyTaskId = 'check_in' | 'catch_10' | 'rare_1' | 'grill_1' | 'spend_1000';
export type SpecialTaskId = 'invite_friend' | 'wallet_check_in';
export type SocialTaskId =
  | 'twitter_follow'
  | 'twitter_repost'
  | 'twitter_like'
  | 'discord_join'
  | 'telegram_join';
export type WeeklyMissionId =
  | 'catch_60_fish'
  | 'catch_6_rare'
  | 'cook_5_dishes'
  | 'sell_3_dishes'
  | 'cube_3_days'
  | 'complete_1_premium_session';
export type TaskId = DailyTaskId | SpecialTaskId | SocialTaskId | WeeklyMissionId;

export type SocialTaskStatus = 'available' | 'pending_verification' | 'verified' | 'claimed';

export interface TaskDefinition {
  id: TaskId;
  title: string;
  target: number;
  rewardCoins?: number;
  rewardBait?: number;
  rewardCubeCharge?: number;
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

export const WEEKLY_MISSIONS: ReadonlyArray<TaskDefinition> = [
  { id: 'catch_60_fish', title: 'Catch 60 fish', target: 60, rewardCoins: 300 },
  { id: 'catch_6_rare', title: 'Catch 6 rare+ fish', target: 6, rewardCoins: 250 },
  { id: 'cook_5_dishes', title: 'Cook 5 dishes', target: 5, rewardBait: 10 },
  { id: 'sell_3_dishes', title: 'Sell 3 dishes', target: 3, rewardBait: 10 },
  { id: 'cube_3_days', title: 'Unlock cube on 3 days', target: 3, rewardCubeCharge: 1 },
  { id: 'complete_1_premium_session', title: 'Complete 1 premium session', target: 1, rewardCoins: 250 },
] as const;

export const DAILY_TASK_IDS = DAILY_TASKS.map((task) => task.id) as DailyTaskId[];
export const SPECIAL_TASK_IDS = SPECIAL_TASKS.map((task) => task.id) as SpecialTaskId[];
export const SOCIAL_TASK_IDS = SOCIAL_TASKS.map((task) => task.id) as SocialTaskId[];
export const WEEKLY_MISSION_IDS = WEEKLY_MISSIONS.map((task) => task.id) as WeeklyMissionId[];

const TASK_REGISTRY = new Map<TaskId, TaskDefinition>(
  [...DAILY_TASKS, ...SPECIAL_TASKS, ...SOCIAL_TASKS, ...WEEKLY_MISSIONS].map((task) => [task.id, task]),
);

export const getTaskDefinition = (taskId: string) => TASK_REGISTRY.get(taskId as TaskId) ?? null;
