import { Job } from "../types";

export const SEEDED_JOBS_LIST: Job[] = [
  {
    id: "job-seed-001",
    title: "Senior Full-Stack Engineer",
    company: "TechVibe Solutions",
    category: "Information Technology (IT) & Software Development",
    salary: "$130,000 - $160,000",
    location: "Remote",
    type: "Full-time",
    requirements: [
      "5+ years of professional software development experience.",
      "Expert proficiency with React, TypeScript, Node.js, and Tailwind CSS.",
      "Hands-on experience with cloud infrastructure (AWS/GCP) and CI/CD pipelines.",
      "Proven ability to mentor junior engineers and participate in code reviews."
    ],
    description: "Join our core engineering team to build scalable, high-performance web applications. You will be responsible for defining architecture, implementing complex interactive features, and optimizing platform performance.",
    impressions: 48,
    createdAt: Date.now() - 3600000 * 2
  },
  {
    id: "job-seed-002",
    title: "Senior Financial Controller",
    company: "Ledger & Associates",
    category: "Accounting & Finance",
    salary: "$110,000 - $140,000",
    location: "Chicago, IL",
    type: "Full-time",
    requirements: [
      "Active CPA certification and Master's in Finance or Accounting.",
      "7+ years of accounting management experience in a medium to large enterprise.",
      "Deep understanding of US GAAP, financial modeling, and corporate tax compliance.",
      "Advanced proficiency in Excel, SAP, and automated reporting systems."
    ],
    description: "We are seeking an experienced Financial Controller to oversee all corporate accounting, budgeting, and financial reporting functions. You will collaborate with executive leadership to drive fiscal strategy.",
    impressions: 27,
    createdAt: Date.now() - 3600000 * 5
  },
  {
    id: "job-seed-003",
    title: "Senior HR Business Partner",
    company: "TalentFlow Inc.",
    category: "Human Resources (HR)",
    salary: "$95,000 - $120,000",
    location: "Austin, TX (Hybrid)",
    type: "Full-time",
    requirements: [
      "SHRM-CP or PHR certification required.",
      "5+ years of experience in employee relations, organizational design, and talent strategy.",
      "Strong knowledge of state and federal labor laws and regulatory compliance.",
      "Outstanding communication and conflict resolution skills."
    ],
    description: "Manage employee engagement, policy development, and talent development pipelines across multiple business units. Act as a strategic partner to managers, facilitating healthy and productive team growth.",
    impressions: 19,
    createdAt: Date.now() - 3600000 * 8
  },
  {
    id: "job-seed-004",
    title: "Senior Digital Marketing Manager",
    company: "BuzzMedia",
    category: "Marketing & Advertising",
    salary: "$105,000 - $130,000",
    location: "New York, NY",
    type: "Full-time",
    requirements: [
      "Proven track record managing successful multi-channel PPC and organic marketing campaigns.",
      "Expert knowledge of Google Ads, Meta Ads Manager, and SEO optimization tools.",
      "Strong analytical mindset with proficiency in Google Analytics 4 and Tableau.",
      "Excellent copywriting, presentation, and team coordination skills."
    ],
    description: "Drive digital growth and brand recognition for our premier consumer clients. You will build, run, and optimize targeted campaigns to maximize return on advertising spend (ROAS) and direct creative assets.",
    impressions: 62,
    createdAt: Date.now() - 3600000 * 11
  },
  {
    id: "job-seed-005",
    title: "Enterprise Account Executive",
    company: "SalesForce Pro LLC",
    category: "Sales",
    salary: "$90,000 base + OTE uncapped",
    location: "Remote (US)",
    type: "Full-time",
    requirements: [
      "4+ years of B2B SaaS enterprise sales experience.",
      "Consistent record of exceeding sales quotas and managing complex pipelines.",
      "Exceptional negotiation, demonstration, and relationship-building skills.",
      "Proficiency with Salesforce CRM and modern sales engagement tools."
    ],
    description: "We are expanding our enterprise sales division. You will identify high-value prospects, deliver impactful product demonstrations, and negotiate long-term software licensing agreements.",
    impressions: 34,
    createdAt: Date.now() - 3600000 * 14
  },
  {
    id: "job-seed-006",
    title: "Customer Support Supervisor",
    company: "SupportHub",
    category: "Customer Service",
    salary: "$65,000 - $80,000",
    location: "Atlanta, GA",
    type: "Full-time",
    requirements: [
      "3+ years supervising a customer support team in an online or retail environment.",
      "Deep familiarity with Zendesk, Intercom, or similar ticketing platforms.",
      "Expertise in establishing and reporting support KPIs (CSAT, SLA, FRT).",
      "Calm, empathetic, and professional communication style."
    ],
    description: "Supervise our high-performing tier-2 customer support team. You will handle escalations, monitor performance metrics, coordinate shifts, and design training protocols to maintain industry-leading service levels.",
    impressions: 41,
    createdAt: Date.now() - 3600000 * 17
  },
  {
    id: "job-seed-007",
    title: "Global Supply Chain Specialist",
    company: "GlobalLogix",
    category: "Procurement & Supply Chain",
    salary: "$85,000 - $105,000",
    location: "Houston, TX",
    type: "Full-time",
    requirements: [
      "Bachelor's degree in Supply Chain Management, Logistics, or related fields.",
      "4+ years coordinating international procurement, shipping, and customs processes.",
      "Strong contract negotiation skills and experience with vendor relationship management.",
      "Advanced analytical skills and ERP (Oracle/SAP) proficiency."
    ],
    description: "Oversee end-to-end global supply chain operations, ensuring cost-efficient and timely procurement of raw materials. You will minimize shipping delays, handle customs paperwork, and conduct vendor evaluations.",
    impressions: 15,
    createdAt: Date.now() - 3600000 * 20
  },
  {
    id: "job-seed-008",
    title: "Executive Administrative Assistant",
    company: "CorpAdvisors LLC",
    category: "Administration & Office Support",
    salary: "$70,000 - $85,000",
    location: "Boston, MA",
    type: "Full-time",
    requirements: [
      "5+ years supporting C-level executive leaders.",
      "Mastery of calendar systems, travel coordination, and document formatting.",
      "Discretion and absolute confidentiality regarding sensitive corporate information.",
      "Outstanding verbal and written communication skills."
    ],
    description: "Provide comprehensive administrative and operational support to our CEO and CFO. You will manage busy calendars, coordinate international board meetings, draft executive briefs, and organize office events.",
    impressions: 22,
    createdAt: Date.now() - 3600000 * 23
  },
  {
    id: "job-seed-009",
    title: "Medical Practice Manager",
    company: "CareFirst Clinic",
    category: "Healthcare & Medical",
    salary: "$90,000 - $115,000",
    location: "Miami, FL",
    type: "Full-time",
    requirements: [
      "Bachelor's degree in Healthcare Administration or Business equivalent.",
      "5+ years running medical clinic operations, medical billing, and compliance.",
      "Familiarity with HIPAA guidelines and Electronic Health Record (EHR) platforms.",
      "Excellent interpersonal and budget coordination skills."
    ],
    description: "Coordinate clinical operations, staffing, and administrative compliance for our fast-growing multi-specialty medical clinic. You will maintain patient records, manage payroll, and optimize clinic scheduling.",
    impressions: 31,
    createdAt: Date.now() - 3600000 * 26
  },
  {
    id: "job-seed-010",
    title: "Structural Design Engineer",
    company: "Apex Engineering",
    category: "Engineering",
    salary: "$100,000 - $125,000",
    location: "Denver, CO",
    type: "Full-time",
    requirements: [
      "Professional Engineer (PE) License required.",
      "4+ years of structural design experience using AutoCAD, Revit, and RISA-3D.",
      "In-depth knowledge of building codes, steel, concrete, and timber design standards.",
      "Strong analytical skills with an emphasis on accuracy and structural safety."
    ],
    description: "Prepare detailed structural calculations, construction drawings, and design plans for high-profile commercial and residential building developments. Collaborate with architects and construction teams.",
    impressions: 28,
    createdAt: Date.now() - 3600000 * 29
  },
  {
    id: "job-seed-011",
    title: "Registered Nurse (ICU)",
    company: "Mercy General Hospital",
    category: "Nursing",
    salary: "$85,000 - $110,000",
    location: "Phoenix, AZ",
    type: "Full-time",
    requirements: [
      "Active RN License in the state of Arizona with BSN preferred.",
      "2+ years of critical care or intensive care unit (ICU) nursing experience.",
      "Active BLS and ACLS certifications.",
      "Outstanding patient advocacy, critical thinking, and communication skills."
    ],
    description: "Provide highly specialized, compassionate care to critically ill patients in our state-of-the-art Intensive Care Unit. Monitor patient vitals, administer medications, and collaborate with physicians.",
    impressions: 50,
    createdAt: Date.now() - 3600000 * 32
  },
  {
    id: "job-seed-012",
    title: "Logistics Specialist",
    company: "CargoSpeed Logistics",
    category: "Logistics & Transportation",
    salary: "$75,000 - $90,000",
    location: "Los Angeles, CA",
    type: "Full-time",
    requirements: [
      "3+ years managing freight scheduling, route optimization, and carrier relations.",
      "Familiarity with DOT regulations and safety standards.",
      "Proficiency with modern Transportation Management Systems (TMS).",
      "Strong problem-solving skills under high-pressure conditions."
    ],
    description: "Design and implement efficient freight routing networks to optimize transit times and minimize logistics costs. Coordinate with third-party carriers, negotiate contracts, and track shipments in real-time.",
    impressions: 18,
    createdAt: Date.now() - 3600000 * 35
  },
  {
    id: "job-seed-013",
    title: "Production Operations Manager",
    company: "HeavyInd Manufacturing",
    category: "Manufacturing & Production",
    salary: "$115,000 - $140,000",
    location: "Cleveland, OH",
    type: "Full-time",
    requirements: [
      "Bachelor's in Industrial Engineering, Business, or equivalent technical degree.",
      "6+ years overseeing assembly lines, factory floor staffing, and safety compliance.",
      "Proven mastery of Lean Manufacturing and Six Sigma methodologies.",
      "Excellent leadership, conflict-management, and cost-control skills."
    ],
    description: "Manage daily manufacturing operations at our state-of-the-art production plant. You will maximize throughput, reduce material waste, enforce rigorous safety policies, and direct shop floor supervisors.",
    impressions: 24,
    createdAt: Date.now() - 3600000 * 38
  },
  {
    id: "job-seed-014",
    title: "Commercial Construction PM",
    company: "BuildCon Group",
    category: "Construction & Building",
    salary: "$120,000 - $145,000",
    location: "Seattle, WA",
    type: "Full-time",
    requirements: [
      "6+ years managing large-scale commercial building projects.",
      "Advanced proficiency in Procore, MS Project, and reading blueprints.",
      "Strong track record managing subcontractors, local permits, and budgets.",
      "OSHA-30 certification required."
    ],
    description: "Lead the construction of modern commercial properties from ground-break to final occupancy certificate. You will maintain build timelines, manage on-site superintendents, and ensure safety compliance.",
    impressions: 16,
    createdAt: Date.now() - 3600000 * 41
  },
  {
    id: "job-seed-015",
    title: "Commercial Real Estate Agent",
    company: "Skyline Properties",
    category: "Real Estate",
    salary: "$120,000+ commission-based",
    location: "San Francisco, CA",
    type: "Full-time",
    requirements: [
      "Active Real Estate License in California.",
      "3+ years representing commercial landlords, tenants, or buyers.",
      "Expert knowledge of lease negotiation, property evaluation, and marketing.",
      "Strong self-motivation and persistent network building."
    ],
    description: "Represent corporate clients in leasing, buying, and selling premium commercial, office, and retail real estate. Analyze market trends, conduct property tours, and negotiate high-value lease contracts.",
    impressions: 33,
    createdAt: Date.now() - 3600000 * 44
  },
  {
    id: "job-seed-016",
    title: "Agricultural Business Analyst",
    company: "Agritech Solutions",
    category: "Agriculture & Agribusiness",
    salary: "$80,000 - $100,000",
    location: "Des Moines, IA",
    type: "Full-time",
    requirements: [
      "Degree in Agricultural Economics, Agribusiness, or related field.",
      "3+ years analysis experience within the agriculture or farming supply chains.",
      "Proficiency with GIS software, data analysis models, and Excel modeling.",
      "Deep understanding of commodities markets and crop forecasting."
    ],
    description: "Conduct market research and evaluate financial viability for our high-impact sustainable agriculture and crop protection initiatives. Support farmers and agricultural suppliers with investment decisions.",
    impressions: 12,
    createdAt: Date.now() - 3600000 * 47
  },
  {
    id: "job-seed-017",
    title: "Civil Construction Foreman",
    company: "PrimeBuild Infrastructure",
    category: "Construction",
    salary: "$80,000 - $95,000",
    location: "Salt Lake City, UT",
    type: "Full-time",
    requirements: [
      "5+ years leading crews on concrete, asphalt, or road building projects.",
      "Proven ability to read plan profiles, run grading instruments, and manage heavy machinery.",
      "Strict enforcement of OSHA guidelines and on-site tool box safety talks.",
      "Clean driving record and commercial driver's license (CDL) preferred."
    ],
    description: "Oversee daily field activities of concrete pouring, excavation, and road construction crews. Coordinate materials delivery, schedule shift labor, and interface with structural engineers on site.",
    impressions: 21,
    createdAt: Date.now() - 3600000 * 50
  },
  {
    id: "job-seed-018",
    title: "Corporate Legal Counsel",
    company: "LexJurist Group",
    category: "Legal Services",
    salary: "$140,000 - $175,000",
    location: "Washington, DC (Hybrid)",
    type: "Full-time",
    requirements: [
      "Juris Doctor (JD) degree from an accredited law school.",
      "Active bar membership in good standing.",
      "4+ years drafting and negotiating complex commercial software and vendor contracts.",
      "Expert understanding of corporate governance and privacy regulations (GDPR/CCPA)."
    ],
    description: "Provide proactive legal counsel on a wide array of business matters including commercial contracting, corporate compliance, risk mitigation, intellectual property, and employment relationships.",
    impressions: 39,
    createdAt: Date.now() - 3600000 * 53
  },
  {
    id: "job-seed-019",
    title: "Farm Operations Manager",
    company: "GreenMeadows Farms",
    category: "Farming",
    salary: "$70,000 - $85,000",
    location: "Sacramento Valley, CA",
    type: "Full-time",
    requirements: [
      "5+ years running commercial organic vegetable or crop farming operations.",
      "Expert knowledge of irrigation systems, organic fertilizers, and pest management.",
      "Experience operating, servicing, and maintaining heavy agricultural machinery.",
      "Strong leadership and seasonal labor force coordination."
    ],
    description: "Direct all day-to-day operations for our 500-acre organic produce farm. You will manage planting, irrigation, fertilizing, harvesting, packaging, and shipping to distribution hubs.",
    impressions: 14,
    createdAt: Date.now() - 3600000 * 56
  },
  {
    id: "job-seed-020",
    title: "Clinical Pharmacist",
    company: "Pharmax Health",
    category: "Pharmacy",
    salary: "$115,000 - $135,000",
    location: "Detroit, MI",
    type: "Full-time",
    requirements: [
      "Doctor of Pharmacy (PharmD) degree required.",
      "Active Pharmacist License in the state of Michigan.",
      "Board Certification in Pharmacotherapy preferred.",
      "Strong consultation skills and deep pharmaceutical knowledge."
    ],
    description: "Review patient profiles, verify drug compatibility, and provide consultation on complex therapies for healthcare staff and patients. Maintain accurate controlled substances logs.",
    impressions: 43,
    createdAt: Date.now() - 3600000 * 59
  },
  {
    id: "job-seed-021",
    title: "Mathematics Educator",
    company: "HighSchool Prep Academy",
    category: "Education & Teaching",
    salary: "$55,000 - $70,000",
    location: "Philadelphia, PA",
    type: "Full-time",
    requirements: [
      "Bachelor's in Mathematics or Secondary Education.",
      "Active State Teaching Certification in Pennsylvania.",
      "Experience teaching Algebra, Geometry, and Advanced Calculus.",
      "Strong parent-teacher communications and classroom management."
    ],
    description: "Develop curriculum and deliver engaging lesson plans for middle and high school students. Foster analytical thinking and prepare students for SAT/AP math examinations.",
    impressions: 26,
    createdAt: Date.now() - 3600000 * 62
  },
  {
    id: "job-seed-022",
    title: "Retail Store Manager",
    company: "Boutique Goods",
    category: "Retail & Wholesale",
    salary: "$60,000 - $75,000",
    location: "Portland, OR",
    type: "Full-time",
    requirements: [
      "4+ years managing retail store operations, inventory, and point-of-sale systems.",
      "Proven ability to recruit, train, and schedule retail sales staff.",
      "In-depth knowledge of visual merchandising and local promotions.",
      "Excellent sales leadership and customer relationship management."
    ],
    description: "Oversee daily store operations, drive product sales, maintain inventory accuracy, coordinate visual floor displays, and deliver exceptional shopping experiences to our boutique clientele.",
    impressions: 37,
    createdAt: Date.now() - 3600000 * 65
  },
  {
    id: "job-seed-023",
    title: "Senior Management Consultant",
    company: "StrategyPartners",
    category: "Consulting",
    salary: "$120,000 - $150,000",
    location: "Boston, MA (Hybrid)",
    type: "Full-time",
    requirements: [
      "MBA from a top-tier business school.",
      "4+ years of strategic management consulting experience.",
      "Expertise in cost reduction, organizational restructuring, and digital migration.",
      "Outstanding presentation and corporate client management skills."
    ],
    description: "Lead critical restructuring and operational transformation engagements for high-profile clients. Conduct organizational reviews, construct economic models, and deliver executive board presentations.",
    impressions: 30,
    createdAt: Date.now() - 3600000 * 68
  },
  {
    id: "job-seed-024",
    title: "Graduate Trainee (Business Operations)",
    company: "Fortune500 Corp",
    category: "Internship & Graduate Trainee Programs",
    salary: "$50,000 - $65,000",
    location: "Minneapolis, MN",
    type: "Internship",
    requirements: [
      "Recent graduate with a Bachelor's degree in Business, Finance, or Management.",
      "Strong academic record with active campus leadership experience.",
      "Proficiency with analytical tools and business presentation software.",
      "Eagerness to learn and rotate across diverse operational departments."
    ],
    description: "Our rotational graduate trainee program prepares future leaders. You will rotate across corporate finance, product management, supply chain, and retail client operations.",
    impressions: 72,
    createdAt: Date.now() - 3600000 * 71
  },
  {
    id: "job-seed-025",
    title: "Aircraft Maintenance Engineer",
    company: "SkyWings Aviation",
    category: "Aviation",
    salary: "$85,000 - $105,000",
    location: "Charlotte, NC",
    type: "Full-time",
    requirements: [
      "FAA Airframe and Powerplant (A&P) Certificate required.",
      "3+ years performing mechanical maintenance on regional commercial jets.",
      "Familiarity with aviation safety guidelines and FAA logging compliance.",
      "Strong manual dexterity and analytical trouble-shooting."
    ],
    description: "Conduct scheduled airframe inspections, structural repairs, and electrical checks to keep our fleet fully compliant with strict FAA guidelines. Keep highly detailed log entries.",
    impressions: 13,
    createdAt: Date.now() - 3600000 * 74
  },
  {
    id: "job-seed-026",
    title: "Resource Extraction Geologist",
    company: "TerraMining Group",
    category: "Mining & Natural Resources",
    salary: "$95,000 - $120,000",
    location: "Elko, NV",
    type: "Full-time",
    requirements: [
      "Degree in Geology, Earth Sciences, or Geotechnical Engineering.",
      "3+ years on-site ore modeling, mineral mapping, and core drill logging.",
      "Proficiency with Leapfrog Geo, Vulcan, or geological modeling software.",
      "Commitment to modern environmental protection and safety standards."
    ],
    description: "Analyze core drill samples, map subterranean mineral distributions, and evaluate geological hazards at our precious metals mining operations to optimize safe extraction layouts.",
    impressions: 9,
    createdAt: Date.now() - 3600000 * 77
  },
  {
    id: "job-seed-027",
    title: "R&D Lead Scientist",
    company: "BioLabs Research",
    category: "Research & Development",
    salary: "$110,000 - $135,000",
    location: "San Diego, CA",
    type: "Full-time",
    requirements: [
      "Ph.D. in Biochemistry, Molecular Biology, or Biotechnology.",
      "3+ years post-doc or industrial research experience leading molecular assays.",
      "Expertise with CRISPR gene editing, assay design, and protein purification.",
      "Excellent research logging, grant writing, and presentation skills."
    ],
    description: "Direct our primary molecular diagnostic research team. Design novel essays, model cellular interactions, secure research grants, and publish findings in respected medical journals.",
    impressions: 46,
    createdAt: Date.now() - 3600000 * 80
  },
  {
    id: "job-seed-028",
    title: "Marine Superintendent",
    company: "OceanBlue Shipping",
    category: "Maritime & Shipping",
    salary: "$115,000 - $140,000",
    location: "Seattle, WA",
    type: "Full-time",
    requirements: [
      "Merchant Mariner Credential with experience as Chief Officer or Captain.",
      "5+ years shore-based marine superintendency managing commercial fleets.",
      "Strong understanding of SOLAS, MARPOL, and global shipping regulations.",
      "Excellent budget management and dry-dock logistics coordination."
    ],
    description: "Oversee dry-dock repairs, vessel crew transitions, cargo holds safety compliance, and navigation configurations for our trans-Pacific cargo ships. Maintain budgets and reduce turnaround delays.",
    impressions: 11,
    createdAt: Date.now() - 3600000 * 83
  },
  {
    id: "job-seed-029",
    title: "Senior QA Lead",
    company: "SecureCode Software",
    category: "Quality Assurance & Quality Control",
    salary: "$100,000 - $125,000",
    location: "Remote (US)",
    type: "Full-time",
    requirements: [
      "5+ years writing automated software testing frameworks (Cypress, Playwright).",
      "Expertise with JavaScript, Python, and CI/CD GitHub workflows.",
      "Familiarity with load testing (k6, JMeter) and API mocking.",
      "Proven leadership overseeing a remote QA team."
    ],
    description: "Design automated web application testing frameworks. Author detailed testing scripts, coordinate regression runs, review logs, and audit deployment security pipelines to ensure zero-defect software launches.",
    impressions: 29,
    createdAt: Date.now() - 3600000 * 86
  },
  {
    id: "job-seed-030",
    title: "Remote Content Strategist",
    company: "VirtualPen Agency",
    category: "Remote & Freelance Jobs",
    salary: "$60,000 - $80,000",
    location: "Remote",
    type: "Full-time",
    requirements: [
      "3+ years producing SEO blogs, white papers, and digital marketing copy.",
      "Experience setting content calendars and managing freelance writer pools.",
      "Excellent editorial skills and keyword optimization strategies.",
      "High level of self-organization and remote project coordination."
    ],
    description: "Manage content creation strategies for a roster of technology and healthcare accounts. Conduct content gaps audits, draft compelling blog briefs, and edit SEO posts for release.",
    impressions: 55,
    createdAt: Date.now() - 3600000 * 89
  },
  {
    id: "job-seed-031",
    title: "Destination Travel Manager",
    company: "Wanderlust Tours",
    category: "Tourism",
    salary: "$55,000 - $70,000",
    location: "Las Vegas, NV",
    type: "Full-time",
    requirements: [
      "4+ years coordinating group travel, tour planning, or event hospitality.",
      "Expert knowledge of local Vegas hotel blocks, show booking, and dining networks.",
      "Outstanding client service, conflict management, and public speaking skills.",
      "First aid and emergency coordination certification preferred."
    ],
    description: "Manage travel itinerary operations, tour guides, and transport logistics for our premium leisure group packages. Secure optimal corporate rates and resolve tourist issues on site.",
    impressions: 17,
    createdAt: Date.now() - 3600000 * 92
  },
  {
    id: "job-seed-032",
    title: "Senior Media Producer",
    company: "LensCraft Studio",
    category: "Photography & Videography",
    salary: "$70,000 - $90,000",
    location: "Los Angeles, CA",
    type: "Full-time",
    requirements: [
      "Advanced proficiency in Premiere Pro, After Effects, and DaVinci Resolve.",
      "4+ years professional camera operation (Sony FX6, RED) and studio lighting.",
      "Outstanding color grading, audio mixing, and motion graphics skills.",
      "Strong portfolio showcasing commercial campaigns."
    ],
    description: "Produce, film, and edit cinematic commercial video campaigns for our luxury consumer clients. Maintain studio camera grids, design post-production workflows, and mentor junior editors.",
    impressions: 40,
    createdAt: Date.now() - 3600000 * 95
  },
  {
    id: "job-seed-033",
    title: "Corporate Events Director",
    company: "GalaEvents",
    category: "Event Management",
    salary: "$85,000 - $110,000",
    location: "Chicago, IL",
    type: "Full-time",
    requirements: [
      "5+ years producing conventions, gala fundraisers, and large corporate exhibits.",
      "In-depth contract negotiations experience with hotel venues and caterers.",
      "Familiarity with budget tracking, CAD seating charts, and audio/video staging.",
      "Calm under pressure with exceptional leadership skills."
    ],
    description: "Plan and deliver unforgettable high-profile corporate conventions and gala events. You will manage budgets, hire subcontractors, supervise AV setups, and run on-site event operations.",
    impressions: 21,
    createdAt: Date.now() - 3600000 * 98
  },
  {
    id: "job-seed-034",
    title: "Senior Fashion Designer",
    company: "CoutureHouse",
    category: "Fashion & Beauty",
    salary: "$90,000 - $115,000",
    location: "New York, NY",
    type: "Full-time",
    requirements: [
      "Bachelor's degree in Fashion Design.",
      "5+ years developing luxury or fast-fashion apparel collections.",
      "Mastery of CLO 3D, Illustrator, pattern making, and fabric selection.",
      "Expert knowledge of fashion manufacturing and tech packs."
    ],
    description: "Lead the design direction for our upcoming ready-to-wear seasonal apparel collection. Sketch concepts, build detailed tech packs, source sustainable textiles, and oversee prototype fits.",
    impressions: 51,
    createdAt: Date.now() - 3600000 * 101
  },
  {
    id: "job-seed-035",
    title: "Lead Structural Welder",
    company: "IronWorks Corp",
    category: "Welding",
    salary: "$65,000 - $80,000",
    location: "Pittsburgh, PA",
    type: "Full-time",
    requirements: [
      "AWS Certified Welder (FCAW/SMAW) required.",
      "4+ years industrial structural welding on bridges or high-rise steel frames.",
      "Proficient reading blueprint structural symbols and welding specifications.",
      "Strict compliance with helmet safety, ventilation, and fire hazards policies."
    ],
    description: "Perform heavy-gauge structural welding on industrial steel support frames. Supervise safety on our structural floor, verify joints integrity, and mentor apprentice welders.",
    impressions: 11,
    createdAt: Date.now() - 3600000 * 104
  },
  {
    id: "job-seed-036",
    title: "Automotive Service Technician",
    company: "MotorWorks Service",
    category: "Automotive",
    salary: "$60,000 - $75,000",
    location: "St. Louis, MO",
    type: "Full-time",
    requirements: [
      "ASE Certification required.",
      "3+ years diagnosing and repairing commercial engine, brake, and HVAC systems.",
      "Experience operating computerized engine diagnostic systems.",
      "Excellent hand-eye coordination and physical stamina."
    ],
    description: "Diagnose mechanical and electrical problems, service brake calipers, flush transmission lines, replace engines, and perform scheduled safety checks for our busy automotive service center.",
    impressions: 14,
    createdAt: Date.now() - 3600000 * 107
  },
  {
    id: "job-seed-037",
    title: "Senior Project Manager",
    company: "PrimeDeliver Consulting",
    category: "Project Management",
    salary: "$110,000 - $135,000",
    location: "Washington, DC (Hybrid)",
    type: "Full-time",
    requirements: [
      "PMP or Prince2 certification required.",
      "6+ years managing multi-million dollar software or government initiatives.",
      "Expertise in Agile/Scrum processes, Jira planning, and burn-down reports.",
      "Exceptional client-facing engagement and risk assessment skills."
    ],
    description: "Coordinate cross-functional engineering, design, and deployment teams to deliver critical infrastructure solutions on schedule. Assess risks, coordinate client demos, and manage project budgets.",
    impressions: 42,
    createdAt: Date.now() - 3600000 * 110
  },
  {
    id: "job-seed-038",
    title: "Data Analytics Director",
    company: "InsightData Corp",
    category: "Data Science & Analytics",
    salary: "$145,000 - $175,000",
    location: "San Jose, CA",
    type: "Full-time",
    requirements: [
      "Master's or Ph.D. in Statistics, Data Science, or Economics.",
      "7+ years leading data scientists and analytics operations.",
      "Expertise with Python, SQL, Tableau, and automated ETL pipelines.",
      "Deep understanding of A/B testing models and predictive warehousing."
    ],
    description: "Direct our primary data analytics and business intelligence division. You will design predictive customer attrition models, optimize advertising databases, and deliver insights to the executive board.",
    impressions: 45,
    createdAt: Date.now() - 3600000 * 113
  },
  {
    id: "job-seed-039",
    title: "Security Operations Analyst (SOC)",
    company: "CyberShield Security",
    category: "Cybersecurity",
    salary: "$95,000 - $120,000",
    location: "Remote (US)",
    type: "Full-time",
    requirements: [
      "Active CISSP, CEH, or Security+ certification.",
      "3+ years tracking network traffic anomalies and managing SIEM dashboards (Splunk).",
      "Experience coordinating active threat investigations and containment.",
      "Knowledge of firewalls, endpoint protection, and penetration test frameworks."
    ],
    description: "Analyze, identify, and mitigate malicious network activities and server breaches. You will configure firewalls, manage server alerts, run vulnerability scans, and maintain server logs.",
    impressions: 38,
    createdAt: Date.now() - 3600000 * 116
  },
  {
    id: "job-seed-040",
    title: "Senior UI/UX Designer",
    company: "CreativeMinds Agency",
    category: "Design & Creative Arts",
    salary: "$100,000 - $125,000",
    location: "Los Angeles, CA (Hybrid)",
    type: "Full-time",
    requirements: [
      "5+ years experience designing consumer-facing mobile and desktop web experiences.",
      "Exceptional visual design skills backed by a stunning Figma portfolio.",
      "Deep understanding of design systems, layout rhythm, and typography.",
      "Experience conducting user interviews and usability analysis."
    ],
    description: "Define the visual design language and user journeys for our high-profile consumer accounts. You will design interactive UI wireframes, maintain Figma design libraries, and collaborate with developers.",
    impressions: 61,
    createdAt: Date.now() - 3600000 * 119
  },
  {
    id: "job-seed-041",
    title: "PR & Media Relations Manager",
    company: "EchoPR Solutions",
    category: "Media & Communications",
    salary: "$80,000 - $100,000",
    location: "New York, NY",
    type: "Full-time",
    requirements: [
      "4+ years as a PR Specialist or Media Relations liaison.",
      "Extensive contact list across business, retail, and tech journalists.",
      "Outstanding copywriter with experience drafting press releases and speeches.",
      "Proven crisis communication and reputation management skills."
    ],
    description: "Shape public perception and drive positive press coverage for our corporate clients. You will write media briefs, pitch stories to leading journalists, and manage brand press events.",
    impressions: 26,
    createdAt: Date.now() - 3600000 * 122
  },
  {
    id: "job-seed-042",
    title: "Senior Editorial Director",
    company: "DailyChronicle",
    category: "Journalism & Publishing",
    salary: "$85,000 - $110,000",
    location: "Boston, MA",
    type: "Full-time",
    requirements: [
      "Degree in Journalism, Communications, or English.",
      "5+ years of digital editing or newsroom coordination.",
      "In-depth knowledge of AP style, copyright laws, and SEO publishing guidelines.",
      "Proven ability to manage and mentor a team of staff writers."
    ],
    description: "Oversee daily digital content strategy and article editing for our national news outlet. You will manage content budgets, coordinate freelancer pitches, review draft copies, and verify sources.",
    impressions: 42,
    createdAt: Date.now() - 3600000 * 125
  },
  {
    id: "job-seed-043",
    title: "Physical Security Manager",
    company: "SafeGuard Pro",
    category: "Security Services",
    salary: "$70,000 - $85,000",
    location: "Orlando, FL",
    type: "Full-time",
    requirements: [
      "4+ years leading corporate or hospital physical security operations.",
      "Experience maintaining CCTV grids, access control systems, and alarm boards.",
      "Outstanding emergency management and police liaison coordination.",
      "CPR and first aid certifications required."
    ],
    description: "Supervise patrol officers, inspect facility perimeter locks, audit surveillance logs, configure access badges, and lead emergency evacuation drills for our corporate campus.",
    impressions: 16,
    createdAt: Date.now() - 3600000 * 128
  },
  {
    id: "job-seed-044",
    title: "Public Policy Specialist",
    company: "Municipal Services Bureau",
    category: "Government & Public Administration",
    salary: "$80,000 - $100,000",
    location: "Sacramento, CA",
    type: "Full-time",
    requirements: [
      "Master's in Public Administration, Public Policy, or political science.",
      "3+ years drafting legislative analyses or city zoning evaluations.",
      "Deep understanding of municipal budgets and public hearing processes.",
      "Excellent research, report logging, and public speaking skills."
    ],
    description: "Analyze proposed policy regulations, draft legislative briefs, participate in public zoning hearings, and advise elected city officials on sustainable housing and infrastructure initiatives.",
    impressions: 11,
    createdAt: Date.now() - 3600000 * 131
  },
  {
    id: "job-seed-045",
    title: "Facilities Operations Supervisor",
    company: "CleanSpaces LLC",
    category: "Cleaning & Facility Management",
    salary: "$60,000 - $75,000",
    location: "Columbus, OH",
    type: "Full-time",
    requirements: [
      "3+ years supervising building maintenance or janitorial teams.",
      "Familiarity with commercial HVAC, fire systems, and cleaning agents safely.",
      "Proficiency with CMMS work order software.",
      "Excellent schedule management and physical stamina."
    ],
    description: "Manage facilities sanitization and preventative building maintenance across multiple office properties. Coordinate supply orders, inspect safety doors, and schedule shift cleaners.",
    impressions: 19,
    createdAt: Date.now() - 3600000 * 134
  },
  {
    id: "job-seed-046",
    title: "Global Program Director",
    company: "HopeInternational",
    category: "Non-Governmental Organizations (NGOs)",
    salary: "$85,000 - $105,000",
    location: "Washington, DC (Hybrid)",
    type: "Full-time",
    requirements: [
      "5+ years directing international aid or local community programs.",
      "Extensive experience writing grant proposals and managing donor budgets.",
      "Fluent multilingual communication skills (Spanish or French) preferred.",
      "Willingness to travel internationally to coordinate local relief."
    ],
    description: "Oversee sustainable community development and water sanitation projects in developing nations. Manage donor relations, draft program budgets, and report findings to the executive board.",
    impressions: 29,
    createdAt: Date.now() - 3600000 * 137
  },
  {
    id: "job-seed-047",
    title: "Petroleum Drilling Engineer",
    company: "EnerGas Exploration",
    category: "Oil & Gas",
    salary: "$135,000 - $170,000",
    location: "Midland, TX",
    type: "Full-time",
    requirements: [
      "Degree in Petroleum Engineering or Geotechnical Engineering.",
      "4+ years of on-site drilling operations or well designs experience.",
      "Proficient modeling pressure hydraulics using Landmark software.",
      "Rigorous commitment to oilwell safety guidelines and environmental standards."
    ],
    description: "Design efficient well drilling pathways, model subterranean reservoir pressures, select casing sizes, and oversee on-site drilling operators to ensure safe, cost-efficient petroleum extraction.",
    impressions: 22,
    createdAt: Date.now() - 3600000 * 140
  },
  {
    id: "job-seed-048",
    title: "Network Telecom Specialist",
    company: "GigaConnect Telecom",
    category: "Telecommunications",
    salary: "$90,000 - $115,000",
    location: "Richmond, VA",
    type: "Full-time",
    requirements: [
      "Cisco CCNA or CCNP certification required.",
      "3+ years maintaining fiber optic, VoIP, and wireless microwave towers.",
      "Proficiency with telecom network diagnostic and wire tracing systems.",
      "Outstanding troubleshooting skills under tight timelines."
    ],
    description: "Maintain high-throughput telecommunication switches, diagnose fiber optic routing drops, configure secure corporate VoIP grids, and monitor cell tower performance levels.",
    impressions: 17,
    createdAt: Date.now() - 3600000 * 143
  },
  {
    id: "job-seed-049",
    title: "Executive Culinary Chef",
    company: "SavoryCuisine Group",
    category: "Food Services & Catering",
    salary: "$75,000 - $95,000",
    location: "Nashville, TN",
    type: "Full-time",
    requirements: [
      "Degree in Culinary Arts or equivalent fine dining cooking experience.",
      "4+ years leading kitchen shifts, creating menus, and managing food costs.",
      "Strict compliance with ServSafe and municipal health department regulations.",
      "Strong leadership and physical stamina during peak dining shifts."
    ],
    description: "Lead all kitchen operations for our premier dining establishment. You will design creative seasonal menus, oversee sous chefs, source premium ingredients, and maintain strict hygiene logs.",
    impressions: 35,
    createdAt: Date.now() - 3600000 * 146
  },
  {
    id: "job-seed-050",
    title: "Retail Category Buyer",
    company: "ShopMart Stores",
    category: "Retail",
    salary: "$80,000 - $100,000",
    location: "Cincinnati, OH",
    type: "Full-time",
    requirements: [
      "3+ years in retail product buying, vendor sourcing, or merchandise planning.",
      "Advanced analytical skills with expertise in Excel modeling and market research.",
      "Strong pricing strategy, margin calculations, and contract negotiation.",
      "Familiarity with retail consumer trends."
    ],
    description: "Sourced and curate home goods assortments across 200+ retail stores nationwide. Negotiate supply prices, establish margin benchmarks, and collaborate with logistics.",
    impressions: 28,
    createdAt: Date.now() - 3600000 * 149
  },
  {
    id: "job-seed-051",
    title: "Renewable Energy Consultant",
    company: "PowerGen Systems",
    category: "Energy and Power",
    salary: "$90,000 - $115,000",
    location: "Salt Lake City, UT (Hybrid)",
    type: "Full-time",
    requirements: [
      "Degree in Environmental Science, Electrical Engineering, or equivalent.",
      "3+ years evaluating grid loads, solar installations, or wind farm layouts.",
      "Strong knowledge of state solar tax credits and grid tie compliance laws.",
      "Excellent customer-facing consult and presentation skills."
    ],
    description: "Advise residential and commercial developers on renewable solar and wind systems feasibility. Run site shade calculations, prepare ROI projections, and manage local grid utility applications.",
    impressions: 23,
    createdAt: Date.now() - 3600000 * 152
  }
];
