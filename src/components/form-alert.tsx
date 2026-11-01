// A form-level error (not tied to one field). role="alert" makes screen
// readers announce it as soon as it appears.
export function FormAlert({
  message,
}: {
  readonly message: string | undefined;
}) {
  if (message === undefined) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
