'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { TRIGGER_WORKFLOW } from '@/lib/graphql';

interface WorkflowCardProps {
  workflow: {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    steps: Array<{
      id: string;
      step_order: number;
      step_type: string;
    }>;
    triggers: Array<{
      id: string;
      trigger_type: string;
      is_active: boolean;
    }>;
    runs: Array<{
      id: string;
      status: string;
      started_at: string;
    }>;
  };
}

export default function WorkflowCard({ workflow }: WorkflowCardProps) {
  const router = useRouter();
  const [triggerWorkflow, { loading: triggering }] = useMutation(TRIGGER_WORKFLOW);

  const latestRun = workflow.runs?.[0];
  const stepTypes = [...new Set(workflow.steps.map((s) => s.step_type))];
  const hasManualTrigger = workflow.triggers.some(
    (t) => t.trigger_type === 'manual' && t.is_active
  );

  const handleTrigger = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await triggerWorkflow({
        variables: { workflow_id: workflow.id },
      });
      // Refresh the page to show new run
      router.refresh();
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      alert('Failed to trigger workflow');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => router.push(`/workflows/${workflow.id}`)}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
        {latestRun && (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
              latestRun.status
            )}`}
          >
            {latestRun.status}
          </span>
        )}
      </div>

      {workflow.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {workflow.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {stepTypes.map((type) => (
          <span
            key={type}
            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
          >
            {type.replace('_', ' ')}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{workflow.steps.length} steps</span>
        <span>
          {workflow.triggers.length} trigger{workflow.triggers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {hasManualTrigger && (
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {triggering ? 'Triggering...' : 'Run Workflow'}
        </button>
      )}
    </div>
  );
}
