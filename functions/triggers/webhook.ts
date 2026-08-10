import { Request, Response } from 'express';
import { gqlRequest, QUERIES } from '../_utils/graphql';

export default async (req: Request, res: Response) => {
  const { method, headers, body, params } = req;
  
  // Only accept POST requests
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const workflow_id = (req.body as any)?.workflow_id || (req.query as any)?.workflow_id;
    const payload = body;
    
    // Verify webhook secret
    const webhookSecret = headers['x-webhook-secret'];
    
    // Get workflow trigger to verify secret
    const triggerQuery = `
      query GetTrigger($workflow_id: uuid!) {
        workflow_triggers(
          where: { 
            workflow_id: { _eq: $workflow_id }, 
            trigger_type: { _eq: "webhook" },
            is_active: { _eq: true }
          }
        ) {
          id
          webhook_secret
          config
        }
      }
    `;
    
    const triggerData = await gqlRequest(triggerQuery, { workflow_id }, true);
    const trigger = triggerData.workflow_triggers?.[0];
    
    if (!trigger) {
      return res.status(404).json({ error: 'Webhook trigger not found' });
    }
    
    // Verify secret if configured
    if (trigger.webhook_secret && webhookSecret !== trigger.webhook_secret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
    
    // Get the org_id for quota checking
    const workflowQuery = `
      query GetWorkflow($workflow_id: uuid!) {
        workflows_by_pk(id: $workflow_id) {
          id
          org_id
        }
      }
    `;
    
    const workflowData = await gqlRequest(workflowQuery, { workflow_id }, true);
    const workflow = workflowData.workflows_by_pk;
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // Check org quota
    const quotaQuery = `
      query GetQuota($org_id: uuid!) {
        organizations_by_pk(id: $org_id) {
          usage_calls_used
          usage_calls_allowed
        }
      }
    `;
    
    const quotaData = await gqlRequest(quotaQuery, { org_id: workflow.org_id }, true);
    const org = quotaData.organizations_by_pk;
    
    if (org.usage_calls_used >= org.usage_calls_allowed) {
      return res.status(403).json({ error: 'Quota exhausted' });
    }
    
    // Create workflow run
    const runData = await gqlRequest(
      QUERIES.CREATE_WORKFLOW_RUN,
      { 
        workflow_id, 
        trigger_type: 'webhook',
        started_by: null 
      },
      true
    );
    
    const run = runData.insert_workflow_runs_one;
    
    // Note: Actual step execution would happen asynchronously
    // For now, return the run ID
    // In production, you'd use a background worker or queue
    
    return res.status(200).json({ 
      workflow_run_id: run.id,
      message: 'Workflow triggered successfully',
      payload_received: payload 
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
