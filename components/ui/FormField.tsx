import {
  cloneElement,
  isValidElement,
  type ReactElement,
} from "react";

import type {
  FormDescriptionProps,
  FormErrorProps,
  FormFieldProps,
  FormLabelProps,
} from "../../types/ui";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function FormField({
  id,
  label,
  description,
  error,
  successMessage,
  warningMessage,
  required = false,
  disabled = false,
  readOnly = false,
  orientation = "vertical",
  ariaLabel,
  children,
}: FormFieldProps) {
  const descriptionId = description
    ? `${id}-description`
    : undefined;

  const errorId = error
    ? `${id}-error`
    : undefined;

  const messageId =
    errorId ??
    (successMessage ? `${id}-success` : undefined) ??
    (warningMessage ? `${id}-warning` : undefined);

  const describedBy = [
    descriptionId,
    messageId,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  if (!isValidElement(children)) {
    throw new Error(
      "Aviritech FormField requires exactly one valid React element as its control.",
    );
  }

  const child = children as ReactElement<Record<string, unknown>>;

  const control = cloneElement(child, {
    id: child.props.id ?? id,
    "aria-describedby":
      child.props["aria-describedby"] ?? describedBy,
    "aria-invalid":
      child.props["aria-invalid"] ?? (Boolean(error) || undefined),
    "aria-required":
      child.props["aria-required"] ?? (required || undefined),
    "aria-label":
      child.props["aria-label"] ?? ariaLabel,
    "aria-disabled":
      child.props["aria-disabled"] ?? (disabled || undefined),
    disabled:
      child.props.disabled ?? (disabled || undefined),
    readOnly:
      child.props.readOnly ?? (readOnly || undefined),
  });

  return (
    <div
      className={cn(
        "space-y-2",
        orientation === "horizontal" &&
          "grid grid-cols-[minmax(140px,220px)_1fr] items-start gap-4 space-y-0",
      )}
    >
      <div>
        {label ? (
          <FormLabel
            htmlFor={id}
            required={required}
          >
            {label}
          </FormLabel>
        ) : null}

        {description ? (
          <FormDescription id={descriptionId!}>
            {description}
          </FormDescription>
        ) : null}
      </div>

      <div>
        {control}

        {error ? (
          <FormError id={errorId!}>
            {error}
          </FormError>
        ) : successMessage ? (
          <p
            id={`${id}-success`}
            className="mt-1 text-xs text-green-700"
          >
            {successMessage}
          </p>
        ) : warningMessage ? (
          <p
            id={`${id}-warning`}
            className="mt-1 text-xs text-yellow-800"
          >
            {warningMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function FormLabel({
  htmlFor,
  required,
  children,
  className,
  ...props
}: FormLabelProps) {
  return (
    <label
      {...props}
      htmlFor={htmlFor}
      className={cn(
        "block text-sm font-medium text-neutral-900",
        className,
      )}
    >
      {children}

      {required ? (
        <span
          aria-hidden="true"
          className="ml-1 text-red-600"
        >
          *
        </span>
      ) : null}
    </label>
  );
}

export function FormDescription({
  id,
  children,
  className,
  ...props
}: FormDescriptionProps) {
  return (
    <p
      {...props}
      id={id}
      className={cn(
        "mt-1 text-xs text-neutral-500",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function FormError({
  id,
  children,
  className,
  ...props
}: FormErrorProps) {
  return (
    <p
      {...props}
      id={id}
      role="alert"
      className={cn(
        "mt-1 text-xs text-red-600",
        className,
      )}
    >
      {children}
    </p>
  );
}

export default FormField;
