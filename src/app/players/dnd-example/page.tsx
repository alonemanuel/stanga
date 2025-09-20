"use client";

import { DraggableList } from "@/components/dnd/DraggableList";

export default function DndExamplePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">DnD Example</h1>
      <DraggableList />
    </div>
  );
}


