// components/ui/spinner.tsx
import React from "react";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div className="flex justify-center items-center">
      <Loader2 className={`h-6 w-6 animate-spin text-muted-foreground ${className || ""}`} />
    </div>
  );
}