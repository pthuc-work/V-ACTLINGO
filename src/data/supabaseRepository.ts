// ==============================================================================
// V-ACT HUB: SupabaseRepository (Supabase + Local Cache & Offline Sync Queue)
// ==============================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase, getCurrentUser } from '../lib/supabase';
import { DataRepository } from './repository';
import { LocalRepository, LOCAL_USER_ID } from './localRepository';
import { syncQueueManager } from './syncQueue';
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
  FormulaGroup,
} from './types';

// ==============================================================================
// Mapping Helpers (camelCase <-> snake_case)
// ==============================================================================

function toSubject(row: any): Subject {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    code: row.code,
    description: row.description || '',
    icon: row.icon || '',
    position: row.position,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromSubject(item: Partial<Subject>): any {
  const row: any = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.userId !== undefined) row.user_id = item.userId;
  if (item.name !== undefined) row.name = item.name;
  if (item.code !== undefined) row.code = item.code;
  if (item.description !== undefined) row.description = item.description;
  if (item.icon !== undefined) row.icon = item.icon;
  if (item.position !== undefined) row.position = item.position;
  if (item.visibility !== undefined) row.visibility = item.visibility;
  return row;
}

function toTopic(row: any): Topic {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    name: row.name,
    description: row.description || '',
    position: row.position,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromTopic(item: Partial<Topic>): any {
  const row: any = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.userId !== undefined) row.user_id = item.userId;
  if (item.subjectId !== undefined) row.subject_id = item.subjectId;
  if (item.name !== undefined) row.name = item.name;
  if (item.description !== undefined) row.description = item.description;
  if (item.position !== undefined) row.position = item.position;
  if (item.visibility !== undefined) row.visibility = item.visibility;
  return row;
}

function toSet(row: any): SetEntity {
  return {
    id: row.id,
    userId: row.user_id,
    topicId: row.topic_id,
    name: row.name,
    description: row.description || '',
    position: row.position,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromSet(item: Partial<SetEntity>): any {
  const row: any = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.userId !== undefined) row.user_id = item.userId;
  if (item.topicId !== undefined) row.topic_id = item.topicId;
  if (item.name !== undefined) row.name = item.name;
  if (item.description !== undefined) row.description = item.description;
  if (item.position !== undefined) row.position = item.position;
  if (item.visibility !== undefined) row.visibility = item.visibility;
  return row;
}

function toPassage(row: any): Passage {
  return {
    id: row.id,
    userId: row.user_id,
    setId: row.set_id,
    title: row.title || '',
    content: row.content,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromPassage(item: Partial<Passage>): any {
  const row: any = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.userId !== undefined) row.user_id = item.userId;
  if (item.setId !== undefined) row.set_id = item.setId;
  if (item.title !== undefined) row.title = item.title;
  if (item.content !== undefined) row.content = item.content;
  if (item.position !== undefined) row.position = item.position;
  return row;
}

function toQuestion(row: any): Question {
  return {
    id: row.id,
    userId: row.user_id,
    setId: row.set_id,
    passageId: row.passage_id,
    no: row.no,
    prompt: row.prompt,
    options: row.options || [],
    correctIndex: row.correct_index,
    answerSource: row.answer_source,
    verified: row.verified,
    category: row.category || '',
    formula: row.formula || '',
    explanation: row.explanation || '',
    figure: row.figure || null,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromQuestion(item: Partial<Question>): any {
  const row: any = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.userId !== undefined) row.user_id = item.userId;
  if (item.setId !== undefined) row.set_id = item.setId;
  if (item.passageId !== undefined) row.passage_id = item.passageId;
  if (item.no !== undefined) row.no = item.no;
  if (item.prompt !== undefined) row.prompt = item.prompt;
  if (item.options !== undefined) row.options = item.options;
  if (item.correctIndex !== undefined) row.correct_index = item.correctIndex;
  if (item.answerSource !== undefined) row.answer_source = item.answerSource;
  if (item.verified !== undefined) row.verified = item.verified;
  if (item.category !== undefined) row.category = item.category;
  if (item.formula !== undefined) row.formula = item.formula;
  if (item.explanation !== undefined) row.explanation = item.explanation;
  if (item.figure !== undefined) row.figure = item.figure;
  if (item.position !== undefined) row.position = item.position;
  return row;
}

function toSetProgress(row: any): SetProgress {
  return {
    id: row.id,
    userId: row.user_id,
    setId: row.set_id,
    completed: row.completed,
    score: Number(row.score),
    totalQuestions: row.total_questions,
    stars: row.stars,
    attemptsCount: row.attempts_count,
    lastAttemptedAt: row.last_attempted_at,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resume_state: row.resume_state ?? null,
    resumeState: row.resume_state ?? null,
  };
}

function fromSetProgress(item: Partial<SetProgress>): any {
  const row: any = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.userId !== undefined) row.user_id = item.userId;
  if (item.setId !== undefined) row.set_id = item.setId;
  if (item.completed !== undefined) row.completed = item.completed;
  if (item.score !== undefined) row.score = item.score;
  if (item.totalQuestions !== undefined) row.total_questions = item.totalQuestions;
  if (item.stars !== undefined) row.stars = item.stars;
  if (item.attemptsCount !== undefined) row.attempts_count = item.attemptsCount;
  if (item.lastAttemptedAt !== undefined) row.last_attempted_at = item.lastAttemptedAt;
  if (item.position !== undefined) row.position = item.position;
  if ((item as any).resume_state !== undefined || (item as any).resumeState !== undefined) {
    row.resume_state = (item as any).resume_state ?? (item as any).resumeState;
  }
  return row;
}

function toQuestionAttempt(row: any): QuestionAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    questionId: row.question_id,
    setId: row.set_id,
    selectedIndex: row.selected_index,
    isCorrect: row.is_correct,
    isFlagged: row.is_flagged,
    timeSpentSeconds: row.time_spent_seconds,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromQuestionAttempt(item: Partial<QuestionAttempt>): any {
  const row: any = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.userId !== undefined) row.user_id = item.userId;
  if (item.questionId !== undefined) row.question_id = item.questionId;
  if (item.setId !== undefined) row.set_id = item.setId;
  if (item.selectedIndex !== undefined) row.selected_index = item.selectedIndex;
  if (item.isCorrect !== undefined) row.is_correct = item.isCorrect;
  if (item.isFlagged !== undefined) row.is_flagged = item.isFlagged;
  if (item.timeSpentSeconds !== undefined) row.time_spent_seconds = item.timeSpentSeconds;
  if (item.position !== undefined) row.position = item.position;
  return row;
}

function toUserStats(row: any): UserStats {
  return {
    id: row.id,
    userId: row.user_id,
    xp: row.xp,
    streak: row.streak,
    maxStreak: row.max_streak,
    lastActiveDate: row.last_active_date,
    streakFreezesWeekly: row.streak_freezes_weekly,
    streakFreezesReserve: row.streak_freezes_reserve,
    targetMajorCode: row.target_major_code,
    targetMajorName: row.target_major_name,
    targetScore: Number(row.target_score),
    dailyGoalXp: row.daily_goal_xp,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromUserStats(item: Partial<UserStats>): any {
  const row: any = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.userId !== undefined) row.user_id = item.userId;
  if (item.xp !== undefined) row.xp = item.xp;
  if (item.streak !== undefined) row.streak = item.streak;
  if (item.maxStreak !== undefined) row.max_streak = item.maxStreak;
  if (item.lastActiveDate !== undefined) row.last_active_date = item.lastActiveDate;
  if (item.streakFreezesWeekly !== undefined) row.streak_freezes_weekly = item.streakFreezesWeekly;
  if (item.streakFreezesReserve !== undefined) row.streak_freezes_reserve = item.streakFreezesReserve;
  if (item.targetMajorCode !== undefined) row.target_major_code = item.targetMajorCode;
  if (item.targetMajorName !== undefined) row.target_major_name = item.targetMajorName;
  if (item.targetScore !== undefined) row.target_score = item.targetScore;
  if (item.dailyGoalXp !== undefined) row.daily_goal_xp = item.dailyGoalXp;
  if (item.position !== undefined) row.position = item.position;
  return row;
}

function toSettings(row: any): UserSettings {
  return {
    id: row.id,
    userId: row.user_id,
    soundEnabled: row.sound_enabled,
    hapticsEnabled: row.haptics_enabled,
    theme: row.theme,
    geminiApiKey: row.gemini_api_key || '',
    geminiModel: row.gemini_model || 'gemini-1.5-flash',
    reminderTime: row.reminder_time,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromSettings(item: Partial<UserSettings>): any {
  const row: any = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.userId !== undefined) row.user_id = item.userId;
  if (item.soundEnabled !== undefined) row.sound_enabled = item.soundEnabled;
  if (item.hapticsEnabled !== undefined) row.haptics_enabled = item.hapticsEnabled;
  if (item.theme !== undefined) row.theme = item.theme;
  if (item.geminiApiKey !== undefined) row.gemini_api_key = item.geminiApiKey;
  if (item.geminiModel !== undefined) row.gemini_model = item.geminiModel;
  if (item.reminderTime !== undefined) row.reminder_time = item.reminderTime;
  if (item.position !== undefined) row.position = item.position;
  return row;
}

// ==============================================================================
// SupabaseRepository Implementation
// ==============================================================================

export class SupabaseRepository implements DataRepository {
  public readonly mode = 'supabase' as const;
  private client: SupabaseClient;
  private localCache: LocalRepository;

  constructor(client?: SupabaseClient) {
    if (!client && !defaultSupabase) {
      throw new Error('Supabase client is not available. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    this.client = client || defaultSupabase!;
    this.localCache = new LocalRepository();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flushSyncQueue();
      });
    }
  }

  private async getUserId(): Promise<string> {
    const user = await getCurrentUser();
    return user ? user.id : LOCAL_USER_ID;
  }

  async flushSyncQueue() {
    return syncQueueManager.processQueue(this.client);
  }

  // ----------------------------------------------------------------------------
  // Subjects
  // ----------------------------------------------------------------------------
  async getSubjects(): Promise<Subject[]> {
    try {
      const { data, error } = await this.client
        .from('subjects')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      const subjects = (data || []).map(toSubject);

      // Cache locally
      for (const s of subjects) {
        await this.localCache.createSubject(s).catch(() => this.localCache.updateSubject(s.id, s));
      }
      return subjects;
    } catch (err) {
      console.warn('Supabase getSubjects failed, serving from local cache:', err);
      return this.localCache.getSubjects();
    }
  }

  async getSubject(id: string): Promise<Subject | null> {
    try {
      const { data, error } = await this.client
        .from('subjects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const item = toSubject(data);
      await this.localCache.createSubject(item).catch(() => this.localCache.updateSubject(item.id, item));
      return item;
    } catch {
      return this.localCache.getSubject(id);
    }
  }

  async createSubject(data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Subject> {
    const userId = data.userId || await this.getUserId();
    const createdLocal = await this.localCache.createSubject({ ...data, userId });
    const row = fromSubject(createdLocal);

    try {
      const { data: inserted, error } = await this.client.from('subjects').insert(row).select().single();
      if (error) throw error;
      return toSubject(inserted);
    } catch (err) {
      await syncQueueManager.enqueue('subjects', 'INSERT', createdLocal.id, row);
      return createdLocal;
    }
  }

  async updateSubject(id: string, data: Partial<Subject>): Promise<Subject> {
    const updatedLocal = await this.localCache.updateSubject(id, data);
    const row = fromSubject(data);

    try {
      const { data: updated, error } = await this.client.from('subjects').update(row).eq('id', id).select().single();
      if (error) throw error;
      return toSubject(updated);
    } catch {
      await syncQueueManager.enqueue('subjects', 'UPDATE', id, { ...row, id });
      return updatedLocal;
    }
  }

  async deleteSubject(id: string): Promise<void> {
    await this.localCache.deleteSubject(id);
    try {
      const { error } = await this.client.from('subjects').delete().eq('id', id);
      if (error) throw error;
    } catch {
      await syncQueueManager.enqueue('subjects', 'DELETE', id);
    }
  }

  async reorderSubjects(orderedIds: string[]): Promise<void> {
    await this.localCache.reorderSubjects(orderedIds);
    for (let i = 0; i < orderedIds.length; i++) {
      try {
        await this.client.from('subjects').update({ position: i }).eq('id', orderedIds[i]);
      } catch {
        await syncQueueManager.enqueue('subjects', 'UPDATE', orderedIds[i], { id: orderedIds[i], position: i });
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Topics
  // ----------------------------------------------------------------------------
  async getTopics(subjectId?: string): Promise<Topic[]> {
    try {
      let query = this.client.from('topics').select('*').order('position', { ascending: true });
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      const topics = (data || []).map(toTopic);

      for (const t of topics) {
        await this.localCache.createTopic(t).catch(() => this.localCache.updateTopic(t.id, t));
      }
      return topics;
    } catch (err) {
      console.warn('Supabase getTopics failed, serving from local cache:', err);
      return this.localCache.getTopics(subjectId);
    }
  }

  async getTopic(id: string): Promise<Topic | null> {
    try {
      const { data, error } = await this.client.from('topics').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const item = toTopic(data);
      await this.localCache.createTopic(item).catch(() => this.localCache.updateTopic(item.id, item));
      return item;
    } catch {
      return this.localCache.getTopic(id);
    }
  }

  async createTopic(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Topic> {
    const userId = data.userId || await this.getUserId();
    const createdLocal = await this.localCache.createTopic({ ...data, userId });
    const row = fromTopic(createdLocal);

    try {
      const { data: inserted, error } = await this.client.from('topics').insert(row).select().single();
      if (error) throw error;
      return toTopic(inserted);
    } catch {
      await syncQueueManager.enqueue('topics', 'INSERT', createdLocal.id, row);
      return createdLocal;
    }
  }

  async updateTopic(id: string, data: Partial<Topic>): Promise<Topic> {
    const updatedLocal = await this.localCache.updateTopic(id, data);
    const row = fromTopic(data);

    try {
      const { data: updated, error } = await this.client.from('topics').update(row).eq('id', id).select().single();
      if (error) throw error;
      return toTopic(updated);
    } catch {
      await syncQueueManager.enqueue('topics', 'UPDATE', id, { ...row, id });
      return updatedLocal;
    }
  }

  async deleteTopic(id: string): Promise<void> {
    await this.localCache.deleteTopic(id);
    try {
      const { error } = await this.client.from('topics').delete().eq('id', id);
      if (error) throw error;
    } catch {
      await syncQueueManager.enqueue('topics', 'DELETE', id);
    }
  }

  async reorderTopics(orderedIds: string[]): Promise<void> {
    await this.localCache.reorderTopics(orderedIds);
    for (let i = 0; i < orderedIds.length; i++) {
      try {
        await this.client.from('topics').update({ position: i }).eq('id', orderedIds[i]);
      } catch {
        await syncQueueManager.enqueue('topics', 'UPDATE', orderedIds[i], { id: orderedIds[i], position: i });
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Sets
  // ----------------------------------------------------------------------------
  async getSets(topicId?: string): Promise<SetEntity[]> {
    try {
      let query = this.client.from('sets').select('*').order('position', { ascending: true });
      if (topicId) {
        query = query.eq('topic_id', topicId);
      }
      const { data, error } = await query;
      if (error) throw error;
      const sets = (data || []).map(toSet);

      for (const s of sets) {
        await this.localCache.createSet(s).catch(() => this.localCache.updateSet(s.id, s));
      }
      return sets;
    } catch (err) {
      console.warn('Supabase getSets failed, serving from local cache:', err);
      return this.localCache.getSets(topicId);
    }
  }

  async getSet(id: string): Promise<SetEntity | null> {
    try {
      const { data, error } = await this.client.from('sets').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const item = toSet(data);
      await this.localCache.createSet(item).catch(() => this.localCache.updateSet(item.id, item));
      return item;
    } catch {
      return this.localCache.getSet(id);
    }
  }

  async createSet(data: Omit<SetEntity, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<SetEntity> {
    const userId = data.userId || await this.getUserId();
    const createdLocal = await this.localCache.createSet({ ...data, userId });
    const row = fromSet(createdLocal);

    try {
      const { data: inserted, error } = await this.client.from('sets').insert(row).select().single();
      if (error) throw error;
      return toSet(inserted);
    } catch {
      await syncQueueManager.enqueue('sets', 'INSERT', createdLocal.id, row);
      return createdLocal;
    }
  }

  async updateSet(id: string, data: Partial<SetEntity>): Promise<SetEntity> {
    const updatedLocal = await this.localCache.updateSet(id, data);
    const row = fromSet(data);

    try {
      const { data: updated, error } = await this.client.from('sets').update(row).eq('id', id).select().single();
      if (error) throw error;
      return toSet(updated);
    } catch {
      await syncQueueManager.enqueue('sets', 'UPDATE', id, { ...row, id });
      return updatedLocal;
    }
  }

  async deleteSet(id: string): Promise<void> {
    await this.localCache.deleteSet(id);
    try {
      const { error } = await this.client.from('sets').delete().eq('id', id);
      if (error) throw error;
    } catch {
      await syncQueueManager.enqueue('sets', 'DELETE', id);
    }
  }

  async reorderSets(orderedIds: string[]): Promise<void> {
    await this.localCache.reorderSets(orderedIds);
    for (let i = 0; i < orderedIds.length; i++) {
      try {
        await this.client.from('sets').update({ position: i }).eq('id', orderedIds[i]);
      } catch {
        await syncQueueManager.enqueue('sets', 'UPDATE', orderedIds[i], { id: orderedIds[i], position: i });
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Passages
  // ----------------------------------------------------------------------------
  async getPassages(setId?: string): Promise<Passage[]> {
    try {
      let query = this.client.from('passages').select('*').order('position', { ascending: true });
      if (setId) {
        query = query.eq('set_id', setId);
      }
      const { data, error } = await query;
      if (error) throw error;
      const passages = (data || []).map(toPassage);

      for (const p of passages) {
        await this.localCache.createPassage(p).catch(() => this.localCache.updatePassage(p.id, p));
      }
      return passages;
    } catch (err) {
      console.warn('Supabase getPassages failed, serving from local cache:', err);
      return this.localCache.getPassages(setId);
    }
  }

  async getPassage(id: string): Promise<Passage | null> {
    try {
      const { data, error } = await this.client.from('passages').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return toPassage(data);
    } catch {
      return this.localCache.getPassage(id);
    }
  }

  async createPassage(data: Omit<Passage, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Passage> {
    const userId = data.userId || await this.getUserId();
    const createdLocal = await this.localCache.createPassage({ ...data, userId });
    const row = fromPassage(createdLocal);

    try {
      const { data: inserted, error } = await this.client.from('passages').insert(row).select().single();
      if (error) throw error;
      return toPassage(inserted);
    } catch {
      await syncQueueManager.enqueue('passages', 'INSERT', createdLocal.id, row);
      return createdLocal;
    }
  }

  async updatePassage(id: string, data: Partial<Passage>): Promise<Passage> {
    const updatedLocal = await this.localCache.updatePassage(id, data);
    const row = fromPassage(data);

    try {
      const { data: updated, error } = await this.client.from('passages').update(row).eq('id', id).select().single();
      if (error) throw error;
      return toPassage(updated);
    } catch {
      await syncQueueManager.enqueue('passages', 'UPDATE', id, { ...row, id });
      return updatedLocal;
    }
  }

  async deletePassage(id: string): Promise<void> {
    await this.localCache.deletePassage(id);
    try {
      const { error } = await this.client.from('passages').delete().eq('id', id);
      if (error) throw error;
    } catch {
      await syncQueueManager.enqueue('passages', 'DELETE', id);
    }
  }

  // ----------------------------------------------------------------------------
  // Questions
  // ----------------------------------------------------------------------------
  async getQuestions(setId?: string): Promise<Question[]> {
    try {
      let query = this.client.from('questions').select('*').order('position', { ascending: true });
      if (setId) {
        query = query.eq('set_id', setId);
      }
      const { data, error } = await query;
      if (error) throw error;
      const questions = (data || []).map(toQuestion);

      for (const q of questions) {
        await this.localCache.createQuestion(q).catch(() => this.localCache.updateQuestion(q.id, q));
      }
      return questions;
    } catch (err) {
      console.warn('Supabase getQuestions failed, serving from local cache:', err);
      return this.localCache.getQuestions(setId);
    }
  }

  async getQuestion(id: string): Promise<Question | null> {
    try {
      const { data, error } = await this.client.from('questions').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return toQuestion(data);
    } catch {
      return this.localCache.getQuestion(id);
    }
  }

  async createQuestion(data: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Question> {
    const userId = data.userId || await this.getUserId();
    const createdLocal = await this.localCache.createQuestion({ ...data, userId });
    const row = fromQuestion(createdLocal);

    try {
      const { data: inserted, error } = await this.client.from('questions').insert(row).select().single();
      if (error) throw error;
      return toQuestion(inserted);
    } catch {
      await syncQueueManager.enqueue('questions', 'INSERT', createdLocal.id, row);
      return createdLocal;
    }
  }

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question> {
    const updatedLocal = await this.localCache.updateQuestion(id, data);
    const row = fromQuestion(data);

    try {
      const { data: updated, error } = await this.client.from('questions').update(row).eq('id', id).select().single();
      if (error) throw error;
      return toQuestion(updated);
    } catch {
      await syncQueueManager.enqueue('questions', 'UPDATE', id, { ...row, id });
      return updatedLocal;
    }
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.localCache.deleteQuestion(id);
    try {
      const { error } = await this.client.from('questions').delete().eq('id', id);
      if (error) throw error;
    } catch {
      await syncQueueManager.enqueue('questions', 'DELETE', id);
    }
  }

  async bulkCreateQuestions(questions: Array<Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }>): Promise<Question[]> {
    const userId = await this.getUserId();
    const prepared = questions.map((q) => ({ ...q, userId: q.userId || userId }));
    const createdLocals = await this.localCache.bulkCreateQuestions(prepared);
    const rows = createdLocals.map(fromQuestion);

    try {
      const { data: inserted, error } = await this.client.from('questions').insert(rows).select();
      if (error) throw error;
      return (inserted || []).map(toQuestion);
    } catch {
      for (const row of rows) {
        await syncQueueManager.enqueue('questions', 'INSERT', row.id, row);
      }
      return createdLocals;
    }
  }

  // ----------------------------------------------------------------------------
  // Progress & Attempts
  // ----------------------------------------------------------------------------
  async getSetProgress(setId: string): Promise<SetProgress | null> {
    try {
      const { data, error } = await this.client
        .from('set_progress')
        .select('*')
        .eq('set_id', setId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const progress = toSetProgress(data);
      await this.localCache.saveSetProgress(progress);
      return progress;
    } catch {
      return this.localCache.getSetProgress(setId);
    }
  }

  async getAllSetProgress(): Promise<SetProgress[]> {
    try {
      const { data, error } = await this.client.from('set_progress').select('*');
      if (error) throw error;
      const items = (data || []).map(toSetProgress);
      for (const item of items) {
        await this.localCache.saveSetProgress(item);
      }
      return items;
    } catch {
      return this.localCache.getAllSetProgress();
    }
  }

  async saveSetProgress(progress: Omit<SetProgress, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<SetProgress> {
    const userId = progress.userId || await this.getUserId();
    const savedLocal = await this.localCache.saveSetProgress({ ...progress, userId });
    const row = fromSetProgress(savedLocal);

    try {
      const { data, error } = await this.client
        .from('set_progress')
        .upsert(row, { onConflict: 'user_id,set_id' })
        .select()
        .single();
      if (error) throw error;
      return toSetProgress(data);
    } catch {
      await syncQueueManager.enqueue('set_progress', 'INSERT', savedLocal.id, row);
      return savedLocal;
    }
  }

  async recordAttempt(attempt: Omit<QuestionAttempt, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<QuestionAttempt> {
    const userId = attempt.userId || await this.getUserId();
    const savedLocal = await this.localCache.recordAttempt({ ...attempt, userId });
    const row = fromQuestionAttempt(savedLocal);

    try {
      const { data, error } = await this.client.from('question_attempts').insert(row).select().single();
      if (error) throw error;
      return toQuestionAttempt(data);
    } catch {
      await syncQueueManager.enqueue('question_attempts', 'INSERT', savedLocal.id, row);
      return savedLocal;
    }
  }

  async getAttempts(questionId?: string): Promise<QuestionAttempt[]> {
    try {
      let query = this.client.from('question_attempts').select('*');
      if (questionId) {
        query = query.eq('question_id', questionId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(toQuestionAttempt);
    } catch {
      return this.localCache.getAttempts(questionId);
    }
  }

  async getIncorrectAttempts(): Promise<QuestionAttempt[]> {
    try {
      const { data, error } = await this.client
        .from('question_attempts')
        .select('*')
        .eq('is_correct', false);
      if (error) throw error;
      return (data || []).map(toQuestionAttempt);
    } catch {
      return this.localCache.getIncorrectAttempts();
    }
  }

  async clearFlaggedAttempt(id: string): Promise<void> {
    await this.localCache.clearFlaggedAttempt(id);
    try {
      await this.client.from('question_attempts').update({ is_flagged: false }).eq('id', id);
    } catch {
      await syncQueueManager.enqueue('question_attempts', 'UPDATE', id, { id, is_flagged: false });
    }
  }

  // ----------------------------------------------------------------------------
  // User Stats & Settings
  // ----------------------------------------------------------------------------
  async getUserStats(): Promise<UserStats> {
    try {
      const userId = await this.getUserId();
      const { data, error } = await this.client
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const stats = toUserStats(data);
        await this.localCache.updateUserStats(stats);
        return stats;
      }
    } catch (err) {
      console.warn('Supabase getUserStats error:', err);
    }
    return this.localCache.getUserStats();
  }

  async updateUserStats(stats: Partial<UserStats>): Promise<UserStats> {
    const updatedLocal = await this.localCache.updateUserStats(stats);
    const userId = stats.userId || await this.getUserId();
    const row = fromUserStats({ ...stats, userId });

    try {
      const { data, error } = await this.client
        .from('user_stats')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return toUserStats(data);
    } catch {
      await syncQueueManager.enqueue('user_stats', 'UPDATE', updatedLocal.id, row);
      return updatedLocal;
    }
  }

  async getSettings(): Promise<UserSettings> {
    try {
      const userId = await this.getUserId();
      const { data, error } = await this.client
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const settings = toSettings(data);
        await this.localCache.updateSettings(settings);
        return settings;
      }
    } catch (err) {
      console.warn('Supabase getSettings error:', err);
    }
    return this.localCache.getSettings();
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const updatedLocal = await this.localCache.updateSettings(settings);
    const userId = settings.userId || await this.getUserId();
    const row = fromSettings({ ...settings, userId });

    try {
      const { data, error } = await this.client
        .from('settings')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return toSettings(data);
    } catch {
      await syncQueueManager.enqueue('settings', 'UPDATE', updatedLocal.id, row);
      return updatedLocal;
    }
  }

  async saveSettings(settings: Partial<UserSettings> & Partial<UserStats>): Promise<void> {
    await this.updateSettings(settings);
    const statsKeys: Array<keyof UserStats> = ['targetMajorCode', 'targetMajorName', 'targetScore', 'dailyGoalXp'];
    const hasStats = statsKeys.some((k) => k in settings);
    if (hasStats) {
      await this.updateUserStats(settings as Partial<UserStats>);
    }
  }

  // ----------------------------------------------------------------------------
  // Formula Groups
  // ----------------------------------------------------------------------------
  async getFormulaGroups(topicId?: string): Promise<FormulaGroup[]> {
    try {
      let query = this.client.from('formula_groups').select('*');
      if (topicId) {
        query = query.eq('topic_id', topicId);
      }
      const { data, error } = await query.order('order', { ascending: true });
      if (error || !data) {
        return this.localCache.getFormulaGroups(topicId);
      }
      return data.map((row) => ({
        id: row.id,
        topicId: row.topic_id,
        title: row.title,
        order: row.order ?? 0,
        items: row.items || [],
      }));
    } catch {
      return this.localCache.getFormulaGroups(topicId);
    }
  }

  async saveFormulaGroup(group: FormulaGroup): Promise<void> {
    await this.localCache.saveFormulaGroup(group);
    try {
      await this.client.from('formula_groups').upsert({
        id: group.id,
        topic_id: group.topicId,
        title: group.title,
        order: group.order,
        items: group.items,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('saveFormulaGroup remote sync error, cached locally:', err);
    }
  }

  async deleteFormulaGroup(id: string): Promise<void> {
    await this.localCache.deleteFormulaGroup(id);
    try {
      await this.client.from('formula_groups').delete().eq('id', id);
    } catch (err) {
      console.warn('deleteFormulaGroup remote delete error, cached locally:', err);
    }
  }

  // ----------------------------------------------------------------------------
  // Import / Export / Backup
  // ----------------------------------------------------------------------------
  async exportFullBackup(): Promise<FullBackupData> {
    return this.localCache.exportFullBackup();
  }

  async importFullBackup(backup: FullBackupData): Promise<void> {
    await this.localCache.importFullBackup(backup);
    // Queue synchronizations
    for (const s of backup.subjects || []) await this.createSubject(s);
    for (const t of backup.topics || []) await this.createTopic(t);
    for (const st of backup.sets || []) await this.createSet(st);
    for (const p of backup.passages || []) await this.createPassage(p);
    if (backup.questions && backup.questions.length > 0) {
      await this.bulkCreateQuestions(backup.questions);
    }
  }

  async importV1Package(pkg: V1ImportPackage): Promise<{ subjectId: string; topicId: string; setId: string; questionCount: number }> {
    const result = await this.localCache.importV1Package(pkg);
    // Sync into Supabase in background
    this.syncLocalToRemote().catch((e) => console.warn('Background sync error after import:', e));
    return result;
  }

  private async syncLocalToRemote(): Promise<void> {
    try {
      const subjects = await this.localCache.getSubjects();
      for (const s of subjects) {
        await this.client.from('subjects').upsert(fromSubject(s));
      }
      const topics = await this.localCache.getTopics();
      for (const t of topics) {
        await this.client.from('topics').upsert(fromTopic(t));
      }
      const sets = await this.localCache.getSets();
      for (const st of sets) {
        await this.client.from('sets').upsert(fromSet(st));
      }
      const passages = await this.localCache.getPassages();
      for (const p of passages) {
        await this.client.from('passages').upsert(fromPassage(p));
      }
      const questions = await this.localCache.getQuestions();
      for (const q of questions) {
        await this.client.from('questions').upsert(fromQuestion(q));
      }
    } catch (err) {
      console.warn('syncLocalToRemote failed:', err);
    }
  }

  async clearAllData(): Promise<void> {
    await this.localCache.clearAllData();
    const userId = await this.getUserId();
    await this.client.from('questions').delete().eq('user_id', userId);
    await this.client.from('passages').delete().eq('user_id', userId);
    await this.client.from('sets').delete().eq('user_id', userId);
    await this.client.from('topics').delete().eq('user_id', userId);
    await this.client.from('subjects').delete().eq('user_id', userId);
    await this.client.from('set_progress').delete().eq('user_id', userId);
    await this.client.from('question_attempts').delete().eq('user_id', userId);
  }
}
