export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasPdlKey() {
  return Boolean(process.env.PDL_API_KEY);
}

export function hasApolloKey() {
  return Boolean(process.env.APOLLO_API_KEY);
}

export function hasHunterKey() {
  return Boolean(process.env.HUNTER_API_KEY);
}

export function hasDropcontactKey() {
  return Boolean(process.env.DROPCONTACT_API_KEY);
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
