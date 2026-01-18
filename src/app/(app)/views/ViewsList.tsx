"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal } from "lucide-react";
import { createView, renameView, deleteView } from "./actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ViewsListProps {
  views: Array<{
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export function ViewsList({ views }: ViewsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedView, setSelectedView] = useState<{ id: string; name: string } | null>(null);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error("View name is required");
      return;
    }
    startTransition(async () => {
      const result = await createView(newName);
      if (result.success) {
        toast.success("View created successfully");
        setCreateOpen(false);
        setNewName("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create view");
      }
    });
  };

  const handleRename = () => {
    if (!selectedView || !newName.trim()) {
      toast.error("View name is required");
      return;
    }
    startTransition(async () => {
      const result = await renameView(selectedView.id, newName);
      if (result.success) {
        toast.success("View renamed successfully");
        setRenameOpen(false);
        setNewName("");
        setSelectedView(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to rename view");
      }
    });
  };

  const handleDelete = () => {
    if (!selectedView) return;
    startTransition(async () => {
      const result = await deleteView(selectedView.id);
      if (result.success) {
        toast.success("View deleted successfully");
        setDeleteOpen(false);
        setSelectedView(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete view");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing Views</h1>
          <p className="text-muted-foreground mt-1">
            Create views to override active status of employees and overhead types
          </p>
        </div>
        <Button
          onClick={() => {
            setNewName("");
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create View
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Views</CardTitle>
        </CardHeader>
        <CardContent>
          {views.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No views created yet</p>
              <Button
                onClick={() => {
                  setNewName("");
                  setCreateOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First View
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {views.map((view) => (
                  <TableRow key={view.id}>
                    <TableCell className="font-medium">{view.name}</TableCell>
                    <TableCell>
                      {new Date(view.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(view.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              router.push(`/views/${view.id}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedView(view);
                              setNewName(view.name);
                              setRenameOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedView(view);
                              setDeleteOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create View</DialogTitle>
            <DialogDescription>
              Enter a name for the new pricing view
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">View Name</Label>
              <Input
                id="create-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Q1 2024 Scenario"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreate();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename View</DialogTitle>
            <DialogDescription>
              Enter a new name for the view
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-name">View Name</Label>
              <Input
                id="rename-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Q1 2024 Scenario"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isPending}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete View</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedView?.name}"? This action cannot be undone
              and will delete all associated overrides.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


