# Gemini Webhook Callback Handler

A Cloudflare Worker that receives and verifies webhook callbacks from the Gemini API using the [Standard Webhooks](https://www.standardwebhooks.com/) specification.

## What it does

- Listens for incoming `POST` requests
- Verifies the webhook signature using your signing secret and the [standardwebhooks](https://www.npmjs.com/package/standardwebhooks) library
- Handles the following event types:
  - `batch.succeeded` — a batch job has finished processing; logs the batch ID and output file URI (if available)
  - `video.generated` — a video has been generated; logs the output file URI

## Reference

- [Gemini API Webhooks documentation](https://ai.google.dev/gemini-api/docs/webhooks)
- Accompanying [Webhooks end-to-end cookbook](https://github.com/google-gemini/cookbook/blob/main/quickstarts/Webhooks.ipynb)
- Based on the [Read POST](https://developers.cloudflare.com/workers/examples/read-post/) Cloudflare Workers example.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Cloudflare](https://www.cloudflare.com/) account
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set the webhook signing secret:**

   ```bash
   npx wrangler secret put WEBHOOK_SIGNING_SECRET
   ```

   You'll be prompted to paste your signing secret value.

## Local Development

```bash
npm run dev
```

This starts a local dev server (typically at `http://localhost:8787`). For local testing, you can set the secret in a `.dev.vars` file:

```
WEBHOOK_SIGNING_SECRET=your_secret_here
```

## Deploy

```bash
npm run deploy
```

This deploys the worker to your Cloudflare account. The worker URL will be printed in the output — use this as your webhook callback URL in the Gemini API configuration.

