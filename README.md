# TaskFlow — Project & Task Management (Next.js + Firebase)

TaskFlow is a bilingual (Arabic/English) project and task workspace built with Next.js 14 and Firebase. It includes a responsive dashboard, project and task views, calendar, account settings, persisted RTL/LTR language selection, and light/dark themes.

## Setup
1. Create a Firebase project → enable **Authentication → Email/Password** and **Cloud Firestore**.
2. `cp .env.example .env.local` and fill in the web-app config values.
3. Paste `firestore.rules` into Firestore → Rules (or `firebase deploy --only firestore:rules`).
4. `npm install && npm run dev` → http://localhost:3000
5. Deploy: import the repo in Vercel, add the same 4 env vars.

## Structure
`app/` routes (/login, /register, /dashboard, /tasks, /projects, /projects/new, /projects/[id], /calendar, /settings) · `components/` · `hooks/` · `lib/` · `firestore.rules`

Language and theme preferences are stored in browser local storage. UI translations are centralized in `lib/i18n.js`. Project and task content remains as entered by the user.

## Firestore
`users/{uid}` · `projects/{id}` (ownerId, memberIds[]) · `projects/{id}/tasks/{taskId}` — see SRS §10.

## Demo data (Appendix A)
Register `owner@example.test` and `member@example.test`, create "Website Redesign", add the member, add the 4 sample tasks.

## Security tests to run (TC-06, TC-13, TC-14)
Log in as member → try editing project (denied). Open another user's project URL → "Access denied".

## Known limitations
- Project settings live inside `/projects/[id]` (collapsible section), not a separate route.
- Project deletion uses one batch (max 500 tasks).
- Any signed-in user can read a single user profile by email lookup (needed for adding members).
- The calendar displays task due dates and does not introduce a separate calendar data model.
