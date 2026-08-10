'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticationStatus, useSignOut } from '@nhost/nhost-js/react';
import { useQuery } from '@apollo/client';
import { GET_ORGANIZATIONS } from '@/lib/graphql';
import WorkflowList from '@/components/WorkflowList';
import CreateWorkflowModal from '@/components/CreateWorkflowModal';

export default function WorkflowsPage() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const { signOut } = useSignOut();
  const router = useRouter();
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const { data: orgData, loading: orgsLoading } = useQuery(GET_ORGANIZATIONS, {
    variables: { user_id: 'current-user-id' }, // Will be replaced with actual user ID
    skip: !isAuthenticated,
  });

  if (isLoading || orgsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const organizations = orgData?.org_members || [];
  const currentOrg = organizations.find((m: any) => m.org_id === selectedOrg)?.organization;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Workflow Builder
            </h1>
            
            <div className="flex items-center space-x-4">
              {/* Organization Selector */}
              <select
                value={selectedOrg || ''}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Organization</option>
                {organizations.map((m: any) => (
                  <option key={m.org_id} value={m.org_id}>
                    {m.organization.name} ({m.role})
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => signOut()}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedOrg ? (
          <>
            {/* Usage Quota */}
            {currentOrg && (
              <div className="mb-6 bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Usage Quota
                  </span>
                  <span className="text-sm text-gray-500">
                    {currentOrg.usage_calls_used} / {currentOrg.usage_calls_allowed} calls used
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        (currentOrg.usage_calls_used / currentOrg.usage_calls_allowed) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* Workflow List */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Workflows
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Create Workflow
              </button>
            </div>

            <WorkflowList orgId={selectedOrg} />
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Please select an organization to view workflows
            </p>
          </div>
        )}
      </main>

      {/* Create Workflow Modal */}
      {showCreateModal && selectedOrg && (
        <CreateWorkflowModal
          orgId={selectedOrg}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
