# GitHub PR Dashboard

A clean, minimal dashboard showing all your open pull requests across repos and orgs. Built with React Router (Remix) on Cloudflare Workers.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set:
   - **Application name:** PR Dashboard
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** `http://localhost:5173/auth/callback`
4. Copy the **Client ID** and generate a **Client Secret**

### 3. Configure environment variables

Copy `.dev.vars.example` to `.dev.vars` and fill in your values:

```bash
cp .dev.vars.example .dev.vars
```

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
SESSION_SECRET=any_random_string
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy to Cloudflare

```bash
# Set secrets
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put SESSION_SECRET

# Deploy
npm run deploy
```

Update your GitHub OAuth App's callback URL to your production URL (`https://your-app.workers.dev/auth/callback`).

## Features

- GitHub OAuth login
- Shows all open PRs you're involved in (owned repos + org repos)
- Displays: title, repo, author, CI status, review status, timestamps
- Server-side rendering via React Router loaders
- Cloudflare Workers compatible (no Node.js APIs)
- Tailwind CSS styling
