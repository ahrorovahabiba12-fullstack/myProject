// Per-career "Kasb tanlash" data: Holland (RIASEC) types, the usual DTM
// specialty-subject pair (Subject codes; 1st = 3.1-point block) and the
// University.programs keywords used to match universities. Keyed by
// Career.code. content:sync copies riasec/exam into the Career rows.
import { Riasec } from "./careerTest";

export type CareerMeta = { riasec: Riasec[]; exam: [string, string]; keywords: string[]; extra?: "creative" | "physical" };

const MED = ["medicine", "pediatric"];
const ENG = ["engineer", "electronic", "aviation", "transport", "mining"];
const BIZ = ["econom", "financ", "bank", "business", "management", "marketing"];

/** Keyed by Career.code (seed.ts). Exam pairs are the usual DTM blocks;
 * the official list is published every year and may differ by university. */
export const CAREER_META: Record<string, CareerMeta> = {
  SOFTWARE_ENGINEER: { riasec: ["I", "R", "C"], exam: ["MATH", "PHYSICS"], keywords: ["software", "computer", "it", "ai"] },
  AI_ENGINEER: { riasec: ["I", "R"], exam: ["MATH", "PHYSICS"], keywords: ["ai", "computer", "software"] },
  DATA_SCIENTIST: { riasec: ["I", "C"], exam: ["MATH", "ENGLISH"], keywords: ["computer", "mathematics", "it", "ai"] },
  CYBERSECURITY_SPECIALIST: { riasec: ["I", "C", "R"], exam: ["MATH", "PHYSICS"], keywords: ["computer", "it", "software"] },
  MEDICINE: { riasec: ["I", "S"], exam: ["BIOLOGY", "CHEMISTRY"], keywords: MED },
  DENTIST: { riasec: ["I", "S", "R"], exam: ["BIOLOGY", "CHEMISTRY"], keywords: ["dentist"] },
  PHARMACY: { riasec: ["I", "C"], exam: ["CHEMISTRY", "BIOLOGY"], keywords: ["pharma"] },
  NURSE: { riasec: ["S", "R"], exam: ["BIOLOGY", "CHEMISTRY"], keywords: MED },
  PHYSIOTHERAPIST: { riasec: ["S", "R"], exam: ["BIOLOGY", "CHEMISTRY"], keywords: [...MED, "sport"] },
  NUTRITIONIST: { riasec: ["I", "S"], exam: ["BIOLOGY", "CHEMISTRY"], keywords: MED },
  PARAMEDIC: { riasec: ["S", "R"], exam: ["BIOLOGY", "CHEMISTRY"], keywords: MED },
  VETERINARIAN: { riasec: ["I", "R"], exam: ["BIOLOGY", "CHEMISTRY"], keywords: ["veterinary"] },
  AGRONOMIST: { riasec: ["R", "I"], exam: ["BIOLOGY", "CHEMISTRY"], keywords: ["agronomy", "agricultur", "irrigation"] },
  ENVIRONMENTAL_SCIENTIST: { riasec: ["I", "R"], exam: ["BIOLOGY", "CHEMISTRY"], keywords: ["biology", "agronomy"] },
  PSYCHOLOGIST: { riasec: ["S", "I"], exam: ["BIOLOGY", "MOTHER_LANG"], keywords: ["pedagog", "philolog"] },
  TEACHER: { riasec: ["S", "A"], exam: ["MOTHER_LANG", "MATH"], keywords: ["pedagog", "primary education", "mathematics", "philolog"] },
  SOCIAL_WORKER: { riasec: ["S", "E"], exam: ["HISTORY", "MOTHER_LANG"], keywords: ["pedagog", "history"] },
  LAWYER: { riasec: ["E", "S", "I"], exam: ["HISTORY", "ENGLISH"], keywords: ["law"] },
  DIPLOMAT: { riasec: ["E", "S"], exam: ["HISTORY", "ENGLISH"], keywords: ["international relations", "foreign language"] },
  CIVIL_SERVANT: { riasec: ["C", "S", "E"], exam: ["HISTORY", "ENGLISH"], keywords: ["law", "econom", "management"] },
  POLICE_OFFICER: { riasec: ["R", "S", "E"], exam: ["HISTORY", "MOTHER_LANG"], keywords: ["law"], extra: "physical" },
  MILITARY_OFFICER: { riasec: ["R", "E"], exam: ["MATH", "PHYSICS"], keywords: ["engineer"], extra: "physical" },
  FIREFIGHTER: { riasec: ["R", "S"], exam: ["MATH", "PHYSICS"], keywords: ["engineer"], extra: "physical" },
  ECONOMIST: { riasec: ["C", "I", "E"], exam: ["MATH", "ENGLISH"], keywords: BIZ },
  ACCOUNTANT: { riasec: ["C"], exam: ["MATH", "ENGLISH"], keywords: ["financ", "econom", "bank"] },
  AUDITOR: { riasec: ["C", "E"], exam: ["MATH", "ENGLISH"], keywords: ["financ", "econom"] },
  FINANCIAL_ANALYST: { riasec: ["C", "I"], exam: ["MATH", "ENGLISH"], keywords: ["financ", "bank", "econom"] },
  ENTREPRENEUR: { riasec: ["E", "A"], exam: ["MATH", "ENGLISH"], keywords: BIZ },
  MARKETING_SPECIALIST: { riasec: ["E", "A"], exam: ["MATH", "ENGLISH"], keywords: ["marketing", "business", "media", "public relations"] },
  HR_MANAGER: { riasec: ["E", "S"], exam: ["MATH", "ENGLISH"], keywords: ["management", "business"] },
  LOGISTICS_MANAGER: { riasec: ["E", "C"], exam: ["MATH", "ENGLISH"], keywords: ["transport", "management", "econom"] },
  REAL_ESTATE_AGENT: { riasec: ["E", "S"], exam: ["MATH", "ENGLISH"], keywords: ["business", "econom"] },
  HOTEL_MANAGER: { riasec: ["E", "S"], exam: ["ENGLISH", "MATH"], keywords: ["management", "business", "foreign language"] },
  TOUR_GUIDE: { riasec: ["S", "E", "A"], exam: ["HISTORY", "ENGLISH"], keywords: ["history", "foreign language", "culture"] },
  ARCHITECT: { riasec: ["A", "R", "I"], exam: ["MATH", "PHYSICS"], keywords: ["architect", "civil engineering"], extra: "creative" },
  CIVIL_ENGINEER: { riasec: ["R", "I"], exam: ["MATH", "PHYSICS"], keywords: ["civil engineering", "architect"] },
  MECHANICAL_ENGINEER: { riasec: ["R", "I"], exam: ["MATH", "PHYSICS"], keywords: ["mechanical", ...ENG] },
  ELECTRICAL_ENGINEER: { riasec: ["R", "I"], exam: ["MATH", "PHYSICS"], keywords: ["electrical", "electronic", "engineer"] },
  CHEMICAL_ENGINEER: { riasec: ["I", "R"], exam: ["CHEMISTRY", "MATH"], keywords: ["chemical", "textile"] },
  GEOLOGIST: { riasec: ["R", "I"], exam: ["CHEMISTRY", "MATH"], keywords: ["mining"] },
  PILOT: { riasec: ["R", "I"], exam: ["MATH", "PHYSICS"], keywords: ["aviation"], extra: "physical" },
  DESIGNER: { riasec: ["A", "R"], exam: ["MATH", "MOTHER_LANG"], keywords: ["design", "fine arts"], extra: "creative" },
  FASHION_DESIGNER: { riasec: ["A", "R"], exam: ["MATH", "MOTHER_LANG"], keywords: ["fashion", "textile", "design"], extra: "creative" },
  JOURNALIST: { riasec: ["A", "S", "E"], exam: ["MOTHER_LANG", "ENGLISH"], keywords: ["journalism", "media", "public relations"] },
  WRITER: { riasec: ["A", "I"], exam: ["MOTHER_LANG", "HISTORY"], keywords: ["philolog", "literature", "journalism"] },
  TRANSLATOR: { riasec: ["A", "S", "C"], exam: ["ENGLISH", "MOTHER_LANG"], keywords: ["foreign language", "translation", "philolog"] },
  ACTOR: { riasec: ["A", "E"], exam: ["MOTHER_LANG", "HISTORY"], keywords: ["performing arts", "culture"], extra: "creative" },
  MUSICIAN: { riasec: ["A"], exam: ["MOTHER_LANG", "HISTORY"], keywords: ["performing arts", "culture"], extra: "creative" },
  FILM_DIRECTOR: { riasec: ["A", "E"], exam: ["MOTHER_LANG", "HISTORY"], keywords: ["performing arts", "media", "culture"], extra: "creative" },
  PHOTOGRAPHER: { riasec: ["A", "R"], exam: ["MOTHER_LANG", "HISTORY"], keywords: ["fine arts", "media", "design"], extra: "creative" },
  CHEF: { riasec: ["R", "A"], exam: ["BIOLOGY", "CHEMISTRY"], keywords: ["chemical", "agricultur"] },
};
