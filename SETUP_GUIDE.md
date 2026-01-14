# 🏭 Pipe Tracker - Complete Setup Guide

## Overview

This is your complete tube & pipe plant equipment tracking system with:
- ✅ Web dashboard (React + Tailwind)
- ✅ Database (Supabase - PostgreSQL)
- ✅ WhatsApp bot (Twilio)
- ✅ Smart reminders (contextual prompts)
- ✅ Team collaboration (3 users)

**Estimated setup time: 30-45 minutes**
**Monthly cost: $0-20** (depending on WhatsApp usage)

---

## Step 1: Create Supabase Account (Free)

1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub or email
3. Click **"New Project"**
4. Choose:
   - Organization: Create new or use existing
   - Project name: `pipe-tracker`
   - Database password: **Save this somewhere safe!**
   - Region: Choose closest to you (e.g., Middle East)
5. Wait for project to be created (~2 minutes)

### Get Your Supabase Credentials
1. Go to **Settings → API**
2. Copy and save:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...`
   - **service_role key**: `eyJhbG...` (keep this secret!)

---

## Step 2: Set Up Database

1. In Supabase, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste and click **"Run"**
5. You should see "Success" messages
6. **Run the tasks schema next:** Create another query and run `supabase/tasks-schema.sql`

### Verify Tables Created
Go to **Table Editor** - you should see:
- `projects`
- `follow_up_history`
- `reminders`
- `team_members`
- `whatsapp_sessions`
- `task_lists`
- `tasks`
- `task_comments`

---

## Step 3: Create Twilio Account (WhatsApp)

1. Go to [twilio.com](https://www.twilio.com)
2. Sign up for a free account
3. Complete verification (phone number)

### Set Up WhatsApp Sandbox (Free for Testing)
1. Go to **Messaging → Try it out → Send a WhatsApp message**
2. Follow instructions to connect your phone:
   - Save the Twilio number in your contacts
   - Send the join code (e.g., "join example-word")
3. You'll receive a confirmation

### Get Twilio Credentials
1. Go to **Console Dashboard**
2. Copy:
   - **Account SID**: `ACxxxxx`
   - **Auth Token**: `xxxxx` (click to reveal)
3. Go to **Messaging → Senders → WhatsApp Senders**
4. Copy your **WhatsApp number**: `+14155238886` (sandbox) or your own

### Configure Webhook
1. Go to **Messaging → Settings → WhatsApp Sandbox Settings**
2. Set "When a message comes in" to:
   ```
   https://your-app.vercel.app/api/whatsapp
   ```
   (We'll update this URL after deploying)

---

## Step 4: Deploy to Vercel (Free)

### Option A: Deploy with GitHub (Recommended)

1. Create a GitHub account if you don't have one
2. Create a new repository: `pipe-tracker`
3. Upload all the files from `pipe-tracker-app/` folder
4. Go to [vercel.com](https://vercel.com)
5. Sign in with GitHub
6. Click **"Import Project"**
7. Select your `pipe-tracker` repository
8. Configure Environment Variables (see below)
9. Click **Deploy**

### Environment Variables

Add these in Vercel project settings:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | From Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Public key |
| `SUPABASE_SERVICE_KEY` | `eyJhbG...` | Service role key |
| `TWILIO_ACCOUNT_SID` | `ACxxxxx` | From Twilio |
| `TWILIO_AUTH_TOKEN` | `xxxxx` | From Twilio |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` | Include "whatsapp:" prefix |
| `CRON_SECRET` | `your-random-string` | Make up a random string |

---

## Step 5: Set Up Cron Jobs (Automatic Reminders)

In your `vercel.json` file, add:

```json
{
  "crons": [
    {
      "path": "/api/cron?type=daily_digest",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/cron?type=super_priority",
      "schedule": "0 */4 * * *"
    },
    {
      "path": "/api/cron?type=priority",
      "schedule": "0 4,16 * * *"
    },
    {
      "path": "/api/cron?type=non_priority",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/cron?type=tasks",
      "schedule": "0 5,13 * * *"
    }
  ]
}
```

**Note:** Times are in UTC. Adjust for your timezone (GST = UTC+4):
- `0 4 * * *` = 8 AM GST (daily digest)
- `0 */4 * * *` = every 4 hours (super priority projects)
- `0 4,16 * * *` = 8 AM & 8 PM GST (priority projects)
- `0 5 * * *` = 9 AM GST (non-priority projects)
- `0 5,13 * * *` = 9 AM & 5 PM GST (task reminders)

---

## Step 6: Add Team Members

### Via Supabase Dashboard
1. Go to **Authentication → Users**
2. Click **"Invite user"** for each team member
3. They'll receive an email to set their password

### Add WhatsApp Numbers
1. Go to **Table Editor → team_members**
2. Click **"Insert row"**
3. Fill in:
   - `id`: Copy from auth.users
   - `full_name`: Team member name
   - `phone_number`: Their WhatsApp number (e.g., `971501234567`)
   - `whatsapp_enabled`: `true`
   - `role`: `admin` or `member`

### Have Team Members Join WhatsApp Sandbox
Each team member needs to:
1. Save Twilio number in contacts
2. Send the join code to that number
3. They'll start receiving reminders

---

## Step 7: Update Twilio Webhook

Now that your app is deployed:

1. Copy your Vercel URL (e.g., `https://pipe-tracker.vercel.app`)
2. Go to Twilio → Messaging → WhatsApp Sandbox Settings
3. Update webhook URL to:
   ```
   https://pipe-tracker.vercel.app/api/whatsapp
   ```

---

## Using the System

### Web Dashboard
- Visit your Vercel URL
- Log in with your Supabase credentials
- Add/edit projects, view pipeline, track follow-ups

### WhatsApp Commands

**Project Commands:**

| Command | What it does |
|---------|-------------|
| `ADD` | Start adding a new project |
| `LIST` | View all projects |
| `URGENT` | See overdue projects |
| `STATS` | Pipeline summary |
| `FOCUS` | Today's random focus projects |
| `SEARCH [name]` | Search for a project |
| `HELP` | Show all commands |

**Project Task Commands:**

| Command | What it does |
|---------|-------------|
| `PRIORITY` | View all priority tasks (project + general) |
| `ADDPTASK` | Add task to a project (shows project list) |
| `ADDPTASK [#]` | Add task to specific project number |

**General Task Commands:**

| Command | What it does |
|---------|-------------|
| `TASKS` | View all pending tasks |
| `ADDTASK` | Add a new task |
| `DUETASKS` | See due/overdue tasks |
| `TASKLISTS` | View all task lists |
| `VIEWLIST [#]` | View tasks in a specific list |
| `DONETASK [#]` | Mark a task as complete |

### Smart Reminder Responses

**Project Reminders - Reply with:**
- `DONE` - Mark as followed up
- `CALL` - Will call today
- `SKIP` - Remind tomorrow
- `WON` - Deal closed!
- `LOST` - Lost the deal
- `HOT` - Customer interested
- `UPDATE` - Change project details

**Task Reminders - Reply with:**
- `DONE` - Complete the task
- `LATER` - Move to tomorrow
- `SKIP` - Skip this reminder
- `PROGRESS` - Mark as in progress

---

## Upgrading to Production WhatsApp

The sandbox is free but limited. For production:

1. Go to Twilio → Messaging → Senders → WhatsApp Senders
2. Click **"Request access to a number"**
3. Fill out the business verification form
4. Wait for approval (usually 1-3 days)
5. Update your webhook URL
6. Update `TWILIO_WHATSAPP_NUMBER` in Vercel

**Cost:** ~$0.005 per message sent + $0.005 per message received

---

## Troubleshooting

### WhatsApp not responding
- Check Twilio logs: Console → Monitor → Messaging
- Verify webhook URL is correct
- Make sure phone is connected to sandbox

### Reminders not sending
- Check Vercel function logs
- Verify cron jobs are running
- Check team_members have phone numbers

### Database errors
- Check Supabase logs: Database → Logs
- Verify RLS policies are correct

---

## Support

If you need help:
1. Check Supabase docs: [supabase.com/docs](https://supabase.com/docs)
2. Check Twilio docs: [twilio.com/docs/whatsapp](https://www.twilio.com/docs/whatsapp)
3. Open an issue on GitHub

---

## File Structure

```
pipe-tracker-app/
├── api/
│   ├── whatsapp-bot.js     # WhatsApp message handler (projects + tasks)
│   ├── whatsapp.js         # Vercel endpoint for WhatsApp
│   ├── cron-reminders.js   # Scheduled reminder jobs (projects + tasks)
│   └── cron.js             # Vercel endpoint for cron
├── src/
│   └── app/
│       └── page.jsx        # Main dashboard (React)
├── supabase/
│   ├── schema.sql          # Main database schema (projects)
│   └── tasks-schema.sql    # Tasks database schema
├── package.json
├── vercel.json             # Cron job config
└── SETUP_GUIDE.md          # This file
```

---

**🎉 You're all set! Start tracking your pipe plant projects!**
