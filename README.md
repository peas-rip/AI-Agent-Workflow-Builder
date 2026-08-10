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
