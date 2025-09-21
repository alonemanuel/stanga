"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/forms/fields";
import { useZodForm, Form } from "@/components/forms/Form";
import { PlayerCreateSchema, PlayerUpdateSchema, type PlayerCreate, type PlayerUpdate } from "@/lib/validations/player";
import { useCreatePlayer, useUpdatePlayer } from "@/lib/hooks/use-players";

interface PlayerFormProps {
  player?: {
    id: string;
    name: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}


export function PlayerForm({ player, onSuccess, onCancel }: PlayerFormProps) {
  const isEditing = !!player;
  const createMutation = useCreatePlayer();
  const updateMutation = useUpdatePlayer();
  
  const schema = isEditing ? PlayerUpdateSchema : PlayerCreateSchema;
  const methods = useZodForm(schema, {
    defaultValues: isEditing ? {
      name: player.name,
    } : {
      name: "",
    },
  });

  const onSubmit = async (data: PlayerCreate | PlayerUpdate) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: player.id,
          data: data as PlayerUpdate,
        });
      } else {
        await createMutation.mutateAsync(data as PlayerCreate);
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
