"use client";

import * as React from "react";

interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  contentId: string;
  children: React.ReactNode;
}

export function CollapsibleSection({ 
  title, 
  isExpanded, 
  onToggle, 
  contentId, 
  children 
}: CollapsibleSectionProps) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div 
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      
      {isExpanded && (
        <div 
          id={contentId}
          className="p-6 pt-0 border-t bg-card"
          role="region"
          aria-labelledby={`${contentId}-header`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
