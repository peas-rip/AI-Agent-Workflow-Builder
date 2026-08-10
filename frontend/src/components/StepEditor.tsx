'use client';

import { useState } from 'react';

interface StepEditorProps {
  stepType: string;
  initialConfig?: any;
  onSave: (config: any) => void;
  onCancel: () => void;
}

export default function StepEditor({ stepType, initialConfig, onSave, onCancel }: StepEditorProps) {
  const [config, setConfig] = useState(initialConfig || getDefaultConfig(stepType));

  function getDefaultConfig(type: string) {
    switch (type) {
      case 'llm_call':
        return {
          model: 'llama-3.1-70b-versatile',
          prompt: '',
          system_prompt: '',
          max_tokens: 1024,
          temperature: 0.7,
        };
      case 'http_request':
        return {
          url: '',
          method: 'GET',
          headers: {},
          body: null,
        };
      case 'db_write':
        return {
          table: '',
          data: {},
          on_conflict: '',
        };
      case 'notify':
        return {
          webhook_url: '',
          message: '',
          channel: 'slack',
        };
      case 'conditional_branch':
        return {
          condition: {
            field: '',
            operator: 'eq',
            value: '',
          },
        };
      case 'approval_gate':
        return {
          message: 'This step requires approval',
        };
      default:
        return {};
    }
  }

  const handleSave = () => {
    onSave(config);
  };

  const renderLLMCallEditor = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Template Variables:</strong> Use <code className="bg-blue-100 px-1 rounded">{'{{previous_output}}'}</code> to reference the previous step's output in your prompt.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model
        </label>
        <select
          value={config.model}
          onChange={(e) => setConfig({ ...config, model: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="llama-3.1-70b-versatile">Llama 3.1 70B</option>
          <option value="llama-3.1-8b-instant">Llama 3.1 8B (Faster)</option>
          <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
          <option value="gemma-7b-it">Gemma 7B</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          System Prompt (Optional)
        </label>
        <textarea
          value={config.system_prompt}
          onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
          placeholder="You are a helpful assistant..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          User Prompt
        </label>
        <textarea
          value={config.prompt}
          onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={4}
          placeholder="Enter your prompt here... Use {{previous_output}} to include the previous step's output"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Example: "Summarize the following: {'{{previous_output}}'}"
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Tokens
          </label>
          <input
            type="number"
            value={config.max_tokens}
            onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min={1}
            max={4096}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Temperature
          </label>
          <input
            type="number"
            value={config.temperature}
            onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min={0}
            max={2}
            step={0.1}
          />
        </div>
      </div>
    </div>
  );

  const renderHttpRequestEditor = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Template Variables:</strong> Use <code className="bg-blue-100 px-1 rounded">{'{{previous_output}}'}</code> in the request body to include the previous step's output.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL
        </label>
        <input
          type="url"
          value={config.url}
          onChange={(e) => setConfig({ ...config, url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://api.example.com/data"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Method
        </label>
        <select
          value={config.method}
          onChange={(e) => setConfig({ ...config, method: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Headers (JSON)
        </label>
        <textarea
          value={JSON.stringify(config.headers, null, 2)}
          onChange={(e) => {
            try {
              setConfig({ ...config, headers: JSON.parse(e.target.value) });
            } catch {}
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
          placeholder='{"Content-Type": "application/json"}'
        />
      </div>

      {config.method !== 'GET' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Request Body (JSON)
          </label>
          <textarea
            value={config.body ? JSON.stringify(config.body, null, 2) : ''}
            onChange={(e) => {
              try {
                setConfig({ ...config, body: JSON.parse(e.target.value) });
              } catch {}
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4}
            placeholder='{"key": "value"}'
          />
        </div>
      )}
    </div>
  );

  const renderDbWriteEditor = () => (
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
          Data (JSON)
        </label>
        <textarea
          value={JSON.stringify(config.data, null, 2)}
          onChange={(e) => {
            try {
              setConfig({ ...config, data: JSON.parse(e.target.value) });
            } catch {}
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={4}
          placeholder='{"column": "value"}'
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          On Conflict (Optional)
        </label>
        <input
          type="text"
          value={config.on_conflict}
          onChange={(e) => setConfig({ ...config, on_conflict: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="table_name_pkey"
        />
      </div>
    </div>
  );

  const renderNotifyEditor = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Template Variables:</strong> Use <code className="bg-blue-100 px-1 rounded">{'{{previous_output}}'}</code> in the message to include the previous step's output.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Webhook URL
        </label>
        <input
          type="url"
          value={config.webhook_url}
          onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://hooks.slack.com/services/..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Channel
        </label>
        <select
          value={config.channel}
          onChange={(e) => setConfig({ ...config, channel: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="slack">Slack</option>
          <option value="discord">Discord</option>
          <option value="email">Email</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          value={config.message}
          onChange={(e) => setConfig({ ...config, message: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={4}
          placeholder="Notification message..."
          required
        />
      </div>
    </div>
  );

  const renderConditionalBranchEditor = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Template Variables:</strong> Use <code className="bg-blue-100 px-1 rounded">{'{{previous_output}}'}</code> to reference the previous step's entire output, or <code className="bg-blue-100 px-1 rounded">{'{{previous_output.content}}'}</code> for a specific field.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Field (from previous step output)
        </label>
        <input
          type="text"
          value={config.condition?.field || ''}
          onChange={(e) =>
            setConfig({
              ...config,
              condition: { ...config.condition, field: e.target.value },
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., content, status, score, result"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Use dot notation for nested fields: <code>result.score</code>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operator
        </label>
        <select
          value={config.condition?.operator || 'eq'}
          onChange={(e) =>
            setConfig({
              ...config,
              condition: { ...config.condition, operator: e.target.value },
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="eq">Equals</option>
          <option value="neq">Not Equals</option>
          <option value="gt">Greater Than</option>
          <option value="lt">Less Than</option>
          <option value="gte">Greater or Equal</option>
          <option value="lte">Less or Equal</option>
          <option value="contains">Contains</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Value
        </label>
        <input
          type="text"
          value={config.condition?.value || ''}
          onChange={(e) =>
            setConfig({
              ...config,
              condition: { ...config.condition, value: e.target.value },
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Value to compare against"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Example: For LLM output, check if <code>content</code> contains <code>success</code>
        </p>
      </div>
    </div>
  );

  const renderApprovalGateEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Approval Message
        </label>
        <textarea
          value={config.message}
          onChange={(e) => setConfig({ ...config, message: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
          placeholder="Why does this step need approval?"
        />
      </div>
    </div>
  );

  const renderEditor = () => {
    switch (stepType) {
      case 'llm_call':
        return renderLLMCallEditor();
      case 'http_request':
        return renderHttpRequestEditor();
      case 'db_write':
        return renderDbWriteEditor();
      case 'notify':
        return renderNotifyEditor();
      case 'conditional_branch':
        return renderConditionalBranchEditor();
      case 'approval_gate':
        return renderApprovalGateEditor();
      default:
        return <p>Unknown step type</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Configure {stepType.replace('_', ' ')}
          </h2>

          {renderEditor()}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Save Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
