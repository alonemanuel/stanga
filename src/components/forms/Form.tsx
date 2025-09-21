"use client";

import * as React from "react";
import { FormProvider, useForm, type UseFormProps, type FieldValues, type UseFormReturn } from "react-hook-form";
import { z, type ZodSchema } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export function useZodForm<TSchema extends ZodSchema<any>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, "resolver">
) {
  return useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema as any),
    mode: "onSubmit",
    reValidateMode: "onChange",
    ...options,
  });
}

interface FormProps<T extends FieldValues = FieldValues> {
  children: React.ReactNode;
  methods: UseFormReturn<T>;
  onSubmit?: (data: T) => void | Promise<void>;
  className?: string;
}

export function Form<T extends FieldValues = FieldValues>({ children, methods, onSubmit, className }: FormProps<T>) {
  return (
    <FormProvider {...methods}>
      {onSubmit ? (
        <form onSubmit={methods.handleSubmit(onSubmit)} className={className}>
          {children}
        </form>
      ) : (
        <div className={className}>
          {children}
        </div>
      )}
    </FormProvider>
  );
}


