'use client';

import { useRouter } from 'next/navigation';

interface WorkflowRunListProps {
  runs: Array<{
    id: string;
    status: string;
    trigger_type: string;
    started_at: string;
    completed_at?: string;
    error_message?: string;
    step_runs: Array<{
      id: string;
      status: string;
      output?: any;
      workflow_step: {
        step_type: string;
        config: string;
      };
    }>;
  }>;
}

export default function WorkflowRunList({ runs }: WorkflowRunListProps) {
  const router = useRouter();

  if (!runs || runs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No runs yet</p>
        <p className="text-sm text-gray-400 mt-2">
          Run the workflow to see execution history
        </p>
      </div>
    );
  }

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

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'running':
        return '⟳';
      case 'paused':
        return '⏸';
      case 'failed':
        return '✗';
      default:
        return '○';
    }
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'llm_call':
        return '🤖';
      case 'http_request':
        return '🌐';
      case 'db_write':
        return '💾';
      case 'notify':
        return '🔔';
      case 'conditional_branch':
        return '🔀';
      case 'approval_gate':
        return '✅';
      default:
        return '⚡';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    if (duration < 60) {
      return `${duration}s`;
    }
    return `${Math.round(duration / 60)}m ${duration % 60}s`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <div
          key={run.id}
          className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/workflows/${run.id}`)}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-3">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                  run.status
                )}`}
              >
                {run.status}
              </span>
              <span className="text-sm text-gray-500">
                via {run.trigger_type}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {formatDuration(run.started_at, run.completed_at)}
            </span>
          </div>

          <div className="text-xs text-gray-500 mb-3">
            Started: {formatTime(run.started_at)}
            {run.completed_at && (
              <> | Completed: {formatTime(run.completed_at)}</>
            )}
          </div>

          {run.error_message && (
            <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
              <p className="text-red-800 text-sm">{run.error_message}</p>
            </div>
          )}

          {/* Step Progress */}
          <div className="flex items-center space-x-2">
            {run.step_runs.map((stepRun, index) => (
              <div key={stepRun.id} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    stepRun.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : stepRun.status === 'running'
                      ? 'bg-blue-100 text-blue-800'
                      : stepRun.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  title={`${stepRun.workflow_step.step_type}: ${stepRun.status}`}
                >
                  {getStepStatusIcon(stepRun.status)}
                </div>
                {index < run.step_runs.length - 1 && (
                  <div className="w-4 h-0.5 bg-gray-200 mx-1"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
