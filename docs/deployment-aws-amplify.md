# Deploying to AWS Amplify Hosting

This is an alternative to the Vercel deployment described in the [README](../README.md) — use whichever host you prefer, not both. AWS Amplify Hosting natively supports Next.js 14's App Router, including the dynamic API routes this blog uses (`/api/reactions`, `/api/comments`, `/api/admin/comments`), so no code changes are needed to move here.

**Important:** do this from a **personal AWS account**, not a work/employer account — mixing a personal project's billing and resources into a corporate AWS account is a bad idea even at near-$0 cost. If you don't have a personal account yet, create one at [aws.amazon.com](https://aws.amazon.com) first.

## Cost expectations

For a low-traffic personal blog, Amplify Hosting's free tier (first 12 months of a new AWS account) covers:
- 1,000 build minutes/month
- 15 GB served/month
- 5 GB stored/month

After the 12-month free tier ends, this blog's actual traffic will realistically cost a few cents to a couple of dollars a month — Amplify bills per build-minute and per GB served/stored, and a personal blog uses very little of either.

## Step 1: Connect the GitHub repo

1. Go to the [AWS Amplify console](https://console.aws.amazon.com/amplify/) (make sure you're in your personal account, and pick a region — `us-east-1` is a safe default).
2. Click **"New app"** → **"Host web app"**.
3. Choose **GitHub** as the source, and authorize AWS Amplify to access your GitHub account when prompted (this is an OAuth grant — it'll ask which repos to allow; select this blog's repo, e.g. `bilaschandra/blogs`).
4. Select the `main` branch.

## Step 2: Build settings

Amplify auto-detects this as a Next.js app and generates a default build spec. Confirm (or paste) this build configuration:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

Amplify detects the `.next` output and automatically enables **SSR/Web Compute** support for the dynamic routes — you don't need to configure anything else for the API routes to work.

## Step 3: Environment variables

In the app's **Environment variables** settings (before the first deploy, or any time after — changes require a redeploy to take effect), add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your real MongoDB Atlas connection string |
| `NEXT_PUBLIC_SITE_URL` | The domain Amplify assigns after first deploy, e.g. `https://main.xxxxxxxxxxxx.amplifyapp.com` (update this and redeploy once you know it, same as the Vercel flow) |

No `ADMIN_PASSWORD` env var is needed — admin accounts are real username/password accounts stored in MongoDB (see "Create the first admin account" below).

## Step 4: MongoDB Atlas network access

Same requirement as Vercel: in Atlas → **Network Access**, allow `0.0.0.0/0`. AWS Amplify's SSR compute (like Vercel's serverless functions) doesn't have static outbound IPs, so Atlas has to accept connections from any IP — your data stays protected by the connection string's username/password, not by IP restriction.

## Step 5: Create the first admin account

There's no public signup and no `ADMIN_PASSWORD` env var — admin accounts are real username/password accounts stored in MongoDB. To create the first one, run this locally with `DATABASE_URL` pointed at the same MongoDB Atlas database Amplify uses:

```bash
DATABASE_URL="<your Atlas connection string>" npm run create-admin -- --username=<username> --password=<password> --displayName="<Full Name>" --role=admin
```

Once at least one admin account exists, further accounts can be created from `/admin/users` while logged in as an admin. Log in at `/admin/login` with the username/password you just created.

## Step 6: Deploy and verify

Amplify deploys automatically once you save the settings above. After it finishes:

1. Home/blog pages render, cards show the black cover-image fallback (until you add real images).
2. Clicking an emoji reaction persists after reload (confirms the app reaches MongoDB Atlas).
3. Submitting a comment shows "awaiting moderation"; logging in at `/admin/login` with the admin account created in Step 5 and visiting `/admin/comments` shows it pending; approving makes it public.
4. `/rss.xml` and `/sitemap.xml` return valid XML using the real Amplify domain.

## Step 7 (optional): Custom domain

In the app's **Domain management** settings, add your own domain and follow Amplify's DNS verification steps (it provisions an SSL certificate automatically). Update `NEXT_PUBLIC_SITE_URL` to match and redeploy.

## Ongoing: auto-deploy on push

Once connected, every `git push` to `main` triggers a new Amplify build automatically — same workflow as the Vercel setup, just on AWS.
