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

export function Form({ children, methods }: { children: React.ReactNode; methods: ReturnType<typeof useForm>; }) {
  return <FormProvider {...methods}>{children}</FormProvider>;
}


