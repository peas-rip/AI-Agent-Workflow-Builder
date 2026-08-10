'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { CREATE_WORKFLOW } from '@/lib/graphql';

interface CreateWorkflowModalProps {
  orgId: string;
  userId: string;
  onClose: () => void;
}

export default function CreateWorkflowModal({ orgId, userId, onClose }: CreateWorkflowModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const router = useRouter();

  const [createWorkflow, { loading, error }] = useMutation(CREATE_WORKFLOW);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data } = await createWorkflow({
        variables: {
          org_id: orgId,
          name,
          description: description || undefined,
          created_by: userId,
        },
      });

      if (data?.insert_workflows_one?.id) {
        router.push(`/workflows/${data.insert_workflows_one.id}`);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create workflow:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create New Workflow
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Content Generation Pipeline"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Optional description of what this workflow does"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Workflow'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
