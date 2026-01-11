"use client";

import { Button } from "@/components/ui/button";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Currency } from "@/lib/format";
import { formatMoney, formatPct } from "@/lib/format";

interface ClickableCellProps {
  value: number | null;
  currency: Currency;
  percentage?: number | null;
  className?: string;
  onClick: () => void;
  children?: React.ReactNode;
}

export function ClickableCell({
  value,
  currency,
  percentage,
  className,
  onClick,
  children,
}: ClickableCellProps) {
  return (
    <TableCell className={cn("text-right", className)}>
      <Button
        variant="ghost"
        className="h-auto p-0 font-normal hover:bg-muted/50 w-full justify-end"
        onClick={onClick}
      >
        <div className="flex flex-col items-end">
          {children || (
            <>
              <span>{value !== null ? formatMoney(value, currency) : "—"}</span>
              {percentage !== null && percentage !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {formatPct(percentage)}
                </span>
              )}
            </>
          )}
        </div>
      </Button>
    </TableCell>
  );
}

