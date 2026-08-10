import { Request, Response } from 'express';
import { gqlRequest, QUERIES } from '../_utils/graphql';
import { callLLMWithRetry } from '../_utils/groq';
import { 
  ActionInput, 
  SessionVariables, 
  WorkflowStep, 
  LLMCallConfig,
  HttpRequestConfig,
  DbWriteConfig,
  NotifyConfig,
  ConditionalBranchConfig 
} from '../_utils/types';

// Store workflow execution state (in production, use Redis or database)
const executionState = new Map<string, Map<string, any>>();

export default async (req: Request, res: Response) => {
  const { action, input, session_variables } = req.body;
  
  try {
    switch (action.name) {
      case 'triggerWorkflowRun':
        return await triggerWorkflowRun(input, session_variables, res);
      case 'approveStep':
        return await approveStep(input, session_variables, res);
      default:
        return res.status(400).json({ message: 'Unknown action' });
    }
  } catch (error) {
    console.error('Action error:', error);
    return res.status(500).json({ message: error.message });
  }
};

async function triggerWorkflowRun(
  input: ActionInput,
  session_variables: SessionVariables,
  res: Response
) {
  const { workflow_id } = input;
  const user_id = session_variables['x-hasura-user-id'];
  
  // 1. Verify caller is owner/editor in the workflow's org
  const membershipData = await gqlRequest(
    QUERIES.GET_ORG_MEMBERSHIP,
    { workflow_id, user_id },
    true
  );
  
  const workflow = membershipData.workflows_by_pk;
  if (!workflow) {
    return res.status(404).json({ message: 'Workflow not found' });
  }
  
  const membership = workflow.organization?.org_members?.[0];
  if (!membership || membership.role === 'viewer') {
    return res.status(403).json({ 
      message: 'Insufficient permissions - only owners and editors can trigger workflows' 
    });
  }
  
  // 2. Check org quota
  const orgData = await gqlRequest(
    QUERIES.GET_ORG_QUOTA,
    { org_id: workflow.org_id },
    true
  );
  
  const org = orgData.organizations_by_pk;
  if (org.usage_calls_used >= org.usage_calls_allowed) {
    return res.status(403).json({ 
      message: 'Quota exhausted - organization has reached its usage limit' 
    });
  }
  
  // 3. Create workflow_run
  const runData = await gqlRequest(
    QUERIES.CREATE_WORKFLOW_RUN,
    { 
      workflow_id, 
      trigger_type: 'manual',
      started_by: user_id 
    },
    true
  );
  
  const run = runData.insert_workflow_runs_one;
  
  // 4. Execute steps synchronously
  try {
    await executeSteps(run.id, workflow_id, workflow.org_id);
    
    return res.status(200).json({ 
      workflow_run_id: run.id,
      status: 'completed'
    });
  } catch (error) {
    // Update run status to failed
    await gqlRequest(
      QUERIES.UPDATE_WORKFLOW_RUN,
      { 
        id: run.id, 
        status: 'failed',
        error_message: error.message 
      },
      true
    );
    
    return res.status(200).json({ 
      workflow_run_id: run.id,
      status: 'failed',
      error: error.message
    });
  }
}

async function executeSteps(runId: string, workflowId: string, orgId: string) {
  // Get workflow steps
  const workflowData = await gqlRequest(
    QUERIES.GET_WORKFLOW_WITH_STEPS,
    { workflow_id: workflowId },
    true
  );
  
  const steps: WorkflowStep[] = workflowData.workflows_by_pk?.steps || [];
  
  if (steps.length === 0) {
    throw new Error('Workflow has no steps');
  }
  
  // Initialize step output storage for this run
  const stepOutputs = new Map<string, any>();
  executionState.set(runId, stepOutputs);
  
  // Execute each step in order
  for (const step of steps) {
    const result = await executeStep(runId, step, stepOutputs);
    
    // If approval gate was hit, stop execution
    if (result && result.requires_approval) {
      return; // Execution will resume when approveStep is called
    }
    
    // Store step output for next steps to use
    stepOutputs.set(step.id, result);
  }
  
  // All steps completed - mark workflow as completed
  await gqlRequest(
    QUERIES.UPDATE_WORKFLOW_RUN,
    { id: runId, status: 'completed' },
    true
  );
  
  // Increment org quota
  await gqlRequest(
    QUERIES.INCREMENT_ORG_USAGE,
    { org_id: orgId },
    true
  );
  
  // Cleanup
  executionState.delete(runId);
}

async function executeStep(
  runId: string, 
  step: WorkflowStep, 
  stepOutputs: Map<string, any>
): Promise<any> {
  // Create step run
  const stepRunData = await gqlRequest(
    QUERIES.CREATE_STEP_RUN,
    { 
      workflow_run_id: runId, 
      workflow_step_id: step.id,
      input: {} 
    },
    true
  );
  
  const stepRun = stepRunData.insert_step_runs_one;
  
  let attempt = 0;
  const maxAttempts = 3;
  
  while (attempt < maxAttempts) {
    try {
      // Get previous step output for context
      const previousOutput = getPreviousStepOutput(step, stepOutputs);
      
      const result = await executeStepByType(step, previousOutput, stepOutputs);
      
      // Check if this is an approval gate that needs to pause
      if (result && result.requires_approval) {
        // Update step run as paused
        await gqlRequest(
          QUERIES.UPDATE_STEP_RUN,
          {
            id: stepRun.id,
            status: 'paused',
            output: result,
            attempt_count: attempt + 1
          },
          true
        );
        
        // Update workflow run as paused
        await gqlRequest(
          QUERIES.UPDATE_WORKFLOW_RUN,
          { 
            id: runId, 
            status: 'paused'
          },
          true
        );
        
        return result; // Signal to stop execution
      }
      
      // Update step run as completed
      await gqlRequest(
        QUERIES.UPDATE_STEP_RUN,
        {
          id: stepRun.id,
          status: 'completed',
          output: result,
          attempt_count: attempt + 1
        },
        true
      );
      
      return result;
    } catch (error) {
      attempt++;
      console.error(`Step ${step.step_order} attempt ${attempt} failed:`, error.message);
      
      if (attempt >= maxAttempts) {
        // Update step run as failed
        await gqlRequest(
          QUERIES.UPDATE_STEP_RUN,
          {
            id: stepRun.id,
            status: 'failed',
            error_message: error.message,
            attempt_count: attempt
          },
          true
        );
        
        throw new Error(`Step ${step.step_order} failed after ${maxAttempts} attempts: ${error.message}`);
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

function getPreviousStepOutput(
  currentStep: WorkflowStep, 
  stepOutputs: Map<string, any>
): any {
  // Get all step outputs in order
  const outputs = Array.from(stepOutputs.values());
  
  // Return the last step's output
  return outputs.length > 0 ? outputs[outputs.length - 1] : null;
}

async function executeStepByType(
  step: WorkflowStep, 
  previousOutput: any,
  stepOutputs: Map<string, any>
): Promise<any> {
  const config = JSON.parse(step.config);
  
  switch (step.step_type) {
    case 'llm_call':
      return await executeLLMCall(config, previousOutput);
    case 'http_request':
      return await executeHttpRequest(config, previousOutput);
    case 'db_write':
      return await executeDbWrite(config, previousOutput);
    case 'notify':
      return await executeNotify(config, previousOutput);
    case 'conditional_branch':
      return await executeConditionalBranch(config, previousOutput);
    case 'approval_gate':
      return await executeApprovalGate(config);
    default:
      throw new Error(`Unknown step type: ${step.step_type}`);
  }
}

async function executeLLMCall(config: LLMCallConfig, previousOutput: any) {
  // If prompt references previous output, substitute it
  let prompt = config.prompt;
  
  if (previousOutput && prompt.includes('{{previous_output}}')) {
    const outputStr = typeof previousOutput === 'string' 
      ? previousOutput 
      : JSON.stringify(previousOutput);
    prompt = prompt.replace('{{previous_output}}', outputStr);
  }
  
  if (previousOutput && prompt.includes('{{previous_output.content}}')) {
    prompt = prompt.replace('{{previous_output.content}}', previousOutput.content || '');
  }
  
  return await callLLMWithRetry({ ...config, prompt });
}

async function executeHttpRequest(config: HttpRequestConfig, previousOutput: any) {
  const { url, method = 'GET', headers = {}, body } = config;
  
  // Substitute previous output into body if needed
  let finalBody = body;
  if (body && previousOutput) {
    const bodyStr = JSON.stringify(body);
    if (bodyStr.includes('{{previous_output}}')) {
      finalBody = JSON.parse(bodyStr.replace('{{previous_output}}', JSON.stringify(previousOutput)));
    }
  }
  
  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (finalBody && method !== 'GET') {
    fetchOptions.body = JSON.stringify(finalBody);
  }
  
  const response = await fetch(url, fetchOptions);
  const data = await response.json();
  
  return {
    status: response.status,
    statusText: response.statusText,
    data,
  };
}

async function executeDbWrite(config: DbWriteConfig, previousOutput: any) {
  const { table, data, on_conflict } = config;
  
  // Substitute previous output into data if needed
  let finalData = data;
  if (data && previousOutput) {
    const dataStr = JSON.stringify(data);
    if (dataStr.includes('{{previous_output}}')) {
      finalData = JSON.parse(dataStr.replace('{{previous_output}}', JSON.stringify(previousOutput)));
    }
  }
  
  // Build GraphQL mutation dynamically
  const mutation = `
    mutation InsertData($data: [${table}_insert_input!]!) {
      insert_${table}(objects: $data, on_conflict: ${on_conflict ? `{constraint: ${on_conflict}, update_columns: [${Object.keys(finalData).join(', ')}]}` : ''}) {
        affected_rows
        returning {
          id
        }
      }
    }
  `;
  
  const result = await gqlRequest(mutation, { data: [finalData] }, true);
  return result[`insert_${table}`];
}

async function executeNotify(config: NotifyConfig, previousOutput: any) {
  const { webhook_url, message, channel = 'slack' } = config;
  
  // Substitute previous output into message if needed
  let finalMessage = message;
  if (previousOutput && message.includes('{{previous_output}}')) {
    const outputStr = typeof previousOutput === 'string' 
      ? previousOutput 
      : JSON.stringify(previousOutput, null, 2);
    finalMessage = message.replace('{{previous_output}}', outputStr);
  }
  
  // Send to webhook
  const response = await fetch(webhook_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: finalMessage,
      channel,
    }),
  });
  
  return {
    status: response.status,
    sent: response.ok,
  };
}

async function executeConditionalBranch(config: ConditionalBranchConfig, previousOutput: any) {
  const { condition } = config;
  const { field, operator, value } = condition;
  
  if (!previousOutput) {
    return {
      evaluated: false,
      result: false,
      reason: 'No previous step output to evaluate',
    };
  }
  
  // Extract the field value from previous output
  let fieldValue: any;
  
  if (typeof previousOutput === 'object' && previousOutput !== null) {
    // Try to get field from nested output
    fieldValue = field.split('.').reduce((obj, key) => obj?.[key], previousOutput);
  } else {
    fieldValue = previousOutput;
  }
  
  // Evaluate the condition
  let result = false;
  let comparisonValue = value;
  
  // Try to convert value to appropriate type
  if (typeof fieldValue === 'number') {
    comparisonValue = Number(value);
  } else if (typeof fieldValue === 'boolean') {
    comparisonValue = value === 'true';
  }
  
  switch (operator) {
    case 'eq':
      result = fieldValue == comparisonValue;
      break;
    case 'neq':
      result = fieldValue != comparisonValue;
      break;
    case 'gt':
      result = fieldValue > comparisonValue;
      break;
    case 'lt':
      result = fieldValue < comparisonValue;
      break;
    case 'gte':
      result = fieldValue >= comparisonValue;
      break;
    case 'lte':
      result = fieldValue <= comparisonValue;
      break;
    case 'contains':
      result = String(fieldValue).includes(String(comparisonValue));
      break;
    default:
      result = false;
  }
  
  return {
    evaluated: true,
    field,
    operator,
    value: comparisonValue,
    actualValue: fieldValue,
    result,
    explanation: `Field "${field}" (${fieldValue}) ${operator} "${comparisonValue}" = ${result}`,
  };
}

async function executeApprovalGate(config: any) {
  return {
    type: 'approval_gate',
    message: config.message || 'This step requires approval',
    requires_approval: true,
  };
}

async function approveStep(
  input: ActionInput,
  session_variables: SessionVariables,
  res: Response
) {
  const { step_run_id, approved } = input;
  const user_id = session_variables['x-hasura-user-id'];
  
  // 1. Get step run and workflow run
  const stepRunQuery = `
    query GetStepRun($id: uuid!) {
      step_runs_by_pk(id: $id) {
        id
        workflow_run_id
        workflow_step_id
        status
        output
      }
    }
  `;
  
  const stepRunData = await gqlRequest(stepRunQuery, { id: step_run_id }, true);
  const stepRun = stepRunData.step_runs_by_pk;
  
  if (!stepRun) {
    return res.status(404).json({ message: 'Step run not found' });
  }
  
  if (stepRun.status !== 'paused') {
    return res.status(400).json({ message: 'Step is not paused' });
  }
  
  // 2. Get workflow run to check org
  const workflowRunQuery = `
    query GetWorkflowRun($id: uuid!) {
      workflow_runs_by_pk(id: $id) {
        id
        workflow_id
        status
      }
    }
  `;
  
  const workflowRunData = await gqlRequest(workflowRunQuery, { id: stepRun.workflow_run_id }, true);
  const workflowRun = workflowRunData.workflow_runs_by_pk;
  
  // 3. Get workflow to check org
  const workflowQuery = `
    query GetWorkflow($workflow_id: uuid!) {
      workflows_by_pk(id: $workflow_id) {
        id
        org_id
      }
    }
  `;
  
  const workflowData = await gqlRequest(
    workflowQuery,
    { workflow_id: workflowRun.workflow_id },
    true
  );
  const workflow = workflowData.workflows_by_pk;
  
  // 4. Verify approver has correct role (owner or editor)
  const membershipQuery = `
    query GetMembership($org_id: uuid!, $user_id: uuid!) {
      org_members(where: { 
        org_id: { _eq: $org_id }, 
        user_id: { _eq: $user_id } 
      }) {
        role
      }
    }
  `;
  
  const membershipData = await gqlRequest(
    membershipQuery,
    { org_id: workflow.org_id, user_id },
    true
  );
  
  const membership = membershipData.org_members?.[0];
  
  if (!membership || membership.role === 'viewer') {
    return res.status(403).json({ 
      message: 'Only owners and editors can approve steps' 
    });
  }
  
  // 5. Update step run
  await gqlRequest(
    QUERIES.UPDATE_STEP_RUN,
    {
      id: step_run_id,
      status: approved ? 'completed' : 'failed',
      output: { approved, approved_by: user_id },
      approved_by: user_id,
      approved_at: new Date().toISOString()
    },
    true
  );
  
  if (approved) {
    // 6. Resume workflow execution
    await gqlRequest(
      QUERIES.UPDATE_WORKFLOW_RUN,
      { id: workflowRun.id, status: 'running' },
      true
    );
    
    try {
      // Get all steps and resume from next step
      const stepsData = await gqlRequest(
        QUERIES.GET_WORKFLOW_WITH_STEPS,
        { workflow_id: workflowRun.workflow_id },
        true
      );
      
      const steps = stepsData.workflows_by_pk?.steps || [];
      
      // Find the approved step index
      const approvedStepIndex = steps.findIndex((s: any) => s.id === stepRun.workflow_step_id);
      
      if (approvedStepIndex === -1) {
        throw new Error('Approved step not found in workflow');
      }
      
      // Initialize step outputs from previous runs
      const stepOutputs = new Map<string, any>();
      
      // Get all previous step runs to reconstruct state
      const previousRunsQuery = `
        query GetPreviousRuns($workflow_run_id: uuid!) {
          step_runs(where: { 
            workflow_run_id: { _eq: $workflow_run_id },
            status: { _in: ["completed", "paused"] }
          }, order_by: { workflow_step: { step_order: asc } }) {
            id
            workflow_step_id
            status
            output
          }
        }
      `;
      
      const previousRunsData = await gqlRequest(
        previousRunsQuery,
        { workflow_run_id: workflowRun.id },
        true
      );
      
      // Reconstruct step outputs from completed steps
      for (const prevRun of previousRunsData.step_runs) {
        if (prevRun.status === 'completed' && prevRun.output) {
          stepOutputs.set(prevRun.workflow_step_id, prevRun.output);
        }
      }
      
      // Execute remaining steps
      for (let i = approvedStepIndex + 1; i < steps.length; i++) {
        const step = steps[i];
        const result = await executeStep(workflowRun.id, step, stepOutputs);
        
        if (result && result.requires_approval) {
          return res.status(200).json({ success: true, status: 'paused' });
        }
        
        stepOutputs.set(step.id, result);
      }
      
      // All steps completed
      await gqlRequest(
        QUERIES.UPDATE_WORKFLOW_RUN,
        { id: workflowRun.id, status: 'completed' },
        true
      );
      
      // Increment org quota
      await gqlRequest(
        QUERIES.INCREMENT_ORG_USAGE,
        { org_id: workflow.org_id },
        true
      );
      
      return res.status(200).json({ success: true, status: 'completed' });
    } catch (error) {
      await gqlRequest(
        QUERIES.UPDATE_WORKFLOW_RUN,
        { 
          id: workflowRun.id, 
          status: 'failed',
          error_message: error.message 
        },
        true
      );
      return res.status(200).json({ success: true, status: 'failed' });
    }
  } else {
    // 7. Mark workflow as failed
    await gqlRequest(
      QUERIES.UPDATE_WORKFLOW_RUN,
      { 
        id: workflowRun.id, 
        status: 'failed',
        error_message: 'Approval denied' 
      },
      true
    );
    
    return res.status(200).json({ success: true, status: 'failed' });
  }
}
