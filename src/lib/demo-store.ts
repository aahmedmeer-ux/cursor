import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { UnlockedContact } from "@/types";

const STORE_PATH = path.join(process.cwd(), ".data", "demo-store.json");

export type DemoUser = {
  id: string;
  email: string;
  created_at: string;
  balance: number;
  contacts: UnlockedContact[];
};

type DemoStore = {
  users: Record<string, DemoUser>;
};

const DEFAULT_BALANCE = 25;

async function ensureStore(): Promise<DemoStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as DemoStore;
  } catch {
    const empty: DemoStore = { users: {} };
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function saveStore(store: DemoStore) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function getOrCreateDemoUser(
  email: string,
  preferredId?: string
): Promise<DemoUser> {
  const store = await ensureStore();
  const existing = Object.values(store.users).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) return existing;

  if (preferredId && store.users[preferredId]) {
    return store.users[preferredId];
  }

  const user: DemoUser = {
    id: preferredId ?? randomUUID(),
    email: email.toLowerCase(),
    created_at: new Date().toISOString(),
    balance: DEFAULT_BALANCE,
    contacts: [],
  };
  store.users[user.id] = user;
  await saveStore(store);
  return user;
}

export async function getDemoUser(userId: string): Promise<DemoUser | null> {
  const store = await ensureStore();
  return store.users[userId] ?? null;
}

export async function ensureDemoUser(session: {
  id: string;
  email: string;
}): Promise<DemoUser> {
  const existing = await getDemoUser(session.id);
  if (existing) return existing;
  return getOrCreateDemoUser(session.email, session.id);
}

export async function listDemoContacts(userId: string): Promise<UnlockedContact[]> {
  const user = await getDemoUser(userId);
  if (!user) return [];
  return [...user.contacts].sort(
    (a, b) =>
      new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
  );
}

export async function unlockDemoContact(
  userId: string,
  data: {
    person_name: string;
    job_title: string | null;
    company: string | null;
    email: string;
    phone: string | null;
    linkedin_url: string | null;
    location: string | null;
  }
): Promise<{ contact: UnlockedContact; balance: number }> {
  const store = await ensureStore();
  const user = store.users[userId];
  if (!user) throw new Error("Demo user not found");
  if (user.balance < 1) throw new Error("Insufficient credits");

  const existing = user.contacts.find(
    (c) =>
      c.person_name === data.person_name &&
      c.company === data.company &&
      c.email === data.email
  );
  if (existing) {
    return { contact: existing, balance: user.balance };
  }

  user.balance -= 1;
  const contact: UnlockedContact = {
    id: randomUUID(),
    user_id: userId,
    person_name: data.person_name,
    job_title: data.job_title,
    company: data.company,
    email: data.email,
    phone: data.phone,
    linkedin_url: data.linkedin_url,
    location: data.location,
    unlocked_at: new Date().toISOString(),
  };
  user.contacts.push(contact);
  await saveStore(store);
  return { contact, balance: user.balance };
}

export async function addDemoCredits(userId: string, amount: number) {
  const store = await ensureStore();
  const user = store.users[userId];
  if (!user) throw new Error("Demo user not found");
  user.balance += amount;
  await saveStore(store);
  return user.balance;
}
