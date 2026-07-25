"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { contactsToCsv, downloadCsv } from "@/lib/csv";
import type { UnlockedContact } from "@/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<UnlockedContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/contacts");
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Failed to load contacts");
          return;
        }
        setContacts(data.contacts ?? []);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function handleExport() {
    if (contacts.length === 0) {
      toast.error("No contacts to export");
      return;
    }
    const csv = contactsToCsv(contacts);
    downloadCsv(`leadunlock-contacts-${Date.now()}.csv`, csv);
    toast.success("CSV downloaded");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Saved Contacts
        </h1>
        <p className="text-sm text-muted-foreground">
          Leads you have unlocked with credits. Export anytime to CSV.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">
          Loading contacts…
        </div>
      ) : (
        <ContactsTable contacts={contacts} onExport={handleExport} />
      )}
    </div>
  );
}
