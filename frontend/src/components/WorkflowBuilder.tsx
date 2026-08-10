'use client';

import { useState, useCallback } from 'react';
import { useMutation, useApolloClient } from '@apollo/client';
import { 
  CREATE_WORKFLOW_STEP, 
  UPDATE_WORKFLOW_STEP, 
  DELETE_WORKFLOW_STEP,
  TRIGGER_WORKFLOW 
} from '@/lib/graphql';
import StepCard from './StepCard';
import StepEditor from './StepEditor';
import TriggerEditor from './TriggerEditor';

interface WorkflowBuilderProps {
  workflow: {
    id: string;
    name: string;
    steps: Array<{
      id: string;
      step_order: number;
      step_type: string;
      config: string;
    }>;
    triggers: Array<{
      id: string;
      trigger_type: string;
      config: string;
      is_active: boolean;
      webhook_secret?: string;
    }>;
  };
}

export default function WorkflowBuilder({ workflow }: WorkflowBuilderProps) {
  const [localSteps, setLocalSteps] = useState(workflow.steps);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [showStepEditor, setShowStepEditor] = useState(false);
  const [showTriggerEditor, setShowTriggerEditor] = useState(false);
  const [newStepType, setNewStepType] = useState<string>('llm_call');
  const [isReordering, setIsReordering] = useState(false);
  
  const apolloClient = useApolloClient();

  const [createStep] = useMutation(CREATE_WORKFLOW_STEP);
  const [updateStep] = useMutation(UPDATE_WORKFLOW_STEP);
  const [deleteStep] = useMutation(DELETE_WORKFLOW_STEP);
  const [triggerWorkflow, { loading: triggering }] = useMutation(TRIGGER_WORKFLOW);

  const steps = [...localSteps].sort((a, b) => a.step_order - b.step_order);
  const hasManualTrigger = workflow.triggers.some(
    (t) => t.trigger_type === 'manual' && t.is_active
  );

  const refreshWorkflow = useCallback(async () => {
    await apolloClient.refetchQueries({ include: ['GetWorkflowDetail'] });
  }, [apolloClient]);

  const handleAddStep = async (config: any) => {
    try {
      const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.step_order)) + 1 : 1;
      const { data } = await createStep({
        variables: {
          workflow_id: workflow.id,
          step_order: nextOrder,
          step_type: newStepType,
          config: JSON.stringify(config),
        },
      });
      
      if (data?.insert_workflow_steps_one) {
        setLocalSteps(prev => [...prev, data.insert_workflow_steps_one]);
      }
      
      setShowStepEditor(false);
    } catch (error) {
      console.error('Failed to add step:', error);
      alert('Failed to add step');
    }
  };

  const handleUpdateStep = async (stepId: string, config: any) => {
    try {
      await updateStep({
        variables: {
          id: stepId,
          config: JSON.stringify(config),
        },
      });
      
      setLocalSteps(prev => prev.map(s => 
        s.id === stepId ? { ...s, config: JSON.stringify(config) } : s
      ));
      
      setEditingStep(null);
    } catch (error) {
      console.error('Failed to update step:', error);
      alert('Failed to update step');
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) {
      return;
    }

    try {
      await deleteStep({
        variables: { id: stepId },
      });
      
      const remainingSteps = localSteps.filter(s => s.id !== stepId);
      const reorderedSteps = remainingSteps.map((s, i) => ({
        ...s,
        step_order: i + 1
      }));
      
      for (const step of reorderedSteps) {
        const original = localSteps.find(s => s.id === step.id);
        if (original && step.step_order !== original.step_order) {
          await updateStep({
            variables: {
              id: step.id,
              step_order: step.step_order,
            },
          });
        }
      }
      
      setLocalSteps(reorderedSteps);
    } catch (error) {
      console.error('Failed to delete step:', error);
      alert('Failed to delete step');
    }
  };

  const handleReorder = async (dragIndex: number, hoverIndex: number) => {
    if (isReordering) return;
    
    setIsReordering(true);
    
    const draggedStep = steps[dragIndex];
    const newSteps = [...steps];
    newSteps.splice(dragIndex, 1);
    newSteps.splice(hoverIndex, 0, draggedStep);

    const reorderedSteps = newSteps.map((s, i) => ({
      ...s,
      step_order: i + 1
    }));
    
    setLocalSteps(reorderedSteps);

    try {
      const updatePromises = reorderedSteps.map((step, index) => {
        const original = steps.find(s => s.id === step.id);
        if (original && original.step_order !== step.step_order) {
          return updateStep({
            variables: {
              id: step.id,
              step_order: step.step_order,
            },
          });
        }
        return Promise.resolve();
      });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Failed to reorder steps:', error);
      setLocalSteps([...workflow.steps]);
      alert('Failed to reorder steps');
    } finally {
      setIsReordering(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0 || isReordering) return;
    await handleReorder(index, index - 1);
  };

  const handleMoveDown = async (index: number) => {
    if (index >= steps.length - 1 || isReordering) return;
    await handleReorder(index, index + 1);
  };

  const handleTrigger = async () => {
    try {
      await triggerWorkflow({
        variables: { workflow_id: workflow.id },
      });
      await refreshWorkflow();
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      alert('Failed to trigger workflow');
    }
  };

  const stepTypes = [
    { value: 'llm_call', label: 'LLM Call', description: 'Call an AI model' },
    { value: 'http_request', label: 'HTTP Request', description: 'Call an external API' },
    { value: 'db_write', label: 'Database Write', description: 'Write to database' },
    { value: 'notify', label: 'Notification', description: 'Send notification' },
    { value: 'conditional_branch', label: 'Conditional Branch', description: 'If/else logic' },
    { value: 'approval_gate', label: 'Approval Gate', description: 'Require approval' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="space-y-4 mb-6">
        {steps.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 mb-2">No steps yet</p>
            <p className="text-sm text-gray-400">
              Add your first step to build the workflow
            </p>
          </div>
        ) : (
          steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              totalSteps={steps.length}
              isEditing={editingStep === step.id}
              isReordering={isReordering}
              onEdit={() => setEditingStep(step.id)}
              onDelete={() => handleDeleteStep(step.id)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
            />
          ))
        )}
      </div>

      <div className="mb-6">
        <select
          value={newStepType}
          onChange={(e) => setNewStepType(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm mr-2"
        >
          {stepTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowStepEditor(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Add Step
        </button>
      </div>

      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Triggers</h3>
          <button
            onClick={() => setShowTriggerEditor(true)}
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            + Add Trigger
          </button>
        </div>

        <div className="space-y-2">
          {workflow.triggers.map((trigger) => (
            <div
              key={trigger.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <span className="font-medium">{trigger.trigger_type}</span>
                <span className={`ml-2 text-sm ${trigger.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                  ({trigger.is_active ? 'Active' : 'Inactive'})
                </span>
              </div>
              {trigger.trigger_type === 'webhook' && (
                <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                  POST /webhook/{workflow.id}
                </code>
              )}
            </div>
          ))}
        </div>
      </div>

      {hasManualTrigger && (
        <div className="mt-6">
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {triggering ? 'Running...' : 'Run Workflow'}
          </button>
        </div>
      )}

      {showStepEditor && (
        <StepEditor
          stepType={newStepType}
          onSave={handleAddStep}
          onCancel={() => setShowStepEditor(false)}
        />
      )}

      {editingStep && (
        <StepEditor
          stepType={steps.find(s => s.id === editingStep)?.step_type || 'llm_call'}
          initialConfig={JSON.parse(steps.find(s => s.id === editingStep)?.config || '{}')}
          onSave={(config) => handleUpdateStep(editingStep, config)}
          onCancel={() => setEditingStep(null)}
        />
      )}

      {showTriggerEditor && (
        <TriggerEditor
          workflowId={workflow.id}
          onSave={async () => {
            setShowTriggerEditor(false);
            await refreshWorkflow();
          }}
          onCancel={() => setShowTriggerEditor(false)}
        />
      )}
    </div>
  );
}
