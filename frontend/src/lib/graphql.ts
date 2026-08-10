import { gql } from '@apollo/client';

// Queries
export const GET_ORGANIZATIONS = gql`
  query GetOrganizations($user_id: uuid!) {
    org_members(where: { user_id: { _eq: $user_id } }) {
      id
      role
      organization {
        id
        name
        usage_calls_used
        usage_calls_allowed
      }
    }
  }
`;

export const GET_WORKFLOWS = gql`
  query GetWorkflows($org_id: uuid!) {
    workflows(where: { org_id: { _eq: $org_id } }) {
      id
      name
      description
      created_at
      updated_at
      steps(order_by: { step_order: asc }) {
        id
        step_order
        step_type
        config
      }
      triggers {
        id
        trigger_type
        is_active
      }
      runs(order_by: { started_at: desc }, limit: 1) {
        id
        status
        started_at
        completed_at
      }
    }
  }
`;

export const GET_WORKFLOW_DETAIL = gql`
  query GetWorkflowDetail($workflow_id: uuid!) {
    workflows_by_pk(id: $workflow_id) {
      id
      name
      description
      org_id
      created_at
      updated_at
      steps(order_by: { step_order: asc }) {
        id
        step_order
        step_type
        config
      }
      triggers {
        id
        trigger_type
        config
        is_active
        webhook_secret
      }
      runs(order_by: { started_at: desc }, limit: 5) {
        id
        status
        trigger_type
        started_at
        completed_at
        error_message
        step_runs(order_by: { workflow_step: { step_order: asc } }) {
          id
          status
          output
          error_message
          started_at
          completed_at
          workflow_step {
            step_type
            config
          }
        }
      }
    }
  }
`;

export const GET_WORKFLOW_RUN = gql`
  query GetWorkflowRun($run_id: uuid!) {
    workflow_runs_by_pk(id: $run_id) {
      id
      status
      trigger_type
      started_at
      completed_at
      error_message
      step_runs(order_by: { workflow_step: { step_order: asc } }) {
        id
        status
        input
        output
        error_message
        attempt_count
        approved_by
        approved_at
        started_at
        completed_at
        workflow_step {
          step_order
          step_type
          config
        }
      }
    }
  }
`;

// Subscriptions
export const SUBSCRIBE_WORKFLOW_RUN = gql`
  subscription SubscribeWorkflowRun($run_id: uuid!) {
    workflow_runs_by_pk(id: $run_id) {
      id
      status
      error_message
      completed_at
      step_runs(order_by: { workflow_step: { step_order: asc } }) {
        id
        status
        output
        error_message
        attempt_count
        approved_by
        approved_at
        started_at
        completed_at
        workflow_step {
          step_order
          step_type
          config
        }
      }
    }
  }
`;

// Mutations
export const TRIGGER_WORKFLOW = gql`
  mutation TriggerWorkflow($workflow_id: uuid!) {
    triggerWorkflowRun(workflow_id: $workflow_id) {
      workflow_run_id
      status
    }
  }
`;

export const APPROVE_STEP = gql`
  mutation ApproveStep($step_run_id: uuid!, $approved: Boolean!) {
    approveStep(step_run_id: $step_run_id, approved: $approved) {
      success
      status
    }
  }
`;

export const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow($org_id: uuid!, $name: String!, $description: String) {
    insert_workflows_one(object: {
      org_id: $org_id,
      name: $name,
      description: $description
    }) {
      id
      name
    }
  }
`;

export const UPDATE_WORKFLOW = gql`
  mutation UpdateWorkflow($id: uuid!, $name: String, $description: String) {
    update_workflows_by_pk(
      pk_columns: { id: $id },
      _set: { name: $name, description: $description }
    ) {
      id
      name
    }
  }
`;

export const CREATE_WORKFLOW_STEP = gql`
  mutation CreateWorkflowStep(
    $workflow_id: uuid!,
    $step_order: Int!,
    $step_type: String!,
    $config: jsonb!
  ) {
    insert_workflow_steps_one(object: {
      workflow_id: $workflow_id,
      step_order: $step_order,
      step_type: $step_type,
      config: $config
    }) {
      id
      step_order
      step_type
      config
    }
  }
`;

export const UPDATE_WORKFLOW_STEP = gql`
  mutation UpdateWorkflowStep(
    $id: uuid!,
    $step_order: Int,
    $step_type: String,
    $config: jsonb
  ) {
    update_workflow_steps_by_pk(
      pk_columns: { id: $id },
      _set: { step_order: $step_order, step_type: $step_type, config: $config }
    ) {
      id
      step_order
      step_type
      config
    }
  }
`;

export const DELETE_WORKFLOW_STEP = gql`
  mutation DeleteWorkflowStep($id: uuid!) {
    delete_workflow_steps_by_pk(id: $id) {
      id
    }
  }
`;

export const CREATE_WORKFLOW_TRIGGER = gql`
  mutation CreateWorkflowTrigger(
    $workflow_id: uuid!,
    $trigger_type: String!,
    $config: jsonb!,
    $webhook_secret: String
  ) {
    insert_workflow_triggers_one(object: {
      workflow_id: $workflow_id,
      trigger_type: $trigger_type,
      config: $config,
      webhook_secret: $webhook_secret
    }) {
      id
      trigger_type
      config
    }
  }
`;

export const UPDATE_WORKFLOW_TRIGGER = gql`
  mutation UpdateWorkflowTrigger(
    $id: uuid!,
    $config: jsonb,
    $is_active: Boolean
  ) {
    update_workflow_triggers_by_pk(
      pk_columns: { id: $id },
      _set: { config: $config, is_active: $is_active }
    ) {
      id
      trigger_type
      config
      is_active
    }
  }
`;

export const DELETE_WORKFLOW_TRIGGER = gql`
  mutation DeleteWorkflowTrigger($id: uuid!) {
    delete_workflow_triggers_by_pk(id: $id) {
      id
    }
  }
`;
