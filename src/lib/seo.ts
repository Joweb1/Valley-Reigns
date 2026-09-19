import { Job } from "../types";
import { getCategoryImage } from "./categories";

export interface JobSEOMetadata {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl: string;
  ogImageUrl: string;
  employmentType: string;
  currency: string;
  baseSalaryNumeric: number | null;
  validThroughDate: string;
  faqSnippet?: Array<{ question: string; answer: string }>;
  aiSummary: string;
}

/**
 * Generate URL-friendly slug from job title and company
 */
export function generateJobSlug(title: string, company: string, id: string): string {
  const cleanTitle = (title || "job")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 40);
  
  const cleanCompany = (company || "valley-reigns")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 30);

  return `${cleanTitle}-at-${cleanCompany}-${id}`.replace(/-+/g, "-");
}

/**
 * Parse numeric salary and currency from strings like "₦250,000 / month", "$3,500 / mo", "150000"
 */
export function parseSalaryInfo(salaryStr: string): { numeric: number | null; currency: string } {
  if (!salaryStr) return { numeric: null, currency: "NGN" };
  
  let currency = "NGN";
  if (salaryStr.includes("$")) currency = "USD";
  else if (salaryStr.includes("£")) currency = "GBP";
  else if (salaryStr.includes("€")) currency = "EUR";
  else if (salaryStr.includes("₦") || salaryStr.toLowerCase().includes("ngn") || salaryStr.toLowerCase().includes("naira")) currency = "NGN";

  const digits = salaryStr.replace(/[^0-9]/g, "");
  const num = digits ? parseInt(digits, 10) : null;
  return { numeric: num, currency };
}

/**
 * Map job type to Schema.org JobPosting employmentType
 */
export function mapEmploymentType(typeStr: string): string {
  const lower = (typeStr || "").toLowerCase();
  if (lower.includes("part")) return "PART_TIME";
  if (lower.includes("contract") || lower.includes("temp")) return "CONTRACTOR";
  if (lower.includes("intern")) return "INTERN";
  if (lower.includes("remote")) return "FULL_TIME";
  return "FULL_TIME";
}

/**
 * Automatically computes complete SEO & AIO metadata for any job
 */
export function generateJobSEOMetadata(job: Partial<Job> & { id: string; title: string; company: string }): JobSEOMetadata {
  const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://valley-reigns.onrender.com";
  const slug = generateJobSlug(job.title || "Job Opening", job.company || "Valley Reigns", job.id);
  const canonicalUrl = `${origin}/jobs/${job.id}`;

  const category = job.category || "General";
  const location = job.location || "Nigeria";
  const salary = job.salary || "Competitive Salary";
  const { numeric: baseSalaryNumeric, currency } = parseSalaryInfo(salary);
  const employmentType = mapEmploymentType(job.type || "Full-time");

  // Meta Title (Max 60 chars target)
  const metaTitle = `${job.title} at ${job.company} (${location}) | Valley Reigns Jobs`;
  
  // Meta Description (Max 160 chars target)
  const rawDesc = job.description ? job.description.replace(/\s+/g, " ").trim() : "";
  const excerpt = rawDesc.length > 110 ? rawDesc.substring(0, 107) + "..." : rawDesc;
  const metaDescription = `Apply for ${job.title} at ${job.company} in ${location}. Salary: ${salary}. ${excerpt} Apply securely on Valley Reigns.`;

  // Dynamic Category Image
  const ogImageUrl = job.category ? getCategoryImage(job.category) : "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&auto=format&fit=crop&q=80";

  // Keywords
  const metaKeywords = [
    job.title,
    `${job.title} jobs`,
    job.company,
    `${job.company} careers`,
    job.category,
    `${job.category} vacancies`,
    location,
    `jobs in ${location}`,
    "Valley Reigns recruitment",
    "Valley Reigns job board",
    "verified vacancies",
    "direct candidate routing"
  ];

  // Calculate 90 days validity for Google Jobs Schema
  const createdDate = job.createdAt ? new Date(job.createdAt) : new Date();
  const validThrough = new Date(createdDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  // AI Overview Summary (Concise bullet format for LLMs)
  const reqSummary = (job.requirements || []).slice(0, 4).join("; ");
  const aiSummary = `Job: ${job.title} at ${job.company}. Location: ${location}. Category: ${category}. Type: ${job.type || "Full-time"}. Salary: ${salary}. Requirements: ${reqSummary || "Relevant professional experience."} Verified vacancy active on Valley Reigns.`;

  // FAQ Schema snippets for Google Answer Box / AI Search
  const faqSnippet = [
    {
      question: `How do I apply for ${job.title} at ${job.company}?`,
      answer: `You can apply directly and securely on Valley Reigns by visiting ${canonicalUrl} and clicking 'Apply Now' to connect directly with the hiring recruiter.`
    },
    {
      question: `What is the salary for ${job.title} at ${job.company}?`,
      answer: `The listed compensation for this position is ${salary}.`
    },
    {
      question: `Where is this position located?`,
      answer: `This role is based in ${location} with hiring facilitated via Valley Reigns recruitment routing.`
    }
  ];

  return {
    slug,
    metaTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    ogImageUrl,
    employmentType,
    currency,
    baseSalaryNumeric,
    validThroughDate: validThrough,
    faqSnippet,
    aiSummary
  };
}

/**
 * Builds Google JobPosting Schema.org JSON-LD object
 */
export function buildGoogleJobPostingSchema(job: Job) {
  const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://valley-reigns.onrender.com";
  const seo = job.seo || generateJobSEOMetadata(job);
  const datePosted = new Date(job.createdAt || Date.now()).toISOString();
  const imageUrl = getCategoryImage(job.category);

  // Requirements formatted as clean HTML / plain text list
  const reqsHtml = (job.requirements && job.requirements.length > 0)
    ? `<p><strong>Candidate Requirements:</strong></p><ul>${job.requirements.map(r => `<li>${r}</li>`).join("")}</ul>`
    : "";

  const fullDescriptionHtml = `<p>${job.description || ""}</p>${reqsHtml}<p><em>Apply securely through the Valley Reigns high-fidelity recruitment platform.</em></p>`;

  const schema: Record<string, any> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    "title": job.title,
    "description": fullDescriptionHtml,
    "identifier": {
      "@type": "PropertyValue",
      "name": "Valley Reigns",
      "value": job.id
    },
    "datePosted": datePosted,
    "validThrough": seo.validThroughDate,
    "employmentType": seo.employmentType,
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.company,
      "sameAs": origin,
      "logo": imageUrl
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": job.location,
        "addressLocality": job.location.split(",")[0]?.trim() || job.location,
        "addressCountry": "NG"
      }
    },
    "image": imageUrl,
    "directApply": true,
    "url": `${origin}/jobs/${job.id}`
  };

  if (seo.baseSalaryNumeric && seo.baseSalaryNumeric > 0) {
    schema["baseSalary"] = {
      "@type": "MonetaryAmount",
      "currency": seo.currency,
      "value": {
        "@type": "QuantitativeValue",
        "value": seo.baseSalaryNumeric,
        "unitText": "MONTH"
      }
    };
  }

  return schema;
}

/**
 * Injects document head meta tags, OpenGraph, Twitter cards, and JSON-LD structured data dynamically
 */
export function applyJobSEOTags(job: Job) {
  if (typeof document === "undefined") return;

  const origin = window.location.origin;
  const seo = job.seo || generateJobSEOMetadata(job);
  const pageUrl = `${origin}/jobs/${job.id}`;
  const categoryImage = getCategoryImage(job.category);

  // 1. Title
  document.title = seo.metaTitle;

  // Helper to set or create meta tag
  const setMeta = (nameAttr: "name" | "property", key: string, content: string) => {
    let el = document.querySelector(`meta[${nameAttr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(nameAttr, key);
      document.head.appendChild(el);
    }
    el.content = content;
  };

  // 2. Standard Search Meta
  setMeta("name", "description", seo.metaDescription);
  setMeta("name", "keywords", seo.metaKeywords.join(", "));
  setMeta("name", "robots", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
  setMeta("name", "author", `${job.company} via Valley Reigns`);

  // 3. Open Graph Social Cards (WhatsApp, Facebook, LinkedIn, Telegram)
  setMeta("property", "og:type", "article");
  setMeta("property", "og:site_name", "Valley Reigns");
  setMeta("property", "og:title", seo.metaTitle);
  setMeta("property", "og:description", seo.metaDescription);
  setMeta("property", "og:url", pageUrl);
  setMeta("property", "og:image", categoryImage);
  setMeta("property", "og:image:secure_url", categoryImage);
  setMeta("property", "og:image:alt", `${job.title} - ${job.category}`);
  setMeta("property", "og:image:width", "600");
  setMeta("property", "og:image:height", "400");

  // 4. Twitter / X Cards
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", seo.metaTitle);
  setMeta("name", "twitter:description", seo.metaDescription);
  setMeta("name", "twitter:image", categoryImage);
  setMeta("name", "twitter:image:alt", `${job.title} at ${job.company}`);

  // 5. Canonical Link
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement("link");
    canonicalEl.rel = "canonical";
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.href = pageUrl;

  // 6. Schema.org JSON-LD Structured Data
  let ldJsonEl = document.getElementById("job-posting-ld-json") as HTMLScriptElement | null;
  if (!ldJsonEl) {
    ldJsonEl = document.createElement("script");
    ldJsonEl.type = "application/ld+json";
    ldJsonEl.id = "job-posting-ld-json";
    document.head.appendChild(ldJsonEl);
  }

  const jobSchema = buildGoogleJobPostingSchema(job);
  
  // Also include FAQ Page schema for Google Answer box
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": (seo.faqSnippet || []).map(f => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.answer
      }
    }))
  };

  ldJsonEl.textContent = JSON.stringify([jobSchema, faqSchema], null, 2);
}

/**
 * Resets document head meta tags back to platform defaults
 */
export function resetPlatformSEOTags() {
  if (typeof document === "undefined") return;

  const defaultTitle = "Valley Reigns | High-Fidelity Tech Recruitment & Communication Routing";
  const defaultDesc = "Valley Reigns is a premier high-fidelity recruitment routing platform bridging exceptional tech talent with top-tier companies through interactive, real-time communication channels.";
  const origin = window.location.origin;

  document.title = defaultTitle;

  const setMeta = (nameAttr: "name" | "property", key: string, content: string) => {
    const el = document.querySelector(`meta[${nameAttr}="${key}"]`) as HTMLMetaElement | null;
    if (el) el.content = content;
  };

  setMeta("name", "description", defaultDesc);
  setMeta("name", "keywords", "Valley Reigns, tech recruitment, developer jobs, recruitment routing, real-time communication routing, hire engineers, elite tech talent");
  setMeta("property", "og:title", defaultTitle);
  setMeta("property", "og:description", defaultDesc);
  setMeta("property", "og:url", origin);
  setMeta("property", "og:type", "website");
  setMeta("name", "twitter:title", defaultTitle);
  setMeta("name", "twitter:description", defaultDesc);

  const canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (canonicalEl) canonicalEl.href = origin;

  const ldJsonEl = document.getElementById("job-posting-ld-json");
  if (ldJsonEl) ldJsonEl.remove();
}
