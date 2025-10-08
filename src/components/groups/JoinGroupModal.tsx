'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGroups } from '@/lib/hooks/use-groups';
import { useGroupContext } from '@/lib/hooks/use-group-context';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function JoinGroupModal({ isOpen, onClose, onSuccess }: JoinGroupModalProps) {
  const { joinGroup, isLoading } = useGroups();
  const { setActiveGroup } = useGroupContext();
  const [inviteCode, setInviteCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    try {
      const group = await joinGroup(inviteCode.trim().toUpperCase());
      toast.success(`Successfully joined ${group.name}!`);
      setActiveGroup(group);
      setInviteCode('');
      
      // Call onSuccess first to reload groups before closing
      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group');
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
            <h2 className="text-xl font-semibold">Join Group</h2>
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
              <label htmlFor="invite-code" className="block text-sm font-medium mb-2">
                Invite Code
              </label>
              <input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the 6-character code provided by the group admin
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
                disabled={isLoading || inviteCode.trim().length !== 6}
              >
                {isLoading ? 'Joining...' : 'Join Group'}
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
