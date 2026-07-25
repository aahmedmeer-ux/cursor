"use client";

import { useRouter } from "next/navigation";
import { Coins, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { UserProfile } from "@/types";

type AppTopbarProps = {
  user: UserProfile;
};

export function AppTopbar({ user }: AppTopbarProps) {
  const router = useRouter();

  async function handleSignOut() {
    const res = await fetch("/api/auth/signout", { method: "POST" });
    if (!res.ok) {
      toast.error("Failed to sign out");
      return;
    }
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex flex-1 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.email}</p>
          {user.isDemo && (
            <p className="text-xs text-muted-foreground">Demo mode</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-sm">
            <Coins className="size-3.5" />
            {user.credits} credit{user.credits === 1 ? "" : "s"}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
