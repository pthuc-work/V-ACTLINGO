// ==============================================================================
// V-ACT HUB: LocalRepository (IndexedDB Implementation via idb + In-Memory Fallback)
// ==============================================================================

import { openDB, IDBPDatabase } from 'idb';
import { DataRepository } from './repository';
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

export const LOCAL_USER_ID = 'local-user';
const DB_NAME = 'vact_hub_db';
const DB_VERSION = 1;

export class LocalRepository implements DataRepository {
  public readonly mode = 'local' as const;
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private inMemoryStores: Record<string, Map<string, any>> = {
    subjects: new Map(),
    topics: new Map(),
    sets: new Map(),
    passages: new Map(),
    questions: new Map(),
    setProgress: new Map(),
    questionAttempts: new Map(),
    userStats: new Map(),
    settings: new Map(),
    syncQueue: new Map(),
  };

  constructor() {
    if (typeof indexedDB !== 'undefined') {
      this.dbPromise = this.initDB();
    }
  }

  private isIDBAvailable(): boolean {
    return typeof indexedDB !== 'undefined' && this.dbPromise !== null;
  }

  private async initDB(): Promise<IDBPDatabase> {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('subjects')) {
          const sStore = db.createObjectStore('subjects', { keyPath: 'id' });
          sStore.createIndex('position', 'position');
        }
        if (!db.objectStoreNames.contains('topics')) {
          const tStore = db.createObjectStore('topics', { keyPath: 'id' });
          tStore.createIndex('subjectId', 'subjectId');
          tStore.createIndex('position', 'position');
        }
        if (!db.objectStoreNames.contains('sets')) {
          const setStore = db.createObjectStore('sets', { keyPath: 'id' });
          setStore.createIndex('topicId', 'topicId');
          setStore.createIndex('position', 'position');
        }
        if (!db.objectStoreNames.contains('passages')) {
          const pStore = db.createObjectStore('passages', { keyPath: 'id' });
          pStore.createIndex('setId', 'setId');
          pStore.createIndex('position', 'position');
        }
        if (!db.objectStoreNames.contains('questions')) {
          const qStore = db.createObjectStore('questions', { keyPath: 'id' });
          qStore.createIndex('setId', 'setId');
          qStore.createIndex('passageId', 'passageId');
          qStore.createIndex('position', 'position');
        }
        if (!db.objectStoreNames.contains('setProgress')) {
          const spStore = db.createObjectStore('setProgress', { keyPath: 'id' });
          spStore.createIndex('setId', 'setId', { unique: true });
        }
        if (!db.objectStoreNames.contains('questionAttempts')) {
          const qaStore = db.createObjectStore('questionAttempts', { keyPath: 'id' });
          qaStore.createIndex('questionId', 'questionId');
          qaStore.createIndex('isCorrect', 'isCorrect');
        }
        if (!db.objectStoreNames.contains('userStats')) {
          db.createObjectStore('userStats', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          const sqStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          sqStore.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }

  private generateId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ----------------------------------------------------------------------------
  // Internal Unified Store Helpers
  // ----------------------------------------------------------------------------
  private async getStoreItems(storeName: string): Promise<any[]> {
    if (this.isIDBAvailable()) {
      const db = await this.dbPromise!;
      return await db.getAll(storeName);
    }
    const store = this.inMemoryStores[storeName] || new Map();
    return Array.from(store.values());
  }

  private async getStoreItem(storeName: string, id: string): Promise<any | null> {
    if (this.isIDBAvailable()) {
      const db = await this.dbPromise!;
      return (await db.get(storeName, id)) || null;
    }
    const store = this.inMemoryStores[storeName];
    return store?.get(id) || null;
  }

  private async putStoreItem(storeName: string, item: any): Promise<void> {
    if (this.isIDBAvailable()) {
      const db = await this.dbPromise!;
      await db.put(storeName, item);
      return;
    }
    if (!this.inMemoryStores[storeName]) {
      this.inMemoryStores[storeName] = new Map();
    }
    this.inMemoryStores[storeName].set(item.id, item);
  }

  private async deleteStoreItem(storeName: string, id: string): Promise<void> {
    if (this.isIDBAvailable()) {
      const db = await this.dbPromise!;
      await db.delete(storeName, id);
      return;
    }
    this.inMemoryStores[storeName]?.delete(id);
  }

  private async getStoreItemsByIndex(storeName: string, indexName: string, value: any): Promise<any[]> {
    if (this.isIDBAvailable()) {
      const db = await this.dbPromise!;
      return await db.getAllFromIndex(storeName, indexName, value);
    }
    const items = await this.getStoreItems(storeName);
    return items.filter((item) => item[indexName] === value);
  }

  // ----------------------------------------------------------------------------
  // Subjects
  // ----------------------------------------------------------------------------
  async getSubjects(): Promise<Subject[]> {
    const items: Subject[] = await this.getStoreItems('subjects');
    return items.sort((a, b) => a.position - b.position);
  }

  async getSubject(id: string): Promise<Subject | null> {
    return await this.getStoreItem('subjects', id);
  }

  async createSubject(data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Subject> {
    const now = new Date().toISOString();
    const subject: Subject = {
      id: data.id || this.generateId(),
      userId: data.userId || LOCAL_USER_ID,
      name: data.name,
      code: data.code,
      description: data.description || '',
      icon: data.icon || '',
      position: data.position ?? 0,
      visibility: data.visibility || 'private',
      createdAt: now,
      updatedAt: now,
    };
    await this.putStoreItem('subjects', subject);
    return subject;
  }

  async updateSubject(id: string, data: Partial<Subject>): Promise<Subject> {
    const existing = await this.getSubject(id);
    if (!existing) throw new Error(`Subject with id ${id} not found`);
    const updated: Subject = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await this.putStoreItem('subjects', updated);
    return updated;
  }

  async deleteSubject(id: string): Promise<void> {
    const topics = await this.getTopics(id);
    for (const topic of topics) {
      await this.deleteTopic(topic.id);
    }
    await this.deleteStoreItem('subjects', id);
  }

  async reorderSubjects(orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      const subject = await this.getSubject(orderedIds[i]);
      if (subject) {
        subject.position = i;
        subject.updatedAt = new Date().toISOString();
        await this.putStoreItem('subjects', subject);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Topics
  // ----------------------------------------------------------------------------
  async getTopics(subjectId?: string): Promise<Topic[]> {
    let items: Topic[];
    if (subjectId) {
      items = await this.getStoreItemsByIndex('topics', 'subjectId', subjectId);
    } else {
      items = await this.getStoreItems('topics');
    }
    return items.sort((a, b) => a.position - b.position);
  }

  async getTopic(id: string): Promise<Topic | null> {
    return await this.getStoreItem('topics', id);
  }

  async createTopic(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Topic> {
    const now = new Date().toISOString();
    const topic: Topic = {
      id: data.id || this.generateId(),
      userId: data.userId || LOCAL_USER_ID,
      subjectId: data.subjectId,
      name: data.name,
      description: data.description || '',
      position: data.position ?? 0,
      visibility: data.visibility || 'private',
      createdAt: now,
      updatedAt: now,
    };
    await this.putStoreItem('topics', topic);
    return topic;
  }

  async updateTopic(id: string, data: Partial<Topic>): Promise<Topic> {
    const existing = await this.getTopic(id);
    if (!existing) throw new Error(`Topic with id ${id} not found`);
    const updated: Topic = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await this.putStoreItem('topics', updated);
    return updated;
  }

  async deleteTopic(id: string): Promise<void> {
    const sets = await this.getSets(id);
    for (const set of sets) {
      await this.deleteSet(set.id);
    }
    await this.deleteStoreItem('topics', id);
  }

  async reorderTopics(orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      const topic = await this.getTopic(orderedIds[i]);
      if (topic) {
        topic.position = i;
        topic.updatedAt = new Date().toISOString();
        await this.putStoreItem('topics', topic);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Sets
  // ----------------------------------------------------------------------------
  async getSets(topicId?: string): Promise<SetEntity[]> {
    let items: SetEntity[];
    if (topicId) {
      items = await this.getStoreItemsByIndex('sets', 'topicId', topicId);
    } else {
      items = await this.getStoreItems('sets');
    }
    return items.sort((a, b) => a.position - b.position);
  }

  async getSet(id: string): Promise<SetEntity | null> {
    return await this.getStoreItem('sets', id);
  }

  async createSet(data: Omit<SetEntity, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<SetEntity> {
    const now = new Date().toISOString();
    const set: SetEntity = {
      id: data.id || this.generateId(),
      userId: data.userId || LOCAL_USER_ID,
      topicId: data.topicId,
      name: data.name,
      description: data.description || '',
      position: data.position ?? 0,
      visibility: data.visibility || 'private',
      createdAt: now,
      updatedAt: now,
    };
    await this.putStoreItem('sets', set);
    return set;
  }

  async updateSet(id: string, data: Partial<SetEntity>): Promise<SetEntity> {
    const existing = await this.getSet(id);
    if (!existing) throw new Error(`Set with id ${id} not found`);
    const updated: SetEntity = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await this.putStoreItem('sets', updated);
    return updated;
  }

  async deleteSet(id: string): Promise<void> {
    const questions = await this.getQuestions(id);
    for (const q of questions) {
      await this.deleteQuestion(q.id);
    }
    const passages = await this.getPassages(id);
    for (const p of passages) {
      await this.deletePassage(p.id);
    }
    const progress = await this.getSetProgress(id);
    if (progress) {
      await this.deleteStoreItem('setProgress', progress.id);
    }
    await this.deleteStoreItem('sets', id);
  }

  async reorderSets(orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      const set = await this.getSet(orderedIds[i]);
      if (set) {
        set.position = i;
        set.updatedAt = new Date().toISOString();
        await this.putStoreItem('sets', set);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Passages
  // ----------------------------------------------------------------------------
  async getPassages(setId?: string): Promise<Passage[]> {
    let items: Passage[];
    if (setId) {
      items = await this.getStoreItemsByIndex('passages', 'setId', setId);
    } else {
      items = await this.getStoreItems('passages');
    }
    return items.sort((a, b) => a.position - b.position);
  }

  async getPassage(id: string): Promise<Passage | null> {
    return await this.getStoreItem('passages', id);
  }

  async createPassage(data: Omit<Passage, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Passage> {
    const now = new Date().toISOString();
    const passage: Passage = {
      id: data.id || this.generateId(),
      userId: data.userId || LOCAL_USER_ID,
      setId: data.setId ?? null,
      title: data.title || '',
      content: data.content,
      position: data.position ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.putStoreItem('passages', passage);
    return passage;
  }

  async updatePassage(id: string, data: Partial<Passage>): Promise<Passage> {
    const existing = await this.getPassage(id);
    if (!existing) throw new Error(`Passage with id ${id} not found`);
    const updated: Passage = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await this.putStoreItem('passages', updated);
    return updated;
  }

  async deletePassage(id: string): Promise<void> {
    const questions = await this.getStoreItemsByIndex('questions', 'passageId', id);
    for (const q of questions) {
      q.passageId = null;
      await this.putStoreItem('questions', q);
    }
    await this.deleteStoreItem('passages', id);
  }

  // ----------------------------------------------------------------------------
  // Questions
  // ----------------------------------------------------------------------------
  async getQuestions(setId?: string): Promise<Question[]> {
    let items: Question[];
    if (setId) {
      items = await this.getStoreItemsByIndex('questions', 'setId', setId);
    } else {
      items = await this.getStoreItems('questions');
    }
    return items.sort((a, b) => a.position - b.position);
  }

  async getQuestion(id: string): Promise<Question | null> {
    return await this.getStoreItem('questions', id);
  }

  async createQuestion(data: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<Question> {
    const now = new Date().toISOString();
    const question: Question = {
      id: data.id || this.generateId(),
      userId: data.userId || LOCAL_USER_ID,
      setId: data.setId,
      passageId: data.passageId ?? null,
      no: data.no ?? 1,
      prompt: data.prompt,
      options: data.options || [],
      correctIndex: data.correctIndex ?? null,
      answerSource: data.answerSource || 'none',
      verified: data.verified ?? false,
      category: data.category || '',
      formula: data.formula || '',
      explanation: data.explanation || '',
      figure: data.figure || null,
      position: data.position ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.putStoreItem('questions', question);
    return question;
  }

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question> {
    const existing = await this.getQuestion(id);
    if (!existing) throw new Error(`Question with id ${id} not found`);
    const updated: Question = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await this.putStoreItem('questions', updated);
    return updated;
  }

  async deleteQuestion(id: string): Promise<void> {
    const attempts = await this.getAttempts(id);
    for (const att of attempts) {
      await this.deleteStoreItem('questionAttempts', att.id);
    }
    await this.deleteStoreItem('questions', id);
  }

  async bulkCreateQuestions(questions: Array<Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }>): Promise<Question[]> {
    const created: Question[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const item: Question = {
        id: q.id || this.generateId(),
        userId: q.userId || LOCAL_USER_ID,
        setId: q.setId,
        passageId: q.passageId ?? null,
        no: q.no ?? (i + 1),
        prompt: q.prompt,
        options: q.options || [],
        correctIndex: q.correctIndex ?? null,
        answerSource: q.answerSource || 'none',
        verified: q.verified ?? false,
        category: q.category || '',
        formula: q.formula || '',
        explanation: q.explanation || '',
        figure: q.figure || null,
        position: q.position ?? i,
        createdAt: now,
        updatedAt: now,
      };
      await this.putStoreItem('questions', item);
      created.push(item);
    }
    return created;
  }

  // ----------------------------------------------------------------------------
  // Progress & Attempts
  // ----------------------------------------------------------------------------
  async getSetProgress(setId: string): Promise<SetProgress | null> {
    const items = await this.getStoreItemsByIndex('setProgress', 'setId', setId);
    return items.length > 0 ? items[0] : null;
  }

  async getAllSetProgress(): Promise<SetProgress[]> {
    return await this.getStoreItems('setProgress');
  }

  async saveSetProgress(progress: Omit<SetProgress, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<SetProgress> {
    const existing = await this.getSetProgress(progress.setId);
    const now = new Date().toISOString();
    const item: SetProgress = {
      id: existing ? existing.id : (progress.id || this.generateId()),
      userId: progress.userId || LOCAL_USER_ID,
      setId: progress.setId,
      completed: progress.completed,
      score: progress.score,
      totalQuestions: progress.totalQuestions,
      stars: progress.stars,
      attemptsCount: progress.attemptsCount,
      lastAttemptedAt: progress.lastAttemptedAt || now,
      position: progress.position ?? 0,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    await this.putStoreItem('setProgress', item);
    return item;
  }

  async recordAttempt(attempt: Omit<QuestionAttempt, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<QuestionAttempt> {
    const now = new Date().toISOString();
    const item: QuestionAttempt = {
      id: attempt.id || this.generateId(),
      userId: attempt.userId || LOCAL_USER_ID,
      questionId: attempt.questionId,
      setId: attempt.setId ?? null,
      selectedIndex: attempt.selectedIndex ?? null,
      isCorrect: attempt.isCorrect,
      isFlagged: attempt.isFlagged ?? false,
      timeSpentSeconds: attempt.timeSpentSeconds ?? 0,
      position: attempt.position ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.putStoreItem('questionAttempts', item);
    return item;
  }

  async getAttempts(questionId?: string): Promise<QuestionAttempt[]> {
    if (questionId) {
      return await this.getStoreItemsByIndex('questionAttempts', 'questionId', questionId);
    }
    return await this.getStoreItems('questionAttempts');
  }

  async getIncorrectAttempts(): Promise<QuestionAttempt[]> {
    const items: QuestionAttempt[] = await this.getStoreItems('questionAttempts');
    return items.filter((a) => !a.isCorrect);
  }

  async clearFlaggedAttempt(id: string): Promise<void> {
    const item = await this.getStoreItem('questionAttempts', id);
    if (item) {
      item.isFlagged = false;
      item.updatedAt = new Date().toISOString();
      await this.putStoreItem('questionAttempts', item);
    }
  }

  // ----------------------------------------------------------------------------
  // User Stats & Settings
  // ----------------------------------------------------------------------------
  async getUserStats(): Promise<UserStats> {
    const items: UserStats[] = await this.getStoreItems('userStats');
    if (items.length > 0) return items[0];

    const now = new Date().toISOString();
    const defaultStats: UserStats = {
      id: 'default_stats',
      userId: LOCAL_USER_ID,
      xp: 0,
      streak: 0,
      maxStreak: 0,
      lastActiveDate: null,
      streakFreezesWeekly: 3,
      streakFreezesReserve: 0,
      targetMajorCode: '106',
      targetMajorName: 'Khoa học Máy tính',
      targetScore: 85.45,
      dailyGoalXp: 50,
      position: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.putStoreItem('userStats', defaultStats);
    return defaultStats;
  }

  async updateUserStats(stats: Partial<UserStats>): Promise<UserStats> {
    const current = await this.getUserStats();
    const updated: UserStats = {
      ...current,
      ...stats,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };
    await this.putStoreItem('userStats', updated);
    return updated;
  }

  async getSettings(): Promise<UserSettings> {
    const items: UserSettings[] = await this.getStoreItems('settings');
    if (items.length > 0) return items[0];

    const now = new Date().toISOString();
    const defaultSettings: UserSettings = {
      id: 'default_settings',
      userId: LOCAL_USER_ID,
      soundEnabled: true,
      hapticsEnabled: true,
      theme: 'system',
      geminiApiKey: '',
      geminiModel: 'gemini-1.5-flash',
      reminderTime: null,
      position: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.putStoreItem('settings', defaultSettings);
    return defaultSettings;
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated: UserSettings = {
      ...current,
      ...settings,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };
    await this.putStoreItem('settings', updated);
    return updated;
  }

  // ----------------------------------------------------------------------------
  // Import / Export / Backup
  // ----------------------------------------------------------------------------
  async exportFullBackup(): Promise<FullBackupData> {
    const [
      subjects,
      topics,
      sets,
      passages,
      questions,
      setProgress,
      questionAttempts,
      userStats,
      settings,
    ] = await Promise.all([
      this.getSubjects(),
      this.getTopics(),
      this.getSets(),
      this.getPassages(),
      this.getQuestions(),
      this.getAllSetProgress(),
      this.getAttempts(),
      this.getUserStats(),
      this.getSettings(),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects,
      topics,
      sets,
      passages,
      questions,
      setProgress,
      questionAttempts,
      userStats,
      settings,
    };
  }

  async importFullBackup(backup: FullBackupData): Promise<void> {
    await this.clearAllData();

    for (const item of backup.subjects || []) await this.putStoreItem('subjects', item);
    for (const item of backup.topics || []) await this.putStoreItem('topics', item);
    for (const item of backup.sets || []) await this.putStoreItem('sets', item);
    for (const item of backup.passages || []) await this.putStoreItem('passages', item);
    for (const item of backup.questions || []) await this.putStoreItem('questions', item);
    for (const item of backup.setProgress || []) await this.putStoreItem('setProgress', item);
    for (const item of backup.questionAttempts || []) await this.putStoreItem('questionAttempts', item);
    if (backup.userStats) await this.putStoreItem('userStats', backup.userStats);
    if (backup.settings) await this.putStoreItem('settings', backup.settings);
  }

  async importV1Package(pkg: V1ImportPackage): Promise<{ subjectId: string; topicId: string; setId: string; questionCount: number }> {
    // 1. Resolve Subject
    const subjectName = typeof pkg.subject === 'string' ? pkg.subject : pkg.subject.name;
    const subjectCode = typeof pkg.subject === 'string' 
      ? (pkg.subject.toLowerCase().includes('anh') ? 'ENG' : pkg.subject.toLowerCase().includes('toán') ? 'MATH' : 'VIE')
      : (pkg.subject.code || 'VIE');
    const subjectDesc = typeof pkg.subject === 'object' ? pkg.subject.description || '' : '';
    const subjectIcon = typeof pkg.subject === 'object' ? pkg.subject.icon || '' : '';

    const subjects = await this.getSubjects();
    let subject = subjects.find(
      (s) => s.code.toLowerCase() === subjectCode.toLowerCase() || s.name.toLowerCase() === subjectName.toLowerCase()
    );
    if (!subject) {
      subject = await this.createSubject({
        userId: LOCAL_USER_ID,
        name: subjectName,
        code: subjectCode,
        description: subjectDesc,
        icon: subjectIcon,
        position: subjects.length,
        visibility: 'private',
      });
    }

    // 2. Resolve Topic under Subject
    const topicName = typeof pkg.topic === 'string' ? pkg.topic : pkg.topic.name;
    const topicDesc = typeof pkg.topic === 'object' ? pkg.topic.description || '' : '';

    const topics = await this.getTopics(subject.id);
    let topic = topics.find((t) => t.name.toLowerCase() === topicName.toLowerCase());
    if (!topic) {
      topic = await this.createTopic({
        userId: LOCAL_USER_ID,
        subjectId: subject.id,
        name: topicName,
        description: topicDesc,
        position: topics.length,
        visibility: 'private',
      });
    }

    // 3. Resolve Set under Topic
    const setName = typeof pkg.set === 'string' ? pkg.set : pkg.set.name;
    const setDesc = typeof pkg.set === 'object' ? pkg.set.description || '' : '';

    const sets = await this.getSets(topic.id);
    let setEntity = sets.find((s) => s.name.toLowerCase() === setName.toLowerCase());
    if (!setEntity) {
      setEntity = await this.createSet({
        userId: LOCAL_USER_ID,
        topicId: topic.id,
        name: setName,
        description: setDesc,
        position: sets.length,
        visibility: 'private',
      });
    }

    // 4. Create Passages if any
    const passageIdMap = new Map<string, string>();
    if (pkg.passages && pkg.passages.length > 0) {
      for (let i = 0; i < pkg.passages.length; i++) {
        const p = pkg.passages[i];
        const content = p.content || p.text || '';
        const createdPassage = await this.createPassage({
          userId: LOCAL_USER_ID,
          setId: setEntity.id,
          title: p.title || '',
          content,
          position: p.position ?? i,
        });
        if (p.id) {
          passageIdMap.set(p.id, createdPassage.id);
        }
      }
    }

    // 5. Create Questions
    const questionsToCreate = pkg.questions.map((q, idx) => ({
      userId: LOCAL_USER_ID,
      setId: setEntity!.id,
      passageId: q.passageId ? (passageIdMap.get(q.passageId) || null) : null,
      no: q.no ?? (idx + 1),
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex ?? null,
      answerSource: q.answerSource || 'document',
      verified: q.verified ?? false,
      category: q.category || '',
      formula: q.formula || '',
      explanation: q.explanation || '',
      figure: q.figure || null,
      position: q.position ?? idx,
    }));

    await this.bulkCreateQuestions(questionsToCreate);

    return {
      subjectId: subject.id,
      topicId: topic.id,
      setId: setEntity.id,
      questionCount: questionsToCreate.length,
    };
  }

  async clearAllData(): Promise<void> {
    const storeNames = [
      'subjects',
      'topics',
      'sets',
      'passages',
      'questions',
      'setProgress',
      'questionAttempts',
      'userStats',
      'settings',
      'syncQueue',
    ];
    if (this.isIDBAvailable()) {
      const db = await this.dbPromise!;
      const tx = db.transaction(storeNames, 'readwrite');
      for (const name of storeNames) {
        await tx.objectStore(name).clear();
      }
      await tx.done;
    } else {
      for (const name of storeNames) {
        this.inMemoryStores[name]?.clear();
      }
    }
  }
}
