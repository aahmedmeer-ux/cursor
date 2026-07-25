"use client";

import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UnlockedContact } from "@/types";

type ContactsTableProps = {
  contacts: UnlockedContact[];
  onExport: () => void;
};

export function ContactsTable({ contacts, onExport }: ContactsTableProps) {
  if (contacts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No unlocked contacts yet. Search for people and spend a credit to reveal
        their email.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onExport}>
          <Download className="size-4" />
          Export to CSV
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Unlocked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{contact.person_name}</p>
                    {contact.linkedin_url && (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        LinkedIn <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>{contact.job_title ?? "—"}</TableCell>
                <TableCell>{contact.company ?? "—"}</TableCell>
                <TableCell className="font-mono text-sm">
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:underline"
                  >
                    {contact.email}
                  </a>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(contact.unlocked_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
