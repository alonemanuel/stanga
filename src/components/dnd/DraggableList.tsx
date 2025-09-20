"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndProvider } from "./DndProvider";

function SortableItem({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "manipulation",
  };
  return (
    <li ref={setNodeRef} style={style} className="px-3 py-2 rounded border mb-2 bg-card text-card-foreground" {...attributes} {...listeners}>
      {label}
    </li>
  );
}

export function DraggableList() {
  const [items, setItems] = React.useState([
    { id: "1", label: "Item 1" },
    { id: "2", label: "Item 2" },
    { id: "3", label: "Item 3" },
  ]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === String(active.id));
    const newIndex = items.findIndex((i) => i.id === String(over.id));
    setItems((items) => arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndProvider>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="p-4">
            {items.map((item) => (
              <SortableItem key={item.id} id={item.id} label={item.label} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </DndProvider>
  );
}


