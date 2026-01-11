"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ViewSelectorProps {
  views: Array<{
    id: string;
    name: string;
  }>;
}

function ViewSelectorInner({ views }: ViewSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentViewId = searchParams.get("view") || "__base__";

  const handleViewChange = (viewId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (viewId === "__base__") {
      params.delete("view");
    } else {
      params.set("view", viewId);
    }
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newUrl);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="view-selector" className="text-sm font-medium">
        View:
      </Label>
      <Select value={currentViewId} onValueChange={handleViewChange}>
        <SelectTrigger id="view-selector" className="w-[200px]">
          <SelectValue placeholder="Base (no overrides)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__base__">Base (no overrides)</SelectItem>
          {views.map((view) => (
            <SelectItem key={view.id} value={view.id}>
              {view.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ViewSelector(props: ViewSelectorProps) {
  return (
    <Suspense fallback={<div className="w-[200px] h-10 bg-muted animate-pulse rounded-md" />}>
      <ViewSelectorInner {...props} />
    </Suspense>
  );
}

