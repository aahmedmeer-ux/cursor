/**
 * Privacy controls for public / shared deployments.
 *
 * When repository indexing is disabled (default), uploaded papers are never
 * added to the comparison corpus, so other users cannot match against them.
 */
export function isRepositoryIndexingAllowed(): boolean {
  const raw = (process.env.ALLOW_REPOSITORY_INDEXING ?? "false").toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function resolveAddToIndex(requested: boolean): boolean {
  if (!isRepositoryIndexingAllowed()) return false;
  return requested;
}

export const PRIVACY_NOTICE =
  "Privacy mode is on: your upload is analyzed for this report only. The file is deleted after processing and is never added to the shared comparison repository.";
