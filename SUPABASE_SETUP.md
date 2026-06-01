# Dukan App - Supabase Setup Guide

## Step 1: Create 2 Supabase Projects
1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Create **2 new projects**:
   - Project 1: `dukan-dev` (for development/testing)
   - Project 2: `dukan-prod` (for real shop data)
   - Save the database passwords somewhere safe!

## Step 2: Set Up Environment Variables
For **Development** (local testing):
- Copy `.env.local.example` to `.env.local`
- In your `dukan-dev` project:
  - Go to **Project Settings → API**
  - Copy `URL` → paste as `NEXT_PUBLIC_SUPABASE_URL`
  - Copy `anon public` → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For **Production**:
- When deploying to Vercel/Netlify, use your `dukan-prod` project's URL and anon key in production environment variables.

## Step 3: Run the Schema on Both Projects
1. For **both projects**, go to **SQL Editor** in Supabase Dashboard
2. Click **New query**
3. Copy the entire contents of `supabase/schema.sql` and paste it
4. Click **Run** to create all tables

## Step 4: Start Migrating Code
Now we can start updating our hooks and components to use Supabase instead of Dexie!
