# Implementation Write-up

## Schema Reasoning

The database schema follows a hierarchical structure: Organizations → Workflows → Steps/Triggers → Runs → Step Runs. This design supports:

1. **Multi-tenancy**: Each organization is isolated with its own quota and members
2. **Audit trail**: Complete history of workflow executions with step-level details
3. **Flexibility**: JSONB config columns allow different step types without schema changes
4. **Real-time**: Tables are optimized for Hasura subscriptions with proper indexes

Key design decisions:
- `workflow_steps.config` uses JSONB for flexible step configuration
- `workflow_runs` supports paused state for approval gates
- `step_runs` tracks attempt count for retry logic
- Aggregation view provides org-level usage statistics

## Two-Layer Permission System

### Layer 1: Organization + Role Scoping

Every permission checks that the user is a member of the organization AND has the required role:

```yaml
# Example: workflows table
filter:
  organization:
    org_members:
      - user_id: { _eq: "X-Hasura-User-Id" }
      - role: { _in: ["owner", "editor", "viewer"] }
```

This ensures:
- Users can only see workflows in their organizations
- Role-based access (owner > editor > viewer)
- Cross-org isolation is airtight

### Layer 2: Step-Level Gating

Dangerous step types (db_write, webhook trigger, notify) require owner role:

```yaml
# workflow_steps insert permission
- role: owner
  check: {}  # Can insert all types
- role: editor
  check:
    step_type: { _in: ["llm_call", "http_request", "conditional_branch", "approval_gate"] }
```

This is enforced at the database level, but the Action handler also verifies:
1. Caller's role before triggering workflow
2. Approver's role before resuming paused workflow

## Approval Gate Pause/Resume Implementation

### Pause Flow

1. Workflow executes steps sequentially
2. When hitting `approval_gate` step:
   - Step run is created with status `running`
   - Step executes and returns `{ requires_approval: true }`
   - Step run is updated to `paused`
   - Workflow run status changes to `paused`
   - Execution stops (no more steps processed)

### Resume Flow

1. User clicks "Approve" or "Deny" button in frontend
2. Frontend calls `approveStep` mutation with `step_run_id` and `approved` boolean
3. Action handler:
   - Fetches step run and workflow run
   - Verifies approver's role (must be owner or editor)
   - Updates step run status (`completed` or `failed`)
   - If approved:
     - Sets workflow run status to `running`
     - Resumes execution from next step
   - If denied:
     - Sets workflow run status to `failed`
     - Records denial reason

### Key Implementation Details

- Approval is checked in the Action handler, not just database permissions
- This is because approval is a mid-execution decision, not a simple row read/write
- The Action handler has admin access to bypass normal permissions for workflow execution
- Frontend uses GraphQL subscriptions to show real-time pause state

## Final Scenario Demonstration

### Setup

1. **Two Organizations**: Org A (with owner, editor, viewer) and Org B (with viewer)
2. **Workflow in Org A**: 5 steps including LLM call, HTTP request, conditional branch, notification, and approval gate

### Execution

1. **Manual Trigger**: Owner clicks "Run Workflow"
2. **LLM Call**: Calls Groq API with prompt
3. **HTTP Request**: Posts to external API
4. **Conditional Branch**: Evaluates based on previous output
5. **Approval Gate**: Pauses, shows approval UI
6. **Owner Approves**: Workflow resumes
7. **Notification**: Sends Slack message
8. **Completion**: Status shows "completed"

### Cross-Org Isolation

1. **Org B user logs in**: Cannot see Org A's workflows
2. **Direct ID attack**: Querying Org A's workflow ID returns empty
3. **Trigger attempt**: Org B user cannot trigger Org A's workflow
4. **Approval attempt**: Org B user cannot approve Org A's workflow

All six scenarios pass, proving:
- Schema and relationships work correctly
- Both permission layers are enforced
- Action handler verifies roles
- Subscriptions provide live updates
- Approval gate pause/resume works end-to-end
