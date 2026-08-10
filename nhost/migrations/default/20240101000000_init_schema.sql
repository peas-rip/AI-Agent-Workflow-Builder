-- AI Agent Workflow Builder - Initial Schema
-- Organizations with usage quota
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  usage_calls_used INT DEFAULT 0,
  usage_calls_allowed INT DEFAULT 1000,
  usage_period_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Organization membership with roles
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- Workflows
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow steps (ordered)
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN (
    'llm_call', 'http_request', 'db_write', 
    'notify', 'conditional_branch', 'approval_gate'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workflow_id, step_order)
);

-- Workflow triggers
CREATE TABLE IF NOT EXISTS public.workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'manual', 'webhook', 'scheduled', 'database_event'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  webhook_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow runs
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'running', 'paused', 'completed', 'failed'
  )),
  trigger_type TEXT NOT NULL,
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Step runs
CREATE TABLE IF NOT EXISTS public.step_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  workflow_step_id UUID NOT NULL REFERENCES public.workflow_steps(id),
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'paused'
  )),
  input JSONB,
  output JSONB,
  error_message TEXT,
  attempt_count INT DEFAULT 0,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
   started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID REFERENCES public.workflow_runs(id),
  channel TEXT NOT NULL DEFAULT 'slack',
  message JSONB NOT NULL,
  webhook_url TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_org ON public.workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON public.workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON public.workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON public.workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_step_runs_run ON public.step_runs(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_step_runs_status ON public.step_runs(status);
CREATE INDEX IF NOT EXISTS idx_notifications_run ON public.notifications(workflow_run_id);

-- Create aggregation view for org usage stats
CREATE OR REPLACE VIEW public.org_usage_stats AS
SELECT 
  o.id as org_id,
  o.name as org_name,
  o.usage_calls_used,
  o.usage_calls_allowed,
  o.usage_calls_allowed - o.usage_calls_used as calls_remaining,
  COUNT(DISTINCT w.id) as total_workflows,
  COUNT(DISTINCT wr.id) as total_runs,
  AVG(
    CASE 
      WHEN wr.completed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (wr.completed_at - wr.started_at))
      ELSE NULL 
    END
  ) as avg_run_duration_seconds
FROM public.organizations o
LEFT JOIN public.workflows w ON w.org_id = o.id
LEFT JOIN public.workflow_runs wr ON wr.workflow_id = w.id 
  AND wr.started_at >= o.usage_period_start
GROUP BY o.id, o.name, o.usage_calls_used, o.usage_calls_allowed;

-- Enable Row Level Security (idempotent)
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies using hasura_session variable (compatible with Nhost Cloud)
CREATE POLICY "org_members_select_own_org" ON public.org_members
  FOR SELECT USING (
    user_id = current_setting('hasura.user.id', true)::uuid
  );

CREATE POLICY "workflows_select_own_org" ON public.workflows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.user_id = current_setting('hasura.user.id', true)::uuid 
        AND om.org_id = workflows.org_id
    )
  );

CREATE POLICY "workflow_steps_select_own_org" ON public.workflow_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.org_members om ON om.org_id = w.org_id
      WHERE om.user_id = current_setting('hasura.user.id', true)::uuid 
        AND w.id = workflow_steps.workflow_id
    )
  );

CREATE POLICY "workflow_triggers_select_own_org" ON public.workflow_triggers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.org_members om ON om.org_id = w.org_id
      WHERE om.user_id = current_setting('hasura.user.id', true)::uuid 
        AND w.id = workflow_triggers.workflow_id
    )
  );

CREATE POLICY "workflow_runs_select_own_org" ON public.workflow_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.org_members om ON om.org_id = w.org_id
      WHERE om.user_id = current_setting('hasura.user.id', true)::uuid 
        AND w.id = workflow_runs.workflow_id
    )
  );

CREATE POLICY "step_runs_select_own_org" ON public.step_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflow_runs wr
      JOIN public.workflows w ON w.id = wr.workflow_id
      JOIN public.org_members om ON om.org_id = w.org_id
      WHERE om.user_id = current_setting('hasura.user.id', true)::uuid 
        AND wr.id = step_runs.workflow_run_id
    )
  );

CREATE POLICY "notifications_select_own_org" ON public.notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflow_runs wr
      JOIN public.workflows w ON w.id = wr.workflow_id
      JOIN public.org_members om ON om.org_id = w.org_id
      WHERE om.user_id = current_setting('hasura.user.id', true)::uuid 
        AND wr.id = notifications.workflow_run_id
    )
  );
