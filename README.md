# ExpenseIQ - AI Expense Tracker

**Live Demo:** `PASTE_DEPLOYED_URL_HERE`

ExpenseIQ is a full-stack expense tracking web app with an AI chatbot that manages finances through natural language (Create, Read, Update, Delete), analytics, and budget insights.

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

1. Import this GitHub repo into Vercel.
2. Add env vars (`DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`).
3. Deploy.
4. Run:

```bash
npx prisma db push
```

5. Paste deployed URL at top of this README.

## Architecture

- Next.js App Router for UI + API in one codebase.
- Prisma ORM for typed DB operations.
- JWT cookie auth for sessions.
- Tool-based AI actions routed through `lib/chat-tools.ts`.
- Context memory via `lastExpenseIds`.
- Local chatbot fallback for demo reliability.

## AI Integration

- `/api/chat` receives message history and context.
- Primary: OpenAI tool calling (`add_expenses`, `query_expenses`, `update_expense`, `delete_expense`, `compare_months`, etc.).
- State handling:
  - remembers recent expense IDs for follow-up commands
  - supports lookup hints like "yesterday's grocery expense"
- Fallback mode:
  - local parser in `lib/local-chat.ts` maps NL intents to the same tool layer.

## Demo

Add screenshot/video links here:

- Signup/Login
- Dashboard charts
- Transactions filtering/sorting/export
- Budgets and progress
- Chatbot CRUD + analytics conversation

Video: `PASTE_VIDEO_LINK_HERE`

## Future Improvements

- Learn category preferences from corrections
- Recurring expense automation
- Better multilingual NLP
- Anomaly detection alerts
- Expanded test coverage (unit/integration/e2e)

## Collaborators (Private Repo)

Invite:

- `Aswath363`
- `akshaiP`
- `ashwanthnebula`

## Submission Checklist

- [ ] Private repo
- [ ] Collaborators invited
- [ ] Live demo URL added
- [ ] README completed
- [ ] Screenshots/video attached
- [ ] Email sent to `contact@nebulaknowlab.com`
