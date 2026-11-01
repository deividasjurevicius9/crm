import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InputProps = Omit<
  ComponentProps<"input">,
  "id" | "name" | "aria-invalid" | "aria-describedby"
>;

interface FormFieldProps extends InputProps {
  readonly name: string;
  readonly label: string;
  // Server-side validation message for this field, if any.
  readonly error?: string | undefined;
}

// Label + input + error message, wired for screen readers: the label names the
// input, aria-invalid marks it wrong and aria-describedby reads the message.
export function FormField({
  name,
  label,
  error,
  ...inputProps
}: FormFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const hasError = error !== undefined;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={hasError ? true : undefined}
        aria-describedby={hasError ? errorId : undefined}
        {...inputProps}
      />
      {hasError && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
