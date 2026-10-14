# Relay

A keyboard-first Gmail client with an AI assistant: thread summaries, contextual reply drafts, and follow-up suggestions.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Zod, the Gmail API and the OpenAI Responses API.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill it in:

   | Variable | Where to get it |
   |---|---|
   | `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (32+ characters) |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud console → Google Auth Platform → Clients → Create client (Web application) |
   | `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/auth/google/callback`, also added to the client's authorized redirect URIs |
   | `OPENAI_API_KEY` | platform.openai.com → API keys. The organization needs billing credit. |
   | `OPENAI_MODEL` | Optional, defaults to `gpt-5-mini` |

3. In the Google Cloud project, enable the Gmail API, add the `gmail.modify` scope to the consent screen, and add your account as a test user. `gmail.modify` is a restricted scope, so unverified apps only work for listed test users.
4. Run `npm run dev` and open http://localhost:3000.

> On Windows, run npm scripts from PowerShell or Git Bash; no POSIX-only env prefixes are used.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm run lint` | ESLint (no `any`, type-only imports enforced) |
| `npm test` | Vitest unit tests |

## Project structure

```
src/
  app/                 Routes: /login, /mail, and API route handlers under app/api
  components/
    mail/              Workspace: sidebar, thread list, reader, assistant panel, compose
    ui/                shadcn/ui primitives
    providers/         Theme, TanStack Query, tooltips, toasts
  schemas/             Zod schemas (Z<Name>Schema) and the types inferred from them
  services/
    gmail/             Gmail client, MIME parsing and building, thread operations
    ai/                OpenAI calls, prompts, thread serialization
  lib/                 Auth/session, env validation, API helpers, formatting
  hooks/               Hotkeys, media queries, stored preferences
```

## Validation conventions

- Every Zod schema is named `Z<Name>Schema`; its inferred type drops the prefix (`ZEmailThreadSchema` → `EmailThread`).
- Every API route validates its input with `ZXSchema.safeParse(...)`, returning a 400 with per-field messages, and its output with `ZXSchema.parse(...)` before responding.
- Responses use one envelope, `{ ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }`, and the client parses both the envelope and `data` with Zod.
- Gmail data, OpenAI answers, the session cookie and environment variables are all parsed with Zod before use.

## API

| Route | Input | Output |
|---|---|---|
| `GET /api/auth/google/login` | `?returnTo` | Redirect to Google |
| `GET /api/auth/google/callback` | `?code&state` or `?error` | Redirect |
| `POST /api/auth/logout` | | `SignOutResponse` |
| `GET /api/auth/session` | | `SessionResponse` |
| `GET /api/gmail/profile` | | `GmailProfile` |
| `GET /api/gmail/mailboxes` | | `MailboxCounts` |
| `GET /api/gmail/threads` | `?mailbox&q&pageToken&pageSize` | `ThreadListPage` |
| `GET /api/gmail/threads/:id` | | `EmailThread` |
| `POST /api/gmail/threads/:id/actions` | `{ action }` | `ThreadActionResult` |
| `POST /api/gmail/threads/:id/reply` | `ReplyRequest` | `SentMessage` |
| `POST /api/gmail/messages` | `ComposeRequest` | `SentMessage` |
| `POST /api/ai/summarize` | `{ threadId }` | `ThreadSummary` |
| `POST /api/ai/draft` | `{ threadId, tone?, length?, instructions? }` | `ReplyDraft` |
| `POST /api/ai/follow-ups` | `{ threadId, now? }` | `FollowUpSuggestions` |

## Keyboard shortcuts

Press `?` in the app for the full list. The main ones: `j`/`k` move between threads, `r` reply, `c` new message, `e` archive, `s` star, `u` mark unread, `#` trash, `/` search, `g` then `i`/`s`/`t`/`d`/`a` to switch mailbox, `.` toggle the assistant, `⌘K` command menu, `⌘↵` send.

## Privacy

- Gmail tokens live only in an encrypted, HttpOnly session cookie; there is no database.
- OpenAI requests use `store: false`, and the user id is hashed before it is sent.
- Thread content is marked as untrusted in prompts, so instructions inside emails are ignored.
