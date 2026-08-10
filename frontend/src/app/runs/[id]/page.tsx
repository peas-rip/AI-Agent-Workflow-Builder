'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_WORKFLOW_RUN, SUBSCRIBE_WORKFLOW_RUN } from '@/lib/graphql';
import WorkflowRunDetail from '@/components/WorkflowRunDetail';

export default function WorkflowRunPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const runId = params.id as string;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Use subscription for real-time updates
  const { data, loading, error } = useSubscription(SUBSCRIBE_WORKFLOW_RUN, {
    variables: { run_id: runId },
    skip: !isAuthenticated,
  });

  // Also fetch initial data
  const { data: initialData, loading: initialLoading } = useQuery(GET_WORKFLOW_RUN, {
    variables: { run_id: runId },
    skip: !isAuthenticated,
  });

  if (isLoading || initialLoading) {
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
            <p className="text-red-800">Error loading workflow run: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const run = data?.workflow_runs_by_pk || initialData?.workflow_runs_by_pk;

  if (!run) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">Workflow run not found</p>
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
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Workflow Run
              </h1>
              <p className="text-gray-600 text-sm">
                {run.id}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkflowRunDetail run={run} />
      </main>
    </div>
  );
}
