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
