<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/da7c6473-abff-47df-9f4e-ae1255a6bd67

## Run Locally

**Prerequisites:**  Node.js


1. Install the locked dependencies:
   `npm ci`
2. Copy `.env.example` to `.env` and set your local MySQL password and `GEMINI_API_KEY`. Set a unique `JWT_SECRET` of at least 32 characters for production. If you want mock data instead, leave `DB_HOST` empty.
3. Run the app:
   `npm run dev`

## MySQL Workbench

Workbench is the database client; the MySQL Server service must also be running. Create the schema once in Workbench:

```sql
CREATE DATABASE IF NOT EXISTS darling_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

In the project-root `.env`, use the host, port, user, password, and schema for that server. For a local installation these are usually `localhost`, `3306`, `root`, your MySQL root password, and `darling_app`. Do not include quotes around the values. Restart `npm run dev` after editing `.env`.

On startup, the app creates or updates its tables, including `users`, `user_images`, `swipes`, `profile_impressions`, `user_songs`, and `advertisements`. The configured DB account needs permission to create and alter tables during setup. Verify the running app at `http://localhost:3000/api/health`; a working connection returns `{"success":true,"database":"connected"}`. Run `npm run db:check` to list the selected schema's tables and row counts.

Common connection errors:

- `ECONNREFUSED`: start the MySQL Server service and confirm its port.
- `ER_ACCESS_DENIED_ERROR`: recheck `DB_USER`, `DB_PASSWORD`, and that the account can connect from `localhost`.
- `ER_BAD_DB_ERROR`: run the `CREATE DATABASE` statement above and make sure `DB_NAME` matches exactly.

## Profile photos and advertisements

Each profile can have several image URLs in `user_images`; the profile editor maintains this table. Use publicly accessible HTTPS image URLs from image hosting or object storage. Avoid saving large image binaries as SQL data. Profiles with no saved photo are omitted from the swipe feed. Feed ranking sorts by compatibility percentage, then known distance, then account creation date. The distance filter can reach 1,000 km. Viewing a card is recorded in `profile_impressions`, so it will not reappear on the next visit; likes and passes are also excluded. To reach more unseen profiles, increase the distance in **Tiêu chí ưu tiên**.

The app inserts one advertisement after every five profiles for accounts whose `users.is_premium` value is false. Add, pause, or schedule ads in Workbench using [`database/ads_setup.sql`](database/ads_setup.sql). Save an image URL and a full HTTPS landing-page URL. The ad card's **Tìm hiểu thêm** button opens that link in a new tab.

Premium status is stored on the server in `users.is_premium`; the app does not grant Premium from a browser button. The current Premium screen has no payment provider connected. Set the flag only after confirming a payment, and clear it when a subscription expires.

## Admin account and dashboard

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before starting the app. The password must be at least 16 characters. Startup promotes the matching account to admin, or creates it when that email is new. Admins see the **Quản trị** tab and can upload or link ad images, manage ad links and schedules, and change Premium/admin flags. The admin password is hashed before it is stored; do not commit `.env`.

For Railway or Render, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` as service environment variables before the first deploy. These create/promote an account in the database connected to that service. The same variables must be present when moving the service to a different database.

## Railway and Render

The project includes `railway.json` and `render.yaml`. The Render build explicitly installs build tools, creates `dist`, then removes development dependencies; start command is `npm start` and health check is `/api/health`. Railway's `railway.json` is Config-as-Code for existing legacy services only; Railway says this format is deprecated and stops being read on 2026-12-01. For a new Railway service, use Railpack settings or Railway IaC instead. A cloud app cannot use `DB_HOST=localhost` to reach MySQL Workbench on your computer: `localhost` points to the cloud service container. On Railway, add a MySQL service in the same project and set the app service's variables to references such as `${{MySQL.MYSQLHOST}}`, `${{MySQL.MYSQLPORT}}`, `${{MySQL.MYSQLUSER}}`, `${{MySQL.MYSQLPASSWORD}}`, and `${{MySQL.MYSQLDATABASE}}` (replace `MySQL` with the database service's actual name). Keep the database private and use the Railway-provided service variables. Render offers managed Postgres, which is not compatible with this MySQL app; it also documents running a separate, self-managed MySQL private service backed by a disk. For that option, follow the MySQL backup guidance rather than relying on disk snapshots. For an external MySQL provider, follow its TLS requirements and set `DB_SSL=true` or `DB_SSL=false` accordingly. The database user needs permission to create and alter the application tables during setup. Keep a unique `JWT_SECRET` of at least 32 characters in the service settings.

`render.yaml` uses Render's free plan for preview. Render pauses a free web service after 15 minutes without traffic; choose a paid plan in Render if you need the service to stay available continuously.

The local folder currently has no Git remote or `.git` metadata, so it cannot push these fixes to GitHub from this checkout. The GitHub page could not be fetched through the available web connection in this session. After committing/pushing this folder from the original Git checkout, trigger a new deploy and confirm `/api/health` reports `database: connected`.

## Moments and schema

Moments now write to `moments.image_url`, `caption`, and `audience`; MySQL generates the moment ID. The old API tried to write `moment_data`, which is absent in the actual table. Startup safely widens `image_url` so captured photos can persist. Reactions are stored in `moment_reactions`, and the owner can inspect the people who reacted. Uploaded images are currently stored as base64 in MySQL; for a larger production deployment, move image bytes to object storage and keep only the resulting HTTPS URL in MySQL.

The schema audit found legacy tables such as `likes` alongside the active `swipes` flow, plus `subscriptions` alongside the current `users.is_premium` flag. I left those tables intact because the application history and any external queries may still depend on them; no columns were removed without evidence that their data is disposable.

## Production performance and public launch

The app now lazy-loads route screens instead of downloading login, setup, admin, and moments views together. On the latest local production build, the initial JavaScript entry is about 323 KB (103 KB gzip); the signed-in feed is a separate chunk. Hashed production assets are cached for a year while `index.html` is revalidated.

Chat loads the newest 100 messages once, then requests only rows after the last message ID every 1.2 seconds. Older history is loaded in additional 100-message pages. MySQL indexes `(match_id, id)` for these lookups. The request body limit is 32 MB, login and registration have per-IP limits, and Cupid AI has a short-window abuse limit in addition to its daily free quota. Configure `CORS_ORIGINS` only if the frontend is hosted on a different origin; same-origin deployment needs no extra origin.

Before inviting the public:

1. Push this project to the GitHub repository connected to your deploy service. This workspace copy currently has no `.git` metadata, so changes here must first be copied or committed from the original Git checkout.
2. Prefer Railway for the current MySQL stack: create a MySQL service in the project and reference its private host, port, username, password, and database variables from the web service. Keep the database private. For a new service, set build command `npm ci --include=dev && npm run build && npm prune --omit=dev`, start command `npm start`, and health check `/api/health` in the service settings; Railway's current `railway.json` format cannot configure new services.
3. Render can run the web app and a separate self-managed MySQL private service with a persistent disk, but that database needs its own deployment and backup operations. Alternatively, connect an external MySQL provider. Render Postgres is not a drop-in replacement. The Blueprint defaults `DB_SSL=false` for a private Render MySQL service; set it to `true` if your external provider requires TLS. Select an always-on paid web plan if the app must stay available continuously.
4. Set `JWT_SECRET` (at least 32 random characters), `GEMINI_API_KEY`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the host dashboard. The admin password must be at least 16 characters. Never commit `.env`; use `.env.example` only for placeholders.
5. Confirm the build succeeds and `/api/health` reports `database: connected`; then sign in as admin and verify profile loading, chat, moments, and the ad dashboard.
6. Before scaling, move image/audio bytes out of MySQL base64 columns to object storage, add database backups and monitoring, and connect a real payment provider before selling Premium. The repository currently uses MySQL image/audio payloads and its Premium screen does not process payments.
