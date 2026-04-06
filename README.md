# ExpenseIQ - AI Expense Tracker

**Live Demo:** `PASTE_DEPLOYED_URL_HERE`

ExpenseIQ is a full-stack expense tracking web app with an AI chatbot that supports natural-language CRUD, analytics, and budget insights.

## Setup Instructions

```bash
git clone https://github.com/kaviyarasicit-art/MYPROECT.git
cd MYPROECT
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

Open `http://localhost:3000`

## Environment Variables

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-strong-random-secret-min-16-chars"
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4o-mini"
```

If `OPENAI_API_KEY` is missing/invalid, chatbot falls back to local intent mode.

## Deployment Instructions

### Vercel (recommended)

1. Import this repo into Vercel.
2. Set env vars (`DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`).
3. Deploy.
4. Run:

```bash
npx prisma db push
```

5. Paste deployed URL at top of this README.

### Railway / Render

1. Connect repo.
2. Provision database and set `DATABASE_URL`.
3. Build command: `npm run build`
4. Start command: `npm start`
5. Run `npx prisma db push`.

## Architecture and Design Trade-offs

- Next.js App Router for full-stack single codebase
- Prisma ORM for type-safe DB operations
- JWT cookie session auth
- Tool-based AI integration through server-side tool execution
- `lastExpenseIds` for context-aware follow-up operations
- Local AI fallback for reliability without external key dependency

## AI Integration (CRUD + State)

- Chat UI sends conversation + context to `/api/chat`
- Primary mode uses OpenAI tool calls:
  - `add_expenses`, `query_expenses`, `update_expense`, `delete_expense`,
  - `compare_months`, `spending_insights`, `get_budget_status`, etc.
- Tools are executed in `lib/chat-tools.ts`
- Stateful updates/deletes supported through recent expense tracking and lookup hints
- Local fallback parser (`lib/local-chat.ts`) maps intents to the same tool layer

## Demo

Add links to screenshots/video:

- Signup/Login
- Dashboard analytics
- Transactions filtering/export
- Budget setup/progress
- Chatbot CRUD and insights

Video: https://myproect.vercel.app/

## Future Improvements

- Learn user-specific category mappings
- Better multilingual NLP extraction
- Recurring expense automation
- Alerting/notifications
- More automated tests (unit/integration/e2e)


- [ ] Screenshots/video attached
- [ ] Email sent to `contact@nebulaknowlab.com`
