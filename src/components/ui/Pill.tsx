import { clsx } from "clsx";
import React from "react";

interface PillProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Pill({ children, active = false, onClick, className }: PillProps) {
  const isInteractive = !!onClick;
  return (
    <span
      role={isInteractive ? "button" : undefined}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center px-3.5 py-1.5 whitespace-nowrap",
        "font-sans text-[13px] rounded-[6px]",
        "border transition-all duration-200",
        active
          ? "bg-[#1A1A1A] text-[#FAFAF7] border-[#1A1A1A]"
          : "bg-[#F4F3EE] text-[#1A1A1A] border-[#E2E0D8]",
        isInteractive && "cursor-pointer hover:border-[#1A1A1A]",
        className
      )}
    >
      {children}
    </span>
  );
}
