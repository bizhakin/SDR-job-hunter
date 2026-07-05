# Gmail API Setup Guide

This guide walks through creating a Google Cloud project and enabling Gmail API access for the Closer Job Hunter app. Since this is an internal tool, no Google verification is needed — just testing mode.

## Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click the project dropdown at the top → "New Project"
3. Name it "Closer Job Hunter" (or anything)
4. Click "Create"

## Step 2: Enable Gmail API

1. In your new project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click it → **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** → **Create**
3. Fill in:
   - App name: `Closer Job Hunter`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue**
5. **Scopes**: Click **Add or Remove Scopes**
   - In the filter, paste: `https://www.googleapis.com/auth/gmail.send`
   - Select it → **Update** → **Save and Continue**
6. **Test users**: Add the email address(es) that will use the app (your brother's email)
7. Click **Save and Continue** → **Back to Dashboard**

No verification needed for testing mode (up to 100 users).

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Closer Job Hunter Web`
5. Authorized JavaScript origins: `http://localhost:3000`
6. Authorized redirect URIs: `http://localhost:3000/api/gmail/callback`
7. Click **Create**

Copy the **Client ID** and **Client Secret** that appear.

## Step 5: Add to .env.local

Add these to `closer-job-hunter/.env.local`:

```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

## Step 6: Apply Schema

Run the user_tokens migration in Supabase SQL editor:

```sql
create table user_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  provider text not null,
  access_token text,
  refresh_token text not null,
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, provider)
);

alter table user_tokens enable row level security;

create policy "Users manage own tokens"
  on user_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Test

1. Run the app: `npx next dev`
2. Go to Profile page
3. Click **Connect Gmail**
4. Authorize with the test email
5. You'll be redirected back — status shows "Gmail connected"
