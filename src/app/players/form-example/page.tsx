"use client";

import * as React from "react";
import { z } from "zod";
import { useZodForm, Form } from "@/components/forms/Form";
import { TextField, SubmitButton } from "@/components/forms/fields";
import { toast } from "sonner";

const Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
});

export default function PlayerFormExample() {
  const methods = useZodForm(Schema, { defaultValues: { name: "", email: "" } });

  async function onSubmit(values: z.infer<typeof Schema>) {
    await new Promise((r) => setTimeout(r, 500));
    toast.success(`Submitted: ${values.name} <${values.email}>`);
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Form Example</h1>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
        <Form methods={methods}>
          <TextField name="name" label="Name" placeholder="Jane Doe" />
          <TextField name="email" label="Email" type="email" placeholder="jane@example.com" />
          <SubmitButton className="mt-2">Submit</SubmitButton>
        </Form>
      </form>
    </div>
  );
}


