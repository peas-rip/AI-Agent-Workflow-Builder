'use client';

import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ORGANIZATIONS, GET_WORKFLOWS } from '@/lib/graphql';
import WorkflowCard from '@/components/WorkflowCard';
import CreateWorkflowModal from '@/components/CreateWorkflowModal';

export default function WorkflowsPage() {
  const { isAuthenticated, isLoading, userId } = useAuth();
  const router = useRouter();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: orgsData, loading: orgsLoading } = useQuery(GET_ORGANIZATIONS, {
    variables: { user_id: userId },
    skip: !isAuthenticated || !userId,
  });

  const { data: workflowsData, loading: workflowsLoading } = useQuery(GET_WORKFLOWS, {
    variables: { org_id: selectedOrgId },
    skip: !selectedOrgId,
  });

  useEffect(() => {
    if (orgsData?.org_members?.length > 0 && !selectedOrgId) {
      setSelectedOrgId(orgsData.org_members[0].organization.id);
    }
  }, [orgsData, selectedOrgId]);

  if (isLoading || orgsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const orgMembers = orgsData?.org_members || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your AI agent workflows
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {orgMembers.length > 1 && (
              <select
                value={selectedOrgId || ''}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {orgMembers.map((member: any) => (
                  <option key={member.organization.id} value={member.organization.id}>
                    {member.organization.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Workflow
            </button>
          </div>
        </div>

        {workflowsLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading workflows...</div>
          </div>
        ) : workflowsData?.workflows?.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">No workflows yet</div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workflowsData?.workflows?.map((workflow: any) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && selectedOrgId && (
        <CreateWorkflowModal
          orgId={selectedOrgId}
          userId={userId!}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
