import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import { ensureDemoUser } from "@/lib/demo-store";
import { decodeDemoSession, DEMO_COOKIE } from "@/lib/demo-session";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types";

export { DEMO_COOKIE };

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: credits } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      return {
        id: user.id,
        email: user.email ?? "",
        created_at: user.created_at,
        credits: credits?.balance ?? 0,
        isDemo: false,
      };
    } catch (error) {
      console.error("Supabase auth error:", error);
    }
  }

  const cookieStore = await cookies();
  const session = decodeDemoSession(cookieStore.get(DEMO_COOKIE)?.value);
  if (!session) return null;

  const demoUser = await ensureDemoUser(session);

  return {
    id: demoUser.id,
    email: demoUser.email,
    created_at: demoUser.created_at,
    credits: demoUser.balance,
    isDemo: true,
  };
}

export async function requireUser(): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
