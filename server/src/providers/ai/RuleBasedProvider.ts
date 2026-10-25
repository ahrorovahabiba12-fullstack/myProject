import {
  AIProvider,
  CareerRecommendationInput,
  CareerRecommendationOutput,
  ChatContext,
  ChatMessageInput,
  DailyCoachInput,
  DailyCoachOutput,
  LearningPlanInput,
  LearningPlanOutput,
  LearningRecommendationInput,
  LearningRecommendationOutput,
  ParentReportInput,
  ParentReportOutput,
  ProgressAnalysisInput,
  ProgressAnalysisOutput,
} from "./AIProvider";
import { Lang } from "../../middleware/language";

/** Picks the Russian string for lang === "ru", Uzbek otherwise — local to
 * this provider since every reply here is a hand-written template, not a
 * DB field, so it doesn't go through utils/localize's uz/ru pair shape. */
function L(uz: string, ru: string, lang: Lang): string {
  return lang === "ru" ? ru : uz;
}

// The student types free natural-language text into "Kasbiy qiziqishlar" (e.g.
// "programming", "dasturlash", "shifokor") — never the internal catalog code
// (e.g. "SOFTWARE_ENGINEER"). This maps each catalog code to the everyday
// Uzbek/Russian/English words a real student would actually type for it, so
// getCareerRecommendation can match on meaning instead of literal identity.
const CAREER_KEYWORDS: Record<string, string[]> = {
  SOFTWARE_ENGINEER: ["dasturlash", "dasturchi", "dastur tuzish", "dasturiy ta'minot", "programming", "programmer", "coding", "coder", "software", "разработка", "программирование", "программист"],
  MEDICINE: ["shifokor", "tibbiyot", "vrach", "doctor", "medicine", "medical", "медицина", "врач", "доктор"],
  PHARMACY: ["farmatsevt", "dorixona", "dori", "pharmacy", "pharmacist", "аптека", "фармацевт"],
  AI_ENGINEER: ["sun'iy intellekt", "mashinaviy o'rganish", "artificial intelligence", "machine learning", "ai", "нейросеть", "искусственный интеллект", "машинное обучение"],
  TEACHER: ["o'qituvchi", "pedagog", "ta'lim beruvchi", "teacher", "teaching", "учитель", "педагог", "преподаватель"],
  LAWYER: ["huquqshunos", "advokat", "yurist", "lawyer", "law", "юрист", "адвокат"],
  ECONOMIST: ["iqtisodchi", "iqtisodiyot", "economist", "economics", "экономист", "экономика"],
  ARCHITECT: ["arxitektor", "arxitektura", "architect", "architecture", "архитектор"],
  JOURNALIST: ["jurnalist", "jurnalistika", "journalist", "journalism", "журналист", "журналистика"],
  CIVIL_ENGINEER: ["qurilish muhandisi", "qurilish", "civil engineer", "construction", "строитель", "инженер-строитель", "строительство"],
  VETERINARIAN: ["veterinar", "hayvon shifokori", "veterinarian", "vet", "ветеринар"],
  PSYCHOLOGIST: ["psixolog", "psixologiya", "psychologist", "psychology", "психолог", "психология"],
  ACCOUNTANT: ["buxgalter", "hisobchi", "accountant", "accounting", "бухгалтер"],
  DESIGNER: ["dizayner", "dizayn", "designer", "design", "дизайнер", "дизайн"],
  TRANSLATOR: ["tarjimon", "tarjima", "translator", "translation", "переводчик", "перевод"],
  PILOT: ["uchuvchi", "pilot", "пилот", "лётчик"],
  DENTIST: ["stomatolog", "tish shifokori", "dentist", "стоматолог"],
  MARKETING_SPECIALIST: ["marketing", "marketolog", "маркетинг", "маркетолог"],
  MECHANICAL_ENGINEER: ["mexanika muhandisi", "mexanik", "mechanical engineer", "механик", "инженер-механик"],
  ELECTRICAL_ENGINEER: ["elektr muhandisi", "elektrotexnika", "electrical engineer", "электрик", "инженер-электрик"],
  CHEMICAL_ENGINEER: ["kimyo muhandisi", "chemical engineer", "инженер-химик"],
  DATA_SCIENTIST: ["data science", "ma'lumotlar tahlili", "data scientist", "аналитик данных", "наука о данных"],
  CYBERSECURITY_SPECIALIST: ["kiberxavfsizlik", "xaker", "cybersecurity", "hacker", "хакер", "кибербезопасность"],
  ENVIRONMENTAL_SCIENTIST: ["ekolog", "ekologiya", "environmental", "эколог", "экология"],
  GEOLOGIST: ["geolog", "geologiya", "geologist", "геолог"],
  NURSE: ["hamshira", "nurse", "медсестра", "медбрат"],
  PHYSIOTHERAPIST: ["fizioterapevt", "physiotherapist", "физиотерапевт"],
  NUTRITIONIST: ["dietolog", "ovqatlanish mutaxassisi", "nutritionist", "диетолог"],
  PARAMEDIC: ["tez tibbiy yordam", "paramedic", "фельдшер"],
  FINANCIAL_ANALYST: ["moliyaviy analitik", "moliya", "financial analyst", "finance", "финансовый аналитик", "финансы"],
  AUDITOR: ["auditor", "audit", "аудитор"],
  ENTREPRENEUR: ["tadbirkor", "biznes", "entrepreneur", "business", "предприниматель", "бизнес"],
  HR_MANAGER: ["kadrlar", "hr", "human resources", "менеджер по персоналу", "кадры"],
  LOGISTICS_MANAGER: ["logistika", "logistics", "логистика"],
  REAL_ESTATE_AGENT: ["ko'chmas mulk", "rieltor", "real estate", "риелтор", "недвижимость"],
  DIPLOMAT: ["diplomat", "diplomatiya", "diplomacy", "дипломат"],
  POLICE_OFFICER: ["politsiya", "police", "полицейский", "полиция"],
  CIVIL_SERVANT: ["davlat xizmatchisi", "civil servant", "государственный служащий"],
  WRITER: ["yozuvchi", "adabiyot", "writer", "писатель"],
  ACTOR: ["aktyor", "aktrisa", "actor", "актёр", "актриса"],
  MUSICIAN: ["musiqachi", "musiqa", "musician", "music", "музыкант", "музыка"],
  FILM_DIRECTOR: ["rejissyor", "kino", "film director", "режиссёр"],
  PHOTOGRAPHER: ["fotograf", "fotografiya", "photographer", "фотограф"],
  FASHION_DESIGNER: ["moda dizayneri", "fashion designer", "модельер"],
  CHEF: ["oshpaz", "chef", "cook", "повар"],
  HOTEL_MANAGER: ["mehmonxona menejeri", "hotel manager", "менеджер отеля"],
  TOUR_GUIDE: ["gid", "sayyohlik", "tour guide", "экскурсовод", "туризм"],
  AGRONOMIST: ["agronom", "agronomist", "агроном"],
  SOCIAL_WORKER: ["ijtimoiy xodim", "social worker", "социальный работник"],
  MILITARY_OFFICER: ["harbiy", "military", "военный"],
  FIREFIGHTER: ["o't o'chiruvchi", "firefighter", "пожарный"],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Bidirectional substring match, case-insensitive — handles both a longer
// phrase containing a keyword ("men dasturlash bilan shug'ullanaman") and a
// shorter typed word that a keyword itself contains ("dastur" -> "dasturchi").
// Short strings (<=3 chars, e.g. "AI", "HR") only match as a whole word via a
// word-boundary check, never a raw substring — otherwise "ai" would match
// inside almost any unrelated word.
function matchesCareerInterest(interestRaw: string, keywords: string[]): boolean {
  const interest = interestRaw.toLowerCase().trim();
  if (!interest) return false;
  return keywords.some((kw) => {
    const k = kw.toLowerCase().trim();
    if (!k) return false;
    if (interest.length <= 3 || k.length <= 3) {
      return (
        interest === k ||
        new RegExp(`\\b${escapeRegExp(k)}\\b`).test(interest) ||
        new RegExp(`\\b${escapeRegExp(interest)}\\b`).test(k)
      );
    }
    return interest.includes(k) || k.includes(interest);
  });
}

/**
 * Deterministic, dependency-free fallback. Used automatically whenever no
 * AI credential is configured, or when a live provider call fails — the
 * product must never show a broken AI feature.
 */
export class RuleBasedProvider implements AIProvider {
  readonly name = "rule-based";

  async getLearningRecommendation(
    input: LearningRecommendationInput
  ): Promise<LearningRecommendationOutput> {
    const { lang } = input;
    const sorted = [...input.subjectLevels].sort((a, b) => a.score - b.score);
    const items = sorted.slice(0, 4).map((s, idx) => ({
      subjectCode: s.subjectCode,
      reason:
        s.level === "WEAK"
          ? L(
              `${s.subjectName} bo'yicha natijangiz (${Math.round(s.score)}%) hozircha past — muntazam mashq bilan sezilarli yaxshilash mumkin.`,
              `Ваш результат по предмету «${s.subjectName}» (${Math.round(s.score)}%) пока низкий — регулярная практика может значительно его улучшить.`,
              lang
            )
          : s.level === "MEDIUM"
            ? L(
                `${s.subjectName} bo'yicha natijangiz (${Math.round(s.score)}%) o'rtacha — biroz ko'proq mashq bilan yaxshi darajaga chiqishingiz mumkin.`,
                `Ваш результат по предмету «${s.subjectName}» (${Math.round(s.score)}%) средний — с небольшой дополнительной практикой вы можете выйти на хороший уровень.`,
                lang
              )
            : L(
                `${s.subjectName} bo'yicha natijangiz (${Math.round(s.score)}%) yaxshi — shu darajani saqlab qolish uchun muntazam takrorlash foydali.`,
                `Ваш результат по предмету «${s.subjectName}» (${Math.round(s.score)}%) хороший — регулярное повторение поможет удержать этот уровень.`,
                lang
              ),
      minutesPerWeek: s.level === "WEAK" ? 150 : s.level === "MEDIUM" ? 90 : 60,
      priority: idx + 1,
    }));
    return {
      title: L("Haftalik shaxsiy o'quv tavsiyasi", "Еженедельная персональная рекомендация по учёбе", lang),
      items,
      confidence: 0.6,
    };
  }

  async getCareerRecommendation(input: CareerRecommendationInput): Promise<CareerRecommendationOutput> {
    const { lang } = input;
    const LEVEL_WEIGHT: Record<"WEAK" | "MEDIUM" | "STRONG", number> = { WEAK: 0.25, MEDIUM: 0.6, STRONG: 1 };
    const levelByCode = new Map(input.subjectLevels.map((s) => [s.subjectCode, s]));
    const catalogByCode = new Map(input.catalog.map((c) => [c.code, c]));

    // Resolve each free-text interest to catalog codes via keyword matching —
    // the student never types a literal code, so an identity match would
    // silently match nothing for virtually every real student.
    const matchedCodes = new Set<string>();
    for (const interest of input.careerInterests) {
      for (const code of catalogByCode.keys()) {
        if (matchesCareerInterest(interest, CAREER_KEYWORDS[code] ?? [])) matchedCodes.add(code);
      }
    }

    // Real match = how strong the student is in THIS career's own required
    // subjects (never a career's unrelated subjects) combined with the fact
    // that they explicitly declared interest in it — never list position.
    const careers = [...matchedCodes].map((code) => {
      const requiredSubjects = catalogByCode.get(code)?.requiredSubjects ?? [];
      const relevantLevels = requiredSubjects
        .map((sc) => levelByCode.get(sc))
        .filter((s): s is NonNullable<typeof s> => !!s);
      // No quiz data yet for this career's subjects -> neutral baseline, not a penalty.
      const subjectFit = relevantLevels.length
        ? relevantLevels.reduce((sum, s) => sum + LEVEL_WEIGHT[s.level], 0) / relevantLevels.length
        : 0.5;
      const INTEREST_WEIGHT = 0.3;
      const matchScore = Math.round(Math.min(1, subjectFit * (1 - INTEREST_WEIGHT) + INTEREST_WEIGHT) * 100) / 100;

      const strongRelevant = relevantLevels.filter((s) => s.level === "STRONG").map((s) => s.subjectName);
      const reasoning = strongRelevant.length
        ? L(
            `Sizning ${strongRelevant.join(", ")} bo'yicha kuchli natijalaringiz va shu kasbga bo'lgan qiziqishingiz mos keladi.`,
            `Ваши сильные результаты по предмету «${strongRelevant.join(", ")}» и интерес к этой профессии совпадают.`,
            lang
          )
        : L(
            "Siz shu kasbga qiziqish bildirgansiz — tegishli fanlardagi natijalaringiz oshgani sari moslik ham kuchayadi.",
            "Вы проявили интерес к этой профессии — по мере роста результатов по нужным предметам соответствие будет усиливаться.",
            lang
          );

      return { careerCode: code, matchScore, reasoning };
    });
    return { careers };
  }

  async generateParentReport(input: ParentReportInput): Promise<ParentReportOutput> {
    const { lang } = input;
    // weeklyStudyMinutes only comes from timed Schedule sessions — a student
    // who only took quizzes (no timed session) has real activity that a bare
    // "0 daqiqa" sentence would misleadingly contradict alongside a real
    // quiz average. Same gap as RuleBasedProvider.analyzeProgress.
    const summary =
      input.weeklyStudyMinutes === 0 && input.quizCount > 0
        ? L(
            `${input.studentName} shu hafta rejalashtirilgan darslarda vaqt belgilamagan, lekin ${input.quizCount} ta test topshirgan, o'rtacha natija ${Math.round(input.quizAverage)}%.`,
            `${input.studentName} на этой неделе не отмечал время в запланированных занятиях, но прошёл ${input.quizCount} тестов, средний результат ${Math.round(input.quizAverage)}%.`,
            lang
          )
        : L(
            `${input.studentName} shu hafta ${input.weeklyStudyMinutes} daqiqa shug'ullandi, o'rtacha test natijasi ${Math.round(input.quizAverage)}%.`,
            `${input.studentName} на этой неделе занимался ${input.weeklyStudyMinutes} минут, средний результат тестов ${Math.round(input.quizAverage)}%.`,
            lang
          );
    return {
      summary,
      strengths: input.strongSubjects.length ? input.strongSubjects : [L("Barqaror qatnashish", "Стабильное участие", lang)],
      attentionAreas: input.weakSubjects.length ? input.weakSubjects : [],
      nextSteps: [
        L("Kuchsiz fanlarga qo'shimcha 20 daqiqa ajratish", "Уделять слабым предметам дополнительно 20 минут", lang),
        L("Haftalik testni muntazam topshirish", "Регулярно проходить еженедельный тест", lang),
      ],
    };
  }

  async generateLearningPlan(input: LearningPlanInput): Promise<LearningPlanOutput> {
    const days: LearningPlanOutput["days"] = [];
    // Weak subjects are entered twice into the rotation pool so they come up roughly
    // twice as often across the week, not just for longer sessions when their turn
    // happens to land — a student weak in one subject should see it noticeably more
    // often, not merely get a longer block on whichever day it's already scheduled.
    const testedPool = [...input.weakSubjects, ...input.weakSubjects, ...input.mediumSubjects, ...input.strongSubjects];
    // A brand-new student has no quiz results yet, so weakSubjects/strongSubjects are
    // both empty — falling back to a vague "general review" would imply history that
    // doesn't exist. Rotate through real, untested subjects instead; "general review"
    // is a last resort for the (practically impossible) case where even that is empty.
    const pool = testedPool.length > 0 ? testedPool : input.neutralSubjects;
    const weakCodes = new Set(input.weakSubjects.map((s) => s.code));
    const fallback = { code: "general", nameUz: "Umumiy takrorlash", nameRu: "Общее повторение" };
    // A second, lighter block per day brings in subjects beyond the tested weak/strong
    // set — neutral, everyday-useful subjects the student hasn't necessarily tested —
    // so a week isn't limited to only the 1-2 subjects that happen to have a quiz result.
    const secondaryPool =
      input.neutralSubjects.length > 0 ? input.neutralSubjects : [...input.mediumSubjects, ...input.strongSubjects];

    // Monday(1)..Saturday(6) only — the weekly plan deliberately excludes Sunday(7),
    // a rest day with no scheduled study.
    for (let d = 1; d <= 6; d++) {
      const primary = pool[(d - 1) % Math.max(pool.length, 1)] ?? fallback;
      // Completing a block means taking a short, fixed-length quiz (QUIZ_LENGTH
      // questions in QuizService) — never literally an hour of study — so these
      // stay close to how long that quiz actually takes. Keeping them small also
      // keeps StudyAnalyticsService.actualVsPlannedRate meaningful: that rate
      // divides the quiz's real elapsed time by this planned figure, so an
      // inflated estimate here made genuinely-completed-every-day students look
      // like they were falling far short of their plan.
      days.push({
        dayOfWeek: d,
        subjectCode: primary.code,
        minutes: weakCodes.has(primary.code)
          ? Math.min(15, input.availableMinutesPerDay)
          : Math.min(10, input.availableMinutesPerDay),
        title: `${primary.nameUz} bo'yicha mashq`,
        titleRu: `Практика по предмету «${primary.nameRu}»`,
      });

      const secondaryCandidates = secondaryPool.filter((s) => s.code !== primary.code);
      if (secondaryCandidates.length > 0 && input.availableMinutesPerDay > 15) {
        const secondary = secondaryCandidates[(d - 1) % secondaryCandidates.length];
        days.push({
          dayOfWeek: d,
          subjectCode: secondary.code,
          minutes: Math.min(5, input.availableMinutesPerDay - 15),
          title: `${secondary.nameUz} bo'yicha qo'shimcha mashq`,
          titleRu: `Дополнительная практика по предмету «${secondary.nameRu}»`,
        });
      }
    }
    return { days };
  }

  private readonly subjectTips: Record<string, { uz: string[]; ru: string[] }> = {
    MATH: {
      uz: [
        "har kuni 20-30 daqiqa masala yechishga vaqt ajrating, nazariyani yodlashdan ko'ra amaliyotga ko'proq urg'u bering",
        "xato qilgan masalalarni alohida daftarga yozib, bir necha kundan keyin qayta yeching",
        "formulalarni faqat yodlamang — ular qayerdan kelib chiqqanini tushunishga harakat qiling",
      ],
      ru: [
        "уделяйте 20-30 минут в день решению задач, делая упор на практику, а не на зубрёжку теории",
        "записывайте задачи, в которых ошиблись, в отдельную тетрадь и решайте их снова через несколько дней",
        "не просто заучивайте формулы — старайтесь понять, откуда они берутся",
      ],
    },
    ENGLISH: {
      uz: [
        "har kuni kamida 15 daqiqa ingliz tilida audio/video tinglang (subtitr bilan boshlang, keyin subtitrsiz)",
        "yangi so'zlarni alohida yozib, ularni gapda ishlatib mashq qiling — faqat tarjimasini yodlash kam yordam beradi",
        "grammatikada qaysi mavzu (zamon, artikl, predlog) ko'proq xato bo'lsa, o'sha mavzu bo'yicha 10-15 ta mashq qiling",
      ],
      ru: [
        "слушайте английское аудио/видео минимум 15 минут в день (начните с субтитрами, затем без них)",
        "записывайте новые слова и практикуйте их в предложениях — простое заучивание перевода мало помогает",
        "определите, в какой теме грамматики (времена, артикли, предлоги) больше всего ошибок, и сделайте 10-15 упражнений именно по ней",
      ],
    },
    PHYSICS: {
      uz: [
        "formulani yodlashdan oldin, uning fizik ma'nosini (nima nimaga bog'liq) tushunib oling",
        "har bir mavzudan keyin kamida 5 ta masala yeching, faqat nazariyani o'qib qo'ymang",
      ],
      ru: [
        "прежде чем заучивать формулу, поймите её физический смысл (что от чего зависит)",
        "после каждой темы решайте минимум 5 задач, не ограничивайтесь чтением теории",
      ],
    },
    CHEMISTRY: {
      uz: [
        "reaksiya tenglamalarini yozishni muntazam mashq qiling, faqat formulalarni yodlash yetarli emas",
        "davriy jadvalning asosiy qonuniyatlarini tushunishga urg'u bering",
      ],
      ru: [
        "регулярно практикуйте составление уравнений реакций — одного заучивания формул недостаточно",
        "сосредоточьтесь на понимании основных закономерностей периодической таблицы",
      ],
    },
    BIOLOGY: {
      uz: [
        "sxema va rasmlar orqali takrorlang — biologiyada vizual xotira juda yordam beradi",
        "har bir mavzuni o'z so'zlaringiz bilan qayta gapirib berishga harakat qiling",
      ],
      ru: [
        "повторяйте материал по схемам и рисункам — в биологии зрительная память очень помогает",
        "старайтесь пересказывать каждую тему своими словами",
      ],
    },
    HISTORY: {
      uz: [
        "sanalarni izolyatsiyada emas, voqealar zanjiri (sabab-oqibat) sifatida yodlang",
        "xronologik jadval tuzib, asosiy voqealarni vizual tartibda ko'ring",
      ],
      ru: [
        "запоминайте даты не изолированно, а как цепочку событий (причина-следствие)",
        "составьте хронологическую таблицу, чтобы видеть основные события в наглядном порядке",
      ],
    },
    INFORMATICS: {
      uz: [
        "nazariyani o'qib qo'ymasdan, kichik dasturlar yozib amaliyotda mashq qiling",
        "xato chiqqan kodni tushunmasdan tuzatmang — sababini albatta aniqlang",
      ],
      ru: [
        "не ограничивайтесь чтением теории — практикуйтесь, написав небольшие программы",
        "не исправляйте код с ошибкой, не поняв причину — обязательно разберитесь, в чём дело",
      ],
    },
    MOTHER_LANG: {
      uz: [
        "har kuni kichik matn o'qib, asosiy fikrni o'z so'zlaringiz bilan qayta yozib ko'ring",
        "imlo qoidalarida ko'p xato qiladigan joylaringizni alohida ro'yxat qilib, ularni takrorlang",
      ],
      ru: [
        "читайте каждый день небольшой текст и пересказывайте основную мысль своими словами",
        "составьте отдельный список орфографических правил, в которых чаще всего ошибаетесь, и повторяйте их",
      ],
    },
  };

  // Common ways students actually type each subject — including frequent
  // misspellings — so matching doesn't require the exact official name.
  private readonly subjectKeywords: Record<string, string[]> = {
    MATH: ["matematika", "matem", "mat ", "математика", "матем"],
    PHYSICS: ["fizika", "физика"],
    CHEMISTRY: ["kimyo", "химия"],
    BIOLOGY: ["biologiya", "биология"],
    HISTORY: ["tarix", "история"],
    ENGLISH: ["ingliz", "ingiliz", "inglis", "english", "английск"],
    INFORMATICS: [
      "informatika",
      "dasturlash",
      "информатика",
      "программирован",
      "programming",
      "program",
      "coding",
      "code",
    ],
    MOTHER_LANG: ["ona tili", "onatili", "родной язык", "русский язык"],
  };

  private findMentionedSubject(context: ChatContext, userMessage: string) {
    const lower = userMessage.toLowerCase();
    return context.subjectLevels.find((s) => {
      if (lower.includes(s.subjectName.toLowerCase()) || lower.includes(s.subjectCode.toLowerCase())) {
        return true;
      }
      const keywords = this.subjectKeywords[s.subjectCode] ?? [];
      return keywords.some((k) => lower.includes(k));
    });
  }

  async chat(context: ChatContext, history: ChatMessageInput[], userMessage: string): Promise<string> {
    const { lang } = context;
    const weak = context.subjectLevels.filter((s) => s.level === "WEAK").map((s) => s.subjectName);

    if (/kasb|career|mutaxassislik|профессия|карьера/i.test(userMessage)) {
      if (context.grade >= 9) {
        const interestsText = context.careerInterests.join(", ") || L("hali belgilanmagan", "пока не указаны", lang);
        return L(
          `Sizning qiziqishlaringiz (${interestsText}) va fan natijalaringizga asoslanib, kasb yo'nalishini "Kasb yo'li" bo'limida ko'rishingiz mumkin. Aniqroq maslahat uchun qaysi sohalar qiziqtirayotganini yozing.`,
          `На основе ваших интересов (${interestsText}) и результатов по предметам вы можете посмотреть карьерное направление в разделе «Карьера». Для более точного совета напишите, какие сферы вас интересуют.`,
          lang
        );
      }
      return L(
        "Kasb tavsiyalari 9-sinfdan boshlab ochiladi. Hozircha asosiy fanlarni mustahkamlashga e'tibor qarataylik.",
        "Рекомендации по профессии открываются с 9 класса. Пока сосредоточимся на укреплении основных предметов.",
        lang
      );
    }
    if (/reja|schedule|plan|план|расписан/i.test(userMessage)) {
      const weakNote = weak.length
        ? L(
            `Ayniqsa ${weak.join(", ")} fanlariga ko'proq vaqt ajratishni tavsiya qilaman. `,
            `Особенно рекомендую уделять больше времени предметам: ${weak.join(", ")}. `,
            lang
          )
        : "";
      return L(
        `Sizga mos haftalik reja tuzishim mumkin. ${weakNote}"Dars rejasi" bo'limida to'liq jadvalni ko'rishingiz mumkin.`,
        `Я могу составить для вас подходящий недельный план. ${weakNote}Полное расписание вы найдёте в разделе «План занятий».`,
        lang
      );
    }

    // User named a specific subject — give concrete, subject-specific tips
    // instead of a generic "mashq qiling" reply.
    const mentioned = this.findMentionedSubject(context, userMessage);
    if (mentioned) {
      const tips = this.subjectTips[mentioned.subjectCode];
      const levelText =
        mentioned.level === "WEAK"
          ? L(
              `Hozirgi natijangiz (${Math.round(mentioned.score)}%) boshqa fanlaringizga nisbatan past.`,
              `Ваш текущий результат (${Math.round(mentioned.score)}%) ниже, чем по остальным предметам.`,
              lang
            )
          : mentioned.level === "MEDIUM"
            ? L(
                `Natijangiz (${Math.round(mentioned.score)}%) o'rtacha — biroz ko'proq mashq bilan yaxshilash mumkin.`,
                `Ваш результат (${Math.round(mentioned.score)}%) средний — с дополнительной практикой его можно улучшить.`,
                lang
              )
            : L(
                `Natijangiz (${Math.round(mentioned.score)}%) yaxshi — shu darajani saqlab qolish uchun ham muntazamlik kerak.`,
                `Ваш результат (${Math.round(mentioned.score)}%) хороший — чтобы удержать этот уровень, тоже нужна регулярность.`,
                lang
              );
      const tipsList = tips ? (lang === "ru" ? tips.ru : tips.uz) : null;
      const tipsText = tipsList
        ? tipsList.map((t, i) => `${i + 1}) ${t}`).join(" ")
        : L(
            "muntazam mashq qilish va noto'g'ri javoblaringizni qayta ko'rib chiqish foydali bo'ladi.",
            "полезно регулярно практиковаться и разбирать свои неправильные ответы.",
            lang
          );
      return L(
        `${levelText} Tavsiyalarim: ${tipsText} "${mentioned.subjectName}" bo'yicha "Testlar" bo'limida mashq qilib, o'sishni "Progress" bo'limida kuzatib borishingiz mumkin.`,
        `${levelText} Мои рекомендации: ${tipsText} Вы можете практиковаться по предмету «${mentioned.subjectName}» в разделе «Тесты» и отслеживать прогресс в разделе «Прогресс».`,
        lang
      );
    }

    const closing = weak.length
      ? L(
          `Hozircha ${weak.join(", ")} bo'yicha ko'proq mashq qilish foydali bo'lardi.`,
          `Сейчас было бы полезно больше практиковаться по предметам: ${weak.join(", ")}.`,
          lang
        )
      : L("Umumiy natijalaringiz yaxshi ko'rinmoqda.", "В целом ваши результаты выглядят хорошо.", lang);

    // First-ever message in the conversation: greet by name. On later
    // turns an unmatched topic should say so instead of repeating the
    // same greeting verbatim (it isn't actually a new "hello").
    if (history.length === 0) {
      return L(
        `Salom, ${context.studentName}! ${closing} Aniqroq maslahat uchun qaysi fan sizni qiziqtirayotganini nomi bilan yozing.`,
        `Привет, ${context.studentName}! ${closing} Для более точного совета напишите название предмета, который вас интересует.`,
        lang
      );
    }
    return L(
      `Kechirasiz, bu mavzuni aniq tushunmadim. ${closing} Fan nomini (masalan, matematika, fizika, ingliz tili) yozsangiz, aniqroq maslahat bera olaman.`,
      `Извините, я не совсем понял эту тему. ${closing} Если напишете название предмета (например, математика, физика, английский язык), я смогу дать более точный совет.`,
      lang
    );
  }

  async analyzeProgress(input: ProgressAnalysisInput): Promise<ProgressAnalysisOutput> {
    const { lang } = input;
    const totalMinutes = input.weeklyStudyMinutes.reduce((a, b) => a + b, 0);
    const avgScore =
      input.quizScores.length > 0
        ? input.quizScores.reduce((a, b) => a + b, 0) / input.quizScores.length
        : 0;
    const declining = input.subjectTrends.filter((t) => t.delta < 0).map((t) => t.subjectName);
    // Studied minutes only come from timed Schedule sessions — a student who
    // took several quizzes but never ran a timed session has real, visible
    // activity (subject levels, quiz scores) that this must not ignore.
    return {
      improvement:
        totalMinutes > 0
          ? L(
              `Bu davrda jami ${totalMinutes} daqiqa shug'ullandingiz, o'rtacha test natijasi ${Math.round(avgScore)}%.`,
              `За этот период вы занимались в общей сложности ${totalMinutes} минут, средний результат тестов ${Math.round(avgScore)}%.`,
              lang
            )
          : input.quizScores.length > 0
            ? L(
                `Bu davrda ${input.quizScores.length} ta test topshirdingiz, o'rtacha natija ${Math.round(avgScore)}%.`,
                `За этот период вы прошли ${input.quizScores.length} тестов, средний результат ${Math.round(avgScore)}%.`,
                lang
              )
            : L("Hali yetarlicha faoliyat qayd etilmagan.", "Пока недостаточно данных об активности.", lang),
      weakPoints: declining,
      nextSteps: declining.length
        ? declining.map((s) => L(`${s} bo'yicha qo'shimcha mashq qiling`, `Дополнительно потренируйтесь по предмету «${s}»`, lang))
        : [L("Joriy sur'atni davom ettiring", "Продолжайте в том же темпе", lang)],
    };
  }

  async generateDailyCoachMessage(input: DailyCoachInput): Promise<DailyCoachOutput> {
    const { lang } = input;
    const weakText = input.weakSubjects.join(", ");

    if (input.currentStreak >= 7) {
      return {
        message: L(
          `Ajoyib, ${input.studentName}! ${input.currentStreak} kunlik ketma-ket shug'ullanish — bu haqiqiy barqarorlik.`,
          `Отлично, ${input.studentName}! ${input.currentStreak} дней подряд — это настоящая стабильность.`,
          lang
        ),
        recommendedActions: weakText
          ? [L(`${weakText} bo'yicha bugun ham 20 daqiqa ajrating`, `Уделите сегодня 20 минут предмету «${weakText}»`, lang)]
          : [L("Bugun ham odatdagi rejangizni davom ettiring", "Продолжайте сегодня свой обычный план", lang)],
      };
    }

    // Already did something today — the "let's start" / "took a break" framings below
    // would flatly contradict a "done today" badge shown alongside this message.
    if (input.activeToday) {
      return {
        message: L(
          `Ajoyib, ${input.studentName}! Bugun allaqachon birinchi qadamni tashladingiz.`,
          `Отлично, ${input.studentName}! Вы уже сделали первый шаг сегодня.`,
          lang
        ),
        recommendedActions: weakText
          ? [L(`Xohlasangiz, ${weakText} bo'yicha ham mashq qiling`, `При желании потренируйтесь и по предмету «${weakText}»`, lang)]
          : [L("Xohlasangiz, yana bir fan bo'yicha mashq qiling", "При желании потренируйтесь ещё по одному предмету", lang)],
      };
    }

    if (input.isNewStudent) {
      return {
        message: L(
          `Xush kelibsiz, ${input.studentName}! Bu yerda siz o'z bilim darajangizni sinab ko'rasiz va shaxsiy o'quv rejangizni kuzatasiz.`,
          `Добро пожаловать, ${input.studentName}! Здесь вы можете проверить свои знания и следить за своим личным планом обучения.`,
          lang
        ),
        recommendedActions: [
          L("Birinchi testni topshirib, qaysi fanlarda kuchli ekaningizni bilib oling", "Пройдите первый тест, чтобы узнать, в каких предметах вы сильны", lang),
        ],
      };
    }

    if (!input.studiedYesterday) {
      return {
        message: L(
          `Salom, ${input.studentName}! Kecha tanaffus qildingiz — hech qisi yo'q, bugun qayta boshlaylik.`,
          `Привет, ${input.studentName}! Вчера был перерыв — ничего страшного, начнём сегодня заново.`,
          lang
        ),
        recommendedActions: [
          L("Bugun kichikroq maqsad bilan boshlang — 15 daqiqa yetarli", "Начните сегодня с небольшой цели — достаточно 15 минут", lang),
        ],
      };
    }

    return {
      message: L(
        `Salom, ${input.studentName}! Bugun ham davom etaylik.`,
        `Привет, ${input.studentName}! Продолжим и сегодня.`,
        lang
      ),
      recommendedActions: weakText
        ? [L(`${weakText} bo'yicha bugun mashq qiling`, `Сегодня потренируйтесь по предмету «${weakText}»`, lang)]
        : [L("Fanlaringizni muntazam takrorlashda davom eting", "Продолжайте регулярно повторять предметы", lang)],
    };
  }
}
