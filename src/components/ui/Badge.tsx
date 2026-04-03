import { clsx } from "clsx";

type BadgeRole = "owner" | "mod" | "member" | "custom";

interface BadgeProps {
  role?: BadgeRole;
  label: string;
  className?: string;
}

const roleStyles: Record<BadgeRole, string> = {
  owner: "bg-[#1A1A1A] text-[#FAFAF7]",
  mod: "bg-[#C8A96E] text-[#1A1A1A]",
  member: "bg-[#E2E0D8] text-[#1A1A1A]",
  custom: "bg-[#F4F3EE] text-[#999690] border border-[#E2E0D8]",
};

export function Badge({ role = "member", label, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5",
        "font-mono text-[10px] font-medium tracking-wide uppercase rounded-[4px]",
        roleStyles[role],
        className
      )}
    >
      {label}
    </span>
  );
}

interface TagProps {
  children: React.ReactNode;
  className?: string;
}

import React from "react";

export function Tag({ children, className }: TagProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-1",
        "font-mono text-[11px] text-[#999690]",
        "bg-[#F4F3EE] border border-[#E2E0D8] rounded-[4px]",
        className
      )}
    >
      {children}
    </span>
  );
}
