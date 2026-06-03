# Dukan App - Dev/Prod Workflow & Deployment Guide

## Overview
This app uses a proper dev/prod environment setup with two separate Supabase projects:

1. **Development**: Local testing, schema changes, experiments
2. **Production**: Live app with real shop data

## Prerequisites
- 2 Supabase projects: `dukan-dev` (for dev) and `dukan-prod` (for prod)
- Git for version control (optional but recommended)

## Step 1: Set Up Both Supabase Projects

### Project 1: Development (dukan-dev)
You already have this one set up!
- URL: `https://vwkwdfzrdtyfkhzawgya.supabase.co`
- Credentials already in `.env.local`

### Project 2: Production (dukan-prod)
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Name: `dukan-prod`
4. Choose a region close to your users
5. Save the database password!
6. Wait for initialization

## Step 2: Apply Schema to Both Projects
ALWAYS apply schema changes to DEV first, test, then apply to PROD!

### How to Apply Schema Changes
1. **DEV**:
   - Go to your `dukan-dev` project → **SQL Editor** → **New Query**
   - Paste the content of `supabase/schema.sql`
   - Click **Run**
   - Test changes locally with `npm run dev`

2. **PROD** (only after testing DEV):
   - Go to your `dukan-prod` project → **SQL Editor** → **New Query**
   - Paste the SAME `supabase/schema.sql` content
   - Click **Run**
   - Verify all tables are created correctly

## Step 3: Configure Environment Variables

### Local Development (.env.local)
You already have this! Uses your DEV Supabase project:
```
NEXT_PUBLIC_SUPABASE_URL=https://vwkwdfzrdtyfkhzawgya.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_BHGBpjz3ZXgeIVJaljXgZQ_JV8gcLq-
```

### Production (Vercel/Netlify)
1. Go to your hosting provider dashboard
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Use your PROD project URL (from `dukan-prod` → Project Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Use your PROD project anon key (from `dukan-prod` → Project Settings → API)

## Step 4: Typical Workflow
1. Make changes locally (dev)
2. Test everything works with your DEV Supabase project
3. Commit changes to Git (optional but recommended)
4. When ready to deploy:
   - Apply schema to PROD Supabase
   - Deploy your app to Vercel/Netlify
   - Test production deployment!

## Important Notes
- **ALWAYS test in DEV first!**
- **NEVER test schema changes directly in PROD**
- Keep `supabase/schema.sql` as the single source of truth
- Use the same schema file for both DEV and PROD to ensure consistency
- Backup your PROD database regularly (Supabase has backups!)
