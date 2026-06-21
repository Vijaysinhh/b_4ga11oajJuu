# Dukan App - Complete Production Setup Guide

## Prerequisites
1. A Supabase account at [supabase.com](https://supabase.com)

## Step 1: Create your Supabase Project (Production)
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in details:
   - Name: `dukan-prod` (or your preferred name)
   - Database Password: Save this password! You'll need it later
   - Region: Choose the closest region to your users
4. Click **Create new project** and wait for it to initialize

## Step 2: Get Your Project's API Credentials
1. Once your project is ready:
   - Go to **Project Settings → API**
   - Copy the `URL` (starts with `https://...`)
   - Copy the `anon public` key
   - Save both somewhere safe

## Step 3: Set Up Environment Variables

### For Local Development
1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add these lines:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Replace with your actual project URL and anon key from Step 2

### For Production (Vercel/Netlify)
1. Go to your hosting provider's dashboard
2. Add the same environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Use your production project's credentials

## Step 4: Run the Schema in Your Supabase Project
1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **New query**
3. Open the file `supabase/schema.sql` in your code editor
4. Copy and paste the entire contents
5. Click **Run** to execute all SQL script
6. Verify that all tables are created:
   - `shops`
   - `users`
   - `categories`
   - `units`
   - `items`
   - `price_tiers`
   - `sales`
   - `sale_items`
   - `stock_history`
   - `batches`
   - `alerts`
   - `credit_customers`
   - `credit_entries`
   - `app_settings`

## Step 5: Verify Super Admin User
The schema script automatically creates a super admin user:
- Username: `vijaysinhjadhav23@gmail.com`
- Password: `Vijaysinh@23`

You can log in with these credentials first to create your shop!

## Step 6: Test the Setup
1. Run `npm run dev` (or `pnpm dev`) to start your dev server
2. Open [http://localhost:3000](http://localhost:3000)
3. Log in with `vijaysinhjadhav23@gmail.com` / `Vijaysinh@23`
4. You should see the super admin dashboard!

## Step 7: Create Your First Shop
1. From the super admin dashboard, click "Add New Shop"
2. Fill in the shop details
3. Now you can log in with the shop owner's credentials!

## Important Notes
- The schema includes Row Level Security (RLS) is enabled but uses permissive policies for now (you can tighten them later for better security)
- The app uses a local-first approach with Dexie for offline support, and syncs to Supabase in the background
- We also use the `supabase/schema.sql` file whenever you make changes to your database schema
