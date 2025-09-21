"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, User, Clock } from "lucide-react";

interface Goal {
  id: string;
  playerId: string;
  playerName: string;
  minute: number;
  assistId?: string;
  assistName?: string;
}

interface Player {
  id: string;
  name: string;
}

interface GoalListProps {
  teamId: string;
  teamName: string;
  goals: Goal[];
  players: Player[];
  onAddGoal: (playerId: string, assistId?: string) => void;
  onEditGoal: (goalId: string, playerId: string, assistId?: string) => void;
  onDeleteGoal: (goalId: string) => void;
  isLoading?: boolean;
  isPenaltyMode?: boolean;
}

interface AddGoalFormProps {
  players: Player[];
  onSubmit: (playerId: string, assistId?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isPenaltyMode?: boolean;
}

function AddGoalForm({ players, onSubmit, onCancel, isLoading, isPenaltyMode }: AddGoalFormProps) {
  const [selectedScorer, setSelectedScorer] = React.useState<string>('');
  const [selectedAssist, setSelectedAssist] = React.useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow submitting without a scorer (scorer can be empty string)
    // In penalty mode, don't pass assist
    onSubmit(selectedScorer || '', isPenaltyMode ? undefined : (selectedAssist || undefined));
    setSelectedScorer('');
    setSelectedAssist('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <h5 className="font-medium text-sm text-gray-700">Add Goal</h5>
      
      <div className={`grid gap-3 ${isPenaltyMode ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {isPenaltyMode ? 'Penalty Taker (optional)' : 'Scorer (optional)'}
          </label>
          <select
            value={selectedScorer}
            onChange={(e) => setSelectedScorer(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{isPenaltyMode ? 'No penalty taker specified' : 'No scorer specified'}</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </div>
        
        {!isPenaltyMode && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Assist (optional)
            </label>
            <select
              value={selectedAssist}
              onChange={(e) => setSelectedAssist(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No assist</option>
              {players
                .filter(p => p.id !== selectedScorer)
                .map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={isLoading}
          loading={isLoading}
          className="flex-1"
        >
          {isPenaltyMode ? 'Add Penalty Goal' : 'Add Goal'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface EditGoalFormProps {
  goal: Goal;
  players: Player[];
  onSubmit: (playerId: string, assistId?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isPenaltyMode?: boolean;
}

function EditGoalForm({ goal, players, onSubmit, onCancel, isLoading, isPenaltyMode }: EditGoalFormProps) {
  const [selectedScorer, setSelectedScorer] = React.useState<string>(goal.playerId || '');
  const [selectedAssist, setSelectedAssist] = React.useState<string>(goal.assistId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow submitting with or without a scorer
    // In penalty mode, don't pass assist
    onSubmit(selectedScorer || '', isPenaltyMode ? undefined : (selectedAssist || undefined));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <h5 className="font-medium text-sm text-blue-700">Edit Goal</h5>
      
      <div className={`grid gap-3 ${isPenaltyMode ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        <div>
          <label className="block text-xs font-medium text-blue-600 mb-1">
            {isPenaltyMode ? 'Penalty Taker (optional)' : 'Scorer (optional)'}
          </label>
          <select
            value={selectedScorer}
            onChange={(e) => setSelectedScorer(e.target.value)}
            className="w-full p-2 text-sm border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{isPenaltyMode ? 'No penalty taker specified' : 'No scorer specified'}</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </div>
        
        {!isPenaltyMode && (
          <div>
            <label className="block text-xs font-medium text-blue-600 mb-1">
              Assist (optional)
            </label>
            <select
              value={selectedAssist}
              onChange={(e) => setSelectedAssist(e.target.value)}
              className="w-full p-2 text-sm border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No assist</option>
              {players
                .filter(p => p.id !== selectedScorer)
                .map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={isLoading}
          loading={isLoading}
          className="flex-1"
        >
{isPenaltyMode ? 'Save Penalty Changes' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function GoalList({
  teamId,
  teamName,
  goals,
  players,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
  isLoading,
  isPenaltyMode
}: GoalListProps) {
  const [isAddingGoal, setIsAddingGoal] = React.useState(false);
  const [editingGoalId, setEditingGoalId] = React.useState<string | null>(null);

  const handleAddGoal = (playerId: string, assistId?: string) => {
    onAddGoal(playerId, assistId);
    setIsAddingGoal(false);
  };

  const handleEditGoal = (goalId: string, playerId: string, assistId?: string) => {
    onEditGoal(goalId, playerId, assistId);
    setEditingGoalId(null);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      onDeleteGoal(goalId);
    }
  };

  const editingGoal = editingGoalId ? goals.find(g => g.id === editingGoalId) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-lg">{teamName}</h4>
          <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
            {goals.length}
          </Badge>
        </div>
        {!isAddingGoal && !editingGoalId && (
          <Button
            size="sm"
            onClick={() => setIsAddingGoal(true)}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
{isPenaltyMode ? 'Add Penalty Goal' : 'Add Goal'}
          </Button>
        )}
      </div>

      {/* Add Goal Form */}
      {isAddingGoal && (
        <AddGoalForm
          players={players}
          onSubmit={handleAddGoal}
          onCancel={() => setIsAddingGoal(false)}
          isLoading={isLoading}
          isPenaltyMode={isPenaltyMode}
        />
      )}

      {/* Edit Goal Form */}
      {editingGoal && (
        <EditGoalForm
          goal={editingGoal}
          players={players}
          onSubmit={(playerId, assistId) => handleEditGoal(editingGoal.id, playerId, assistId)}
          onCancel={() => setEditingGoalId(null)}
          isLoading={isLoading}
          isPenaltyMode={isPenaltyMode}
        />
      )}

      {/* Goals List */}
      {goals.length > 0 ? (
        <div className="space-y-2">
          {goals.map((goal, index) => (
            <div
              key={goal.id}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-xs">
                  #{index + 1}
                </Badge>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {goal.playerName || 'Unknown Player'}
                  </span>
                  {goal.assistName && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">
                        Assist: {goal.assistName}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{goal.minute}'</span>
                </div>
              </div>
              
              {editingGoalId !== goal.id && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingGoalId(goal.id)}
                    disabled={isLoading || isAddingGoal}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteGoal(goal.id)}
                    disabled={isLoading || isAddingGoal}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
          <div className="text-sm">No goals scored yet</div>
          {!isAddingGoal && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddingGoal(true)}
              disabled={isLoading}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add First Goal
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
