import nhost from './nhost';

export async function gqlRequest<T = any>(
  query: string,
  variables: Record<string, any> = {},
  isAdmin = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (isAdmin) {
    headers['x-hasura-admin-secret'] = process.env.HASURA_ADMIN_SECRET || '';
  }

  // Determine GraphQL URL based on environment
  // Cloud: use NHOST_GRAPHQL_URL or construct from subdomain/region
  // Local: use localhost:8080
  const graphqlUrl = process.env.NHOST_GRAPHQL_URL || 
    (process.env.NHOST_SUBDOMAIN && process.env.NHOST_REGION
      ? `https://${process.env.NHOST_SUBDOMAIN}.hasura.${process.env.NHOST_REGION}.nhost.run/v1/graphql`
      : 'http://localhost:8080/v1/graphql'
    );

  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

export const QUERIES = {
  GET_ORG_MEMBERSHIP: `
    query GetOrgMembership($workflow_id: uuid!, $user_id: uuid!) {
      workflow_steps(where: { workflow_id: { _eq: $workflow_id } }) {
        id
      }
      workflows_by_pk(id: $workflow_id) {
        id
        org_id
        organization {
          org_members(where: { user_id: { _eq: $user_id } }) {
            role
          }
        }
      }
    }
  `,
  GET_WORKFLOW_WITH_STEPS: `
    query GetWorkflowWithSteps($workflow_id: uuid!) {
      workflows_by_pk(id: $workflow_id) {
        id
        name
        org_id
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
        }
      }
    }
  `,
  GET_ORG_QUOTA: `
    query GetOrgQuota($org_id: uuid!) {
      organizations_by_pk(id: $org_id) {
        id
        usage_calls_used
        usage_calls_allowed
      }
    }
  `,
  CREATE_WORKFLOW_RUN: `
    mutation CreateWorkflowRun(
      $workflow_id: uuid!,
      $trigger_type: String!,
      $started_by: uuid
    ) {
      insert_workflow_runs_one(object: {
        workflow_id: $workflow_id,
        trigger_type: $trigger_type,
        started_by: $started_by,
        status: "running"
      }) {
        id
        status
      }
    }
  `,
  CREATE_STEP_RUN: `
    mutation CreateStepRun(
      $workflow_run_id: uuid!,
      $workflow_step_id: uuid!,
      $input: jsonb
    ) {
      insert_step_runs_one(object: {
        workflow_run_id: $workflow_run_id,
        workflow_step_id: $workflow_step_id,
        input: $input,
        status: "running"
      }) {
        id
        status
      }
    }
  `,
  UPDATE_STEP_RUN: `
    mutation UpdateStepRun(
      $id: uuid!,
      $status: String!,
      $output: jsonb,
      $error_message: String,
      $attempt_count: Int,
      $approved_by: uuid,
      $approved_at: timestamptz
    ) {
      update_step_runs_by_pk(
        pk_columns: { id: $id },
        _set: {
          status: $status,
          output: $output,
          error_message: $error_message,
          attempt_count: $attempt_count,
          approved_by: $approved_by,
          approved_at: $approved_at
        }
      ) {
        id
        status
      }
    }
  `,
  UPDATE_WORKFLOW_RUN: `
    mutation UpdateWorkflowRun(
      $id: uuid!,
      $status: String!,
      $error_message: String,
      $completed_at: timestamptz
    ) {
      update_workflow_runs_by_pk(
        pk_columns: { id: $id },
        _set: {
          status: $status,
          error_message: $error_message,
          completed_at: $completed_at
        }
      ) {
        id
        status
      }
    }
  `,
  INCREMENT_ORG_USAGE: `
    mutation IncrementOrgUsage($org_id: uuid!) {
      update_organizations_by_pk(
        pk_columns: { id: $org_id },
        _inc: { usage_calls_used: 1 }
      ) {
        id
        usage_calls_used
      }
    }
  `,
};
