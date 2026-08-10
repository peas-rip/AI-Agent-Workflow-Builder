<<<<<<< HEAD
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
=======
# AI-Agent-Workflow-Builder
A simple AI Agent Workflow Builder
A mini n8n, purpose-built for chaining AI agent steps. Users inside an organization build workflows out of multiple step types, start them multiple ways, and every action is checked against two separate layers of permissions. The assignment ends in one live scenario that proves the whole system actually works — not a checklist graded piece by piece.

This is deliberately not a checklist. The final scenario needs the schema, Hasura config, both permission layers, the Action handler, and live subscriptions to all work together — get any one piece wrong and the scenario visibly breaks.

Tech Stack

nhost (Postgres + Hasura + Auth + Storage + Functions)
Hasura GraphQL Engine
PostgreSQL
GraphQL — queries, mutations, subscriptions
A real LLM API for llm_call steps — any free tier works (Groq, OpenRouter, Gemini). If you can't get access, a stubbed call with a disclosed artificial delay is fine.
React/Next.js frontend — required
Data Model

At minimum:

organizations — with a usage quota (calls used / allowed per period)
org_members — user_id, org_id, role (owner, editor, viewer)
workflows — belongs to an organization
workflow_steps — ordered, with a type (see below) and config (JSONB is fine)
workflow_triggers — trigger type (see below) tied to a workflow
workflow_runs — one per execution, overall status (must support a paused state)
step_runs — one per step per run — status, input, output, error, attempt count, plus approved_by / approved_at for approval-gate steps
Field names are yours to adjust; the relationships — org → members → workflows → steps/triggers, workflow → runs → step_runs — need to hold.

Step Types (Nodes)

Implement at least these:

llm_call — calls a real LLM API
http_request — generic call to any external API
db_write — saves a result into your own tables
notify — Slack/email alert, implemented as an Event Trigger
conditional_branch — if/else based on the previous step's output
approval_gate — pauses the run until someone with the right role approves
Trigger Types

Implement at least these:

Manual — user clicks Run
Webhook — a Hasura Action acting as an inbound endpoint external systems call to start a run
Scheduled — cron-based, via a scheduled function
Database event — a row change in a watched table auto-starts a run, via a Hasura Event Trigger
Hasura Layer

Track all tables, wire up the relationships above
One aggregation — org-level usage this month, or average run duration — as a computed field or Postgres view
Permissions — two layers, not one

Layer 1 — org + role scoping (who can see or trigger a workflow at all): role alone isn't enough — every permission also has to scope to the caller's own org via org_members, so an editor in Org A can never see or touch Org B's data even with the same role.

owner — full control over workflows, steps, triggers, and org membership
editor — can create/edit workflows and steps, can trigger runs — can't manage members
viewer — read-only, cannot trigger a run
Layer 2 — step-level gating (who can act on specific steps): some step types reach outside the sandbox and need tighter control — only an owner can add a db_write, a webhook trigger, or a notify step. Clearing an approval_gate requires the Action handler itself to check the approver's role before resuming the run — this can't be a database permission alone, since it's a mid-execution decision, not a simple row read or write.

GraphQL Operations

A query returning an org's workflows with their steps, triggers, and most recent run status
A mutation to create/edit a workflow, its steps, and its triggers
A mutation to approve a paused approval_gate step
A subscription on step_runs (filtered to a workflow_run_id) for live step-by-step progress, including a "paused, awaiting approval" state
The Integration — the core of the assignment

A Hasura Action, triggerWorkflowRun(workflow_id), backed by a function that:

Verifies the caller is owner/editor in the workflow's org
Checks the org's quota isn't exhausted
Creates the workflow_run, then executes steps in order — llm_call and http_request steps make real external calls, with at least one retry on failure
On hitting an approval_gate step, sets the run to paused and stops — a second Action (approveStep) checks the approver's role before resuming
Updates step_runs / workflow_run status throughout, so the subscription reflects it live
Increments the org's quota usage on completion
Plus at least one trigger beyond manual — webhook, scheduled, or event-based — actually wired to start a run without a button click.

Frontend

Auth via nhost, org context
A screen to build a workflow — add/reorder steps of different types, attach a trigger
A Run button (hidden for viewers), live per-step status via subscription, including a pause/approve UI for approval_gate steps
A usage/quota indicator
>>>>>>> ea6ec895d456462fbffdae392bddea0657890294
