export type PersonResult = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  companyDomain: string;
  industry: string;
  linkedinUrl: string | null;
  /** Masked email shown before unlock */
  maskedEmail: string;
  /** Present only after unlock (or in mock preview) */
  email?: string;
  unlocked?: boolean;
};

export type UnlockedContact = {
  id: string;
  user_id: string;
  person_name: string;
  job_title: string | null;
  company: string | null;
  email: string;
  linkedin_url: string | null;
  unlocked_at: string;
};

export type SearchFilters = {
  jobTitle?: string;
  companyDomain?: string;
  industry?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  created_at: string;
  credits: number;
  isDemo: boolean;
};
