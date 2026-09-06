# BlueTasks — Supabase + Vercel

Blue Telegram Mini App with PostgreSQL/Supabase backend.

## Features
- Telegram auto registration/login using verified Telegram WebApp initData
- Permanent BLC balance in Supabase PostgreSQL
- Premium 3-minute task: 30 BLC, maximum 3 claims/day
- Other tasks: 5 / 6 / 7 / 10 BLC
- Referral link and referral count
- Minimum withdrawal: 1500 BLC
- Withdrawal history
- Admin withdrawal status API
- Reward ledger for audit
- Vercel-compatible, no SQLite filesystem

## Important
`/api/task/complete` is a DEVELOPMENT demo reward endpoint. Do not use it as proof that a real ad was watched. In production, integrate a legitimate ad/offer provider that sends a verified server-to-server callback/postback. Verify the provider signature, task/offer ID, user ID, timestamp, and prevent duplicate crediting.

## Setup

### 1. Supabase
Create a Supabase project.
Open **SQL Editor** and run:

`supabase/schema.sql`

This creates the tables, secure database functions, indexes, and task seed data.

### 2. GitHub
Upload the entire project to a new GitHub repository.

### 3. Vercel
Import the GitHub repository into Vercel.

Add these Environment Variables:

- `BOT_TOKEN` = your NEW Telegram bot token
- `BOT_USERNAME` = your bot username without @
- `SUPABASE_URL` = Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase service_role key
- `ADMIN_IDS` = your Telegram numeric ID; multiple IDs separated by commas

Redeploy after adding variables.

### 4. Telegram
In BotFather set the Mini App / Menu Button URL to your Vercel HTTPS URL.

Then open the bot in Telegram and launch the Mini App.

## Security
- Never put the Supabase service-role key in HTML/JS.
- Never put the Telegram bot token in frontend files.
- If an old bot token was exposed, revoke it and use the new token.
- Admin API checks Telegram ID against `ADMIN_IDS`.
- Telegram initData is verified server-side.


  # BlueTasks Updated

This package updates the BlueTasks Telegram Mini App so bot commands can open the correct Mini App section.

## Commands

- /start -> Home
- /tasks -> Tasks
- /wallet -> Wallet
- /referral -> Referral
- /profile -> Profile
- /help -> Help

## Important environment variables

Set these in Vercel:

- BOT_TOKEN
- BOT_USERNAME
- WEBAPP_URL
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_IDS

Do not put real secrets in this ZIP or GitHub.

## Telegram webhook

After deploying, open these endpoints once while authenticated as the project owner/admin:

POST /api/telegram/set-webhook
POST /api/telegram/set-commands

The webhook URL becomes:

WEBAPP_URL + /api/telegram/webhook

## Existing task reward flow

The current /api/task/complete endpoint remains the existing development/demo reward flow. For production advertising, replace it with verified ad/offer provider server-to-server postback verification. Do not rely on a browser timer alone.

## Files

- api/index.js
- index.html
- app.js
- style.css
- package.json
- vercel.json
- .env.example
- README.md

# BlueTasks Updated

This package updates the BlueTasks Telegram Mini App so bot commands can open the correct Mini App section.

## Commands

- /start -> Home
- /tasks -> Tasks
- /wallet -> Wallet
- /referral -> Referral
- /profile -> Profile
- /help -> Help

## Important environment variables

Set these in Vercel:

- BOT_TOKEN
- BOT_USERNAME
- WEBAPP_URL
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_IDS

Do not put real secrets in this ZIP or GitHub.

## Telegram webhook

After deploying, open these endpoints once while authenticated as the project owner/admin:

POST /api/telegram/set-webhook
POST /api/telegram/set-commands

The webhook URL becomes:

WEBAPP_URL + /api/telegram/webhook

## Existing task reward flow

The current /api/task/complete endpoint remains the existing development/demo reward flow. For production advertising, replace it with verified ad/offer provider server-to-server postback verification. Do not rely on a browser timer alone.

## Files

- api/index.js
- index.html
- app.js
- style.css
- package.json
- vercel.json
- .env.example
- README.md

## TADS integration

This build includes TADS widgets created for BlueTasks:
- TGB widget: `11984`
- Fullscreen widget: `11986`

The TADS SDK is loaded from `https://w.tads.me/widget.js`.
The TGB widget is rendered as a normal ad placement. The `premium3` task opens the TADS fullscreen widget, and the TADS `onShowReward` callback then calls `/api/task/complete` to apply the existing server-side daily-limit/reward logic.

Important: the browser callback is part of the TADS SDK flow, but a client-only callback should not be treated as cryptographic proof of a paid event. For high-value production rewards, use TADS's supported server/webhook verification flow if available for your account and reconcile rewards server-side.

Set TADS widget IDs in `app.js` if you create new widgets later.

## TADS integration

This build includes the TADS widgets created for BlueTasks:
- TGB widget: `11984`
- Fullscreen widget: `11986`

The TADS SDK is loaded from `https://w.tads.me/widget.js`. The TGB widget is rendered as a normal ad placement. The `premium3` task opens the TADS fullscreen widget; after TADS fires `onShowReward`, the app calls `/api/task/complete`, where the existing Supabase RPC applies the task's daily limit and BLC reward.

Important: the browser callback is the TADS SDK event, but a client callback alone is not cryptographic proof of a paid event. For production rewards with real economic value, reconcile rewards server-side using TADS's supported webhook/server verification flow where available for your account.

BlueTasks Updated
This package updates the BlueTasks Telegram Mini App so bot commands can open the correct Mini App section.
Commands
/start -> Home
/tasks -> Tasks
/wallet -> Wallet
/referral -> Referral
/profile -> Profile
/help -> Help
Important environment variables
Set these in Vercel:
BOT_TOKEN
BOT_USERNAME
WEBAPP_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_IDS
Do not put real secrets in this ZIP or GitHub.
Telegram webhook
After deploying, open these endpoints once while authenticated as the project owner/admin:
POST /api/telegram/set-webhook POST /api/telegram/set-commands
The webhook URL becomes:
WEBAPP_URL + /api/telegram/webhook
Existing task reward flow
The current /api/task/complete endpoint remains the existing development/demo reward flow. For production advertising, replace it with verified ad/offer provider server-to-server postback verification. Do not rely on a browser timer alone.
Files
api/index.js
index.html
app.js
style.css
package.json
vercel.json
.env.example
README.md
TADS integration
This build includes TADS widgets created for BlueTasks:
TGB widget: 11984
Fullscreen widget: 11986
The TADS SDK is loaded from https://w.tads.me/widget.js. The TGB widget is rendered as a normal ad placement. The premium3 task opens the TADS fullscreen widget, and the TADS onShowReward callback then calls /api/task/complete to apply the existing server-side daily-limit/reward logic.
Important: the browser callback is part of the TADS SDK flow, but a client-only callback should not be treated as cryptographic proof of a paid event. For high-value production rewards, use TADS's supported server/webhook verification flow if available for your account and reconcile rewards server-side.
Set TADS widget IDs in app.js if you create new widgets later.
TADS integration
This build includes the TADS widgets created for BlueTasks:
TGB widget: 11984
Fullscreen widget: 11986
The TADS SDK is loaded from https://w.tads.me/widget.js. The TGB widget is rendered as a normal ad placement. The premium3 task opens the TADS fullscreen widget; after TADS fires onShowReward, the app calls /api/task/complete, where the existing Supabase RPC applies the task's daily limit and BLC reward.
Important: the browser callback is the TADS SDK event, but a client callback alone is not cryptographic proof of a paid event. For production rewards with real economic value, reconcile rewards server-side using TADS's supported webhook/server verification flow where available for your account.
Rewards policy in this build
BLC display value: 1 BLC = ₹1 within the BlueTasks reward system, subject to eligibility, verification, minimum withdrawal and applicable withdrawal rules.
Global earning limit: 240 BLC per calendar day.
Minimum withdrawal: 1500 BLC.
Do not describe the value as a guaranteed payout outside the actual withdrawal rules.
IMPORTANT: enable the 240 BLC server-side cap
Run supabase/240_daily_blc_cap.sql in the Supabase SQL Editor. It adds an atomic per-user daily cap trigger on task_claims, so the 240 BLC limit is enforced by PostgreSQL rather than only by the browser.
The SQL uses a transaction advisory lock per Telegram user to prevent concurrent requests from bypassing the daily cap.
Ad policy
This build uses one TADS fullscreen ad for each earning action. It does not intentionally chain 3-4 ads from a single reward click. Excessive forced ad patterns can violate ad-network rules and may create low-quality traffic.
For production real-money rewards, use the ad provider's supported server-side verification/webhook flow where available. A browser onShowReward callback alone should not be treated as cryptographic proof of a billable ad event.
TADS fullscreen fix
The fullscreen integration uses controller.showAd() directly for each user action. It does not call loadAd() before every show, which avoids the common issue where the first ad displays successfully but subsequent ad attempts fail.
