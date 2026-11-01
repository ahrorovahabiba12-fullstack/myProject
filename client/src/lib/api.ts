import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

// Access/refresh tokens live only in httpOnly cookies set by the server
// (see server/src/utils/authCookies.ts) — never in localStorage, so
// client-side JS (including anything an XSS bug might run) can't read them.
// `withCredentials` is what makes the browser actually send those cookies on
// every cross-origin (same-site, different-port) request to the API.
export const api = axios.create({ baseURL: API_URL, withCredentials: true });

// Current UI language on every request — the backend picks nameUz/nameRu
// (and every AI-generated reply) against this header, kept in sync with
// i18next via localStorage since the language can change without a reload.
api.interceptors.request.use((config) => {
  config.headers["X-Lang"] = localStorage.getItem("lang") ?? "uz";
  return config;
});

// On a 401, try exactly one silent refresh before giving up and logging out.
// The refresh call carries the refreshToken cookie automatically; a
// successful response just re-sets fresh cookies server-side — there's
// nothing for the client to read or store.
let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    await axios.post(`${API_URL}/auth/refresh`, undefined, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryableRequestConfig | undefined;
    // A 401 from /auth/* (e.g. a wrong password on /auth/login) is the
    // answer itself, not an expired session — refreshing and then redirecting
    // to /login reloaded the page and wiped the error message off the form.
    const isAuthRequest = original?.url?.startsWith("/auth/") ?? false;
    if (error.response?.status === 401 && original && !original._retry && !isAuthRequest) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccessToken();
      const refreshed = await refreshing;
      refreshing = null;
      if (refreshed) {
        return api.request(original);
      }
      // The session is really gone — drop the cached user too, or
      // ProtectedRoute would keep letting this tab back into pages that 401.
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ---- Response shapes (mirror the backend DTOs exactly — see PROJECT_STATUS.md) ----

export interface AuthSession {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: "STUDENT" | "PARENT" | "ADMIN";
    studentId?: string;
    parentId?: string;
    grade?: number;
  };
}

export interface StudentProfile {
  id: string;
  fullName: string;
  grade: number;
  parent: { fullName: string; email: string } | null;
  region: string | null;
  interests: string[];
  goals: string[];
  careerInterests: string[];
  careerModuleVisible: boolean;
  subjectLevels: { subjectCode: string; subjectNameUz: string; level: "WEAK" | "MEDIUM" | "STRONG"; score: number }[];
}

export interface DashboardSummary {
  fullName: string;
  grade: number;
  streakDays: number;
  points: number;
  badgeCount: number;
  careerModuleVisible: boolean;
  todaySubjectCount: number;
}

// ---- API calls ----

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    role: "STUDENT" | "PARENT";
    fullName: string;
    grade?: number;
    parentEmail?: string;
  }) => api.post<AuthSession>("/auth/register", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthSession>("/auth/login", data).then((r) => r.data),

  logout: () => api.post("/auth/logout"),
};

export const studentApi = {
  getProfile: () => api.get<StudentProfile>("/students/me").then((r) => r.data),
  getDashboard: () => api.get<DashboardSummary>("/students/dashboard").then((r) => r.data),
  updateProfile: (data: Partial<Pick<StudentProfile, "interests" | "goals" | "careerInterests" | "region">>) =>
    api.patch<StudentProfile>("/students/me", data).then((r) => r.data),
  linkParent: (parentEmail: string) =>
    api.put<{ parent: { fullName: string; email: string } }>("/students/me/parent", { parentEmail }).then((r) => r.data),
};

export const subjectApi = {
  list: () => api.get<{ id: string; code: string; nameUz: string; nameRu: string; name: string }[]>("/subjects").then((r) => r.data),
};

export interface QuizReviewItem {
  questionId: string;
  text: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string | null;
}

export interface QuizSubject {
  code: string;
  name: string;
  minGrade: number;
  maxGrade: number;
  grades: number[];
}

export interface QuizTopic {
  id: string;
  number: number;
  name: string;
  questionCount: number;
}

export interface QuizEvaluation {
  mark: 2 | 3 | 4 | 5;
  title: string;
  message: string;
  advice: string;
}

export interface QuizStart {
  topic: { id: string; name: string; grade: number };
  subject: { code: string; name: string };
  questions: { id: string; text: string; options: string[] }[];
  quizToken: string;
}

export interface QuizSubmitResult {
  score: number;
  level: string;
  correctCount: number;
  total: number;
  newBadges: string[];
  review: QuizReviewItem[];
  evaluation: QuizEvaluation;
}

export const quizApi = {
  subjects: () => api.get<{ grade: number; subjects: QuizSubject[] }>("/quiz/subjects").then((r) => r.data),
  topics: (subject: string, grade: number) =>
    api
      .get<{ subject: { code: string; name: string }; grade: number; topics: QuizTopic[] }>("/quiz/topics", { params: { subject, grade } })
      .then((r) => r.data),
  start: (topicId: string) => api.post<QuizStart>("/quiz/start", { topicId }).then((r) => r.data),
  // quizToken is start's opaque, server-signed record of this attempt — echoed
  // back as-is; the server takes subject, grade, topic and timing from it.
  submit: (quizToken: string, answers: { questionId: string; selectedIndex: number }[]) =>
    api.post<QuizSubmitResult>("/quiz/submit", { quizToken, answers }).then((r) => r.data),
};

export interface LearningRecommendation {
  title: string;
  items: { subjectCode: string; reason: string; minutesPerWeek: number; priority: number }[];
}

export const recommendationApi = {
  getLearning: () => api.get<LearningRecommendation>("/recommendations/learning").then((r) => r.data),
};

export const careerApi = {
  getRecommendations: () => api.get("/career/recommendations").then((r) => r.data),
  getRoadmap: (careerCode: string) => api.get(`/career/roadmap/${careerCode}`).then((r) => r.data),
  getUniversities: () =>
    api
      .get<{
        topSubject: string | null;
        universities: {
          id: string;
          name: string;
          description: string;
          city: string;
          country: string;
          region: string;
          programs: string[];
          website: string;
        }[];
      }>("/career/universities")
      .then((r) => r.data),
  getCatalog: () => api.get<{ code: string; name: string }[]>("/career/catalog").then((r) => r.data),
  getTest: () => api.get<CareerTest>("/career/test").then((r) => r.data),
  latestTest: () => api.get<CareerTestResult | null>("/career/test/latest").then((r) => r.data),
  submitTest: (answers: number[]) => api.post<CareerTestResult>("/career/test", { answers }).then((r) => r.data),
  getDetails: (code: string) => api.get<CareerDetails>(`/career/details/${code}`).then((r) => r.data),
  studyCenters: (subject: string, region?: string | null) =>
    api.get<StudyCenter[]>("/career/study-centers", { params: { subject, ...(region ? { region } : {}) } }).then((r) => r.data),
};

export type RiasecType = { code: string; name: string; description: string; emoji: string };
export type CareerTest = { questions: { index: number; text: string }[]; types: RiasecType[] };
export type CareerTestResult = {
  createdAt: string;
  scores: (RiasecType & { score: number })[];
  topTypes: RiasecType[];
  careers: { code: string; name: string; description: string; matchScore: number; types: RiasecType[]; examSubjects: string[] }[];
};
export type ExamBlock = { code: string; name: string; questions: number; points: number };
export type CareerDetails = {
  code: string;
  name: string;
  description: string;
  types: RiasecType[];
  exam: {
    compulsory: ExamBlock[];
    specialty: (ExamBlock & { block: "first" | "second"; myLevel: string | null; myScore: number | null })[];
    maxScore: number;
    extra: string | null;
  };
  universities: {
    id: string;
    name: string;
    description: string;
    city: string;
    regionCode: string;
    region: string;
    programs: string[];
    website: string;
    nearMe: boolean;
  }[];
  studentRegion: string | null;
  hasRoadmap: boolean;
};
export type StudyCenter = {
  code: string;
  name: string;
  regions: string[];
  city: string;
  website: string;
  source: string;
  sourceUrl: string;
  verified: boolean;
};

export interface ChatHistory {
  conversationId: string;
  messages: { id: string; role: string; content: string }[];
}

export const chatApi = {
  getHistory: () => api.get<ChatHistory>("/chat/history").then((r) => r.data),
  sendMessage: (message: string) => api.post<{ conversationId: string; reply: string }>("/chat/message", { message }).then((r) => r.data),
};

export const progressApi = {
  getOverview: () => api.get("/progress/overview").then((r) => r.data),
  analyze: () => api.get("/progress/analyze").then((r) => r.data),
};

export const parentApi = {
  listChildren: () => api.get("/parent/children").then((r) => r.data),
  getChildDashboard: (studentId: string) => api.get(`/parent/children/${studentId}/dashboard`).then((r) => r.data),
  generateReport: (studentId: string) => api.post(`/parent/children/${studentId}/report`).then((r) => r.data),
};

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export const notificationApi = {
  list: () => api.get<NotificationItem[]>("/notifications").then((r) => r.data),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count").then((r) => r.data),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
};

export const achievementApi = {
  list: () =>
    api
      .get<{
        badges: { id: string; code: string; name: string; description: string; icon: string; unlocked: boolean; unlockedAt: string | null }[];
        points: number;
        streakDays: number;
      }>("/achievements")
      .then((r) => r.data),
};

export interface DailyCoachMessage {
  id: string;
  message: string;
  recommendedActions: string[];
  activeToday: boolean;
  coachDate: string;
}

export const dailyCoachApi = {
  getToday: () => api.get<DailyCoachMessage>("/daily-coach/today").then((r) => r.data),
};

export interface ConsistencyScoreData {
  score: number;
  activeDays: number;
  plannedDays: number;
  completedDays: number;
  periodStart: string;
  periodEnd: string;
}

export const consistencyApi = {
  getScore: () => api.get<ConsistencyScoreData>("/consistency").then((r) => r.data),
};

export interface SubjectActivity {
  subjectId: string;
  subjectName: string;
  sessionCount: number;
  minutes: number;
}

export interface DailyTrendPoint {
  date: string;
  minutes: number;
}

export interface StudyStats {
  actualMinutes: number;
  sessionCount: number;
  avgSessionMinutes: number;
  consistencyScore: number;
  currentStreak: number;
  subjectBreakdown: SubjectActivity[];
  dailyTrend: DailyTrendPoint[];
}

export const studyAnalyticsApi = {
  getStats: () => api.get<StudyStats>("/study-analytics/stats").then((r) => r.data),
  getRecommendation: () =>
    api.get<{ recommendation: string }>("/study-analytics/recommendation").then((r) => r.data),
};

export interface DailyCountPoint {
  date: string;
  count: number;
}

export interface AdminStats {
  users: {
    total: number;
    students: number;
    parents: number;
    admins: number;
    newUsersTrend: DailyCountPoint[];
  };
  studentsByGrade: { grade: number; count: number }[];
  quizzes: {
    totalAttempts: number;
    averageScore: number;
    attemptsTrend: DailyCountPoint[];
  };
  engagement: {
    activeStudentsToday: number;
    aiConversations: number;
    aiMessages: number;
    totalAchievements: number;
    unreadNotifications: number;
  };
  catalog: { subjects: number; questions: number; careers: number; universities: number };
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: "STUDENT" | "PARENT" | "ADMIN";
  status: "ACTIVE" | "BLOCKED";
  createdAt: string;
  grade: number | null;
  childrenCount: number | null;
  children: { fullName: string; grade: number }[];
}

export interface AdminActiveStudentToday {
  fullName: string;
  email: string;
  grade: number;
  studyMinutes: number;
}

export interface AdminSubject {
  id: string;
  code: string;
  nameUz: string;
  nameRu: string;
  active: boolean;
  questionCount: number;
}

export interface AdminCareer {
  id: string;
  code: string;
  nameUz: string;
  nameRu: string;
  minGrade: number;
}

export interface AdminUniversity {
  id: string;
  nameUz: string;
  nameRu: string;
  country: string;
  city: string;
}

export interface AdminNotificationInput {
  title: string;
  body: string;
  titleRu?: string;
  bodyRu?: string;
  audience: "STUDENTS" | "PARENTS" | "ALL";
  grade?: number;
  email?: string;
}

export const adminApi = {
  getStats: () => api.get<AdminStats>("/admin/stats").then((r) => r.data),
  listUsers: () => api.get<AdminUser[]>("/admin/users").then((r) => r.data),
  listActiveStudentsToday: () => api.get<AdminActiveStudentToday[]>("/admin/active-students-today").then((r) => r.data),
  listSubjects: () => api.get<AdminSubject[]>("/admin/subjects").then((r) => r.data),
  listCareers: () => api.get<AdminCareer[]>("/admin/careers").then((r) => r.data),
  listUniversities: () => api.get<AdminUniversity[]>("/admin/universities").then((r) => r.data),
  sendNotification: (input: AdminNotificationInput) =>
    api.post<{ sent: number }>("/admin/notifications", input).then((r) => r.data),
  updateUserStatus: (userId: string, status: "ACTIVE" | "BLOCKED") =>
    api.patch<{ id: string; status: "ACTIVE" | "BLOCKED" }>(`/admin/users/${userId}/status`, { status }).then((r) => r.data),
};


export type DtmBlock = "first" | "second" | "compulsory";
export type DtmSubjects = {
  blocks: Record<DtmBlock | "max", { questions: number; points: number } | number>;
  compulsory: string[];
  subjects: { code: string; name: string; available: number; compulsory: boolean }[];
};
export type DtmStart = {
  subject: { code: string; name: string };
  block: DtmBlock;
  points: number;
  questions: { id: string; text: string; options: string[]; grade: number }[];
  dtmToken: string;
};
export type DtmResult = {
  block: DtmBlock;
  correct: number;
  total: number;
  points: number;
  maxPoints: number;
  percent: number;
  review: (Omit<QuizReviewItem, "selectedIndex"> & { selectedIndex: number | null })[];
};
export const dtmApi = {
  subjects: () => api.get<DtmSubjects>("/dtm/subjects").then((r) => r.data),
  start: (subject: string, block: DtmBlock) => api.post<DtmStart>("/dtm/start", { subject, block }).then((r) => r.data),
  submit: (dtmToken: string, answers: { questionId: string; selectedIndex: number }[]) =>
    api.post<DtmResult>("/dtm/submit", { dtmToken, answers }).then((r) => r.data),
};
