'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_WORKFLOW_TRIGGER } from '@/lib/graphql';

interface TriggerEditorProps {
  workflowId: string;
  onSave: () => void;
  onCancel: () => void;
}

export default function TriggerEditor({ workflowId, onSave, onCancel }: TriggerEditorProps) {
  const [triggerType, setTriggerType] = useState('manual');
  const [config, setConfig] = useState<any>(getDefaultConfig('manual'));
  const [webhookSecret, setWebhookSecret] = useState('');

  const [createTrigger, { loading }] = useMutation(CREATE_WORKFLOW_TRIGGER);

  function getDefaultConfig(type: string) {
    switch (type) {
      case 'manual':
        return {};
      case 'webhook':
        return {};
      case 'scheduled':
        return {
          cron: '0 9 * * *', // Daily at 9am
        };
      case 'database_event':
        return {
          table: '',
          event_operation: 'INSERT',
          column_filter: [],
        };
      default:
        return {};
    }
  }

  const handleSave = async () => {
    try {
      await createTrigger({
        variables: {
          workflow_id: workflowId,
          trigger_type: triggerType,
          config: JSON.stringify(config),
          webhook_secret: triggerType === 'webhook' ? webhookSecret || null : null,
        },
      });
      onSave();
    } catch (error) {
      console.error('Failed to create trigger:', error);
      alert('Failed to create trigger');
    }
  };

  const renderManualConfig = () => (
    <div className="text-center py-4">
      <p className="text-gray-600">
        Manual triggers allow you to run the workflow by clicking a button.
      </p>
    </div>
  );

  const renderWebhookConfig = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">Webhook URL:</p>
        <code className="text-sm bg-gray-200 px-2 py-1 rounded">
          POST /webhook/{workflowId}
        </code>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Webhook Secret (Optional)
        </label>
        <input
          type="text"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Shared secret for verification"
        />
        <p className="text-xs text-gray-500 mt-1">
          If set, requests must include this in the X-Webhook-Secret header
        </p>
      </div>
    </div>
  );

  const renderScheduledConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cron Schedule
        </label>
        <input
          type="text"
          value={config.cron}
          onChange={(e) => setConfig({ ...config, cron: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="0 9 * * *"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Examples: "0 9 * * *" (daily at 9am), "*/30 * * * *" (every 30 min)
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">
          Common schedules:
        </p>
        <ul className="text-xs text-gray-500 mt-2 space-y-1">
          <li><code>0 9 * * *</code> - Daily at 9:00 AM</li>
          <li><code>0 9 * * 1-5</code> - Weekdays at 9:00 AM</li>
          <li><code>0 0 1 * *</code> - First day of month</li>
          <li><code>*/15 * * * *</code> - Every 15 minutes</li>
        </ul>
      </div>
    </div>
  );

  const renderDatabaseEventConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Table Name
        </label>
        <input
          type="text"
          value={config.table}
          onChange={(e) => setConfig({ ...config, table: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="my_table"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Operation
        </label>
        <select
          value={config.event_operation}
          onChange={(e) => setConfig({ ...config, event_operation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Column Filter (Optional)
        </label>
        <input
          type="text"
          value={config.column_filter?.join(', ') || ''}
          onChange={(e) =>
            setConfig({
              ...config,
              column_filter: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="column1, column2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Only trigger when these columns change (comma-separated)
        </p>
      </div>
    </div>
  );

  const renderConfig = () => {
    switch (triggerType) {
      case 'manual':
        return renderManualConfig();
      case 'webhook':
        return renderWebhookConfig();
      case 'scheduled':
        return renderScheduledConfig();
      case 'database_event':
        return renderDatabaseEventConfig();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Add Trigger
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Type
              </label>
              <select
                value={triggerType}
                onChange={(e) => {
                  setTriggerType(e.target.value);
                  setConfig(getDefaultConfig(e.target.value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="manual">Manual</option>
                <option value="webhook">Webhook</option>
                <option value="scheduled">Scheduled</option>
                <option value="database_event">Database Event</option>
              </select>
            </div>

            {renderConfig()}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Trigger'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
