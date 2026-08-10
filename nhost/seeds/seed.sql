-- Seed data for testing

-- Create test organizations
INSERT INTO public.organizations (id, name, usage_calls_used, usage_calls_allowed) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Org A', 0, 1000),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Org B', 0, 1000);

-- Note: Users will be created via auth.users when they sign up
-- After signup, add them to org_members manually or via trigger

-- Example: Add a user to Org A as owner (replace user_id with actual auth user ID)
-- INSERT INTO public.org_members (user_id, org_id, role) VALUES
--   ('user-id-from-auth', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'owner');

-- Example workflow for testing
INSERT INTO public.workflows (id, org_id, name, description) VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Content Generation', 'Generate content using AI');

-- Example steps
INSERT INTO public.workflow_steps (workflow_id, step_order, step_type, config) VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 1, 'llm_call', '{
    "model": "llama-3.1-70b-versatile",
    "system_prompt": "You are a helpful content writer.",
    "prompt": "Write a short blog post about AI workflow automation.",
    "max_tokens": 500,
    "temperature": 0.7
  }'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 2, 'http_request', '{
    "url": "https://httpbin.org/post",
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": {"content": "from previous step"}
  }'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 3, 'conditional_branch', '{
    "condition": {
      "field": "status",
      "operator": "eq",
      "value": "success"
    }
  }'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 4, 'notify', '{
    "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "message": "Workflow completed successfully!",
    "channel": "slack"
  }'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 5, 'approval_gate', '{
    "message": "Please review the generated content before publishing."
  }');

-- Add manual trigger
INSERT INTO public.workflow_triggers (workflow_id, trigger_type, config, is_active) VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'manual', '{}', true);

-- Add webhook trigger
INSERT INTO public.workflow_triggers (workflow_id, trigger_type, config, is_active, webhook_secret) VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'webhook', '{}', true, 'my-secret-key');
