// ==============================================================================
// V-ACT HUB: Full Backup & Restore Service
// ==============================================================================

import { DataRepository } from '../../data/repository';
import { getRepository } from '../../data';
import {
  FullBackupData,
  Subject,
  Topic,
  SetEntity,
  Passage,
  Question,
  SetProgress,
  QuestionAttempt,
  UserStats,
  UserSettings,
  V1ImportPackage,
} from '../../data/types';

export interface BackupSummary {
  subjectsCount: number;
  topicsCount: number;
  setsCount: number;
  passagesCount: number;
  questionsCount: number;
  setProgressCount: number;
  attemptsCount: number;
  hasUserStats: boolean;
  hasSettings: boolean;
  claimedChestsCount?: number;
}

export type BackupFormat = 'full_backup' | 'legacy_library' | 'v1_package' | 'unknown';

export interface BackupInspectionResult {
  isValid: boolean;
  format: BackupFormat;
  version?: number | string;
  exportedAt?: string;
  summary: BackupSummary;
  warnings: string[];
  error?: string;
  data?: any;
}

export interface RestoreResult {
  success: boolean;
  mode: 'replace' | 'merge';
  format: BackupFormat;
  importedSubjects: number;
  importedTopics: number;
  importedSets: number;
  importedQuestions: number;
  message: string;
  error?: string;
}

const LOCAL_STORAGE_CHEST_KEY = 'vact_claimed_topic_chests';

/**
 * Generates standard backup filename: vact-backup-YYYYMMDD-HHmm.json
 */
export function generateBackupFileName(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `vact-backup-${year}${month}${day}-${hours}${minutes}.json`;
}

/**
 * Reads claimed topic chest flags from localStorage if in browser environment.
 */
export function getStoredTopicChestFlags(): string[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_CHEST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read topic chest flags from localStorage', err);
  }
  return [];
}

/**
 * Saves claimed topic chest flags to localStorage if in browser environment.
 */
export function saveStoredTopicChestFlags(flags: string[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CHEST_KEY, JSON.stringify(flags));
    }
  } catch (err) {
    console.warn('Failed to save topic chest flags to localStorage', err);
  }
}

/**
 * Export full database to FullBackupData object with Gemini API key stripped.
 */
export async function exportFullBackup(repo?: DataRepository): Promise<FullBackupData> {
  const activeRepo = repo || getRepository();

  const [
    subjects,
    topics,
    sets,
    passages,
    questions,
    setProgress,
    questionAttempts,
    userStats,
    rawSettings,
  ] = await Promise.all([
    activeRepo.getSubjects(),
    activeRepo.getTopics(),
    activeRepo.getSets(),
    activeRepo.getPassages(),
    activeRepo.getQuestions(),
    activeRepo.getAllSetProgress(),
    activeRepo.getAttempts(),
    activeRepo.getUserStats(),
    activeRepo.getSettings(),
  ]);

  // Strip Gemini API key for absolute security
  const sanitizedSettings: UserSettings = {
    ...rawSettings,
    geminiApiKey: '',
  };

  const topicChestFlags = getStoredTopicChestFlags();

  const backupData: FullBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: subjects || [],
    topics: topics || [],
    sets: sets || [],
    passages: passages || [],
    questions: questions || [],
    setProgress: setProgress || [],
    questionAttempts: questionAttempts || [],
    userStats,
    settings: sanitizedSettings,
    topicChestFlags,
  };

  return backupData;
}

/**
 * Export full backup and trigger file download in browser environments.
 */
export async function exportFullBackupToFile(
  repo?: DataRepository
): Promise<{ fileName: string; data: FullBackupData; jsonString: string }> {
  const data = await exportFullBackup(repo);
  const fileName = generateBackupFileName();
  const jsonString = JSON.stringify(data, null, 2);

  // Trigger browser download if DOM environment is present
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return { fileName, data, jsonString };
}

/**
 * Inspect a backup file or string content before restoring.
 * Validates version, format, and counts preview items.
 */
export function inspectBackupFile(content: string | object): BackupInspectionResult {
  const emptySummary: BackupSummary = {
    subjectsCount: 0,
    topicsCount: 0,
    setsCount: 0,
    passagesCount: 0,
    questionsCount: 0,
    setProgressCount: 0,
    attemptsCount: 0,
    hasUserStats: false,
    hasSettings: false,
  };

  let parsed: any;
  if (typeof content === 'string') {
    try {
      parsed = JSON.parse(content);
    } catch (err: any) {
      return {
        isValid: false,
        format: 'unknown',
        summary: emptySummary,
        warnings: [],
        error: `Tệp JSON không hợp lệ: ${err?.message || 'Lỗi cú pháp'}`,
      };
    }
  } else {
    parsed = content;
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      format: 'unknown',
      summary: emptySummary,
      warnings: [],
      error: 'Dữ liệu sao lưu trống hoặc không đúng định dạng',
    };
  }

  const warnings: string[] = [];

  // Check 1: Full Backup format
  if (
    parsed.version === 1 &&
    Array.isArray(parsed.subjects) &&
    (Array.isArray(parsed.sets) || Array.isArray(parsed.questions))
  ) {
    if (parsed.settings && parsed.settings.geminiApiKey) {
      warnings.push('Phát hiện có khóa API trong file sao lưu; hệ thống sẽ loại bỏ để bảo mật.');
    }

    const summary: BackupSummary = {
      subjectsCount: parsed.subjects.length,
      topicsCount: Array.isArray(parsed.topics) ? parsed.topics.length : 0,
      setsCount: Array.isArray(parsed.sets) ? parsed.sets.length : 0,
      passagesCount: Array.isArray(parsed.passages) ? parsed.passages.length : 0,
      questionsCount: Array.isArray(parsed.questions) ? parsed.questions.length : 0,
      setProgressCount: Array.isArray(parsed.setProgress) ? parsed.setProgress.length : 0,
      attemptsCount: Array.isArray(parsed.questionAttempts) ? parsed.questionAttempts.length : 0,
      hasUserStats: Boolean(parsed.userStats),
      hasSettings: Boolean(parsed.settings),
      claimedChestsCount: Array.isArray(parsed.topicChestFlags) ? parsed.topicChestFlags.length : 0,
    };

    return {
      isValid: true,
      format: 'full_backup',
      version: parsed.version,
      exportedAt: parsed.exportedAt,
      summary,
      warnings,
      data: parsed,
    };
  }

  // Check 2: Legacy library format (Array of Subjects containing topics/sets/questions, or { library: [...] })
  const legacyList = Array.isArray(parsed) ? parsed : Array.isArray(parsed.library) ? parsed.library : null;
  if (legacyList && legacyList.length > 0 && legacyList.some((item: any) => item && (item.topics || item.sets || item.name))) {
    let topicsCount = 0;
    let setsCount = 0;
    let questionsCount = 0;

    for (const subj of legacyList) {
      const topics = subj.topics || [];
      topicsCount += topics.length;
      for (const topic of topics) {
        const sets = topic.sets || [];
        setsCount += sets.length;
        for (const set of sets) {
          const qs = set.questions || [];
          questionsCount += qs.length;
        }
      }
    }

    return {
      isValid: true,
      format: 'legacy_library',
      summary: {
        subjectsCount: legacyList.length,
        topicsCount,
        setsCount,
        passagesCount: 0,
        questionsCount,
        setProgressCount: 0,
        attemptsCount: 0,
        hasUserStats: false,
        hasSettings: false,
      },
      warnings: ['Tệp sao lưu thuộc định dạng V-ACT app cũ (library). Sẽ tự động chuyển đổi sang kiến trúc mới.'],
      data: parsed,
    };
  }

  // Check 3: V1 Import Package(s)
  const isV1Single = parsed.schemaVersion === 1 && parsed.questions && (parsed.subject || parsed.topic);
  const isV1Array = Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.questions && parsed[0]?.schemaVersion === 1;

  if (isV1Single || isV1Array) {
    const pkgs: V1ImportPackage[] = isV1Array ? parsed : [parsed];
    const subjects = new Set<string>();
    const topics = new Set<string>();
    let setsCount = 0;
    let questionsCount = 0;
    let passagesCount = 0;

    for (const p of pkgs) {
      const sName = typeof p.subject === 'string' ? p.subject : p.subject?.name || 'Môn học';
      const tName = typeof p.topic === 'string' ? p.topic : p.topic?.name || 'Chuyên đề';
      subjects.add(sName);
      topics.add(`${sName}::${tName}`);
      setsCount++;
      questionsCount += p.questions ? p.questions.length : 0;
      passagesCount += p.passages ? p.passages.length : 0;
    }

    return {
      isValid: true,
      format: 'v1_package',
      version: 1,
      summary: {
        subjectsCount: subjects.size,
        topicsCount: topics.size,
        setsCount,
        passagesCount,
        questionsCount,
        setProgressCount: 0,
        attemptsCount: 0,
        hasUserStats: false,
        hasSettings: false,
      },
      warnings: ['Tệp là gói bài học Schema v1. Sẽ được nạp thành các môn/chuyên đề/bài học tương ứng.'],
      data: parsed,
    };
  }

  return {
    isValid: false,
    format: 'unknown',
    summary: emptySummary,
    warnings: [],
    error: 'Tệp JSON không chứa cấu trúc sao lưu V-ACT hoặc thư viện bài học hợp lệ.',
  };
}

/**
 * Converts legacy library array (from V-ACT_app.html) or V1 packages into FullBackupData format.
 */
export function convertLegacyToFullBackup(parsedData: any): FullBackupData {
  const now = new Date().toISOString();
  const subjects: Subject[] = [];
  const topics: Topic[] = [];
  const sets: SetEntity[] = [];
  const passages: Passage[] = [];
  const questions: Question[] = [];

  // If already full backup
  if (parsedData.version === 1 && Array.isArray(parsedData.subjects) && Array.isArray(parsedData.questions)) {
    return parsedData;
  }

  // Handle Legacy library format (array or { library: [...] })
  const legacyList = Array.isArray(parsedData)
    ? parsedData
    : Array.isArray(parsedData.library)
    ? parsedData.library
    : null;

  if (legacyList && legacyList.length > 0 && legacyList.some((s: any) => s && (s.topics || s.sets || s.name))) {
    let sPos = 0;
    for (const rawSubj of legacyList) {
      const subjId = rawSubj.id || `subj_${sPos + 1}`;
      const subjName = rawSubj.name || `Môn học ${sPos + 1}`;
      const subjCode = rawSubj.code || (subjName.toLowerCase().includes('anh') ? 'ENG' : subjName.toLowerCase().includes('toán') ? 'MATH' : 'VIE');

      subjects.push({
        id: subjId,
        userId: 'local_user',
        name: subjName,
        code: subjCode,
        description: rawSubj.description || '',
        icon: rawSubj.icon || '',
        position: sPos,
        visibility: 'private',
        createdAt: now,
        updatedAt: now,
      });

      const rawTopics = rawSubj.topics || [];
      let tPos = 0;
      for (const rawTopic of rawTopics) {
        const topicId = rawTopic.id || `${subjId}_topic_${tPos + 1}`;
        const topicName = rawTopic.name || `Chuyên đề ${tPos + 1}`;

        topics.push({
          id: topicId,
          userId: 'local_user',
          subjectId: subjId,
          name: topicName,
          description: rawTopic.description || '',
          position: tPos,
          visibility: 'private',
          createdAt: now,
          updatedAt: now,
        });

        const rawSets = rawTopic.sets || [];
        let setPos = 0;
        for (const rawSet of rawSets) {
          const setId = rawSet.id || `${topicId}_set_${setPos + 1}`;
          const setName = rawSet.name || `Bài ${setPos + 1}`;

          sets.push({
            id: setId,
            userId: 'local_user',
            topicId: topicId,
            name: setName,
            description: rawSet.description || '',
            position: setPos,
            visibility: 'private',
            createdAt: now,
            updatedAt: now,
          });

          const rawQuestions = rawSet.questions || [];
          let qPos = 0;
          for (const rawQ of rawQuestions) {
            let passageId: string | null = null;
            if (rawQ.passage || rawQ.passageContent) {
              const pContent = rawQ.passage || rawQ.passageContent;
              const existingP = passages.find((p) => p.content === pContent && p.setId === setId);
              if (existingP) {
                passageId = existingP.id;
              } else {
                const newPId = `passage_${setId}_${passages.length + 1}`;
                passages.push({
                  id: newPId,
                  userId: 'local_user',
                  setId,
                  title: rawQ.passageTitle || '',
                  content: pContent,
                  position: passages.length,
                  createdAt: now,
                  updatedAt: now,
                });
                passageId = newPId;
              }
            }

            const qId = rawQ.id ? String(rawQ.id) : `q_${setId}_${qPos + 1}`;
            questions.push({
              id: qId,
              userId: 'local_user',
              setId,
              passageId,
              no: rawQ.no ?? (qPos + 1),
              prompt: rawQ.prompt || '',
              options: Array.isArray(rawQ.options) ? rawQ.options : ['', '', '', ''],
              correctIndex: typeof rawQ.correctIndex === 'number' ? rawQ.correctIndex : null,
              answerSource: rawQ.answerSource || rawQ.answer_source || 'document',
              verified: rawQ.verified ?? true,
              category: rawQ.category || '',
              formula: rawQ.formula || '',
              explanation: rawQ.explanation || '',
              figure: rawQ.figure || null,
              position: rawQ.position ?? qPos,
              createdAt: now,
              updatedAt: now,
            });
            qPos++;
          }
          setPos++;
        }
        tPos++;
      }
      sPos++;
    }
  } else {
    // Handle V1 Packages
    const pkgs: V1ImportPackage[] = Array.isArray(parsedData) ? parsedData : [parsedData];
    let sIdx = 0;
    const subjectMap = new Map<string, string>();
    const topicMap = new Map<string, string>();

    for (const pkg of pkgs) {
      const sName = typeof pkg.subject === 'string' ? pkg.subject : pkg.subject?.name || 'Môn học';
      const sCode = typeof pkg.subject === 'string'
        ? (sName.toLowerCase().includes('anh') ? 'ENG' : sName.toLowerCase().includes('toán') ? 'MATH' : 'VIE')
        : (pkg.subject?.code || 'VIE');

      let subjId = subjectMap.get(sName);
      if (!subjId) {
        subjId = `subj_${subjects.length + 1}`;
        subjectMap.set(sName, subjId);
        subjects.push({
          id: subjId,
          userId: 'local_user',
          name: sName,
          code: sCode,
          position: sIdx++,
          visibility: 'private',
          createdAt: now,
          updatedAt: now,
        });
      }

      const tName = typeof pkg.topic === 'string' ? pkg.topic : pkg.topic?.name || 'Chuyên đề';
      const topicKey = `${subjId}::${tName}`;
      let topicId = topicMap.get(topicKey);
      if (!topicId) {
        topicId = `topic_${topics.length + 1}`;
        topicMap.set(topicKey, topicId);
        topics.push({
          id: topicId,
          userId: 'local_user',
          subjectId: subjId,
          name: tName,
          position: topics.filter((t) => t.subjectId === subjId).length,
          visibility: 'private',
          createdAt: now,
          updatedAt: now,
        });
      }

      const setName = typeof pkg.set === 'string' ? pkg.set : pkg.set?.name || 'Bài học';
      const setId = `set_${sets.length + 1}`;
      sets.push({
        id: setId,
        userId: 'local_user',
        topicId,
        name: setName,
        position: sets.filter((s) => s.topicId === topicId).length,
        visibility: 'private',
        createdAt: now,
        updatedAt: now,
      });

      const pkgPassageMap = new Map<string, string>();
      if (pkg.passages && pkg.passages.length > 0) {
        for (let pIdx = 0; pIdx < pkg.passages.length; pIdx++) {
          const p = pkg.passages[pIdx];
          const newPassageId = `passage_${passages.length + 1}`;
          if (p.id) pkgPassageMap.set(p.id, newPassageId);
          passages.push({
            id: newPassageId,
            userId: 'local_user',
            setId,
            title: p.title || '',
            content: p.content || (p as any).text || '',
            position: p.position ?? pIdx,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      if (pkg.questions) {
        for (let qIdx = 0; qIdx < pkg.questions.length; qIdx++) {
          const q = pkg.questions[qIdx];
          const pId = q.passageId ? (pkgPassageMap.get(q.passageId) || null) : null;
          questions.push({
            id: `q_${setId}_${qIdx + 1}`,
            userId: 'local_user',
            setId,
            passageId: pId,
            no: q.no ?? (qIdx + 1),
            prompt: q.prompt,
            options: q.options || ['', '', '', ''],
            correctIndex: q.correctIndex ?? null,
            answerSource: q.answerSource || 'document',
            verified: q.verified ?? false,
            category: q.category || '',
            formula: q.formula || '',
            explanation: q.explanation || '',
            figure: q.figure || null,
            position: q.position ?? qIdx,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
  }

  const defaultStats: UserStats = {
    id: 'default_stats',
    userId: 'local_user',
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

  const defaultSettings: UserSettings = {
    id: 'default_settings',
    userId: 'local_user',
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

  return {
    version: 1,
    exportedAt: now,
    subjects,
    topics,
    sets,
    passages,
    questions,
    setProgress: [],
    questionAttempts: [],
    userStats: defaultStats,
    settings: defaultSettings,
  };
}

/**
 * Restore data from backup:
 * - 'replace': Clears all data, then loads backup cleanly.
 * - 'merge': Merges new content, retains highest progress (Math.max(curStars, backupStars)), avoids overwriting loss.
 */
export async function restoreFullBackup(
  backupInput: any,
  mode: 'replace' | 'merge' = 'replace',
  repo?: DataRepository
): Promise<RestoreResult> {
  const activeRepo = repo || getRepository();

  const inspection = inspectBackupFile(backupInput);
  if (!inspection.isValid) {
    throw new Error(inspection.error || 'Dữ liệu sao lưu không hợp lệ');
  }

  const fullBackup = convertLegacyToFullBackup(inspection.data);

  // Preserve existing Gemini API key so user doesn't lose it
  let currentApiKey = '';
  try {
    const existingSettings = await activeRepo.getSettings();
    if (existingSettings && existingSettings.geminiApiKey) {
      currentApiKey = existingSettings.geminiApiKey;
    }
  } catch (err) {
    // ignore
  }

  if (mode === 'replace') {
    // 1. Clear database completely
    await activeRepo.clearAllData();

    // 2. Put subjects
    for (const item of fullBackup.subjects || []) {
      await (activeRepo as any).putStoreItem?.('subjects', item) || activeRepo.createSubject(item);
    }

    // 3. Put topics
    for (const item of fullBackup.topics || []) {
      await (activeRepo as any).putStoreItem?.('topics', item) || activeRepo.createTopic(item);
    }

    // 4. Put sets
    for (const item of fullBackup.sets || []) {
      await (activeRepo as any).putStoreItem?.('sets', item) || activeRepo.createSet(item);
    }

    // 5. Put passages
    for (const item of fullBackup.passages || []) {
      await (activeRepo as any).putStoreItem?.('passages', item) || activeRepo.createPassage(item);
    }

    // 6. Put questions
    for (const item of fullBackup.questions || []) {
      await (activeRepo as any).putStoreItem?.('questions', item) || activeRepo.createQuestion(item);
    }

    // 7. Put progress
    for (const item of fullBackup.setProgress || []) {
      await activeRepo.saveSetProgress(item);
    }

    // 8. Put attempts
    for (const item of fullBackup.questionAttempts || []) {
      await activeRepo.recordAttempt(item);
    }

    // 9. Put userStats
    if (fullBackup.userStats) {
      await activeRepo.updateUserStats(fullBackup.userStats);
    }

    // 10. Put settings (with currentApiKey preserved if empty in backup)
    if (fullBackup.settings) {
      const restoredSettings: UserSettings = {
        ...fullBackup.settings,
        geminiApiKey: fullBackup.settings.geminiApiKey || currentApiKey,
      };
      await activeRepo.updateSettings(restoredSettings);
    }

    // 11. Overwrite topic chest flags
    if (Array.isArray(fullBackup.topicChestFlags)) {
      saveStoredTopicChestFlags(fullBackup.topicChestFlags);
    }

    return {
      success: true,
      mode: 'replace',
      format: inspection.format,
      importedSubjects: fullBackup.subjects.length,
      importedTopics: fullBackup.topics.length,
      importedSets: fullBackup.sets.length,
      importedQuestions: fullBackup.questions.length,
      message: `Đã thay thế toàn bộ dữ liệu: ${fullBackup.subjects.length} môn, ${fullBackup.topics.length} chuyên đề, ${fullBackup.sets.length} bài học, ${fullBackup.questions.length} câu hỏi.`,
    };
  }

  // MODE: 'merge'
  // 1. Merge Subjects
  const existingSubjects = await activeRepo.getSubjects();
  const existingSubjectMap = new Map<string, Subject>();
  for (const s of existingSubjects) {
    existingSubjectMap.set(s.id, s);
    existingSubjectMap.set(s.name.toLowerCase(), s);
  }

  for (const s of fullBackup.subjects || []) {
    const found = existingSubjectMap.get(s.id) || existingSubjectMap.get(s.name.toLowerCase());
    if (!found) {
      await (activeRepo as any).putStoreItem?.('subjects', s) || activeRepo.createSubject(s);
      existingSubjectMap.set(s.id, s);
    }
  }

  // 2. Merge Topics
  const existingTopics = await activeRepo.getTopics();
  const existingTopicMap = new Map<string, Topic>();
  for (const t of existingTopics) {
    existingTopicMap.set(t.id, t);
    existingTopicMap.set(`${t.subjectId}::${t.name.toLowerCase()}`, t);
  }

  for (const t of fullBackup.topics || []) {
    const key = `${t.subjectId}::${t.name.toLowerCase()}`;
    const found = existingTopicMap.get(t.id) || existingTopicMap.get(key);
    if (!found) {
      await (activeRepo as any).putStoreItem?.('topics', t) || activeRepo.createTopic(t);
      existingTopicMap.set(t.id, t);
    }
  }

  // 3. Merge Sets
  const existingSets = await activeRepo.getSets();
  const existingSetMap = new Map<string, SetEntity>();
  for (const st of existingSets) {
    existingSetMap.set(st.id, st);
    existingSetMap.set(`${st.topicId}::${st.name.toLowerCase()}`, st);
  }

  for (const st of fullBackup.sets || []) {
    const key = `${st.topicId}::${st.name.toLowerCase()}`;
    const found = existingSetMap.get(st.id) || existingSetMap.get(key);
    if (!found) {
      await (activeRepo as any).putStoreItem?.('sets', st) || activeRepo.createSet(st);
      existingSetMap.set(st.id, st);
    }
  }

  // 4. Merge Passages
  const existingPassages = await activeRepo.getPassages();
  const existingPassageMap = new Map<string, Passage>();
  for (const p of existingPassages) existingPassageMap.set(p.id, p);

  for (const p of fullBackup.passages || []) {
    if (!existingPassageMap.has(p.id)) {
      await (activeRepo as any).putStoreItem?.('passages', p) || activeRepo.createPassage(p);
      existingPassageMap.set(p.id, p);
    }
  }

  // 5. Merge Questions
  const existingQuestions = await activeRepo.getQuestions();
  const existingQuestionMap = new Map<string, Question>();
  for (const q of existingQuestions) existingQuestionMap.set(q.id, q);

  for (const q of fullBackup.questions || []) {
    if (!existingQuestionMap.has(q.id)) {
      await (activeRepo as any).putStoreItem?.('questions', q) || activeRepo.createQuestion(q);
      existingQuestionMap.set(q.id, q);
    }
  }

  // 6. Merge Set Progress (CRITICAL: Math.max(curStars, backupStars), retain highest score)
  const existingProgress = await activeRepo.getAllSetProgress();
  const progressMap = new Map<string, SetProgress>();
  for (const prog of existingProgress) progressMap.set(prog.setId, prog);

  for (const incomingProg of fullBackup.setProgress || []) {
    const current = progressMap.get(incomingProg.setId);
    if (!current) {
      await activeRepo.saveSetProgress(incomingProg);
    } else {
      const mergedStars = Math.max(current.stars || 0, incomingProg.stars || 0);
      const mergedScore = Math.max(current.score || 0, incomingProg.score || 0);
      const mergedAttempts = Math.max(current.attemptsCount || 0, incomingProg.attemptsCount || 0);
      const mergedCompleted = Boolean(current.completed || incomingProg.completed);
      const resume = current.resume_state || (incomingProg as any).resume_state || (incomingProg as any).resumeState || null;

      await activeRepo.saveSetProgress({
        ...current,
        stars: mergedStars,
        score: mergedScore,
        attemptsCount: mergedAttempts,
        completed: mergedCompleted,
        resume_state: resume,
        resumeState: resume,
        lastAttemptedAt: current.lastAttemptedAt || incomingProg.lastAttemptedAt,
      });
    }
  }

  // 7. Merge Attempts
  const existingAttempts = await activeRepo.getAttempts();
  const attemptIds = new Set(existingAttempts.map((a) => a.id));
  for (const att of fullBackup.questionAttempts || []) {
    if (!attemptIds.has(att.id)) {
      await activeRepo.recordAttempt(att);
      attemptIds.add(att.id);
    }
  }

  // 8. Merge User Stats
  if (fullBackup.userStats) {
    const curStats = await activeRepo.getUserStats();
    await activeRepo.updateUserStats({
      xp: Math.max(curStats.xp || 0, fullBackup.userStats.xp || 0),
      streak: Math.max(curStats.streak || 0, fullBackup.userStats.streak || 0),
      maxStreak: Math.max(curStats.maxStreak || 0, fullBackup.userStats.maxStreak || 0),
      streakFreezesWeekly: Math.max(curStats.streakFreezesWeekly || 0, fullBackup.userStats.streakFreezesWeekly || 0),
      streakFreezesReserve: Math.max(curStats.streakFreezesReserve || 0, fullBackup.userStats.streakFreezesReserve || 0),
      targetMajorCode: curStats.targetMajorCode || fullBackup.userStats.targetMajorCode,
      targetMajorName: curStats.targetMajorName || fullBackup.userStats.targetMajorName,
      targetScore: curStats.targetScore || fullBackup.userStats.targetScore,
      dailyGoalXp: Math.max(curStats.dailyGoalXp || 50, fullBackup.userStats.dailyGoalXp || 50),
    });
  }

  // 9. Merge Settings (Preserve current API key)
  if (fullBackup.settings) {
    const curSettings = await activeRepo.getSettings();
    await activeRepo.updateSettings({
      soundEnabled: curSettings.soundEnabled,
      theme: curSettings.theme || fullBackup.settings.theme,
      geminiApiKey: curSettings.geminiApiKey || currentApiKey,
    });
  }

  // 10. Merge Topic Chest Flags
  if (Array.isArray(fullBackup.topicChestFlags)) {
    const currentFlags = getStoredTopicChestFlags();
    const combined = Array.from(new Set([...currentFlags, ...fullBackup.topicChestFlags]));
    saveStoredTopicChestFlags(combined);
  }

  return {
    success: true,
    mode: 'merge',
    format: inspection.format,
    importedSubjects: fullBackup.subjects.length,
    importedTopics: fullBackup.topics.length,
    importedSets: fullBackup.sets.length,
    importedQuestions: fullBackup.questions.length,
    message: `Đã gộp thành công dữ liệu từ file sao lưu (bảo toàn số sao và tiến độ cao nhất).`,
  };
}

const backupService = {
  exportFullBackup,
  exportFullBackupToFile,
  inspectBackupFile,
  restoreFullBackup,
  convertLegacyToFullBackup,
  generateBackupFileName,
};

export default backupService;

