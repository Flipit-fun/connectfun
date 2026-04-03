import { clsx } from "clsx";
import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-4",
  md: "p-5",
  lg: "p-7",
};

export function Card({ children, className, hover = true, padding = "md" }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-[#FFFFFF] border border-[#E2E0D8] rounded-[4px]",
        paddingStyles[padding],
        hover && "card-hover cursor-default",
        className
      )}
    >
      {children}
    </div>
  );
}
