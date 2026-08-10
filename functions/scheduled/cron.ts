import { Request, Response } from 'express';
import { gqlRequest, QUERIES } from '../_utils/graphql';

export default async (req: Request, res: Response) => {
  // This endpoint is called by Hasura's scheduled triggers (cron)
  
  try {
    // Get all active scheduled triggers
    const triggerQuery = `
      query GetScheduledTriggers {
        workflow_triggers(
          where: { 
            trigger_type: { _eq: "scheduled" },
            is_active: { _eq: true }
          }
        ) {
          id
          workflow_id
          config
          workflow {
            org_id
          }
        }
      }
    `;
    
    const triggerData = await gqlRequest(triggerQuery, {}, true);
    const triggers = triggerData.workflow_triggers || [];
    
    const results = [];
    
    for (const trigger of triggers) {
      try {
        const config = JSON.parse(trigger.config);
        const { cron } = config;
        
        // Check if cron should run now
        // For simplicity, we'll trigger all active scheduled workflows
        // In production, you'd use a cron library to evaluate the schedule
        
        // Check org quota
        const quotaQuery = `
          query GetQuota($org_id: uuid!) {
            organizations_by_pk(id: $org_id) {
              usage_calls_used
              usage_calls_allowed
            }
          }
        `;
        
        const quotaData = await gqlRequest(
          quotaQuery, 
          { org_id: trigger.workflow.org_id }, 
          true
        );
        const org = quotaData.organizations_by_pk;
        
        if (org.usage_calls_used >= org.usage_calls_allowed) {
          results.push({
            trigger_id: trigger.id,
            status: 'skipped',
            reason: 'quota_exhausted'
          });
          continue;
        }
        
        // Create workflow run
        const runData = await gqlRequest(
          QUERIES.CREATE_WORKFLOW_RUN,
          { 
            workflow_id: trigger.workflow_id, 
            trigger_type: 'scheduled',
            started_by: null 
          },
          true
        );
        
        results.push({
          trigger_id: trigger.id,
          workflow_run_id: runData.insert_workflow_runs_one.id,
          status: 'triggered'
        });
        
      } catch (error) {
        console.error(`Failed to trigger scheduled workflow ${trigger.workflow_id}:`, error);
        results.push({
          trigger_id: trigger.id,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return res.status(200).json({ 
      message: 'Scheduled triggers processed',
      results 
    });
    
  } catch (error) {
    console.error('Scheduled trigger error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
