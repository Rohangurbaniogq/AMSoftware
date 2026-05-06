# Developer Handover Guide — OGQ Athlete Monitoring

## What You Need

1. **Vercel account** — to host/deploy the app
2. **Google Sheet + Apps Script** — the backend (shared by previous developer)
3. **This codebase** — clone from the shared GitHub repo

## Local Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd athlete-monitoring

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.local.example .env.local
# Paste the Google Apps Script URL into GOOGLE_SCRIPT_URL
# Leave it empty to run with mock data (no Google Sheet needed)

# 4. Run the dev server
npm run dev
# Opens at http://localhost:3000
```

## Project Structure (What to Edit Where)

| Want to change...                         | Edit this file                                      |
|-------------------------------------------|-----------------------------------------------------|
| **Form fields / layout**                  | `app/form/page.tsx`                                 |
| **Dashboard charts / tabs**               | `app/dashboard/page.tsx`                            |
| **Athlete upload / CSV logic**            | `app/upload/page.tsx`                               |
| **Landing page**                          | `app/page.tsx`                                      |
| **Navigation bar**                        | `components/Navbar.tsx`                             |
| **Login / auth logic**                    | `components/AuthGate.tsx`, `app/api/auth/route.ts`  |
| **Access code** (currently `456789`)      | `app/api/auth/route.ts`                             |
| **Intervention categories**               | `lib/types.ts` -> `INTERVENTION_CATEGORIES`         |
| **Athlete fields**                        | `lib/types.ts` -> `Athlete` interface               |
| **API calls to Google Sheets**            | `lib/sheets.ts` and `lib/gas-fetch.ts`              |
| **Google Sheets backend**                 | `google-apps-script/Code.gs`                        |
| **Styling / theme colors**               | `app/globals.css`                                   |
| **Dark/light theme**                      | `components/ThemeProvider.tsx`                       |

## Key Things to Know

- **Tech stack**: Next.js 16, React 19, Tailwind CSS 4, TypeScript
- **Backend**: No traditional database. Everything is stored in Google Sheets via a deployed Apps Script web app.
- **Auth**: Simple access code + `@ogq.org` email domain check. The access code is hardcoded in `app/api/auth/route.ts`.
- **API routes** are in `app/api/`. They proxy requests to the Google Apps Script. When `GOOGLE_SCRIPT_URL` is empty, they return mock data so you can develop without a Sheet.
- **The form** uses a single period selector (not separate reporting/planned periods). This is intentional.
- **CSV upload** replaces all athletes at once (batch operation).
- **14 intervention categories** are defined in `lib/types.ts` (Physiotherapy, Nutrition, S&C, Psychology, etc.).

## Changing the Google Sheet Backend

1. Open the shared Google Sheet
2. Go to **Extensions -> Apps Script**
3. The code there should match `google-apps-script/Code.gs`
4. After making edits, click **Deploy -> New deployment -> Web app** (execute as "Me", access "Anyone")
5. Copy the new deployment URL into `.env.local` locally and into Vercel environment variables for production

The Google Sheet has 3 tabs:
- **Athletes** — athlete roster (name, sport, category, support staff, etc.)
- **Submissions** — form submission entries
- **Users** — registered user accounts

## Deploying to Vercel

1. Connect the GitHub repo to Vercel
2. Set the environment variable `GOOGLE_SCRIPT_URL` in Vercel project settings
3. Every push to `main` auto-deploys

## Using an AI Coding Tool to Make Changes

You don't need to know how to code. These free AI tools can edit the project for you:

### Recommended: Cursor or Windsurf (Desktop Editors)

1. Download [Cursor](https://cursor.sh) or [Windsurf](https://windsurf.com)
2. Clone the repo and open the folder in the editor
3. Use the AI chat to describe what you want to change (e.g., "Add a new field called Coach Name to the form")
4. The AI reads the code, makes the edits, and you review/accept
5. Run `npm run dev` to test locally, then push to GitHub to deploy

### Alternative: Browser-Based Tools (No Install)

- **[Bolt.new](https://bolt.new)** — Import from GitHub, describe changes, deploy from browser
- **[Lovable.dev](https://lovable.dev)** — Import repo, describe changes in plain English
- **[Replit](https://replit.com)** — Import from GitHub, edit with AI agent, can also host

### Tips for AI Tools

- Be specific: "Add a dropdown called 'Coach Name' to the form page after the athlete selector" works better than "add a field"
- Reference this guide: tell the AI which file to edit (e.g., "Edit app/form/page.tsx to add...")
- Test locally before deploying
- The Google Sheets backend does not need to change for most UI edits
