"use client";

import { Download, ExternalLink, Mail, Phone } from "lucide-react";
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
      <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">
        No unlocked contacts yet. Search people and unlock emails to build your
        lead list.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {contacts.length} unlocked lead{contacts.length === 1 ? "" : "s"}
        </p>
        <Button variant="outline" onClick={onExport}>
          <Download className="size-4" />
          Export to CSV
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title / Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
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
                        className="inline-flex items-center gap-1 text-xs text-[#1a56db] hover:underline"
                      >
                        LinkedIn <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <p>{contact.job_title ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {contact.company ?? "—"}
                  </p>
                </TableCell>
                <TableCell className="space-y-1 text-sm">
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-1.5 font-mono hover:underline"
                  >
                    <Mail className="size-3.5 text-muted-foreground" />
                    {contact.email}
                  </a>
                  {contact.phone && (
                    <p className="flex items-center gap-1.5 font-mono text-muted-foreground">
                      <Phone className="size-3.5" />
                      {contact.phone}
                    </p>
                  )}
                </TableCell>
                <TableCell>{contact.location ?? "—"}</TableCell>
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
