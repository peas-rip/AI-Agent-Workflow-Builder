export interface ActionInput {
  workflow_id?: string;
  step_run_id?: string;
  approved?: boolean;
}

export interface SessionVariables {
  'x-hasura-user-id': string;
  'x-hasura-role': string;
}

export interface WorkflowStep {
  id: string;
  step_order: number;
  step_type: 'llm_call' | 'http_request' | 'db_write' | 
            'notify' | 'conditional_branch' | 'approval_gate';
  config: string;
}

export interface StepRun {
  id: string;
  workflow_run_id: string;
  workflow_step_id: string;
  status: string;
  input: any;
  output: any;
  error_message: string | null;
  attempt_count: number;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: string;
  trigger_type: string;
}

export interface Organization {
  id: string;
  name: string;
  usage_calls_used: number;
  usage_calls_allowed: number;
}

export interface OrgMembership {
  role: 'owner' | 'editor' | 'viewer';
}

export interface LLMCallConfig {
  model?: string;
  prompt: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface HttpRequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface DbWriteConfig {
  table: string;
  data: Record<string, any>;
  on_conflict?: string;
}

export interface NotifyConfig {
  webhook_url: string;
  message: string;
  channel?: string;
}

export interface ConditionalBranchConfig {
  condition: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
    value: any;
  };
  true_branch?: string;
  false_branch?: string;
}
