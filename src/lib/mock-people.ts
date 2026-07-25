import { guessEmail, maskEmail } from "@/lib/mask-email";
import type { PersonResult, SearchFilters, SeniorityLevel } from "@/types";

type MockPerson = Omit<
  PersonResult,
  "id" | "maskedEmail" | "maskedPhone" | "email" | "phone" | "unlocked"
> & { phone: string };

function maskPhone(phone: string) {
  // +1 (415) 555-0182 -> +1 (***) ***-0182
  return phone.replace(/\d(?=\d{4})/g, "*");
}

const BASE: Array<{
  fullName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  companyDomain: string;
  industry: string;
  location: string;
  seniority: SeniorityLevel;
  department: string;
  companySize: string;
  skills: string[];
  linkedinUrl: string;
  twitterUrl?: string;
  phone: string;
  emailConfidence: number;
}> = [
  {
    fullName: "Satya Nadella",
    firstName: "Satya",
    lastName: "Nadella",
    jobTitle: "Chief Executive Officer",
    company: "Microsoft",
    companyDomain: "microsoft.com",
    industry: "Technology",
    location: "Redmond, WA, USA",
    seniority: "C-Level",
    department: "Executive",
    companySize: "10000+",
    skills: ["Cloud", "AI", "Enterprise Software"],
    linkedinUrl: "https://www.linkedin.com/in/satyanadella",
    twitterUrl: "https://twitter.com/satyanadella",
    phone: "+1 (425) 555-0142",
    emailConfidence: 96,
  },
  {
    fullName: "Andy Jassy",
    firstName: "Andy",
    lastName: "Jassy",
    jobTitle: "Chief Executive Officer",
    company: "Amazon",
    companyDomain: "amazon.com",
    industry: "E-commerce",
    location: "Seattle, WA, USA",
    seniority: "C-Level",
    department: "Executive",
    companySize: "10000+",
    skills: ["AWS", "Retail", "Operations"],
    linkedinUrl: "https://www.linkedin.com/in/andy-jassy",
    phone: "+1 (206) 555-0198",
    emailConfidence: 94,
  },
  {
    fullName: "Sundar Pichai",
    firstName: "Sundar",
    lastName: "Pichai",
    jobTitle: "Chief Executive Officer",
    company: "Google",
    companyDomain: "google.com",
    industry: "Technology",
    location: "Mountain View, CA, USA",
    seniority: "C-Level",
    department: "Executive",
    companySize: "10000+",
    skills: ["Product", "AI", "Search"],
    linkedinUrl: "https://www.linkedin.com/in/sundarpichai",
    phone: "+1 (650) 555-0110",
    emailConfidence: 95,
  },
  {
    fullName: "Jensen Huang",
    firstName: "Jensen",
    lastName: "Huang",
    jobTitle: "Founder & CEO",
    company: "NVIDIA",
    companyDomain: "nvidia.com",
    industry: "Semiconductors",
    location: "Santa Clara, CA, USA",
    seniority: "Founder",
    department: "Executive",
    companySize: "10000+",
    skills: ["GPUs", "AI Hardware", "CUDA"],
    linkedinUrl: "https://www.linkedin.com/in/jenhsunhuang",
    phone: "+1 (408) 555-0166",
    emailConfidence: 93,
  },
  {
    fullName: "Brian Chesky",
    firstName: "Brian",
    lastName: "Chesky",
    jobTitle: "Co-Founder & CEO",
    company: "Airbnb",
    companyDomain: "airbnb.com",
    industry: "Travel",
    location: "San Francisco, CA, USA",
    seniority: "Founder",
    department: "Executive",
    companySize: "5001-10000",
    skills: ["Product Design", "Hospitality", "Marketplace"],
    linkedinUrl: "https://www.linkedin.com/in/brianchesky",
    phone: "+1 (415) 555-0133",
    emailConfidence: 91,
  },
  {
    fullName: "Patrick Collison",
    firstName: "Patrick",
    lastName: "Collison",
    jobTitle: "Co-Founder & CEO",
    company: "Stripe",
    companyDomain: "stripe.com",
    industry: "Fintech",
    location: "San Francisco, CA, USA",
    seniority: "Founder",
    department: "Executive",
    companySize: "1001-5000",
    skills: ["Payments", "APIs", "Fintech"],
    linkedinUrl: "https://www.linkedin.com/in/patrickcollison",
    phone: "+1 (415) 555-0177",
    emailConfidence: 97,
  },
  {
    fullName: "Dylan Field",
    firstName: "Dylan",
    lastName: "Field",
    jobTitle: "Co-Founder & CEO",
    company: "Figma",
    companyDomain: "figma.com",
    industry: "Technology",
    location: "San Francisco, CA, USA",
    seniority: "Founder",
    department: "Executive",
    companySize: "1001-5000",
    skills: ["Design Tools", "Collaboration", "Product"],
    linkedinUrl: "https://www.linkedin.com/in/dylanfield",
    phone: "+1 (415) 555-0121",
    emailConfidence: 92,
  },
  {
    fullName: "Guillermo Rauch",
    firstName: "Guillermo",
    lastName: "Rauch",
    jobTitle: "Founder & CEO",
    company: "Vercel",
    companyDomain: "vercel.com",
    industry: "Technology",
    location: "San Francisco, CA, USA",
    seniority: "Founder",
    department: "Executive",
    companySize: "201-1000",
    skills: ["Next.js", "Developer Tools", "Edge"],
    linkedinUrl: "https://www.linkedin.com/in/rauchg",
    twitterUrl: "https://twitter.com/rauchg",
    phone: "+1 (415) 555-0144",
    emailConfidence: 90,
  },
  {
    fullName: "Melanie Perkins",
    firstName: "Melanie",
    lastName: "Perkins",
    jobTitle: "Co-Founder & CEO",
    company: "Canva",
    companyDomain: "canva.com",
    industry: "Technology",
    location: "Sydney, Australia",
    seniority: "Founder",
    department: "Executive",
    companySize: "1001-5000",
    skills: ["Design", "SaaS", "Growth"],
    linkedinUrl: "https://www.linkedin.com/in/melanieperkins",
    phone: "+61 2 5550 0188",
    emailConfidence: 89,
  },
  {
    fullName: "Daniel Ek",
    firstName: "Daniel",
    lastName: "Ek",
    jobTitle: "Founder & CEO",
    company: "Spotify",
    companyDomain: "spotify.com",
    industry: "Entertainment",
    location: "Stockholm, Sweden",
    seniority: "Founder",
    department: "Executive",
    companySize: "5001-10000",
    skills: ["Streaming", "Music", "Product"],
    linkedinUrl: "https://www.linkedin.com/in/daniel-ek-1b5b0a",
    phone: "+46 8 555 0199",
    emailConfidence: 88,
  },
  {
    fullName: "Whitney Wolfe Herd",
    firstName: "Whitney",
    lastName: "Wolfe Herd",
    jobTitle: "Founder",
    company: "Bumble",
    companyDomain: "bumble.com",
    industry: "Technology",
    location: "Austin, TX, USA",
    seniority: "Founder",
    department: "Executive",
    companySize: "201-1000",
    skills: ["Consumer Apps", "Brand", "Marketplace"],
    linkedinUrl: "https://www.linkedin.com/in/whitneywolfeherd",
    phone: "+1 (512) 555-0155",
    emailConfidence: 87,
  },
  {
    fullName: "Alexandr Wang",
    firstName: "Alexandr",
    lastName: "Wang",
    jobTitle: "Founder & CEO",
    company: "Scale AI",
    companyDomain: "scale.com",
    industry: "Artificial Intelligence",
    location: "San Francisco, CA, USA",
    seniority: "Founder",
    department: "Executive",
    companySize: "201-1000",
    skills: ["Machine Learning", "Data Labeling", "AI"],
    linkedinUrl: "https://www.linkedin.com/in/alexandr-wang",
    phone: "+1 (415) 555-0109",
    emailConfidence: 91,
  },
  {
    fullName: "Aisha Rahman",
    firstName: "Aisha",
    lastName: "Rahman",
    jobTitle: "VP of Sales",
    company: "HubSpot",
    companyDomain: "hubspot.com",
    industry: "SaaS",
    location: "Boston, MA, USA",
    seniority: "VP",
    department: "Sales",
    companySize: "5001-10000",
    skills: ["Enterprise Sales", "SaaS", "Pipeline"],
    linkedinUrl: "https://www.linkedin.com/in/aisha-rahman-sales",
    phone: "+1 (617) 555-0181",
    emailConfidence: 86,
  },
  {
    fullName: "Marcus Chen",
    firstName: "Marcus",
    lastName: "Chen",
    jobTitle: "Director of Engineering",
    company: "Notion",
    companyDomain: "notion.so",
    industry: "Technology",
    location: "New York, NY, USA",
    seniority: "Director",
    department: "Engineering",
    companySize: "1001-5000",
    skills: ["Distributed Systems", "TypeScript", "Leadership"],
    linkedinUrl: "https://www.linkedin.com/in/marcus-chen-eng",
    phone: "+1 (212) 555-0162",
    emailConfidence: 84,
  },
  {
    fullName: "Priya Nair",
    firstName: "Priya",
    lastName: "Nair",
    jobTitle: "Head of Talent Acquisition",
    company: "Shopify",
    companyDomain: "shopify.com",
    industry: "E-commerce",
    location: "Toronto, Canada",
    seniority: "Director",
    department: "Human Resources",
    companySize: "5001-10000",
    skills: ["Recruiting", "Employer Branding", "Ops"],
    linkedinUrl: "https://www.linkedin.com/in/priya-nair-ta",
    phone: "+1 (416) 555-0147",
    emailConfidence: 85,
  },
  {
    fullName: "Jordan Blake",
    firstName: "Jordan",
    lastName: "Blake",
    jobTitle: "Chief Marketing Officer",
    company: "Asana",
    companyDomain: "asana.com",
    industry: "SaaS",
    location: "San Francisco, CA, USA",
    seniority: "C-Level",
    department: "Marketing",
    companySize: "1001-5000",
    skills: ["Demand Gen", "Brand", "ABM"],
    linkedinUrl: "https://www.linkedin.com/in/jordan-blake-cmo",
    phone: "+1 (415) 555-0191",
    emailConfidence: 88,
  },
  {
    fullName: "Elena Vasquez",
    firstName: "Elena",
    lastName: "Vasquez",
    jobTitle: "VP of Product",
    company: "Atlassian",
    companyDomain: "atlassian.com",
    industry: "Technology",
    location: "Austin, TX, USA",
    seniority: "VP",
    department: "Product",
    companySize: "5001-10000",
    skills: ["Roadmaps", "B2B SaaS", "UX"],
    linkedinUrl: "https://www.linkedin.com/in/elena-vasquez-product",
    phone: "+1 (512) 555-0114",
    emailConfidence: 90,
  },
  {
    fullName: "Noah Kim",
    firstName: "Noah",
    lastName: "Kim",
    jobTitle: "Senior Software Engineer",
    company: "Datadog",
    companyDomain: "datadoghq.com",
    industry: "Technology",
    location: "New York, NY, USA",
    seniority: "Senior",
    department: "Engineering",
    companySize: "1001-5000",
    skills: ["Observability", "Go", "Kubernetes"],
    linkedinUrl: "https://www.linkedin.com/in/noah-kim-swe",
    phone: "+1 (212) 555-0138",
    emailConfidence: 82,
  },
  {
    fullName: "Sofia Alvarez",
    firstName: "Sofia",
    lastName: "Alvarez",
    jobTitle: "Account Executive",
    company: "Salesforce",
    companyDomain: "salesforce.com",
    industry: "SaaS",
    location: "Chicago, IL, USA",
    seniority: "Manager",
    department: "Sales",
    companySize: "10000+",
    skills: ["Enterprise AE", "CRM", "Negotiation"],
    linkedinUrl: "https://www.linkedin.com/in/sofia-alvarez-ae",
    phone: "+1 (312) 555-0173",
    emailConfidence: 83,
  },
  {
    fullName: "Liam O'Connor",
    firstName: "Liam",
    lastName: "OConnor",
    jobTitle: "CTO",
    company: "Intercom",
    companyDomain: "intercom.com",
    industry: "SaaS",
    location: "Dublin, Ireland",
    seniority: "C-Level",
    department: "Engineering",
    companySize: "1001-5000",
    skills: ["Architecture", "AI Support", "Scale"],
    linkedinUrl: "https://www.linkedin.com/in/liam-oconnor-cto",
    phone: "+353 1 555 0120",
    emailConfidence: 89,
  },
  {
    fullName: "Hannah Brooks",
    firstName: "Hannah",
    lastName: "Brooks",
    jobTitle: "Director of Demand Generation",
    company: "Zendesk",
    companyDomain: "zendesk.com",
    industry: "SaaS",
    location: "San Francisco, CA, USA",
    seniority: "Director",
    department: "Marketing",
    companySize: "5001-10000",
    skills: ["Paid Media", "Lifecycle", "Analytics"],
    linkedinUrl: "https://www.linkedin.com/in/hannah-brooks-dg",
    phone: "+1 (415) 555-0150",
    emailConfidence: 86,
  },
  {
    fullName: "Omar Farouk",
    firstName: "Omar",
    lastName: "Farouk",
    jobTitle: "VP of Customer Success",
    company: "Twilio",
    companyDomain: "twilio.com",
    industry: "Technology",
    location: "London, UK",
    seniority: "VP",
    department: "Customer Success",
    companySize: "5001-10000",
    skills: ["Retention", "Onboarding", "Enterprise"],
    linkedinUrl: "https://www.linkedin.com/in/omar-farouk-cs",
    phone: "+44 20 7555 0184",
    emailConfidence: 87,
  },
  {
    fullName: "Grace Liu",
    firstName: "Grace",
    lastName: "Liu",
    jobTitle: "Product Manager",
    company: "Slack",
    companyDomain: "slack.com",
    industry: "Technology",
    location: "San Francisco, CA, USA",
    seniority: "Manager",
    department: "Product",
    companySize: "1001-5000",
    skills: ["B2B Product", "Collaboration", "Roadmapping"],
    linkedinUrl: "https://www.linkedin.com/in/grace-liu-pm",
    phone: "+1 (415) 555-0128",
    emailConfidence: 81,
  },
  {
    fullName: "Ethan Moore",
    firstName: "Ethan",
    lastName: "Moore",
    jobTitle: "Founder & CEO",
    company: "Linear",
    companyDomain: "linear.app",
    industry: "Technology",
    location: "San Francisco, CA, USA",
    seniority: "Founder",
    department: "Executive",
    companySize: "51-200",
    skills: ["Developer Tools", "Design", "Product"],
    linkedinUrl: "https://www.linkedin.com/in/ethan-moore-linear",
    phone: "+1 (415) 555-0194",
    emailConfidence: 90,
  },
  {
    fullName: "Chloe Martin",
    firstName: "Chloe",
    lastName: "Martin",
    jobTitle: "Chief People Officer",
    company: "Okta",
    companyDomain: "okta.com",
    industry: "Cybersecurity",
    location: "San Francisco, CA, USA",
    seniority: "C-Level",
    department: "Human Resources",
    companySize: "5001-10000",
    skills: ["People Ops", "Culture", "Leadership"],
    linkedinUrl: "https://www.linkedin.com/in/chloe-martin-cpo",
    phone: "+1 (415) 555-0169",
    emailConfidence: 85,
  },
  {
    fullName: "Ryan Patel",
    firstName: "Ryan",
    lastName: "Patel",
    jobTitle: "VP of Business Development",
    company: "Snowflake",
    companyDomain: "snowflake.com",
    industry: "Technology",
    location: "San Mateo, CA, USA",
    seniority: "VP",
    department: "Business Development",
    companySize: "5001-10000",
    skills: ["Partnerships", "Cloud Data", "GTM"],
    linkedinUrl: "https://www.linkedin.com/in/ryan-patel-bd",
    phone: "+1 (650) 555-0136",
    emailConfidence: 88,
  },
  {
    fullName: "Isabella Rossi",
    firstName: "Isabella",
    lastName: "Rossi",
    jobTitle: "Engineering Manager",
    company: "Adobe",
    companyDomain: "adobe.com",
    industry: "Technology",
    location: "San Jose, CA, USA",
    seniority: "Manager",
    department: "Engineering",
    companySize: "10000+",
    skills: ["Frontend", "Design Systems", "Management"],
    linkedinUrl: "https://www.linkedin.com/in/isabella-rossi-em",
    phone: "+1 (408) 555-0117",
    emailConfidence: 80,
  },
  {
    fullName: "Nathan Brooks",
    firstName: "Nathan",
    lastName: "Brooks",
    jobTitle: "Chief Revenue Officer",
    company: "MongoDB",
    companyDomain: "mongodb.com",
    industry: "Technology",
    location: "New York, NY, USA",
    seniority: "C-Level",
    department: "Sales",
    companySize: "5001-10000",
    skills: ["Revenue", "Enterprise Sales", "SaaS"],
    linkedinUrl: "https://www.linkedin.com/in/nathan-brooks-cro",
    phone: "+1 (212) 555-0159",
    emailConfidence: 92,
  },
  {
    fullName: "Mia Johansson",
    firstName: "Mia",
    lastName: "Johansson",
    jobTitle: "Head of Growth",
    company: "Klarna",
    companyDomain: "klarna.com",
    industry: "Fintech",
    location: "Stockholm, Sweden",
    seniority: "Director",
    department: "Marketing",
    companySize: "1001-5000",
    skills: ["Growth", "Performance Marketing", "Fintech"],
    linkedinUrl: "https://www.linkedin.com/in/mia-johansson-growth",
    phone: "+46 8 555 0141",
    emailConfidence: 84,
  },
  {
    fullName: "Caleb Wright",
    firstName: "Caleb",
    lastName: "Wright",
    jobTitle: "Senior Recruiter",
    company: "DoorDash",
    companyDomain: "doordash.com",
    industry: "Technology",
    location: "San Francisco, CA, USA",
    seniority: "Senior",
    department: "Human Resources",
    companySize: "5001-10000",
    skills: ["Technical Recruiting", "Sourcing", "Hiring"],
    linkedinUrl: "https://www.linkedin.com/in/caleb-wright-recruiter",
    phone: "+1 (415) 555-0187",
    emailConfidence: 79,
  },
];

function toResult(person: (typeof BASE)[number], index: number): PersonResult {
  const email = guessEmail(
    person.firstName,
    person.lastName.split(" ")[0] ?? person.lastName,
    person.companyDomain
  );
  return {
    id: `ppl-${index}-${person.companyDomain}`,
    fullName: person.fullName,
    firstName: person.firstName,
    lastName: person.lastName,
    jobTitle: person.jobTitle,
    company: person.company,
    companyDomain: person.companyDomain,
    industry: person.industry,
    location: person.location,
    seniority: person.seniority,
    department: person.department,
    companySize: person.companySize,
    skills: person.skills,
    linkedinUrl: person.linkedinUrl,
    twitterUrl: person.twitterUrl ?? null,
    maskedEmail: maskEmail(email),
    maskedPhone: maskPhone(person.phone),
    emailConfidence: person.emailConfidence,
  };
}

function includesLoose(haystack: string, needle?: string) {
  if (!needle?.trim()) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase().trim());
}

export function searchMockPeople(filters: SearchFilters): PersonResult[] {
  return BASE.map(toResult).filter((person) => {
    if (!includesLoose(person.fullName, filters.name)) return false;
    if (
      filters.jobTitle &&
      !person.jobTitle.toLowerCase().includes(filters.jobTitle.toLowerCase()) &&
      !person.seniority.toLowerCase().includes(filters.jobTitle.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.company &&
      !person.company.toLowerCase().includes(filters.company.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.companyDomain &&
      !person.companyDomain
        .toLowerCase()
        .includes(filters.companyDomain.toLowerCase().replace(/^www\./, ""))
    ) {
      return false;
    }
    if (!includesLoose(person.industry, filters.industry)) return false;
    if (!includesLoose(person.location, filters.location)) return false;
    if (
      filters.seniority &&
      person.seniority.toLowerCase() !== filters.seniority.toLowerCase()
    ) {
      return false;
    }
    if (!includesLoose(person.department, filters.department)) return false;
    if (
      filters.companySize &&
      person.companySize !== filters.companySize
    ) {
      return false;
    }
    if (filters.keywords) {
      const blob = [
        person.jobTitle,
        person.company,
        person.industry,
        person.department,
        ...person.skills,
      ]
        .join(" ")
        .toLowerCase();
      if (!blob.includes(filters.keywords.toLowerCase().trim())) return false;
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

export function getMockPhone(person: {
  firstName: string;
  lastName: string;
  companyDomain: string;
}): string {
  const match = BASE.find(
    (p) =>
      p.firstName === person.firstName &&
      p.lastName === person.lastName &&
      p.companyDomain === person.companyDomain
  );
  return match?.phone ?? "+1 (555) 010-0000";
}

export function getAllMockCompanies() {
  const map = new Map<
    string,
    {
      name: string;
      domain: string;
      industry: string;
      location: string;
      employeeCount: string;
      peopleCount: number;
    }
  >();

  for (const p of BASE) {
    const existing = map.get(p.companyDomain);
    if (existing) {
      existing.peopleCount += 1;
    } else {
      map.set(p.companyDomain, {
        name: p.company,
        domain: p.companyDomain,
        industry: p.industry,
        location: p.location,
        employeeCount: p.companySize,
        peopleCount: 1,
      });
    }
  }

  return Array.from(map.values()).map((c, i) => ({
    id: `co-${i}-${c.domain}`,
    ...c,
    linkedinUrl: `https://www.linkedin.com/company/${c.domain.split(".")[0]}`,
    description: `${c.name} is a ${c.industry.toLowerCase()} company headquartered in ${c.location}.`,
  }));
}

export type { MockPerson };
