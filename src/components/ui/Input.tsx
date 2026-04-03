import { clsx } from "clsx";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  fontStyle?: "sans" | "mono" | "serif";
  error?: string;
}

export function Input({
  label,
  hint,
  fontStyle = "sans",
  error,
  className,
  id,
  ...props
}: InputProps) {
  const fontClass = {
    sans: "font-sans",
    mono: "font-mono text-[13px]",
    serif: "font-serif text-xl italic",
  }[fontStyle];

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="font-mono text-[11px] text-[#999690] tracking-wider uppercase"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={clsx(
          "w-full px-3.5 py-2.5",
          "bg-[#FAFAF7] border border-[#E2E0D8] rounded-[4px]",
          "text-[#1A1A1A] placeholder:text-[#C5C3BB]",
          "transition-colors duration-200",
          "focus:outline-none focus:border-[#1A1A1A]",
          error && "border-red-400",
          fontClass,
          className
        )}
        {...props}
      />
      {hint && !error && (
        <span className="font-mono text-[11px] text-[#999690]">{hint}</span>
      )}
      {error && (
        <span className="font-mono text-[11px] text-red-500">{error}</span>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ label, hint, className, id, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="font-mono text-[11px] text-[#999690] tracking-wider uppercase"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={clsx(
          "w-full px-3.5 py-2.5 min-h-[100px] resize-y",
          "bg-[#FAFAF7] border border-[#E2E0D8] rounded-[4px]",
          "font-sans text-[#1A1A1A] placeholder:text-[#C5C3BB]",
          "transition-colors duration-200",
          "focus:outline-none focus:border-[#1A1A1A]",
          className
        )}
        {...props}
      />
      {hint && <span className="font-mono text-[11px] text-[#999690]">{hint}</span>}
    </div>
  );
}
