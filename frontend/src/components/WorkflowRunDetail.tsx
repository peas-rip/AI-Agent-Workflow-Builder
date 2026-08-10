'use client';

import { useMutation } from '@apollo/client';
import { APPROVE_STEP } from '@/lib/graphql';

interface WorkflowRunDetailProps {
  run: {
    id: string;
    status: string;
    trigger_type: string;
    started_at: string;
    completed_at?: string;
    error_message?: string;
    step_runs: Array<{
      id: string;
      status: string;
      input?: any;
      output?: any;
      error_message?: string;
      attempt_count: number;
      approved_by?: string;
      approved_at?: string;
      started_at?: string;
      completed_at?: string;
      workflow_step: {
        step_order: number;
        step_type: string;
        config: any;
      };
    }>;
  };
}

export default function WorkflowRunDetail({ run }: WorkflowRunDetailProps) {
  const [approveStep, { loading: approving }] = useMutation(APPROVE_STEP);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStepIcon = (type: string) => {
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

  const handleApprove = async (stepRunId: string, approved: boolean) => {
    try {
      await approveStep({
        variables: {
          step_run_id: stepRunId,
          approved,
        },
      });
    } catch (error) {
      console.error('Failed to approve step:', error);
      alert('Failed to approve step');
    }
  };

  const formatDuration = (start?: string, end?: string) => {
    if (!start) return '-';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    if (duration < 60) {
      return `${duration}s`;
    }
    return `${Math.round(duration / 60)}m ${duration % 60}s`;
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Run Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Run Status
            </h2>
            <div className="flex items-center space-x-4">
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                  run.status
                )}`}
              >
                {run.status.toUpperCase()}
              </span>
              <span className="text-gray-500">
                Triggered via {run.trigger_type}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              Duration: {formatDuration(run.started_at, run.completed_at)}
            </div>
            <div className="text-sm text-gray-500">
              Started: {formatTime(run.started_at)}
            </div>
            {run.completed_at && (
              <div className="text-sm text-gray-500">
                Completed: {formatTime(run.completed_at)}
              </div>
            )}
          </div>
        </div>

        {run.error_message && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 mt-1">{run.error_message}</p>
          </div>
        )}

        {run.status === 'paused' && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-medium">Paused</p>
            <p className="text-yellow-700 mt-1">
              This workflow is paused and waiting for approval. Only owners and editors can approve.
            </p>
          </div>
        )}
      </div>

      {/* Step Runs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Steps
        </h2>

        <div className="space-y-4">
          {run.step_runs.map((stepRun, index) => {
            const config = typeof stepRun.workflow_step.config === 'string'
              ? JSON.parse(stepRun.workflow_step.config)
              : stepRun.workflow_step.config || {};

            return (
              <div
                key={stepRun.id}
                className={`border rounded-lg p-4 ${getStatusColor(stepRun.status)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full border">
                      <span className="text-sm font-medium">
                        {stepRun.workflow_step.step_order}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span>{getStepIcon(stepRun.workflow_step.step_type)}</span>
                        <span className="font-medium">
                          {stepRun.workflow_step.step_type.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(
                            stepRun.status
                          )}`}
                        >
                          {stepRun.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatDuration(stepRun.started_at, stepRun.completed_at)}
                        {stepRun.attempt_count > 1 && (
                          <span className="ml-2">
                            ({stepRun.attempt_count} attempts)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approval Buttons for Paused Steps */}
                  {stepRun.status === 'paused' && run.status === 'paused' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(stepRun.id, true)}
                        disabled={approving}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApprove(stepRun.id, false)}
                        disabled={approving}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Deny
                      </button>
                    </div>
                  )}

                  {/* Approval Info */}
                  {stepRun.approved_by && (
                    <div className="text-sm text-gray-600">
                      Approved by: {stepRun.approved_by}
                      <br />
                      at {formatTime(stepRun.approved_at)}
                    </div>
                  )}
                </div>

                {/* Step Details */}
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Config:</p>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(config, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Output:</p>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {stepRun.output
                        ? JSON.stringify(stepRun.output, null, 2)
                        : 'No output yet'}
                    </pre>
                  </div>
                </div>

                {stepRun.error_message && (
                  <div className="mt-3 bg-red-100 border border-red-200 rounded p-2">
                    <p className="text-red-800 text-sm">{stepRun.error_message}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
