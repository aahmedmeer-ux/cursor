export type SeniorityLevel =
  | "Founder"
  | "C-Level"
  | "VP"
  | "Director"
  | "Manager"
  | "Senior"
  | "Entry";

export type PersonResult = {
  id: string;
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
  linkedinUrl: string | null;
  twitterUrl: string | null;
  /** Masked email shown before unlock */
  maskedEmail: string;
  /** Masked phone shown before unlock */
  maskedPhone: string;
  emailConfidence: number;
  /** Present only after unlock */
  email?: string;
  phone?: string;
  unlocked?: boolean;
};

export type UnlockedContact = {
  id: string;
  user_id: string;
  person_name: string;
  job_title: string | null;
  company: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  location: string | null;
  unlocked_at: string;
};

export type SearchFilters = {
  name?: string;
  jobTitle?: string;
  company?: string;
  companyDomain?: string;
  industry?: string;
  location?: string;
  seniority?: string;
  department?: string;
  companySize?: string;
  keywords?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  created_at: string;
  credits: number;
  isDemo: boolean;
};

export type CompanyResult = {
  id: string;
  name: string;
  domain: string;
  industry: string;
  location: string;
  employeeCount: string;
  linkedinUrl: string | null;
  description: string;
  peopleCount: number;
};
