import { SearchClient } from "./search-client";

type SearchPageProps = {
  searchParams: Promise<{ companyDomain?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  return <SearchClient initialDomain={params.companyDomain ?? ""} />;
}
