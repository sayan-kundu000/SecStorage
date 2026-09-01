import React from "react";
import { Checkbox } from "../ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "../ui/table";

export interface FileListProps {
  children: React.ReactNode;
  allSelected?: boolean;
  onSelectAll?: () => void;
  hasItems?: boolean;
}

export function FileList({
  children,
  allSelected = false,
  onSelectAll,
  hasItems = true,
}: FileListProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-10 text-center">
              {hasItems && onSelectAll && (
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all files and folders"
                />
              )}
            </TableHead>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold hidden sm:table-cell">Size</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Last Modified</TableHead>
            <TableHead className="w-12 text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}
