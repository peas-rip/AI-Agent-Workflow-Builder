'use client';

interface StepCardProps {
  step: {
    id: string;
    step_order: number;
    step_type: string;
    config: string;
  };
  index: number;
  totalSteps: number;
  isEditing: boolean;
  isReordering?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function StepCard({
  step,
  index,
  totalSteps,
  isEditing,
  isReordering = false,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: StepCardProps) {
  const config = JSON.parse(step.config);

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

  const getStepLabel = (type: string) => {
    switch (type) {
      case 'llm_call':
        return 'LLM Call';
      case 'http_request':
        return 'HTTP Request';
      case 'db_write':
        return 'Database Write';
      case 'notify':
        return 'Notification';
      case 'conditional_branch':
        return 'Conditional Branch';
      case 'approval_gate':
        return 'Approval Gate';
      default:
        return type;
    }
  };

  const getStepSummary = (type: string, config: any) => {
    switch (type) {
      case 'llm_call':
        return `Model: ${config.model || 'llama-3.1-70b-versatile'}`;
      case 'http_request':
        return `${config.method || 'GET'} ${config.url || 'Not configured'}`;
      case 'db_write':
        return `Table: ${config.table || 'Not configured'}`;
      case 'notify':
        return `To: ${config.webhook_url ? 'Slack' : 'Not configured'}`;
      case 'conditional_branch':
        return `If ${config.condition?.field || 'field'} ${config.condition?.operator || '=='}`;
      case 'approval_gate':
        return 'Requires approval';
      default:
        return 'Not configured';
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isEditing 
          ? 'border-indigo-500 bg-indigo-50' 
          : isReordering 
            ? 'border-blue-300 bg-blue-50 opacity-75' 
            : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
            <span className="text-sm font-medium text-gray-700">
              {step.step_order}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">{getStepIcon(step.step_type)}</span>
            <div>
              <div className="font-medium text-gray-900">
                {getStepLabel(step.step_type)}
              </div>
              <div className="text-sm text-gray-500">
                {getStepSummary(step.step_type, config)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onMoveUp}
            disabled={index === 0 || isReordering}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalSteps - 1 || isReordering}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={onEdit}
            disabled={isReordering}
            className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Edit step"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            disabled={isReordering}
            className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete step"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
