"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { User } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";

export function RoleSwitcher({
  current,
  users,
}: {
  current: User;
  users: User[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function switchTo(userId: string) {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-[var(--muted)]">Demo identity</p>
      <div className="flex flex-col gap-1.5">
        {users.map((user) => (
          <Button
            key={user.id}
            size="sm"
            variant={user.id === current.id ? "default" : "outline"}
            disabled={pending || user.id === current.id}
            onClick={() => switchTo(user.id)}
            className="justify-start"
          >
            {user.role === "STUDENT" ? "Student" : "Instructor"}
          </Button>
        ))}
      </div>
    </div>
  );
}
