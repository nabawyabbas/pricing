"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { formatMoney, formatNumber } from "@/lib/format";
import type { Breakdown } from "@/lib/pricing";

interface BreakdownDialogProps {
  breakdown: Breakdown | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BreakdownDialog({ breakdown, open, onOpenChange }: BreakdownDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!breakdown) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(breakdown, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{breakdown.title}</DialogTitle>
              <DialogDescription className="mt-2">
                Result: <span className="font-semibold text-lg">{formatMoney(breakdown.result, breakdown.currency)}</span>
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy JSON
                </>
              )}
            </Button>
          </div>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead>Inputs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.lines.map((line, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{line.label}</TableCell>
                  <TableCell className="text-right">
                    {line.value !== null ? (
                      typeof line.value === "number" ? (
                        formatNumber(line.value, 2)
                      ) : (
                        String(line.value)
                      )
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {line.formula || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {line.inputs ? (
                      <div className="flex flex-col gap-1">
                        {Object.entries(line.inputs).map(([key, value]) => (
                          <span key={key}>
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

