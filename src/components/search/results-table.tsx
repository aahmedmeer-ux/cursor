"use client";

import { ExternalLink, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PersonResult } from "@/types";

type ResultsTableProps = {
  results: PersonResult[];
  unlockingId: string | null;
  unlockedEmails: Record<string, string>;
  onUnlock: (person: PersonResult) => void;
};

export function ResultsTable({
  results,
  unlockingId,
  unlockedEmails,
  onUnlock,
}: ResultsTableProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No results yet. Try filters like Job Title “CEO” or Domain “stripe.com”.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((person) => {
            const revealed =
              unlockedEmails[person.id] ||
              (person.unlocked ? person.email : undefined);
            const busy = unlockingId === person.id;

            return (
              <TableRow key={person.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{person.fullName}</p>
                    {person.linkedinUrl && (
                      <a
                        href={person.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        LinkedIn <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>{person.jobTitle}</TableCell>
                <TableCell>
                  <div>
                    <p>{person.company}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.companyDomain}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{person.industry}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {revealed ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Unlock className="size-3.5" />
                      {revealed}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Lock className="size-3.5" />
                      {person.maskedEmail}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {revealed ? (
                    <Badge variant="secondary">Unlocked</Badge>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => onUnlock(person)}
                    >
                      {busy ? "Unlocking…" : "Unlock Contact (1 Credit)"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
