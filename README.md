This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Telegram Integration

This project supports expense creation through a Telegram bot.

### Required environment variables

Set the following variables in your local `.env` and in Vercel:

```bash
TELEGRAM_BOT_TOKEN=<bot token>
TELEGRAM_WEBHOOK_SECRET=<random shared secret>
TELEGRAM_BOT_USERNAME=<optional bot username without @>
```

### Database migration on deploy

This integration needs the Telegram tables in production. Run migrations before serving traffic:

```bash
npx prisma migrate deploy
```

If you use Supabase connection pooling (`pooler.supabase.com:6543`) in `DATABASE_URL`, configure `DIRECT_URL` with a direct/session connection (`:5432`) for Prisma CLI commands.

### Webhook setup

After deploy, register the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://<your-domain>/api/telegram/webhook\",\"secret_token\":\"<TELEGRAM_WEBHOOK_SECRET>\"}"
```

### User flow

1. Open `/integracoes/telegram` in the app.
2. Generate a linking code.
3. Send `/vincular CODIGO` to the bot in a private chat.
4. Send expenses in this format:

```text
titulo, descricao, valor, cartao, categoria, status, data
Mercado, Coca, 8,00, Cartao, alimentacao, pago, 2026-03-04
```
