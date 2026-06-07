# Hook & Loot Discord Server Plan

## Objective
Build the Hook & Loot Discord as the official community hub for players between game sessions: news, support, feedback, flex posts, social quests, and event rewards.

## Research checkpoint before role creation
Before creating roles and channels, match common game-server patterns to Hook & Loot mechanics:
- Discord's game community guide recommends a server that covers channels, roles, moderation, invites, events, and a clear official home for the game.
- Community Onboarding should ask players what they want to do and assign roles/channels from those answers.
- Server Guide should give new members 3-5 starter tasks and resource pages.
- Rules Screening and AutoMod should be enabled before broad public invites.
- Hook & Loot-specific loops should turn catches, grill results, cube wins, wallet verification, and events into visible Discord identity.

References:
- https://docs.discord.com/developers/game-development/how-to-create-a-community-for-your-game
- https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ
- https://support.discord.com/hc/en-us/articles/13497665141655-Server-Guide-FAQ
- https://support.discord.com/hc/en-us/articles/1500000466882-Rules-Screening-FAQ
- https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ

## Server structure
### START HERE
- `#welcome`: short intro, game link, what to do next.
- `#rules`: simple rules and safety expectations.
- `#announcements`: release notes, economy updates, events.
- `#start-here`: first-player path: play, verify wallet, join quests.
- `#official-links`: game, website, socials, support links.
- `#roles`: role explanations and future bot role selection.

### GAME
- `#game-updates`: patch notes and live balancing notes.
- `#how-to-play`: core fishing loop, rods, bait, cube, grill, MON rewards.
- `#bug-reports`: player bug reports with a lightweight template.
- `#feedback`: suggestions and tuning feedback.
- `#known-issues`: current issues and workarounds.
- `#leaderboard`: weekly grill/catch highlights.

### COMMUNITY
- `#general`: main chat.
- `#catches-flex`: rare fish screenshots, MON pull screenshots.
- `#strategy`: rods, bait economy, cube choices, grill routes.
- `#memes`: community content.
- `#events-giveaways`: event announcements and entries.
- `#screenshots`: broader game screenshots.

### WEB3 MONAD
- `#wallet-help`: wallet connect and verification help.
- `#payments-help`: purchase/check-in help.
- `#security-alerts`: official scam/security warnings.
- `#withdrawal-status`: MON withdrawal and payout status.

### VOICE EVENTS
- `Fishing Lounge`: casual voice.
- `Event Voice`: event voice channel.
- `Dev Talk`: AMA/dev voice channel.

### STAFF
- `#mod-chat`: private staff coordination.
- `#mod-log`: moderation notes.
- `#bot-log`: bot action log.
- `#automod-alerts`: AutoMod alerts.

## Roles
### Staff and system
- `Hook & Loot Admin`: owner/dev/admin identity.
- `Moderator`: trusted moderation role.
- `HookLoot Bot`: bot identity/label.

### Player identity
- `Verified Angler`: Discord member linked to a game wallet/session.
- `Beta Tester`: tester access and feedback role.
- `VIP Holder`: paid rod/NFT/high-value community role.
- `News Ping`: announcement opt-in.
- `Events Ping`: event opt-in.

### Achievement and event roles
- `Rare Catch Club`: awarded for verified rare+ catch screenshots or game proof.
- `Leviathan Hunter`: awarded for Cosmic Leviathan catch.
- `Grill Master`: weekly grill leaderboard winner/contender.
- `Cube Winner`: notable cube prize winner.
- `Event Winner`: event/giveaway winner.

## Bot reward ideas
Start conservative: Discord should verify and celebrate activity, while the owned API remains the source of truth for actual game rewards.

- Join Discord quest: grant `Verified Angler`; mark `discord_join` verified in `social_task_verifications`; let player claim a small in-game reward.
- Rare catch flex: player posts proof in `#catches-flex`; admin/bot verifies; optional coins/bait or cosmetic role.
- Weekly grill winners: bot posts top 10 in `#leaderboard`; grants temporary `Grill Master`; in-game MON payout stays server-owned.
- Leviathan catch: bot announces catch, grants `Leviathan Hunter`, optional one-time bait/cube bonus.
- Cube jackpot: bot posts celebratory message in `#leaderboard` or `#catches-flex`, grants temporary `Cube Winner`.
- Event quests: bot creates limited-time Discord tasks, then admin/API applies rewards.

## Implementation phases
1. Research and game-fit design: finalize roles, channels, rewards, and moderation defaults from this plan.
2. Manual Discord prerequisites: add the bot to the server, give it `Manage Roles`, `Manage Channels`, `View Channels`, `Send Messages`, and `Read Message History`.
3. Environment setup: set `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` in local/server secrets.
4. Run the setup script: `npm run discord:setup -- --dry-run`, then `npm run discord:setup`.
5. Manual Discord setup: enable Community, Rules Screening, AutoMod, Onboarding, and Server Guide in Discord settings.
6. Game integration v1: enable `discord_join` task UI, link Discord user to wallet/session, verify guild membership, and mark the task verified.
7. Game integration v2: add bot announcements, achievement roles, and event reward review tools.

## Required env
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_POST_SETUP_MESSAGES=1` to post starter messages during setup
