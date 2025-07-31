// components/ui/stat.tsx
import React from "react";

interface StatProps {
  children: React.ReactNode;
  className?: string;
}

export function Stat({ children, className }: StatProps) {
  return <div className={`space-y-1 ${className || ""}`}>{children}</div>;
}

interface StatLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function StatLabel({ children, className }: StatLabelProps) {
  return (
    <p className={`text-sm text-muted-foreground ${className || ""}`}>{children}</p>
  );
}

interface StatNumberProps {
  children: React.ReactNode;
  className?: string;
}

export function StatNumber({ children, className }: StatNumberProps) {
  return <p className={`text-lg font-medium ${className || ""}`}>{children}</p>;
}
