export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function guessEmail(firstName: string, lastName: string, domain: string) {
  const first = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const last = lastName.toLowerCase().replace(/[^a-z]/g, "");
  return `${first}.${last}@${domain}`;
}
