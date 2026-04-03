"use client";
import React from "react";

type ButtonVariant = "primary" | "ghost" | "gold" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  children,
  style,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "4px",
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    transition: "all 0.2s ease",
    cursor: "pointer",
    border: "1px solid transparent",
    outline: "none",
    boxSizing: "border-box",
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: "#1A1A1A",
      color: "#FAFAF7",
      border: "1px solid #1A1A1A",
    },
    ghost: {
      background: "transparent",
      color: "#1A1A1A",
      border: "1px solid #E2E0D8",
    },
    gold: {
      background: "#C8A96E",
      color: "#1A1A1A",
      border: "1px solid #C8A96E",
    },
    danger: {
      background: "transparent",
      color: "#C0392B",
      border: "1px solid #E2E0D8",
    },
  };

  const sizeStyles = {
    sm: { padding: "6px 14px", fontSize: "11px" },
    md: { padding: "10px 20px", fontSize: "13px" },
    lg: { padding: "14px 28px", fontSize: "14px" },
  };

  const combinedStyle: React.CSSProperties = {
    ...baseStyle,
    ...variantStyles[variant],
    ...sizeStyles[size],
    width: fullWidth ? "100%" : "auto",
    ...style,
  };

  // Hover states via state in components is overkill for CSS icons, but simple inline hover is impossible.
  // However, we can use className approach just for hover effects defined in global CSS or just stay reliable.
  
  return (
    <button
      className="btn-component" // define hover in global css if needed, but keeping inline for stability
      style={combinedStyle}
      {...props}
    >
      {children}
    </button>
  );
}
