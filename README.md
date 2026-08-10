# AI Agent Workflow Builder

A mini n8n-like platform for chaining AI agent steps, built with nhost, Hasura, PostgreSQL, and GraphQL.

## Features

- **Multiple Step Types**: LLM calls, HTTP requests, database writes, notifications, conditional branches, and approval gates
- **Multiple Trigger Types**: Manual, webhook, scheduled (cron), and database event triggers
- **Two-Layer Permissions**: Organization scoping + step-level gating
- **Real-time Updates**: Live workflow execution status via GraphQL subscriptions
- **Quota Management**: Per-organization usage tracking

## Tech Stack

- **Backend**: nhost (PostgreSQL + Hasura + Auth + Functions)
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **AI**: Groq API for LLM calls (fastest inference)
- **GraphQL**: Queries, mutations, and subscriptions

## Project Structure

```
├── functions/           # Nhost serverless functions
│   ├── _utils/         # Shared utilities
│   ├── actions/        # Hasura Action handlers
│   ├── triggers/       # Webhook triggers
│   ├── scheduled/      # Cron triggers
│   └── events/         # Database event triggers
├── nhost/              # Nhost configuration
│   ├── migrations/     # Database migrations
│   └── metadata/       # Hasura metadata
└── frontend/           # Next.js application
    └── src/
        ├── app/        # Next.js app router
        ├── components/ # React components
        └── lib/        # Utilities and GraphQL
```

## Setup Instructions

### Option A: Cloud Setup (Recommended - No Docker Required)

#### Prerequisites

1. Node.js 20+
2. Nhost account (free at https://nhost.io)
3. nhost CLI: `npm install -D @nhost/cli`

#### Step 1: Create Nhost Project

1. Go to https://nhost.io and sign up/login
2. Click **Create Project**
3. Enter project name: `workflow-builder`
4. Select region: `eu-central-1`
5. Select **Free** plan
6. Click **Create Project**
7. Note your **Subdomain** and **Admin Secret**

#### Step 2: Apply Database Schema

1. Open Hasura Console from Nhost Dashboard
2. Go to **Data** → **SQL**
3. Paste contents of `nhost/migrations/20240101000000_init_schema.sql`
4. Click **Run**

#### Step 3: Configure Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `.env.local` with your project details:

```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-subdomain
NEXT_PUBLIC_NHOST_REGION=eu-central-1
NEXT_PUBLIC_HASURA_ENDPOINT=https://your-subdomain.hasura.eu-central-1.nhost.run/v1/graphql
HASURA_ADMIN_SECRET=your-admin-secret
GROQ_API_KEY=
SLACK_WEBHOOK_URL=
```

#### Step 4: Deploy Functions

```bash
npm install -D @nhost/cli
nhost login
nhost push --subdomain your-subdomain
```

#### Step 5: Start Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

---

### Option B: Local Setup (Requires Docker)

#### Prerequisites

1. Node.js 20+
2. Docker Desktop running
3. nhost CLI: `npm install -D @nhost/cli`
4. Groq API key (free at https://console.groq.com)

#### Step 1: Initialize Nhost Project

```bash
nhost init
nhost up
```

### 2. Apply Database Migrations

The migration file is in `nhost/migrations/20240101000000_init_schema.sql`. It will be applied automatically when you run `nhost dev`.

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-project
NEXT_PUBLIC_NHOST_REGION=eu-central-1
NEXT_PUBLIC_HASURA_ENDPOINT=https://your-project.hasura.app/v1/graphql
HASURA_ADMIN_SECRET=your-admin-secret
GROQ_API_KEY=gsk_...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 4. Configure Hasura Actions

In the Hasura Console:

1. Go to Actions → Create
2. Create action `triggerWorkflowRun`:
   - Arguments: `workflow_id: uuid!`
   - Returns: `TriggerWorkflowRunResponse`
   - Handler: `{{NHOST_FUNCTIONS_URL}}/actions`
   - Headers: `x-hasura-action-secret: your-secret`

3. Create action `approveStep`:
   - Arguments: `step_run_id: uuid!`, `approved: Boolean!`
   - Returns: `ApproveStepResponse`
   - Handler: `{{NHOST_FUNCTIONS_URL}}/actions`
   - Headers: `x-hasura-action-secret: your-secret`

### 5. Configure Event Triggers

1. Go to Events → Create
2. Create event trigger `db_event_trigger`:
   - Table: Your watched table
   - Operations: INSERT, UPDATE, DELETE
   - Webhook: `{{NHOST_FUNCTIONS_URL}}/events/dbEvent`

### 6. Configure Scheduled Triggers

1. Go to Events → Cron Triggers → Create
2. Create cron trigger:
   - Name: `scheduled_workflow_trigger`
   - Webhook: `{{NHOST_FUNCTIONS_URL}}/scheduled/cron`
   - Schedule: `0 9 * * *` (daily at 9am)

### 7. Start Development

```bash
# Terminal 1: Start Nhost
nhost dev

# Terminal 2: Start Next.js
cd frontend
npm install
npm run dev
```

### 8. Access the App

- Frontend: http://localhost:3000
- Hasura Console: http://localhost:8080/console
- Auth: http://localhost:9001

## Usage

### Creating a Workflow

1. Sign up/login to create your account
2. Select or create an organization
3. Click "Create Workflow"
4. Add steps using the workflow builder
5. Configure each step (LLM prompts, API endpoints, etc.)
6. Add triggers (manual, webhook, etc.)

### Running a Workflow

**Manual:**
- Click "Run Workflow" button on the workflow card

**Webhook:**
```bash
curl -X POST \
  https://your-project.functions.nhost.run/v1/webhook/{workflow_id} \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{"key": "value"}'
```

**Scheduled:**
- Configured in Hasura Console, runs automatically

**Database Event:**
- Configured to watch specific table changes

### Viewing Results

1. Click on a workflow to see its details
2. Click on a run to see live execution status
3. Watch steps execute in real-time via subscriptions
4. Approve approval gates when prompted

## Permission System

### Layer 1: Organization Scoping

Every permission checks that the user is a member of the organization:

```yaml
# Example: workflows table
filter:
  organization:
    org_members:
      - user_id: { _eq: "X-Hasura-User-Id" }
      - role: { _in: ["owner", "editor", "viewer"] }
```

### Layer 2: Step-Level Gating

Dangerous step types require owner role:

```yaml
# workflow_steps table
# Owner can insert all types
- role: owner
  check: {}

# Editor can only insert safe types
- role: editor
  check:
    step_type: { _in: ["llm_call", "http_request", "conditional_branch", "approval_gate"] }
```

### Approval Gate Flow

1. Workflow hits approval_gate step
2. Run status changes to "paused"
3. Only owners/editors can approve
4. `approveStep` action verifies role before resuming

## API Keys

- **Groq**: Free tier provides 14,400 requests/day
- **Slack**: Create incoming webhook at https://api.slack.com/messaging/webhooks

## Deployment

### Frontend (Vercel)

```bash
cd frontend
npx vercel
```

### Nhost

Push to GitHub and connect to nhost.io for automatic deployment.

## License

MIT
