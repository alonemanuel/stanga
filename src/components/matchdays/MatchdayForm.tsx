"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { TextField, SelectField } from "@/components/forms/fields";
import { useZodForm, Form } from "@/components/forms/Form";
import { MatchdayCreateSchema, DEFAULT_RULES, type MatchdayCreate } from "@/lib/validations/matchday";
import { useCreateMatchday } from "@/lib/hooks/use-matchdays";

interface MatchdayFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MatchdayForm({ onSuccess, onCancel }: MatchdayFormProps) {
  const createMutation = useCreateMatchday();
  
  const methods = useZodForm(MatchdayCreateSchema, {
    defaultValues: {
      name: "",
      description: "",
      scheduledAt: "",
      location: "",
      maxPlayers: 18,
      rules: DEFAULT_RULES,
      isPublic: true,
    },
  });

  const onSubmit = async (data: MatchdayCreate) => {
    try {
      await createMutation.mutateAsync(data);
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const isLoading = createMutation.isPending;

  // Generate datetime-local input value (YYYY-MM-DDTHH:MM)
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Adjust for timezone
    return now.toISOString().slice(0, 16);
  };

  React.useEffect(() => {
    // Set default scheduled time to next hour
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    nextHour.setMinutes(nextHour.getMinutes() - nextHour.getTimezoneOffset());
    methods.setValue('scheduledAt', nextHour.toISOString().slice(0, 16));
  }, [methods]);

  return (
    <Form methods={methods} onSubmit={onSubmit} className="space-y-4">
      <TextField
        name="name"
        label="Matchday Name"
        placeholder="e.g., Sunday Football Session"
        required
      />
      
      <TextField
        name="description"
        label="Description"
        placeholder="Optional description of the matchday"
        multiline
        rows={3}
      />
      
      <TextField
        name="scheduledAt"
        label="Date & Time"
        type="datetime-local"
        required
      />
      
      <TextField
        name="location"
        label="Location"
        placeholder="e.g., Central Park Field 1"
      />
      
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="maxPlayers"
          label="Max Players"
          type="number"
          placeholder="18"
        />
        
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Public Matchday
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...methods.register('isPublic')}
              className="rounded border-input"
            />
            <span className="text-sm text-muted-foreground">
              Allow public viewing
            </span>
          </div>
        </div>
      </div>

      {/* Rules Section */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium">Game Rules</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="rules.team_size"
            label="Team Size"
            type="number"
            placeholder="6"
          />
          
          <TextField
            name="rules.game_minutes"
            label="Game Duration (minutes)"
            type="number"
            placeholder="8"
          />
          
          <TextField
            name="rules.extra_minutes"
            label="Extra Time (minutes)"
            type="number"
            placeholder="2"
          />
          
          <TextField
            name="rules.max_goals_to_win"
            label="Max Goals to Win"
            type="number"
            placeholder="2"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Penalties on Tie
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...methods.register('rules.penalties_on_tie')}
                className="rounded border-input"
              />
              <span className="text-sm text-muted-foreground">
                Use penalty shootouts for ties
              </span>
            </div>
          </div>
          
          <TextField
            name="rules.penalty_win_weight"
            label="Penalty Win Weight"
            type="number"
            step="0.1"
            placeholder="0.5"
          />
        </div>

        {/* Points System */}
        <div className="space-y-3">
          <h4 className="text-md font-medium">Points System</h4>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              name="rules.points.loss"
              label="Loss Points"
              type="number"
              placeholder="0"
            />
            
            <TextField
              name="rules.points.draw"
              label="Draw Points"
              type="number"
              placeholder="1"
            />
            
            <TextField
              name="rules.points.penalty_bonus_win"
              label="Penalty Win Points"
              type="number"
              placeholder="2"
            />
            
            <TextField
              name="rules.points.regulation_win"
              label="Regulation Win Points"
              type="number"
              placeholder="3"
            />
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        
        <Button
          type="submit"
          loading={isLoading}
        >
          Create Matchday
        </Button>
      </div>
    </Form>
  );
}
