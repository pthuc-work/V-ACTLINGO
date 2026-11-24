// ==============================================================================
// V-ACT HUB: Data Repository Interface
// ==============================================================================

import {
  Subject,
  Topic,
  SetEntity,
  Passage,
  Question,
  SetProgress,
  QuestionAttempt,
  UserStats,
  UserSettings,
  FullBackupData,
  V1ImportPackage,
} from './types';

export interface DataRepository {
  readonly mode: 'local' | 'supabase';

  // ----------------------------------------------------------------------------
  // Subjects
  // ----------------------------------------------------------------------------
  getSubjects(): Promise<Subject[]>;
  getSubject(id: string): Promise<Subject | null>;
  createSubject(data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Subject>;
  updateSubject(id: string, data: Partial<Subject>): Promise<Subject>;
  deleteSubject(id: string): Promise<void>;
  reorderSubjects(orderedIds: string[]): Promise<void>;

  // ----------------------------------------------------------------------------
  // Topics
  // ----------------------------------------------------------------------------
  getTopics(subjectId?: string): Promise<Topic[]>;
  getTopic(id: string): Promise<Topic | null>;
  createTopic(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Topic>;
  updateTopic(id: string, data: Partial<Topic>): Promise<Topic>;
  deleteTopic(id: string): Promise<void>;
  reorderTopics(orderedIds: string[]): Promise<void>;

  // ----------------------------------------------------------------------------
  // Sets
  // ----------------------------------------------------------------------------
  getSets(topicId?: string): Promise<SetEntity[]>;
  getSet(id: string): Promise<SetEntity | null>;
  createSet(data: Omit<SetEntity, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<SetEntity>;
  updateSet(id: string, data: Partial<SetEntity>): Promise<SetEntity>;
  deleteSet(id: string): Promise<void>;
  reorderSets(orderedIds: string[]): Promise<void>;

  // ----------------------------------------------------------------------------
  // Passages
  // ----------------------------------------------------------------------------
  getPassages(setId?: string): Promise<Passage[]>;
  getPassage(id: string): Promise<Passage | null>;
  createPassage(data: Omit<Passage, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Passage>;
  updatePassage(id: string, data: Partial<Passage>): Promise<Passage>;
  deletePassage(id: string): Promise<void>;

  // ----------------------------------------------------------------------------
  // Questions
  // ----------------------------------------------------------------------------
  getQuestions(setId?: string): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | null>;
  createQuestion(data: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Question>;
  updateQuestion(id: string, data: Partial<Question>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  bulkCreateQuestions(questions: Array<Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }>): Promise<Question[]>;

  // ----------------------------------------------------------------------------
  // Progress & Attempts
  // ----------------------------------------------------------------------------
  getSetProgress(setId: string): Promise<SetProgress | null>;
  getAllSetProgress(): Promise<SetProgress[]>;
  saveSetProgress(progress: Omit<SetProgress, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<SetProgress>;

  recordAttempt(attempt: Omit<QuestionAttempt, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<QuestionAttempt>;
  getAttempts(questionId?: string): Promise<QuestionAttempt[]>;
  getIncorrectAttempts(): Promise<QuestionAttempt[]>;
  clearFlaggedAttempt(id: string): Promise<void>;

  // ----------------------------------------------------------------------------
  // User Stats & Settings
  // ----------------------------------------------------------------------------
  getUserStats(): Promise<UserStats>;
  updateUserStats(stats: Partial<UserStats>): Promise<UserStats>;

  getSettings(): Promise<UserSettings>;
  updateSettings(settings: Partial<UserSettings>): Promise<UserSettings>;
  saveSettings(settings: Partial<UserSettings> & Partial<UserStats>): Promise<void>;

  // ----------------------------------------------------------------------------
  // Backup, Migration & Utilities
  // ----------------------------------------------------------------------------
  exportFullBackup(): Promise<FullBackupData>;
  importFullBackup(backup: FullBackupData): Promise<void>;
  importV1Package(pkg: V1ImportPackage): Promise<{ subjectId: string; topicId: string; setId: string; questionCount: number }>;
  clearAllData(): Promise<void>;
}
