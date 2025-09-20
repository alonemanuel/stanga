"use client";

import * as React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";

export function TextField({ name, label, type = "text", placeholder }: { name: string; label: string; type?: string; placeholder?: string; }) {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as any)?.[name]?.message as string | undefined;
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={name}>{label}</label>
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...register(name)}
      />
      {error ? (
        <p id={`${name}-error`} className="text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function SelectField({ name, label, children }: { name: string; label: string; children: React.ReactNode; }) {
  const { control, formState: { errors } } = useFormContext();
  const error = (errors as any)?.[name]?.message as string | undefined;
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={name}>{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <select
            id={name}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : undefined}
            {...field}
          >
            {children}
          </select>
        )}
      />
      {error ? (
        <p id={`${name}-error`} className="text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ pendingLabel = "Submitting...", children, ...props }: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { formState } = useFormContext();
  return (
    <Button type="submit" aria-busy={formState.isSubmitting} disabled={formState.isSubmitting} {...props}>
      {formState.isSubmitting ? pendingLabel : children}
    </Button>
  );
}


