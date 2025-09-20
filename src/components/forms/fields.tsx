"use client";

import * as React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";

interface TextFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
}

export function TextField({ name, label, type = "text", placeholder, required, multiline, rows = 3 }: TextFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as any)?.[name]?.message as string | undefined;
  
  const commonProps = {
    id: name,
    placeholder,
    className: "w-full rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "aria-invalid": !!error,
    "aria-describedby": error ? `${name}-error` : undefined,
    ...register(name),
  };
  
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {multiline ? (
        <textarea
          {...commonProps}
          rows={rows}
        />
      ) : (
        <input
          {...commonProps}
          type={type}
        />
      )}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

interface SelectFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  children?: React.ReactNode;
}

export function SelectField({ name, label, placeholder, required, options, children }: SelectFieldProps) {
  const { control, formState: { errors } } = useFormContext();
  const error = (errors as any)?.[name]?.message as string | undefined;
  
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
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
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options ? (
              options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            ) : (
              children
            )}
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


