import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface JobCategory {
  name: string;
  label: string;
  imageUrl: string;
  color: string;
}

export const DEFAULT_CATEGORIES: JobCategory[] = [
  {
    name: "Information Technology (IT) & Software Development",
    label: "IT & Software Development",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Information%20Technology%20%28IT%29%20%26%20Software%20Development.png",
    color: "#2563EB"
  },
  {
    name: "Accounting & Finance",
    label: "Accounting & Finance",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Accounting%20%26%20Finance.jpeg",
    color: "#059669"
  },
  {
    name: "Human Resources (HR)",
    label: "Human Resources (HR)",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Human%20Resources%20%28HR%29.jpeg",
    color: "#DB2777"
  },
  {
    name: "Marketing & Advertising",
    label: "Marketing & Advertising",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Marketing%20%26%20Advertising.jpeg",
    color: "#7C3AED"
  },
  {
    name: "Sales",
    label: "Sales",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Sales.jpeg",
    color: "#D97706"
  },
  {
    name: "Customer Service",
    label: "Customer Service",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Customer%20Service.jpeg",
    color: "#0284C7"
  },
  {
    name: "Procurement & Supply Chain",
    label: "Procurement & Supply Chain",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Procurement%20%26%20Supply%20Chain.jpeg",
    color: "#854D0E"
  },
  {
    name: "Administration & Office Support",
    label: "Admin & Office Support",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Administration%20%26%20Office%20Support.jpeg",
    color: "#475569"
  },
  {
    name: "Healthcare & Medical",
    label: "Healthcare & Medical",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Healthcare%20%26%20Medical.jpeg",
    color: "#E11D48"
  },
  {
    name: "Engineering",
    label: "Engineering",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Engineering.jpeg",
    color: "#EA580C"
  },
  {
    name: "Nursing",
    label: "Nursing",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Nursing.jpeg",
    color: "#F43F5E"
  },
  {
    name: "Logistics & Transportation",
    label: "Logistics & Transport",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Logistics%20%26%20Transportation.jpeg",
    color: "#0F766E"
  },
  {
    name: "Manufacturing & Production",
    label: "Manufacturing",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Manufacturing%20%26%20Production.jpeg",
    color: "#334155"
  },
  {
    name: "Construction & Building",
    label: "Construction & Building",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Construction%20%26%20Building.jpeg",
    color: "#9A3412"
  },
  {
    name: "Real Estate",
    label: "Real Estate",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Real%20Estate.jpeg",
    color: "#4338CA"
  },
  {
    name: "Agriculture & Agribusiness",
    label: "Agri-Business",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Agriculture%20%26%20Agribusiness.jpeg",
    color: "#15803D"
  },
  {
    name: "Construction",
    label: "Construction",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Construction.jpeg",
    color: "#B45309"
  },
  {
    name: "Legal Services",
    label: "Legal Services",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Legal%20Services.jpeg",
    color: "#1E293B"
  },
  {
    name: "Farming",
    label: "Farming",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Farming.jpg",
    color: "#16A34A"
  },
  {
    name: "Pharmacy",
    label: "Pharmacy",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Pharmacy.jpg",
    color: "#0891B2"
  },
  {
    name: "Education & Teaching",
    label: "Education & Teaching",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Education%20%26%20Teaching.jpg",
    color: "#CA8A04"
  },
  {
    name: "Retail & Wholesale",
    label: "Retail & Wholesale",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Retail%20%26%20Wholesale.jpg",
    color: "#BE185D"
  },
  {
    name: "Consulting",
    label: "Consulting",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Consulting.jpg",
    color: "#4F46E5"
  },
  {
    name: "Internship & Graduate Trainee Programs",
    label: "Internship & Trainee",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Internship%20%26%20Graduate%20Trainee%20Programs.jpg",
    color: "#4F46E5"
  },
  {
    name: "Aviation",
    label: "Aviation & Aerospace",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Aviation.jpg",
    color: "#0284C7"
  },
  {
    name: "Mining & Natural Resources",
    label: "Mining & Resources",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Mining%20%26%20Natural%20Resources.jpg",
    color: "#78350F"
  },
  {
    name: "Research & Development",
    label: "Research & Dev",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Research%20%26%20Development.jpg",
    color: "#0D9488"
  },
  {
    name: "Maritime & Shipping",
    label: "Maritime & Shipping",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Maritime%20%26%20Shipping.jpg",
    color: "#1E3A8A"
  },
  {
    name: "Quality Assurance & Quality Control",
    label: "QA & Quality Control",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Quality%20Assurance%20%26%20Quality%20Control.jpg",
    color: "#4F46E5"
  },
  {
    name: "Remote & Freelance Jobs",
    label: "Remote & Freelance",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Remote%20%26%20Freelance%20Jobs.jpg",
    color: "#0891B2"
  },
  {
    name: "Tourism",
    label: "Tourism & Travel",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Tourism.jpg",
    color: "#0369A1"
  },
  {
    name: "Photography & Videography",
    label: "Photography & Video",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Photography%20%26%20Videography.jpg",
    color: "#2563EB"
  },
  {
    name: "Event Management",
    label: "Event Management",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Event%20Management.jpg",
    color: "#701A75"
  },
  {
    name: "Fashion & Beauty",
    label: "Fashion & Beauty",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Fashion%20%26%20Beauty.jpg",
    color: "#BE185D"
  },
  {
    name: "Welding",
    label: "Welding Trades",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Welding.jpg",
    color: "#B45309"
  },
  {
    name: "Automotive",
    label: "Automotive",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Automotive.jpg",
    color: "#475569"
  },
  {
    name: "Project Management",
    label: "Project Management",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Project%20Management.jpg",
    color: "#059669"
  },
  {
    name: "Data Science & Analytics",
    label: "Data Science & Analytics",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Data%20Science%20%26%20Analytics.jpg",
    color: "#0891B2"
  },
  {
    name: "Cybersecurity",
    label: "Cybersecurity",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Cybersecurity.jpg",
    color: "#0F172A"
  },
  {
    name: "Design & Creative Arts",
    label: "Design & Creative Arts",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Design%20%26%20Creative%20Arts.jpg",
    color: "#EC4899"
  },
  {
    name: "Media & Communications",
    label: "Media & Comms",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Media%20%26%20Communications.jpg",
    color: "#A21CAF"
  },
  {
    name: "Journalism & Publishing",
    label: "Journalism & Publishing",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Journalism%20%26%20Publishing.jpg",
    color: "#374151"
  },
  {
    name: "Security Services",
    label: "Security Services",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Security%20Services.jpg",
    color: "#1E293B"
  },
  {
    name: "Government & Public Administration",
    label: "Govt & Public Admin",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Government%20%26%20Public%20Administration.jpg",
    color: "#1E3A8A"
  },
  {
    name: "Cleaning & Facility Management",
    label: "Cleaning & Facilities",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Cleaning%20%26%20Facility%20Management.jpg",
    color: "#06B6D4"
  },
  {
    name: "Non-Governmental Organizations (NGOs)",
    label: "NGOs & Non-Profits",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Non-Governmental%20Organizations%20%28NGOs%29.jpg",
    color: "#16A34A"
  },
  {
    name: "Oil & Gas",
    label: "Oil & Gas",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/5b45d417-8e77-4d62-a46f-1c3d262f1b5e~6.jpg",
    color: "#0F172A"
  },
  {
    name: "Telecommunications",
    label: "Telecommunications",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Telecommunications.jpg",
    color: "#2563EB"
  },
  {
    name: "Food Services & Catering",
    label: "Food & Catering",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Food%20Services%20%26%20Catering.jpg",
    color: "#EA580C"
  },
  {
    name: "Retail",
    label: "Retail & Shop",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Retail.jpg",
    color: "#BE185D"
  },
  {
    name: "Energy and Power",
    label: "Energy & Power",
    imageUrl: "https://raw.githubusercontent.com/Joweb1/Jovibe-images/refs/heads/main/Energy%20and%20Power.jpg",
    color: "#65A30D"
  }
];

// Fallback image map for dynamically entered text in old code or custom
const CATEGORY_IMAGE_MAP: Record<string, string> = {
  "Tech": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&auto=format&fit=crop&q=60",
  "Healthcare": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=300&auto=format&fit=crop&q=60",
  "Finance": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&auto=format&fit=crop&q=60",
  "AI & Analytics": "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=300&auto=format&fit=crop&q=60"
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  "Tech": "#1E88E5",
  "Healthcare": "#E11D48",
  "Finance": "#059669",
  "AI & Analytics": "#7E22CE"
};

// In-memory cache for custom categories fetched from Firestore
let customCategoriesCache: JobCategory[] = [];
let listeners: (() => void)[] = [];

// Subscribe to categories (both default & custom ones loaded from Firebase Firestore)
export function subscribeToCategories(callback: (categories: JobCategory[]) => void) {
  try {
    const collRef = collection(db, "categories");
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      const fetched: JobCategory[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name && data.label) {
          fetched.push({
            name: data.name,
            label: data.label,
            imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300&auto=format&fit=crop&q=60",
            color: data.color || "#475569"
          });
        }
      });
      
      customCategoriesCache = fetched;
      const combined = [...DEFAULT_CATEGORIES, ...fetched];
      callback(combined);
      notifyListeners();
    }, (error) => {
      console.warn("Firestore categories collection listener failed, using defaults:", error);
      callback([...DEFAULT_CATEGORIES, ...customCategoriesCache]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.warn("Firestore categories subscription failed, using default list:", error);
    callback([...DEFAULT_CATEGORIES]);
    return () => {};
  }
}

function notifyListeners() {
  listeners.forEach(l => l());
}

export function registerCategoriesListener(onChanged: () => void) {
  listeners.push(onChanged);
  return () => {
    listeners = listeners.filter(l => l !== onChanged);
  };
}

// Add a brand-new custom category to Firestore
export async function addCustomCategory(label: string, imageUrl: string, color: string = "#475569"): Promise<void> {
  const sanitizedName = label.trim();
  if (!sanitizedName) return;
  
  try {
    const catRef = doc(db, "categories", sanitizedName);
    await setDoc(catRef, {
      name: sanitizedName,
      label: sanitizedName,
      imageUrl: imageUrl.trim() || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300&auto=format&fit=crop&q=60",
      color: color || "#475569",
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("Error adding custom category to Firestore:", error);
    // Fallback to local memory cache for this session if Firestore fails
    const exists = customCategoriesCache.some(c => c.name === sanitizedName);
    if (!exists) {
      customCategoriesCache.push({
        name: sanitizedName,
        label: sanitizedName,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300&auto=format&fit=crop&q=60",
        color: color || "#475569"
      });
      notifyListeners();
    }
  }
}

// Helper to resolve an image for ANY category string
export function getCategoryImage(categoryName: string): string {
  // 1. Try default 50
  const def = DEFAULT_CATEGORIES.find(c => c.name.toLowerCase() === categoryName.toLowerCase() || c.label.toLowerCase() === categoryName.toLowerCase());
  if (def) return def.imageUrl;
  
  // 2. Try in-memory cached custom categories
  const cust = customCategoriesCache.find(c => c.name.toLowerCase() === categoryName.toLowerCase() || c.label.toLowerCase() === categoryName.toLowerCase());
  if (cust) return cust.imageUrl;
  
  // 3. Try legacy mapped ones
  if (CATEGORY_IMAGE_MAP[categoryName]) {
    return CATEGORY_IMAGE_MAP[categoryName];
  }
  
  // 4. Fallback generic image (working desk)
  return "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300&auto=format&fit=crop&q=60";
}

// Helper to resolve a color for ANY category string
export function getCategoryThemeColor(categoryName: string): string {
  // 1. Try default 50
  const def = DEFAULT_CATEGORIES.find(c => c.name.toLowerCase() === categoryName.toLowerCase() || c.label.toLowerCase() === categoryName.toLowerCase());
  if (def) return def.color;
  
  // 2. Try in-memory cached custom categories
  const cust = customCategoriesCache.find(c => c.name.toLowerCase() === categoryName.toLowerCase() || c.label.toLowerCase() === categoryName.toLowerCase());
  if (cust) return cust.color;
  
  // 3. Try legacy mapped ones
  if (CATEGORY_COLOR_MAP[categoryName]) {
    return CATEGORY_COLOR_MAP[categoryName];
  }
  
  // 4. Default accent color
  return "#1E88E5";
}
