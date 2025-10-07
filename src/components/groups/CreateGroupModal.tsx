'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGroups } from '@/lib/hooks/use-groups';
import { useGroupContext } from '@/lib/hooks/use-group-context';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onSuccess }: CreateGroupModalProps) {
  const { createGroup, isLoading } = useGroups();
  const { setActiveGroup } = useGroupContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      const group = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success(`${group.name} created successfully!`);
      setActiveGroup(group);
      setName('');
      setDescription('');
      
      // Call onSuccess first to reload groups before closing
      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group');
    }
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Create Group</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="group-name" className="block text-sm font-medium mb-2">
                Group Name *
              </label>
              <input
                id="group-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., FC Yarkon"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="group-description" className="block text-sm font-medium mb-2">
                Description (optional)
              </label>
              <textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your group..."
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                disabled={isLoading}
              />
            </div>

            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm text-muted-foreground">
                You will be the admin of this group. An invite code will be generated automatically 
                for you to share with others.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
}
