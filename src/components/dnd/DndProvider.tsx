"use client";

import * as React from "react";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

export function DndProvider({ children }: { children: React.ReactNode }) {
  const pointer = useSensor(PointerSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const sensors = useSensors(pointer);
  return (
    <DndContext sensors={sensors}>
      {children}
    </DndContext>
  );
}


