"use client";

import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Lock,
  Mail,
  MapPin,
  Phone,
  Unlock,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { PersonResult } from "@/types";

type ResultsTableProps = {
  results: PersonResult[];
  selectedIds: Set<string>;
  unlockingId: string | null;
  bulkUnlocking: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onUnlock: (person: PersonResult) => void;
  onBulkUnlock: () => void;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ResultsTable({
  results,
  selectedIds,
  unlockingId,
  bulkUnlocking,
  onToggle,
  onToggleAll,
  onUnlock,
  onBulkUnlock,
}: ResultsTableProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed bg-white p-12 text-center">
        <div className="max-w-md space-y-2">
          <h3 className="text-base font-semibold">Search 700M+ professional profiles</h3>
          <p className="text-sm text-muted-foreground">
            Use the left filters for title, seniority, company, location, and
            skills — then unlock verified email + phone for 1 credit each.
          </p>
        </div>
      </div>
    );
  }

  const allSelected =
    results.length > 0 && results.every((r) => selectedIds.has(r.id));
  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => onToggleAll(Boolean(v))}
            aria-label="Select all"
          />
          <span className="text-sm text-muted-foreground">
            {results.length} profiles · {selectedCount} selected
          </span>
        </div>
        <Button
          size="sm"
          disabled={selectedCount === 0 || bulkUnlocking}
          onClick={onBulkUnlock}
        >
          {bulkUnlocking
            ? "Unlocking…"
            : `Bulk unlock (${selectedCount} credits)`}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        {results.map((person, index) => {
          const revealed = person.unlocked && person.email;
          const busy = unlockingId === person.id;
          return (
            <div
              key={person.id}
              className={`grid gap-4 px-4 py-4 md:grid-cols-[auto_1fr_220px_180px] md:items-center ${
                index !== results.length - 1 ? "border-b" : ""
              }`}
            >
              <Checkbox
                checked={selectedIds.has(person.id)}
                onCheckedChange={(v) => onToggle(person.id, Boolean(v))}
                aria-label={`Select ${person.fullName}`}
              />

              <div className="flex min-w-0 items-start gap-3">
                <Avatar className="size-11 border">
                  <AvatarFallback className="bg-[#e8f1ff] text-[#1a56db]">
                    {initials(person.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">
                      {person.fullName}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      {person.seniority}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700">
                    {person.jobTitle}
                    <span className="text-muted-foreground"> at </span>
                    <span className="font-medium">{person.company}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3" />
                      {person.companyDomain} · {person.companySize}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {person.location}
                    </span>
                    {person.linkedinUrl && (
                      <a
                        href={person.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#1a56db] hover:underline"
                      >
                        LinkedIn <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  {person.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {person.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-[10px]">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 font-mono text-[13px]">
                  {revealed ? (
                    <>
                      <Mail className="size-3.5 text-emerald-600" />
                      <a href={`mailto:${person.email}`} className="hover:underline">
                        {person.email}
                      </a>
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                    </>
                  ) : (
                    <>
                      <Lock className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {person.maskedEmail}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono text-[13px] text-muted-foreground">
                  <Phone className="size-3.5" />
                  {revealed && person.phone ? person.phone : person.maskedPhone}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Email confidence</span>
                    <span>{person.emailConfidence}%</span>
                  </div>
                  <Progress value={person.emailConfidence} className="h-1.5" />
                </div>
              </div>

              <div className="flex md:justify-end">
                {revealed ? (
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                    <Unlock className="size-3" />
                    Unlocked
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={busy || bulkUnlocking}
                    onClick={() => onUnlock(person)}
                    className="bg-[#1a56db] hover:bg-[#1648b8]"
                  >
                    {busy ? "Unlocking…" : "Unlock (1 credit)"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
