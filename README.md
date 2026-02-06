# GitHub PR Dashboard

A dashboard to view all your open pull requests in one place. Built with React Router v7, Tailwind CSS, and deployed on [Ampt](https://getampt.com).

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```

2. Set Ampt params (via CLI or dashboard):
   ```sh
   ampt params set GITHUB_CLIENT_ID <your-client-id>
   ampt params set GITHUB_CLIENT_SECRET <your-client-secret> --secret
   ```

3. Start development:
   ```sh
   ampt  # starts interactive shell + sandbox
   ```

4. Deploy:
   ```sh
   # Inside the ampt interactive shell:
   deploy prod
   ```

## GitHub OAuth

Create a GitHub OAuth App at https://github.com/settings/developers with:
- **Homepage URL**: Your Ampt app URL
- **Callback URL**: `https://<your-ampt-url>/auth/callback`

## Architecture

- **server.mjs** — Ampt entry point using Express + `@ampt/sdk`
- **app/** — React Router v7 routes and components
- **build/** — Generated client + server bundles (via `react-router build`)
