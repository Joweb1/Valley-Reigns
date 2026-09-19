# Search Infrastructure Upgrade Guide (Algolia / Meilisearch)

## 1. Overview & Current Architecture
Currently, the Valley Reigns platform executes job searches and applicant filtering via **Firestore structured queries** (`where`, `orderBy`, `limit`) combined with optimized client-side substring matching in memory.

### Limitations at 10,000+ Documents
1. **No Full-Text Fuzzy Matching**: Firestore native queries only support exact prefix matches (`>= "eng" && <= "eng\uf8ff"`). They cannot search within middle tokens (e.g., finding "Senior **React** Developer" when typing "react").
2. **Compound Index Constraints**: Multi-facet filtering (e.g., `location == "Fresno"` + `salaryMin >= 50000` + `skills array-contains "TypeScript"`) requires generating manual compound indexes for every permutation in Firestore.
3. **Typo Tolerance & Phonetic Matching**: Firestore cannot tolerate typos (e.g. "Weldr" instead of "Welder").

---

## 2. Recommended Solution: Algolia or Meilisearch

| Feature | Algolia | Meilisearch |
| :--- | :--- | :--- |
| **Hosting** | Fully Managed Cloud (SaaS) | Self-hosted (Cloud Run / Docker) or Meilisearch Cloud |
| **Firestore Integration** | Official Firebase Extension (`firestore-algolia-search`) | Cloud Functions `onDocumentWritten` trigger |
| **Typo Tolerance** | Industry-standard, multi-language | Excellent typo tolerance |
| **Latency** | <15ms globally distributed CDN | <20ms on dedicated container |
| **Cost at 10k Items** | Free tier covers 10k search requests/mo | Free open-source engine on existing Cloud Run |

---

## 3. Implementation Steps (When Upgrading)

### Phase 1: Algolia Index Setup
1. Create an Algolia account and configure two indexes:
   - `jobs_index`
   - `candidates_index`
2. Configure **Searchable Attributes**:
   ```json
   {
     "searchableAttributes": [
       "title",
       "company",
       "location",
       "category",
       "description",
       "requirements",
       "skills"
     ],
     "attributesForFaceting": [
       "filterOnly(status)",
       "searchable(location)",
       "searchable(category)",
       "salaryMin",
       "salaryMax"
     ]
   }
   ```

### Phase 2: Real-Time Firestore Sync
Install the official Firebase Extension:
```bash
firebase ext:install algolia/firestore-algolia-search --project YOUR_FIREBASE_PROJECT_ID
```
Configure parameters:
- **Collection Path**: `jobs`
- **Fields to Index**: `id,title,company,location,category,description,salaryMin,salaryMax,status,createdAt,impressions`
- **Algolia App ID**: `ALGOLIA_APP_ID`
- **Algolia Admin API Key**: `ALGOLIA_API_KEY` (Stored securely in Google Cloud Secret Manager)

### Phase 3: Frontend Search Client Integration
Install the Algolia lite client:
```bash
npm install algoliasearch
```
Sample implementation hook for `JobManagement.tsx` or `JobSeekerDashboard.tsx`:
```typescript
import algoliasearch from "algoliasearch/lite";

const searchClient = algoliasearch(
  process.env.VITE_ALGOLIA_APP_ID!,
  process.env.VITE_ALGOLIA_SEARCH_KEY!
);

const index = searchClient.initIndex("jobs_index");

export async function searchJobsCatalog(queryText: string, filters?: string) {
  const result = await index.search(queryText, {
    filters: filters || "status:active",
    hitsPerPage: 20
  });
  return result.hits;
}
```

---

## 4. Migration Checklist
- [ ] Create Algolia Application in Algolia Console
- [ ] Secure Algolia Admin API key in backend `.env`
- [ ] Deploy Firebase Algolia Extension or Cloud Function sync trigger
- [ ] Backfill existing Firestore jobs into Algolia index
- [ ] Swap client-side `.filter()` in `JobSeekerDashboard.tsx` with `searchJobsCatalog`
