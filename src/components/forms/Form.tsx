"use client";

import * as React from "react";
import { FormProvider, useForm, type UseFormProps } from "react-hook-form";
import { z, type ZodSchema } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export function useZodForm<TSchema extends ZodSchema<any>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, "resolver">
) {
  return useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    ...options,
  });
}

interface FormProps {
  children: React.ReactNode;
  methods: ReturnType<typeof useForm>;
  onSubmit: (data: any) => void | Promise<void>;
  className?: string;
}

export function Form({ children, methods, onSubmit, className }: FormProps) {
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </FormProvider>
  );
}


