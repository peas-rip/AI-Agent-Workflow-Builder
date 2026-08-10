'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { useQuery } from '@apollo/client';
import { GET_WORKFLOW_DETAIL } from '@/lib/graphql';
import WorkflowBuilder from '@/components/WorkflowBuilder';
import WorkflowRunList from '@/components/WorkflowRunList';

export default function WorkflowDetailPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const { data, loading, error } = useQuery(GET_WORKFLOW_DETAIL, {
    variables: { workflow_id: workflowId },
    skip: !isAuthenticated,
  });

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading workflow: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const workflow = data?.workflows_by_pk;

  if (!workflow) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">Workflow not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/workflows')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {workflow.name}
              </h1>
              {workflow.description && (
                <p className="text-gray-600">{workflow.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Workflow Builder */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Workflow Steps
            </h2>
            <WorkflowBuilder workflow={workflow} />
          </div>

          {/* Recent Runs */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Runs
            </h2>
            <WorkflowRunList runs={workflow.runs} />
          </div>
        </div>
      </main>
    </div>
  );
}
