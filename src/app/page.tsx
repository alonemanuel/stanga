"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGroupContext } from "@/lib/hooks/use-group-context";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, PlusCircle } from "lucide-react";
import { JoinGroupModal } from "@/components/groups/JoinGroupModal";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const { activeGroup, isLoading } = useGroupContext();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isLoading && activeGroup) {
      router.replace("/overview");
    }
  }, [activeGroup, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6 max-w-md mx-auto p-6">
          <Users className="h-20 w-20 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Welcome to Stanga</h1>
            <p className="text-muted-foreground text-lg">
              Join a group to start tracking your football matchdays, players, and stats
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              size="lg"
              onClick={() => setShowJoinModal(true)}
              className="w-full"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Join a Group
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowCreateModal(true)}
              className="w-full"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Group
            </Button>
          </div>

          <p className="text-sm text-muted-foreground pt-4">
            Already have an invite code? Click "Join a Group" to enter it.
          </p>
        </div>
      </div>

      <JoinGroupModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}