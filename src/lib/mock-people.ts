import { guessEmail, maskEmail } from "@/lib/mask-email";
import type { PersonResult, SearchFilters } from "@/types";

const MOCK_PEOPLE: Omit<PersonResult, "maskedEmail" | "id">[] = [
  {
    fullName: "Satya Nadella",
    firstName: "Satya",
    lastName: "Nadella",
    jobTitle: "CEO",
    company: "Microsoft",
    companyDomain: "microsoft.com",
    industry: "Technology",
    linkedinUrl: "https://www.linkedin.com/in/satyanadella",
  },
  {
    fullName: "Andy Jassy",
    firstName: "Andy",
    lastName: "Jassy",
    jobTitle: "CEO",
    company: "Amazon",
    companyDomain: "amazon.com",
    industry: "E-commerce",
    linkedinUrl: "https://www.linkedin.com/in/andy-jassy",
  },
  {
    fullName: "Sundar Pichai",
    firstName: "Sundar",
    lastName: "Pichai",
    jobTitle: "CEO",
    company: "Google",
    companyDomain: "google.com",
    industry: "Technology",
    linkedinUrl: "https://www.linkedin.com/in/sundarpichai",
  },
  {
    fullName: "Jensen Huang",
    firstName: "Jensen",
    lastName: "Huang",
    jobTitle: "CEO",
    company: "NVIDIA",
    companyDomain: "nvidia.com",
    industry: "Semiconductors",
    linkedinUrl: "https://www.linkedin.com/in/jenhsunhuang",
  },
  {
    fullName: "Brian Chesky",
    firstName: "Brian",
    lastName: "Chesky",
    jobTitle: "CEO",
    company: "Airbnb",
    companyDomain: "airbnb.com",
    industry: "Travel",
    linkedinUrl: "https://www.linkedin.com/in/brianchesky",
  },
  {
    fullName: "Whitney Wolfe Herd",
    firstName: "Whitney",
    lastName: "Wolfe Herd",
    jobTitle: "Founder",
    company: "Bumble",
    companyDomain: "bumble.com",
    industry: "Technology",
    linkedinUrl: "https://www.linkedin.com/in/whitneywolfeherd",
  },
  {
    fullName: "Daniel Ek",
    firstName: "Daniel",
    lastName: "Ek",
    jobTitle: "CEO",
    company: "Spotify",
    companyDomain: "spotify.com",
    industry: "Entertainment",
    linkedinUrl: "https://www.linkedin.com/in/daniel-ek-1b5b0a",
  },
  {
    fullName: "Patrick Collison",
    firstName: "Patrick",
    lastName: "Collison",
    jobTitle: "CEO",
    company: "Stripe",
    companyDomain: "stripe.com",
    industry: "Fintech",
    linkedinUrl: "https://www.linkedin.com/in/patrickcollison",
  },
  {
    fullName: "Dylan Field",
    firstName: "Dylan",
    lastName: "Field",
    jobTitle: "CEO",
    company: "Figma",
    companyDomain: "figma.com",
    industry: "Technology",
    linkedinUrl: "https://www.linkedin.com/in/dylanfield",
  },
  {
    fullName: "Melanie Perkins",
    firstName: "Melanie",
    lastName: "Perkins",
    jobTitle: "CEO",
    company: "Canva",
    companyDomain: "canva.com",
    industry: "Technology",
    linkedinUrl: "https://www.linkedin.com/in/melanieperkins",
  },
  {
    fullName: "Alexandr Wang",
    firstName: "Alexandr",
    lastName: "Wang",
    jobTitle: "Founder",
    company: "Scale AI",
    companyDomain: "scale.com",
    industry: "Artificial Intelligence",
    linkedinUrl: "https://www.linkedin.com/in/alexandr-wang",
  },
  {
    fullName: "Guillermo Rauch",
    firstName: "Guillermo",
    lastName: "Rauch",
    jobTitle: "CEO",
    company: "Vercel",
    companyDomain: "vercel.com",
    industry: "Technology",
    linkedinUrl: "https://www.linkedin.com/in/rauchg",
  },
];

function toResult(
  person: (typeof MOCK_PEOPLE)[number],
  index: number
): PersonResult {
  const email = guessEmail(
    person.firstName,
    person.lastName.split(" ")[0] ?? person.lastName,
    person.companyDomain
  );
  return {
    id: `mock-${index}-${person.companyDomain}`,
    ...person,
    maskedEmail: maskEmail(email),
  };
}

export function searchMockPeople(filters: SearchFilters): PersonResult[] {
  const title = filters.jobTitle?.toLowerCase().trim();
  const domain = filters.companyDomain?.toLowerCase().trim().replace(/^www\./, "");
  const industry = filters.industry?.toLowerCase().trim();

  return MOCK_PEOPLE.map(toResult).filter((person) => {
    if (title && !person.jobTitle.toLowerCase().includes(title)) return false;
    if (
      domain &&
      !person.companyDomain.toLowerCase().includes(domain) &&
      !person.company.toLowerCase().includes(domain)
    ) {
      return false;
    }
    if (industry && !person.industry.toLowerCase().includes(industry)) {
      return false;
    }
    return true;
  });
}

export function getMockEmail(person: {
  firstName: string;
  lastName: string;
  companyDomain: string;
}) {
  const last = person.lastName.split(" ")[0] ?? person.lastName;
  return guessEmail(person.firstName, last, person.companyDomain);
}
