import { Request, Response } from 'express';
import { gqlRequest, QUERIES } from '../_utils/graphql';

export default async (req: Request, res: Response) => {
  // This endpoint is called by Hasura's Event Triggers
  
  try {
    const { event, created_at } = req.body;
    const { op, table, data } = event;
    const { new: newRow, old: oldRow } = data;
    
    console.log(`Database event: ${op} on ${table}`, { newRow, oldRow });
    
    // Get all active database event triggers for this table
    const triggerQuery = `
      query GetEventTriggers($table_name: String!) {
        workflow_triggers(
          where: { 
            trigger_type: { _eq: "database_event" },
            is_active: { _eq: true },
            config: { _contains: { table: $table_name } }
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
    
    const triggerData = await gqlRequest(
      triggerQuery, 
      { table_name: table.name }, 
      true
    );
    const triggers = triggerData.workflow_triggers || [];
    
    const results = [];
    
    for (const trigger of triggers) {
      try {
        const config = JSON.parse(trigger.config);
        const { event_operation, column_filter } = config;
        
        // Check if this operation matches the trigger config
        if (event_operation && event_operation !== op) {
          results.push({
            trigger_id: trigger.id,
            status: 'skipped',
            reason: 'operation_mismatch'
          });
          continue;
        }
        
        // Check column filter if specified
        if (column_filter && column_filter.length > 0) {
          const hasChangedColumn = column_filter.some(
            (col: string) => newRow[col] !== oldRow?.[col]
          );
          if (!hasChangedColumn) {
            results.push({
              trigger_id: trigger.id,
              status: 'skipped',
              reason: 'column_filter_not_matched'
            });
            continue;
          }
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
        
        // Create workflow run with event data
        const runData = await gqlRequest(
          QUERIES.CREATE_WORKFLOW_RUN,
          { 
            workflow_id: trigger.workflow_id, 
            trigger_type: 'database_event',
            started_by: null 
          },
          true
        );
        
        results.push({
          trigger_id: trigger.id,
          workflow_run_id: runData.insert_workflow_runs_one.id,
          status: 'triggered',
          event: { op, table: table.name }
        });
        
      } catch (error) {
        console.error(`Failed to trigger workflow for event:`, error);
        results.push({
          trigger_id: trigger.id,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return res.status(200).json({ 
      message: 'Database event processed',
      results 
    });
    
  } catch (error) {
    console.error('Database event trigger error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
