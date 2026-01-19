"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleUserActive } from "./actions";
import { toast } from "sonner";

interface ToggleUserActiveButtonProps {
  userId: string;
  isActive: boolean;
}

export function ToggleUserActiveButton({ userId, isActive }: ToggleUserActiveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const result = await toggleUserActive(userId);

      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      toast.success(isActive ? "User deactivated" : "User activated");
      router.refresh();
    } catch (err) {
      toast.error("An error occurred");
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isActive ? "destructive" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "..." : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}


