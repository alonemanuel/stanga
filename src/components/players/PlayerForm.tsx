"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { TextField, SelectField } from "@/components/forms/fields";
import { useZodForm, Form } from "@/components/forms/Form";
import { PlayerCreateSchema, PlayerUpdateSchema, type PlayerCreate, type PlayerUpdate } from "@/lib/validations/player";
import { useCreatePlayer, useUpdatePlayer } from "@/lib/hooks/use-players";

interface PlayerFormProps {
  player?: {
    id: string;
    name: string;
    nickname?: string | null;
    position?: string | null;
    skillLevel: number;
    notes?: string | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const positionOptions = [
  { value: "", label: "No position" },
  { value: "goalkeeper", label: "Goalkeeper" },
  { value: "defender", label: "Defender" },
  { value: "midfielder", label: "Midfielder" },
  { value: "forward", label: "Forward" },
];

const skillLevelOptions = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} ${i === 0 ? '(Beginner)' : i === 9 ? '(Expert)' : ''}`,
}));

export function PlayerForm({ player, onSuccess, onCancel }: PlayerFormProps) {
  const isEditing = !!player;
  const createMutation = useCreatePlayer();
  const updateMutation = useUpdatePlayer();
  
  const schema = isEditing ? PlayerUpdateSchema : PlayerCreateSchema;
  const methods = useZodForm(schema, {
    defaultValues: isEditing ? {
      name: player.name,
      nickname: player.nickname || "",
      position: player.position || "",
      skillLevel: String(player.skillLevel), // Convert to string for SelectField
      notes: player.notes || "",
    } : {
      name: "",
      nickname: "",
      position: "",
      skillLevel: "5", // Keep as string since SelectField returns strings
      notes: "",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      // Transform the data to match the schema expectations
      const transformedData = {
        ...data,
        // Convert empty string to null for position
        position: data.position === "" ? null : data.position,
        // Convert string to number for skillLevel
        skillLevel: typeof data.skillLevel === 'string' ? parseInt(data.skillLevel, 10) : data.skillLevel,
        // Convert empty string to null for optional fields
        nickname: data.nickname === "" ? null : data.nickname,
        notes: data.notes === "" ? null : data.notes,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: player.id,
          data: transformedData as PlayerUpdate,
        });
      } else {
        await createMutation.mutateAsync(transformedData as PlayerCreate);
      }
      
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form methods={methods} onSubmit={onSubmit} className="space-y-4">
      <TextField
        name="name"
        label="Full Name"
        placeholder="Enter player's full name"
        required
      />
      
      <TextField
        name="nickname"
        label="Nickname"
        placeholder="Enter nickname (optional)"
      />
      
      <SelectField
        name="position"
        label="Position"
        placeholder="Select position"
        options={positionOptions}
      />
      
      <SelectField
        name="skillLevel"
        label="Skill Level"
        placeholder="Select skill level"
        options={skillLevelOptions}
        required
      />
      
      <TextField
        name="notes"
        label="Notes"
        placeholder="Additional notes about the player"
        multiline
        rows={3}
      />
      
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
          {isEditing ? 'Update Player' : 'Create Player'}
        </Button>
      </div>
    </Form>
  );
}
