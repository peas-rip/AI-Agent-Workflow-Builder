'use client';

import { useQuery } from '@apollo/client';
import { GET_WORKFLOWS } from '@/lib/graphql';
import { useRouter } from 'next/navigation';
import WorkflowCard from './WorkflowCard';

interface WorkflowListProps {
  orgId: string;
}

export default function WorkflowList({ orgId }: WorkflowListProps) {
  const { data, loading, error } = useQuery(GET_WORKFLOWS, {
    variables: { org_id: orgId },
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading workflows: {error.message}</p>
      </div>
    );
  }

  const workflows = data?.workflows || [];

  if (workflows.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 mb-4">No workflows yet</p>
        <p className="text-sm text-gray-400">
          Create your first workflow to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workflows.map((workflow: any) => (
        <WorkflowCard key={workflow.id} workflow={workflow} />
      ))}
    </div>
  );
}
