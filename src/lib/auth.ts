import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Role, User } from "@/generated/prisma/client";

export const DEMO_COOKIE = "originality_user_id";

let seedPromise: Promise<{ student: User; instructor: User }> | null = null;

async function upsertByEmail(
  email: string,
  data: { name: string; role: Role },
): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  try {
    return await prisma.user.create({
      data: { email, name: data.name, role: data.role },
    });
  } catch {
    const raced = await prisma.user.findUnique({ where: { email } });
    if (raced) return raced;
    throw new Error(`Failed to ensure user ${email}`);
  }
}

/** Ensure demo student + instructor exist; return both. */
export async function ensureDemoUsers(): Promise<{
  student: User;
  instructor: User;
}> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const studentEmail =
        process.env.DEMO_STUDENT_EMAIL ?? "student@example.com";
      const instructorEmail =
        process.env.DEMO_INSTRUCTOR_EMAIL ?? "instructor@example.com";

      const [student, instructor] = await Promise.all([
        upsertByEmail(studentEmail, {
          name: "Alex Student",
          role: "STUDENT",
        }),
        upsertByEmail(instructorEmail, {
          name: "Jordan Instructor",
          role: "INSTRUCTOR",
        }),
      ]);

      return { student, instructor };
    })().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }

  return seedPromise;
}

export async function getCurrentUser(): Promise<User> {
  const { student } = await ensureDemoUsers();
  const jar = await cookies();
  const id = jar.get(DEMO_COOKIE)?.value;
  if (id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) return user;
  }
  return student;
}

export async function setCurrentUserId(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(DEMO_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export function canReview(role: Role): boolean {
  return role === "INSTRUCTOR" || role === "ADMIN";
}
