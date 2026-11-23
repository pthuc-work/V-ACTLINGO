// ==============================================================================
// V-ACT HUB: Data Types & Schema Definitions
// ==============================================================================

export type AnswerSource = 'document' | 'ai' | 'none' | 'user';
export type Visibility = 'private' | 'public' | 'unlisted';

export interface Figure {
  url: string;
  caption?: string;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  code: string; // e.g. "ENG", "VIE", "MATH"
  description?: string;
  icon?: string;
  position: number;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  userId: string;
  subjectId: string;
  name: string;
  description?: string;
  position: number;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export interface SetEntity {
  id: string;
  userId: string;
  topicId: string;
  name: string;
  description?: string;
  position: number;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export interface Passage {
  id: string;
  userId: string;
  setId?: string | null;
  title?: string;
  content: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  userId: string;
  setId: string;
  passageId?: string | null;
  no: number;
  prompt: string;
  options: string[]; // exactly 4 items
  correctIndex: number | null; // 0, 1, 2, 3 or null
  answerSource: AnswerSource;
  verified: boolean;
  category: string;
  formula: string;
  explanation: string;
  figure?: Figure | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface SetProgress {
  id: string;
  userId: string;
  setId: string;
  completed: boolean;
  score: number;
  totalQuestions: number;
  stars: number; // 0, 1, 2, 3
  attemptsCount: number;
  lastAttemptedAt?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionAttempt {
  id: string;
  userId: string;
  questionId: string;
  setId?: string | null;
  selectedIndex: number | null;
  isCorrect: boolean;
  isFlagged: boolean;
  timeSpentSeconds: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  id: string;
  userId: string;
  xp: number;
  streak: number;
  maxStreak: number;
  lastActiveDate?: string | null; // YYYY-MM-DD (Asia/Ho_Chi_Minh)
  streakFreezesWeekly: number; // 3/week
  streakFreezesReserve: number; // Permanent reserve earned when completing topics
  targetMajorCode: string; // default '106' (Khoa học Máy tính)
  targetMajorName: string;
  targetScore: number; // default 85.45
  dailyGoalXp: number; // default 50
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  geminiApiKey: string;
  geminiModel: string;
  reminderTime?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// Import / Export / Backup Schema Types
// ==============================================================================

export interface V1ImportQuestion {
  no?: number;
  passageId?: string | null;
  prompt: string;
  options: string[];
  correctIndex?: number | null;
  answerSource?: AnswerSource;
  verified?: boolean;
  category?: string;
  formula?: string;
  explanation?: string;
  figure?: Figure | null;
  position?: number;
}

export type V1EntityInput = string | { name: string; code?: string; description?: string; icon?: string };

export interface V1ImportPackage {
  schemaVersion: 1;
  subject: V1EntityInput;
  topic: V1EntityInput;
  set: V1EntityInput;
  part?: { index: number; total: number };
  passages?: Array<{ id?: string; text?: string; content?: string; title?: string; position?: number }>;
  questions: V1ImportQuestion[];
}

export interface FullBackupData {
  version: 1;
  exportedAt: string;
  subjects: Subject[];
  topics: Topic[];
  sets: SetEntity[];
  passages: Passage[];
  questions: Question[];
  setProgress: SetProgress[];
  questionAttempts: QuestionAttempt[];
  userStats: UserStats;
  settings: UserSettings;
}

// ==============================================================================
// Offline Write Sync Queue Types
// ==============================================================================

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncTable = 
  | 'subjects' 
  | 'topics' 
  | 'sets' 
  | 'passages' 
  | 'questions' 
  | 'set_progress' 
  | 'question_attempts' 
  | 'user_stats' 
  | 'settings';

export interface SyncQueueItem {
  id: string;
  table: SyncTable;
  operation: SyncOperation;
  recordId: string;
  data?: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}
