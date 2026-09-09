# Belayo

A modern RSVP web app built with **React**, **Tailwind CSS**, and **Supabase**.

## Features

- **Sign up / Sign in** with email or phone number (Supabase Auth)
- **Create invitations** with title, host name, poster/banner (max 3MB), description, date/time, and location
- **Shareable link** — copy, WhatsApp, or email the invitation link (QR code included)
- **Public RSVP page** where guests respond **Yes / No / Maybe** (with name, contact, guest count, and message)
- **Real-time counter** on the dashboard and event detail page (Supabase Realtime)
- **Download PDF / Print** the RSVP report
- **Poppins** font family self-hosted (no external CDN)

## Setup

### 1. Database & storage (already created for this project)

The tables, RLS policies, realtime publication and `posters` storage bucket are all live on the Supabase project. To set up from scratch:

**Option A — SQL Editor (recommended):**
1. Run `supabase/schema.sql` for a fresh install (includes tables, RLS, realtime, storage bucket).
2. Run `supabase/migration_poster.sql` for existing installs to add poster/host fields.

**Option B — CLI (if `pg` is installed):**
```
node scripts/db.cjs apply          # full fresh schema
node scripts/db.cjs migrate <file>  # run a migration
node scripts/db.cjs verify          # confirm everything
```
> Only the **session pooler** host works — the direct `db.*` hostname resolves IPv6-only.  
> Use `postgres.<project-ref>` as the DB user and the password from **Project Settings → Database → Connection string**.

### 2. Configure environment variables

Create a `.env` file in the project root (or copy `.env.example`):

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-KEY
```

Get these from **Project Settings → API** in Supabase.

### 3. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:5173

### 4. Build & deploy

```bash
npm run build
```

The production build is in `dist/`. Deploy to Vercel, Netlify, Cloudflare Pages, etc.

### 5. Create events

- **Poster / banner** — drag & drop or click to upload any image (JPG/PNG/WebP, ≤3 MB). Images are stored in Supabase Storage and served from a public bucket.
- **Hosted by** — the host's / inviter's name shows on the event card, RSVP page, PDF and print output.
- **Date / time** — formatted nicely across all views, including relative badges ("in 3 days") on the dashboard.
