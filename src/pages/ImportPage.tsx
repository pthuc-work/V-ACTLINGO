import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  FileText,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UploadCloud,
  Layers,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Check,
  X,
  FileSpreadsheet,
  Crop as CropIcon,
  HelpCircle,
  FolderPlus,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Save,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ListFilter,
} from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  Modal,
  RichText,
  useToast,
} from '../components/ui';
import { getRepository } from '../data';
import { Subject, Topic, SetEntity, V1ImportPackage } from '../data/types';
import {
  DEFAULT_SUBJECTS,
  buildImportPrompt,
  SupportedSubject,
} from '../features/import/promptBuilder';
import {
  ImportSchemaV1,
  ImportQuestionV1,
  ImportPassageV1,
  validateSchemaV1,
} from '../features/import/schema';
import { parseAndRepair, ParseRepairResult } from '../features/import/parseAndRepair';
import {
  mergeMultipartParts,
  MultipartMergeResult,
  MultipartTracker,
} from '../features/import/multipart';
import {
  parseQuickAnswers,
  applyQuickAnswers,
  QuickAnswerApplyResult,
  QuickAnswerDiff,
  indexToLetter,
  letterToIndex,
} from '../features/import/quickAnswerInput';
import { FigureCropperModal } from '../features/import/FigureCropperModal';

export type TabType = 'prompt' | 'input' | 'preview';

interface StepItem {
  id: TabType;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: React.ReactNode;
}

const STEPS: StepItem[] = [
  {
    id: 'prompt',
    title: '1. Tạo Prompt',
    shortTitle: 'Tạo Prompt',
    subtitle: 'Cấu hình & tạo prompt',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: 'input',
    title: '2. Nhập JSON',
    shortTitle: 'Nhập JSON',
    subtitle: 'Dán & phân tích dữ liệu',
    icon: <UploadCloud className="w-4 h-4" />,
  },
  {
    id: 'preview',
    title: '3. Xem trước & Sửa',
    shortTitle: 'Xem & Sửa',
    subtitle: 'Kiểm tra & lưu bài học',
    icon: <Edit3 className="w-4 h-4" />,
  },
];

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();

  const querySubjectId = searchParams.get('subjectId') || '';
  const queryTopicId = searchParams.get('topicId') || '';
  const querySubjectName = searchParams.get('subjectName') || searchParams.get('subject') || '';
  const queryTopicName = searchParams.get('topicName') || searchParams.get('topic') || '';

  const [activeTab, setActiveTab] = useState<TabType>('prompt');

  // Existing curriculum data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sets, setSets] = useState<SetEntity[]>([]);

  // ----------------------------------------------------------------------------
  // TAB 1: PROMPT BUILDER STATE
  // ----------------------------------------------------------------------------
  const [selectedSubjectName, setSelectedSubjectName] = useState<SupportedSubject>(
    (querySubjectName as SupportedSubject) || 'Tiếng Anh'
  );
  const [topicName, setTopicName] = useState<string>(
    queryTopicName || 'Chuyên đề 15: Câu điều kiện'
  );
  const [setName, setSetName] = useState<string>('Bài tập áp dụng');
  const [docType, setDocType] = useState<string>('exam');
  const [chunkSize, setChunkSize] = useState<number>(25);
  const [expectedParts, setExpectedParts] = useState<number>(3);
  const [customPromptNote, setCustomPromptNote] = useState<string>('');

  const generatedPrompt = useMemo(() => {
    let customInstructions = '';
    if (docType === 'reading') {
      customInstructions = 'Tài liệu có kèm bài đọc hiểu. Hãy tách các đoạn văn dài thành passages[] với id riêng, và gắn passageId tương ứng vào các câu hỏi.';
    } else if (docType === 'complex') {
      customInstructions = 'Tài liệu có công thức KaTeX và hình vẽ phức tạp. Giữ nguyên công thức \\frac{...}, \\sqrt{...} và escape thành \\\\frac, \\\\sqrt. Với hình vẽ, điền page và ước tính bbox: [x0,y0,x1,y1].';
    }

    return buildImportPrompt({
      subject: selectedSubjectName,
      topic: topicName,
      set: setName,
      chunkSize,
      totalPartsExpected: expectedParts,
      customInstructions: customInstructions
        ? `${customInstructions} ${customPromptNote}`.trim()
        : customPromptNote,
    });
  }, [selectedSubjectName, topicName, setName, docType, chunkSize, expectedParts, customPromptNote]);

  // ----------------------------------------------------------------------------
  // TAB 2: JSON INPUT & MULTIPART STATE
  // ----------------------------------------------------------------------------
  const [rawJsonInput, setRawJsonInput] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [lastParseResult, setLastParseResult] = useState<ParseRepairResult | null>(null);

  // Multipart tracking
  const [receivedParts, setReceivedParts] = useState<ImportSchemaV1[]>([]);
  const [multipartSummary, setMultipartSummary] = useState<MultipartMergeResult | null>(null);

  // ----------------------------------------------------------------------------
  // TAB 3: PREVIEW & EDIT STATE
  // ----------------------------------------------------------------------------
  const [packageData, setPackageData] = useState<ImportSchemaV1>({
    schemaVersion: 1,
    subject: querySubjectName || 'Tiếng Anh',
    topic: queryTopicName || 'Chuyên đề 15: Câu điều kiện',
    set: 'Bài tập áp dụng',
    questions: [],
    passages: [],
  });

  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number>(0);
  const [filterMode, setFilterMode] = useState<'all' | 'unanswered' | 'ai' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isQuestionDrawerOpen, setIsQuestionDrawerOpen] = useState<boolean>(false);

  // Destination / Save State
  const [destSubjectMode, setDestSubjectMode] = useState<'existing' | 'new'>('existing');
  const [destSelectedSubjectId, setDestSelectedSubjectId] = useState<string>(querySubjectId);
  const [destNewSubjectName, setDestNewSubjectName] = useState<string>(querySubjectName || '');

  const [destTopicMode, setDestTopicMode] = useState<'existing' | 'new'>('existing');
  const [destSelectedTopicId, setDestSelectedTopicId] = useState<string>(queryTopicId);
  const [destNewTopicName, setDestNewTopicName] = useState<string>(queryTopicName || '');

  const [destSetName, setDestSetName] = useState<string>('Bài tập áp dụng');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modals state
  const [isQuickAnswerModalOpen, setIsQuickAnswerModalOpen] = useState<boolean>(false);
  const [quickAnswerText, setQuickAnswerText] = useState<string>('');
  const [quickAnswerDiffs, setQuickAnswerDiffs] = useState<QuickAnswerDiff[] | null>(null);
  const [quickAnswerWarnings, setQuickAnswerWarnings] = useState<string[]>([]);

  const [isFigureModalOpen, setIsFigureModalOpen] = useState<boolean>(false);
  const [figureTargetQIdx, setFigureTargetQIdx] = useState<number | null>(null);

  // Load existing subjects and topics with full query param matching
  useEffect(() => {
    let isMounted = true;
    const loadCurriculum = async () => {
      try {
        const repo = getRepository();
        const subs = await repo.getSubjects();
        if (!isMounted) return;
        setSubjects(subs);

        // Resolve subject: by querySubjectId, or by querySubjectName, or first
        let matchedSub = subs.find((s) => s.id === querySubjectId);
        if (!matchedSub && querySubjectName) {
          matchedSub = subs.find(
            (s) => s.name.toLowerCase() === querySubjectName.toLowerCase()
          );
        }

        let initialSubId = matchedSub ? matchedSub.id : querySubjectId;
        if (!initialSubId && subs.length > 0) {
          initialSubId = subs[0].id;
          matchedSub = subs[0];
        }

        if (matchedSub) {
          setSelectedSubjectName(matchedSub.name as SupportedSubject);
          setPackageData((prev) => ({ ...prev, subject: matchedSub!.name }));
          setDestNewSubjectName(matchedSub.name);
          setDestSubjectMode('existing');
        } else if (querySubjectName) {
          setSelectedSubjectName(querySubjectName as SupportedSubject);
          setPackageData((prev) => ({ ...prev, subject: querySubjectName }));
          setDestNewSubjectName(querySubjectName);
        }

        setDestSelectedSubjectId(initialSubId);

        if (initialSubId) {
          const tops = await repo.getTopics(initialSubId);
          if (!isMounted) return;
          setTopics(tops);

          let matchedTopic = tops.find((t) => t.id === queryTopicId);
          if (!matchedTopic && queryTopicName) {
            matchedTopic = tops.find(
              (t) => t.name.toLowerCase() === queryTopicName.toLowerCase()
            );
          }

          let initialTopId = matchedTopic ? matchedTopic.id : queryTopicId;
          if (!initialTopId && tops.length > 0) {
            initialTopId = tops[0].id;
            matchedTopic = tops[0];
          }

          if (matchedTopic) {
            setTopicName(matchedTopic.name);
            setPackageData((prev) => ({ ...prev, topic: matchedTopic!.name }));
            setDestNewTopicName(matchedTopic.name);
            setDestTopicMode('existing');
          } else if (queryTopicName) {
            setTopicName(queryTopicName);
            setPackageData((prev) => ({ ...prev, topic: queryTopicName }));
            setDestNewTopicName(queryTopicName);
          }

          setDestSelectedTopicId(initialTopId);
        }
      } catch (err) {
        console.error('Error loading subjects/topics:', err);
      }
    };
    loadCurriculum();
    return () => {
      isMounted = false;
    };
  }, [querySubjectId, queryTopicId, querySubjectName, queryTopicName]);

  // When selected destination subject changes, update topics
  const handleSubjectChange = async (subjectId: string) => {
    setDestSelectedSubjectId(subjectId);
    try {
      const repo = getRepository();
      const tops = await repo.getTopics(subjectId);
      setTopics(tops);
      if (tops.length > 0) {
        setDestSelectedTopicId(tops[0].id);
      } else {
        setDestSelectedTopicId('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Synchronize package metadata into destination fields
  const syncDestinationFromPackage = (pkg: ImportSchemaV1) => {
    if (pkg.subject) {
      setDestNewSubjectName(pkg.subject);
      const match = subjects.find((s) => s.name.toLowerCase() === pkg.subject.toLowerCase());
      if (match) {
        setDestSubjectMode('existing');
        handleSubjectChange(match.id);
      } else {
        setDestSubjectMode('new');
      }
    }
    if (pkg.topic) {
      setDestNewTopicName(pkg.topic);
      const matchTopic = topics.find((t) => t.name.toLowerCase() === pkg.topic.toLowerCase());
      if (matchTopic) {
        setDestTopicMode('existing');
        setDestSelectedTopicId(matchTopic.id);
      } else {
        setDestTopicMode('new');
      }
    }
    if (pkg.set) {
      setDestSetName(pkg.set);
    }
  };

  // ----------------------------------------------------------------------------
  // TAB 1 ACTIONS
  // ----------------------------------------------------------------------------
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      showSuccessToast('Đã sao chép prompt! Dán vào Gemini, ChatGPT hoặc Claude để sinh dữ liệu.');
    } catch {
      showErrorToast('Không thể tự động sao chép, vui lòng bôi đen và nhấn Ctrl+C.');
    }
  };

  // ----------------------------------------------------------------------------
  // TAB 2 ACTIONS: PARSE, MULTIPART, MERGE
  // ----------------------------------------------------------------------------
  const handleParseCurrentInput = () => {
    if (!rawJsonInput.trim()) {
      showErrorToast('Vui lòng dán nội dung JSON trước khi phân tích.');
      return;
    }

    setIsParsing(true);
    try {
      const result = parseAndRepair(rawJsonInput);
      setLastParseResult(result);

      if (result.data) {
        const newPart = result.data;
        const updatedParts = [...receivedParts, newPart];
        setReceivedParts(updatedParts);

        if (updatedParts.length > 1 || newPart.part) {
          const mergeResult = mergeMultipartParts(updatedParts);
          setMultipartSummary(mergeResult);
          if (mergeResult.merged) {
            setPackageData(mergeResult.merged);
            syncDestinationFromPackage(mergeResult.merged);
          }
        } else {
          setPackageData(newPart);
          syncDestinationFromPackage(newPart);
        }

        showSuccessToast(`Phân tích thành công! Đã nạp ${newPart.questions.length} câu hỏi.`);
      } else {
        showErrorToast('Không thể phục hồi JSON. Vui lòng kiểm tra mục lỗi chi tiết bên dưới.');
      }
    } catch (e: any) {
      showErrorToast('Lỗi khi phân tích JSON: ' + (e.message || String(e)));
    } finally {
      setIsParsing(false);
    }
  };

  const handleMergeAllParts = () => {
    if (receivedParts.length === 0) return;
    const result = mergeMultipartParts(receivedParts);
    setMultipartSummary(result);
    if (result.merged) {
      setPackageData(result.merged);
      syncDestinationFromPackage(result.merged);
      showSuccessToast(`Đã gộp ${receivedParts.length} phần thành ${result.merged.questions.length} câu hỏi.`);
      setActiveTab('preview');
    } else {
      showErrorToast('Gộp các phần thất bại do có lỗi xung đột schema.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawJsonInput(text);
        showInfoToast(`Đã nạp file ${file.name}. Bấm "Phân tích JSON" để xử lý.`);
      }
    };
    reader.onerror = () => showErrorToast('Lỗi khi đọc file.');
    reader.readAsText(file);
  };

  const handleClearParts = () => {
    setReceivedParts([]);
    setMultipartSummary(null);
    setLastParseResult(null);
    setRawJsonInput('');
    showInfoToast('Đã xóa danh sách các phần đã nạp.');
  };

  // ----------------------------------------------------------------------------
  // TAB 3 ACTIONS: EDITING QUESTIONS
  // ----------------------------------------------------------------------------
  const questions = packageData.questions;
  const currentQuestion = questions[selectedQuestionIdx] || null;

  // Question status helper
  const getQuestionStatus = (q: ImportQuestionV1) => {
    if (q.correctIndex === null || q.correctIndex === undefined) {
      return { label: 'Chưa có đáp án', variant: 'warning' as const };
    }
    if (q.verified || q.answerSource === 'user') {
      return { label: 'Đã xác minh', variant: 'success' as const };
    }
    return { label: 'AI tạo', variant: 'ai' as const };
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = questions.length;
    let missing = 0;
    let ai = 0;
    let verified = 0;

    questions.forEach((q) => {
      if (q.correctIndex === null || q.correctIndex === undefined) {
        missing++;
      } else if (q.verified || q.answerSource === 'user') {
        verified++;
      } else if (q.answerSource === 'ai') {
        ai++;
      }
    });

    return { total, missing, ai, verified };
  }, [questions]);

  // Filtered question indices
  const filteredIndices = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        if (filterMode === 'unanswered' && q.correctIndex !== null && q.correctIndex !== undefined) return false;
        if (filterMode === 'ai' && q.answerSource !== 'ai') return false;
        if (filterMode === 'verified' && !q.verified && q.answerSource !== 'user') return false;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchPrompt = q.prompt.toLowerCase().includes(query);
          const matchCat = q.category?.toLowerCase().includes(query);
          const matchNo = String(q.no ?? idx + 1).includes(query);
          if (!matchPrompt && !matchCat && !matchNo) return false;
        }

        return true;
      })
      .map(({ idx }) => idx);
  }, [questions, filterMode, searchQuery]);

  const handleUpdateCurrentQuestion = (fields: Partial<ImportQuestionV1>) => {
    if (selectedQuestionIdx < 0 || selectedQuestionIdx >= questions.length) return;
    const updated = [...questions];
    updated[selectedQuestionIdx] = {
      ...updated[selectedQuestionIdx],
      ...fields,
    };
    setPackageData((prev) => ({ ...prev, questions: updated }));
  };

  const handleAddQuestion = () => {
    const newNo = questions.length + 1;
    const newQ: ImportQuestionV1 = {
      no: newNo,
      prompt: 'Câu hỏi mới...',
      options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
      correctIndex: null,
      answerSource: 'user',
      verified: true,
      category: 'Chưa phân loại',
      formula: '',
      explanation: '',
      passageId: null,
      figure: null,
    };
    setPackageData((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ],
    }));
    setSelectedQuestionIdx(questions.length);
    showSuccessToast(`Đã thêm Câu ${newNo}`);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      showErrorToast('Bộ đề cần có ít nhất 1 câu hỏi.');
      return;
    }
    const updated = questions.filter((_, i) => i !== idx);
    const renumbered = updated.map((q, i) => ({ ...q, no: i + 1 }));
    setPackageData((prev) => ({ ...prev, questions: renumbered }));
    if (selectedQuestionIdx >= renumbered.length) {
      setSelectedQuestionIdx(renumbered.length - 1);
    }
    showInfoToast(`Đã xóa câu ${idx + 1}`);
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const list = [...questions];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    const renumbered = list.map((q, i) => ({ ...q, no: i + 1 }));
    setPackageData((prev) => ({ ...prev, questions: renumbered }));
    setSelectedQuestionIdx(targetIdx);
  };

  // ----------------------------------------------------------------------------
  // QUICK ANSWER MODAL ACTIONS
  // ----------------------------------------------------------------------------
  const handleOpenQuickAnswerModal = () => {
    setQuickAnswerText('');
    setQuickAnswerDiffs(null);
    setQuickAnswerWarnings([]);
    setIsQuickAnswerModalOpen(true);
  };

  const handleAnalyzeQuickAnswer = () => {
    if (!quickAnswerText.trim()) {
      showErrorToast('Vui lòng nhập chuỗi đáp án.');
      return;
    }

    const parsed = parseQuickAnswers(quickAnswerText);
    const applyResult = applyQuickAnswers(questions, parsed.answers);

    setQuickAnswerDiffs(applyResult.diffs);
    setQuickAnswerWarnings([...parsed.warnings, ...applyResult.warnings]);
  };

  const handleConfirmQuickAnswers = () => {
    if (!quickAnswerText.trim()) return;

    const parsed = parseQuickAnswers(quickAnswerText);
    const applyResult = applyQuickAnswers(questions, parsed.answers);

    setPackageData((prev) => ({
      ...prev,
      questions: applyResult.updatedQuestions as ImportQuestionV1[],
    }));

    setIsQuickAnswerModalOpen(false);
    showSuccessToast(
      `Đã áp dụng ${applyResult.matchedCount} đáp án người dùng! (${applyResult.conflictCount} câu có điều chỉnh so với AI)`
    );
  };

  // ----------------------------------------------------------------------------
  // SAVE TO LESSON REPOSITORY
  // ----------------------------------------------------------------------------
  const handleSaveToLesson = async () => {
    if (questions.length === 0) {
      showErrorToast('Chưa có câu hỏi nào để lưu.');
      return;
    }

    let finalSubjectName = '';
    if (destSubjectMode === 'existing') {
      const match = subjects.find((s) => s.id === destSelectedSubjectId);
      finalSubjectName = match ? match.name : packageData.subject || 'Tiếng Anh';
    } else {
      finalSubjectName = destNewSubjectName.trim() || packageData.subject || 'Tiếng Anh';
    }

    let finalTopicName = '';
    if (destTopicMode === 'existing') {
      const match = topics.find((t) => t.id === destSelectedTopicId);
      finalTopicName = match ? match.name : packageData.topic || 'Chuyên đề mới';
    } else {
      finalTopicName = destNewTopicName.trim() || packageData.topic || 'Chuyên đề mới';
    }

    const finalSetName = destSetName.trim() || packageData.set || 'Bài tập áp dụng';

    setIsSaving(true);
    try {
      const repo = getRepository();

      const importPkg: V1ImportPackage = {
        schemaVersion: 1,
        subject: finalSubjectName,
        topic: finalTopicName,
        set: finalSetName,
        passages: packageData.passages?.map((p, pIdx) => ({
          id: p.id,
          title: p.title || '',
          content: p.content,
          position: pIdx,
        })),
        questions: questions.map((q, qIdx) => ({
          no: q.no ?? qIdx + 1,
          passageId: q.passageId || null,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          answerSource: q.answerSource || (q.verified ? 'user' : 'ai'),
          verified: q.verified ?? (q.answerSource === 'user'),
          category: q.category || 'Tổng hợp',
          formula: q.formula || '',
          explanation: q.explanation || '',
          figure: q.figure
            ? {
                url: q.figure.url || '',
                caption: q.figure.caption || '',
              }
            : null,
          position: qIdx,
        })),
      };

      const result = await repo.importV1Package(importPkg);

      showSuccessToast(
        `Lưu bài học thành công! Đã nạp ${result.questionCount} câu vào [${finalSubjectName} / ${finalTopicName} / ${finalSetName}].`
      );

      setTimeout(() => {
        const queryParams = new URLSearchParams({
          subjectId: result.subjectId,
          topicId: result.topicId,
          subjectName: finalSubjectName,
          topicName: finalTopicName,
        }).toString();
        navigate(`/roadmap?${queryParams}`);
      }, 700);
    } catch (err: any) {
      console.error('Import save error:', err);
      showErrorToast('Lỗi khi lưu vào bài học: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for Stepper status calculation
  const getStepStatus = (stepId: TabType): 'active' | 'completed' | 'pending' => {
    if (activeTab === stepId) return 'active';
    const order: Record<TabType, number> = { prompt: 0, input: 1, preview: 2 };
    const currentIdx = order[activeTab];
    const stepIdx = order[stepId];
    if (currentIdx > stepIdx) return 'completed';
    if (stepId === 'input' && receivedParts.length > 0) return 'completed';
    if (stepId === 'preview' && questions.length > 0) return 'completed';
    return 'pending';
  };

  // Render question list contents (shared between desktop left column and mobile drawer)
  const renderQuestionList = () => (
    <div className="flex flex-col h-full">
      {/* Search & Filter Header */}
      <div className="p-2.5 border-b border-brand-border space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-surface-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo nội dung, câu số..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border border-brand-border outline-none focus:border-brand-blue"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
              filterMode === 'all'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'bg-brand-bg text-surface-secondary hover:text-surface-primary'
            }`}
          >
            Tất cả ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('unanswered')}
            className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
              filterMode === 'unanswered'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-brand-bg text-amber-600 dark:text-amber-400'
            }`}
          >
            Thiếu đáp án ({stats.missing})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('ai')}
            className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
              filterMode === 'ai'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-brand-bg text-purple-600'
            }`}
          >
            AI ({stats.ai})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('verified')}
            className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
              filterMode === 'verified'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-brand-bg text-green-600'
            }`}
          >
            Xác minh ({stats.verified})
          </button>
        </div>
      </div>

      {/* List Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar min-h-[200px] max-h-[580px]">
        {filteredIndices.length === 0 ? (
          <div className="text-center py-8 text-surface-secondary text-xs font-bold">
            Không có câu hỏi nào khớp bộ lọc.
          </div>
        ) : (
          filteredIndices.map((idx) => {
            const q = questions[idx];
            const isSelected = idx === selectedQuestionIdx;
            const status = getQuestionStatus(q);

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedQuestionIdx(idx);
                  setIsQuestionDrawerOpen(false);
                }}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-brand-blue/10 border-brand-blue shadow-sm'
                    : 'bg-brand-bg/60 border-brand-border hover:border-brand-border/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center font-black text-xs text-brand-navy dark:text-brand-blue">
                      {q.no ?? idx + 1}
                    </span>
                    {q.category && (
                      <span
                        title={q.category}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-border/60 text-surface-secondary truncate max-w-[120px]"
                      >
                        {q.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Chip variant={status.variant} size="sm">
                      {status.label}
                    </Chip>

                    <button
                      type="button"
                      title="Xóa câu này"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuestion(idx);
                      }}
                      className="p-1 rounded-lg text-surface-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs font-medium text-surface-primary line-clamp-2">
                  {q.prompt || 'Chưa có nội dung đề bài...'}
                </p>

                <div className="flex items-center justify-between text-[11px] text-surface-secondary pt-1 border-t border-brand-border/40">
                  <span>
                    Đáp án:{' '}
                    <strong>
                      {q.correctIndex !== null && q.correctIndex !== undefined
                        ? indexToLetter(q.correctIndex)
                        : 'Chưa có'}
                    </strong>
                  </span>
                  {q.figure && <span className="text-brand-blue font-bold">Có hình minh họa</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 w-full pb-16">
      {/* =========================================================================
          TOP HEADER: 1 HÀNG TRÊN DESKTOP (ICON, TIÊU ĐỀ, MÔ TẢ, BADGE SCHEMA).
          XẾP DỌC KHI DƯỚI 768px (<md)
          ========================================================================= */}
      <header
        data-testid="import-header"
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-brand-card/70 border border-brand-border shadow-sm"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-brand-navy dark:text-brand-blue tracking-tight truncate">
              Số hóa đề thi bằng AI
            </h1>
            <p className="text-xs sm:text-sm font-medium text-surface-secondary mt-0.5 line-clamp-2">
              Tạo prompt chuẩn, tự động sửa lỗi JSON, cắt hình minh họa, kiểm tra đáp án và lưu thẳng vào Lộ trình.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
          <div
            data-testid="import-schema-badge"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-400 font-extrabold text-xs shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span>Định dạng chuẩn Schema v1</span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          STEPPER NGANG FULL-WIDTH (THAY THẾ TAB CŨ)
          Trạng thái: active / completed / pending
          Tự rút gọn nhãn trên màn hình hẹp, không bao giờ tràn khung
          ========================================================================= */}
      <nav aria-label="Tiến trình số hóa" data-testid="import-stepper" className="w-full">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
          {STEPS.map((step, idx) => {
            const status = getStepStatus(step.id);
            const badgeText =
              step.id === 'input' && receivedParts.length > 0
                ? `${receivedParts.length} phần`
                : step.id === 'preview' && questions.length > 0
                ? `${questions.length} câu`
                : null;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveTab(step.id)}
                data-step-id={step.id}
                data-status={status}
                aria-current={status === 'active' ? 'step' : undefined}
                className={`relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-left min-w-0 w-full overflow-hidden ${
                  status === 'active'
                    ? 'bg-brand-blue/10 border-brand-blue shadow-sm'
                    : status === 'completed'
                    ? 'bg-green-500/5 border-green-500/40 hover:bg-green-500/10'
                    : 'bg-brand-card/40 border-brand-border/60 hover:border-brand-border opacity-70 hover:opacity-100'
                }`}
              >
                {/* Status Indicator Icon / Step Number */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-colors ${
                    status === 'active'
                      ? 'bg-brand-blue text-white shadow-sm'
                      : status === 'completed'
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'bg-brand-border text-surface-secondary'
                  }`}
                >
                  {status === 'completed' ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Titles & Subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`font-black text-xs sm:text-sm truncate ${
                        status === 'active'
                          ? 'text-brand-blue'
                          : status === 'completed'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-surface-secondary'
                      }`}
                    >
                      <span className="hidden sm:inline">{step.title}</span>
                      <span className="sm:hidden">{step.shortTitle}</span>
                    </span>

                    {badgeText && (
                      <span className="hidden md:inline-block px-1.5 py-0.5 rounded-md text-[10px] font-black bg-brand-blue/15 text-brand-blue shrink-0">
                        {badgeText}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-medium text-surface-muted truncate hidden lg:block mt-0.5">
                    {step.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* =========================================================================
          BƯỚC 1: TẠO PROMPT
          ≥1100px: 2 cột - Trái: form cấu hình (380px, cuộn riêng), Phải: khung prompt calc(100dvh-...)
          <1100px: Xếp dọc, form trước, prompt sau.
          Nút "Sao chép Prompt" và "Sang tab Nhập JSON" cố định ở thanh trên khung prompt.
          ========================================================================= */}
      {activeTab === 'prompt' && (
        <div
          data-testid="import-step-1"
          className="w-full flex flex-col min-[1100px]:flex-row gap-5 items-stretch min-[1100px]:h-[calc(100dvh-220px)] min-[1100px]:min-h-[560px]"
        >
          {/* CỘT TRÁI: FORM CẤU HÌNH (~380px) */}
          <div className="w-full min-[1100px]:w-[380px] shrink-0 flex flex-col gap-4 min-[1100px]:overflow-y-auto custom-scrollbar pr-0 min-[1100px]:pr-1">
            <Card variant="default" padding="lg" className="border-brand-border/80 shadow-sm">
              <h3 className="text-base font-black text-surface-primary mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-blue" />
                Cấu hình thông tin đề thi
              </h3>

              <div className="space-y-4">
                {/* Subject Selector */}
                <div>
                  <label htmlFor="prompt-subject-select" className="block text-xs font-black text-surface-primary mb-1">
                    Môn học
                  </label>
                  <select
                    id="prompt-subject-select"
                    value={selectedSubjectName}
                    onChange={(e) => setSelectedSubjectName(e.target.value as SupportedSubject)}
                    title={selectedSubjectName}
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-bold border-2 border-brand-border outline-none focus:border-brand-blue transition-colors"
                  >
                    {DEFAULT_SUBJECTS.map((sub) => (
                      <option key={sub.code} value={sub.name}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic Name */}
                <div>
                  <label htmlFor="prompt-topic-input" className="block text-xs font-black text-surface-primary mb-1">
                    Tên Chuyên đề
                  </label>
                  <input
                    id="prompt-topic-input"
                    type="text"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    title={topicName}
                    placeholder="Ví dụ: Chuyên đề 15: Câu điều kiện"
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue transition-colors"
                  />
                </div>

                {/* Set / Lesson Name */}
                <div>
                  <label htmlFor="prompt-set-input" className="block text-xs font-black text-surface-primary mb-1">
                    Tên Bài học / Bộ đề
                  </label>
                  <input
                    id="prompt-set-input"
                    type="text"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    title={setName}
                    placeholder="Ví dụ: Bài tập áp dụng"
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue transition-colors"
                  />
                </div>

                {/* Document Type */}
                <div>
                  <label htmlFor="prompt-doctype-select" className="block text-xs font-black text-surface-primary mb-1">
                    Đặc thù tài liệu
                  </label>
                  <select
                    id="prompt-doctype-select"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue transition-colors"
                  >
                    <option value="exam">Đề thi trắc nghiệm thông thường (20-30 câu/lượt)</option>
                    <option value="reading">Có bài đọc hiểu chung (tạo danh sách passages)</option>
                    <option value="complex">Có công thức KaTeX & hình vẽ minh họa</option>
                  </select>
                </div>

                {/* Chunk size & total parts hint */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="prompt-chunk-size" className="block text-xs font-black text-surface-primary mb-1">
                      Số câu / lượt
                    </label>
                    <input
                      id="prompt-chunk-size"
                      type="number"
                      min={10}
                      max={50}
                      value={chunkSize}
                      onChange={(e) => setChunkSize(parseInt(e.target.value) || 25)}
                      className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label htmlFor="prompt-expected-parts" className="block text-xs font-black text-surface-primary mb-1">
                      Gợi ý số phần
                    </label>
                    <input
                      id="prompt-expected-parts"
                      type="number"
                      min={1}
                      max={10}
                      value={expectedParts}
                      onChange={(e) => setExpectedParts(parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>

                {/* Custom Note */}
                <div>
                  <label htmlFor="prompt-custom-note" className="block text-xs font-black text-surface-primary mb-1">
                    Ghi chú bổ sung cho chatbot (tùy chọn)
                  </label>
                  <textarea
                    id="prompt-custom-note"
                    rows={2}
                    value={customPromptNote}
                    onChange={(e) => setCustomPromptNote(e.target.value)}
                    placeholder="Ví dụ: Bỏ qua các câu 12-15 vì bị nhòe mực..."
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-brand-border">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<Copy className="w-4 h-4" />}
                  onClick={handleCopyPrompt}
                >
                  Sao chép Prompt
                </Button>
              </div>
            </Card>

            {/* Quick Guide Box */}
            <Card variant="default" padding="md" className="bg-brand-blue/5 border-brand-blue/20">
              <h4 className="text-xs font-black text-brand-navy dark:text-brand-blue mb-1">
                Quy trình số hóa 3 bước:
              </h4>
              <ol className="text-xs text-surface-secondary space-y-1 list-decimal list-inside font-medium">
                <li>Sao chép prompt ở đây và gửi kèm file PDF sang Gemini / ChatGPT.</li>
                <li>Chatbot trả lời từng phần (1/3, 2/3...), copy JSON dán vào Tab 2.</li>
                <li>Kiểm tra bảng xem trước ở Tab 3 và nhấn 'Lưu vào bài học'.</li>
              </ol>
            </Card>
          </div>

          {/* CỘT PHẢI: KHUNG PROMPT CHIẾM PHẦN CÒN LẠI */}
          <div className="flex-1 min-w-0 flex flex-col rounded-2xl border-2 border-brand-border bg-brand-card overflow-hidden shadow-sm min-[1100px]:h-full">
            {/* Thanh trên cố định của khung prompt */}
            <div className="sticky top-0 z-10 px-4 py-3 bg-brand-surface/95 backdrop-blur-sm border-b border-brand-border flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
                <span className="text-xs sm:text-sm font-black text-surface-primary uppercase tracking-wider truncate">
                  Prompt Tiếng Việt chuẩn hóa
                </span>
                <span className="text-[11px] font-bold text-surface-secondary hidden sm:inline">
                  ({generatedPrompt.length} ký tự)
                </span>
              </div>

              {/* Action Buttons cố định thanh trên */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Copy className="w-4 h-4" />}
                  onClick={handleCopyPrompt}
                  data-testid="copy-prompt-top-btn"
                >
                  Sao chép Prompt
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => setActiveTab('input')}
                  data-testid="goto-input-tab-btn"
                >
                  Sang tab Nhập JSON
                </Button>
              </div>
            </div>

            {/* Nội dung prompt cuộn riêng */}
            <div className="flex-1 min-h-[320px] min-[1100px]:min-h-0 relative bg-brand-bg/60 p-3 overflow-hidden">
              <textarea
                readOnly
                value={generatedPrompt}
                aria-label="Nội dung prompt đã sinh"
                className="w-full h-full min-h-[320px] p-4 rounded-xl bg-brand-bg font-mono text-xs border border-brand-border/60 text-surface-primary outline-none focus:border-brand-blue resize-none custom-scrollbar select-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BƯỚC 2: NHẬP JSON & GHÉP MULTIPART (GIỮ NGUYÊN 100% TÍNH NĂNG)
          ========================================================================= */}
      {activeTab === 'input' && (
        <div data-testid="import-step-2" className="flex flex-col gap-5 w-full">
          <Card variant="default" padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-black text-surface-primary flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-brand-blue" />
                  Dán phản hồi JSON từ Chatbot
                </h3>
                <p className="text-xs text-surface-secondary mt-0.5">
                  Bộ xử lý tự động bỏ rào ```json, sửa dấu \ của LaTeX, nháy cong, phẩy thừa và tự động phục hồi nếu JSON bị cắt dở dang.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-border text-surface-primary font-bold text-xs hover:bg-brand-border/80 transition-all">
                    <FileSpreadsheet className="w-4 h-4 text-brand-blue" />
                    Tải file .json / .txt
                  </span>
                  <input
                    type="file"
                    accept=".json,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                {receivedParts.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearParts}>
                    Xóa các phần ({receivedParts.length})
                  </Button>
                )}
              </div>
            </div>

            {/* JSON Textarea */}
            <textarea
              rows={12}
              value={rawJsonInput}
              onChange={(e) => setRawJsonInput(e.target.value)}
              placeholder={`Dán JSON của chatbot vào đây (có thể dán Phần 1/3, 2/3... hoặc toàn bộ gói JSON)...\n\n{\n  "schemaVersion": 1,\n  "subject": "Tiếng Anh",\n  "topic": "Chuyên đề 15: Câu điều kiện",\n  "set": "Bài tập áp dụng",\n  "questions": [...]\n}`}
              className="w-full p-4 rounded-2xl bg-brand-bg font-mono text-xs border-2 border-brand-border text-surface-primary outline-none focus:border-brand-blue transition-colors custom-scrollbar"
            />

            {/* Parse Action Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-brand-border">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  loading={isParsing}
                  disabled={!rawJsonInput.trim()}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={handleParseCurrentInput}
                >
                  Phân tích & Thêm phần này
                </Button>

                {receivedParts.length > 0 && (
                  <Button
                    variant="outline"
                    size="md"
                    leftIcon={<Layers className="w-4 h-4" />}
                    onClick={handleMergeAllParts}
                  >
                    Gộp tất cả các phần ({receivedParts.length})
                  </Button>
                )}
              </div>

              {questions.length > 0 && (
                <Button
                  variant="secondary"
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => setActiveTab('preview')}
                >
                  Xem trước ({questions.length} câu)
                </Button>
              )}
            </div>
          </Card>

          {/* Multipart Tracker Status Cards */}
          {receivedParts.length > 0 && (
            <Card variant="default" padding="md" className="bg-brand-surface border-brand-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-surface-primary flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-blue" />
                  Tiến độ ghép nhiều phần (Multipart Tracker):
                </span>
                <span className="text-xs font-bold text-surface-secondary">
                  Đã nhận: {receivedParts.length} phần · Tổng: {questions.length} câu
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {receivedParts.map((part, pIdx) => {
                  const partInfo = part.part
                    ? `Phần ${part.part.index}/${part.part.total}`
                    : `Gói lẻ #${pIdx + 1}`;
                  return (
                    <div
                      key={pIdx}
                      className="p-3 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-black text-brand-blue block">
                          {partInfo}
                        </span>
                        <span className="text-[11px] text-surface-secondary">
                          {part.questions.length} câu hỏi
                        </span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    </div>
                  );
                })}
              </div>

              {multipartSummary && multipartSummary.missingParts.length > 0 && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Chưa nhận đủ: Còn thiếu phần{' '}
                    {multipartSummary.missingParts.join(', ')}. Hãy yêu cầu chatbot gửi tiếp!
                  </span>
                </div>
              )}
            </Card>
          )}

          {/* Parse & Repair Report Details */}
          {lastParseResult && (
            <Card variant="default" padding="md" className="bg-brand-bg/50 border-brand-border">
              <h4 className="text-xs font-black text-surface-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Báo cáo tự động sửa lỗi (parseAndRepair):
              </h4>

              {lastParseResult.repairs.length > 0 ? (
                <ul className="text-xs space-y-1 mb-3">
                  {lastParseResult.repairs.map((rep, idx) => (
                    <li key={idx} className="text-brand-blue flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                      {rep}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-surface-secondary mb-3">
                  JSON hợp lệ hoàn toàn, không cần áp dụng thao tác sửa lỗi nào.
                </p>
              )}

              {lastParseResult.warnings.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-brand-border/60">
                  {lastParseResult.warnings.map((w, idx) => (
                    <div key={idx} className="text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {lastParseResult.errors.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-red-500/20">
                  {lastParseResult.errors.map((err, idx) => (
                    <div key={idx} className="text-red-500 text-xs font-bold flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5 shrink-0" />
                      {err}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* =========================================================================
          BƯỚC 3: XEM TRƯỚC & SỬA
          ≥1100px: Bố cục 2 cột (danh sách câu hỏi bên trái, form chỉnh sửa bên phải)
          <1100px: Danh sách câu thu gọn thành dropdown/drawer chọn câu, form chiếm toàn bộ
          ========================================================================= */}
      {activeTab === 'preview' && (
        <div data-testid="import-step-3" className="flex flex-col gap-5 w-full">
          {/* Top Status & Summary Bar */}
          <Card variant="default" padding="md" className="bg-brand-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-surface-secondary">Tổng số câu:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-blue text-white font-black text-xs">
                    {stats.total}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-surface-secondary">Chưa có đáp án:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-black text-xs ${
                      stats.missing > 0
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-brand-border text-surface-secondary'
                    }`}
                  >
                    {stats.missing}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-surface-secondary">AI tạo:</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 font-black text-xs">
                    {stats.ai}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-surface-secondary">Đã xác minh:</span>
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 font-black text-xs">
                    {stats.verified}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FileSpreadsheet className="w-4 h-4 text-brand-blue" />}
                  onClick={handleOpenQuickAnswerModal}
                >
                  Nhập đáp án nhanh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleAddQuestion}
                >
                  Thêm câu
                </Button>
              </div>
            </div>
          </Card>

          {/* DƯỚI 1100px: DROPDOWN / NÚT CHỌN CÂU THU GỌN VÀ NÚT MỞ BỘ LỌC DRAWER */}
          <div
            data-testid="compact-question-nav"
            className="flex min-[1100px]:hidden flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-brand-card border border-brand-border shadow-sm"
          >
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label htmlFor="mobile-question-select" className="text-xs font-black text-surface-primary whitespace-nowrap">
                Chọn câu:
              </label>
              <select
                id="mobile-question-select"
                value={selectedQuestionIdx}
                onChange={(e) => setSelectedQuestionIdx(Number(e.target.value))}
                className="flex-1 px-3 py-1.5 rounded-xl bg-brand-bg text-surface-primary text-xs font-bold border border-brand-border outline-none focus:border-brand-blue truncate"
              >
                {questions.map((q, idx) => {
                  const letter =
                    q.correctIndex !== null && q.correctIndex !== undefined
                      ? indexToLetter(q.correctIndex)
                      : '?';
                  return (
                    <option key={idx} value={idx}>
                      Câu {q.no ?? idx + 1} ({letter}) - {q.prompt ? q.prompt.slice(0, 36) + '...' : 'Chưa có nội dung'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedQuestionIdx <= 0}
                onClick={() => setSelectedQuestionIdx((prev) => Math.max(0, prev - 1))}
                title="Câu trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <span className="text-xs font-black text-brand-blue px-1 whitespace-nowrap">
                {questions.length > 0 ? selectedQuestionIdx + 1 : 0} / {questions.length}
              </span>

              <Button
                variant="ghost"
                size="sm"
                disabled={selectedQuestionIdx >= questions.length - 1}
                onClick={() => setSelectedQuestionIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                title="Câu sau"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                leftIcon={<ListFilter className="w-4 h-4 text-brand-blue" />}
                onClick={() => setIsQuestionDrawerOpen(true)}
              >
                Danh sách
              </Button>
            </div>
          </div>

          {/* MAIN BƯỚC 3 LAYOUT:
              ≥1100px: 2 CỘT (DANH SÁCH BÊN TRÁI 340px, FORM BÊN PHẢI)
              <1100px: FORM CHIẾM TOÀN BỘ CHIỀU NGANG */}
          <div className="flex flex-col min-[1100px]:flex-row gap-5 items-start w-full">
            {/* CỘT TRÁI (≥1100px): DANH SÁCH CÂU HỎI */}
            <aside
              data-testid="desktop-question-list"
              className="hidden min-[1100px]:flex min-[1100px]:w-[340px] shrink-0 flex-col gap-3"
            >
              <Card variant="default" padding="sm" className="w-full overflow-hidden">
                {renderQuestionList()}
              </Card>
            </aside>

            {/* CỘT PHẢI (HOẶC TOÀN BỘ KHI <1100px): FORM CHỈNH SỬA CHI TIẾT */}
            <main data-testid="question-editor-main" className="flex-1 min-w-0 w-full flex flex-col gap-4">
              {currentQuestion ? (
                <Card variant="default" padding="lg">
                  {/* Item Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-brand-border">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-surface-primary">
                        Chỉnh sửa Câu {currentQuestion.no ?? selectedQuestionIdx + 1}
                      </span>
                      <Chip variant={getQuestionStatus(currentQuestion).variant} size="sm">
                        {getQuestionStatus(currentQuestion).label}
                      </Chip>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={selectedQuestionIdx <= 0}
                        leftIcon={<ArrowUp className="w-4 h-4" />}
                        onClick={() => handleMoveQuestion(selectedQuestionIdx, 'up')}
                      >
                        Lên
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={selectedQuestionIdx >= questions.length - 1}
                        leftIcon={<ArrowDown className="w-4 h-4" />}
                        onClick={() => handleMoveQuestion(selectedQuestionIdx, 'down')}
                      >
                        Xuống
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        onClick={() => handleDeleteQuestion(selectedQuestionIdx)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    {/* Category & Formula Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="q-category-input" className="block text-xs font-black text-surface-primary mb-1">
                          Chuyên đề nhỏ / Phân loại (Category)
                        </label>
                        <input
                          id="q-category-input"
                          type="text"
                          value={currentQuestion.category || ''}
                          onChange={(e) => handleUpdateCurrentQuestion({ category: e.target.value })}
                          title={currentQuestion.category || ''}
                          placeholder="Ví dụ: Câu điều kiện loại 3, Từ vựng..."
                          className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                        />
                      </div>

                      <div>
                        <label htmlFor="q-formula-input" className="block text-xs font-black text-surface-primary mb-1">
                          Công thức / Điểm ngữ pháp (Formula)
                        </label>
                        <input
                          id="q-formula-input"
                          type="text"
                          value={currentQuestion.formula || ''}
                          onChange={(e) => handleUpdateCurrentQuestion({ formula: e.target.value })}
                          title={currentQuestion.formula || ''}
                          placeholder="Ví dụ: If + had + V3, would have + V3"
                          className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                        />
                      </div>
                    </div>

                    {/* Passage selection (if passages exist) */}
                    {packageData.passages && packageData.passages.length > 0 && (
                      <div>
                        <label htmlFor="q-passage-select" className="block text-xs font-black text-surface-primary mb-1">
                          Đoạn văn đọc hiểu liên kết (Passage)
                        </label>
                        <select
                          id="q-passage-select"
                          value={currentQuestion.passageId || ''}
                          onChange={(e) =>
                            handleUpdateCurrentQuestion({ passageId: e.target.value || null })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                        >
                          <option value="">-- Không liên kết đoạn văn --</option>
                          {packageData.passages.map((p, pIdx) => (
                            <option key={p.id || pIdx} value={p.id} title={p.title || `Đoạn văn #${pIdx + 1}`}>
                              {p.title || `Đoạn văn #${pIdx + 1} (${p.id})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Question Prompt Editor */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="q-prompt-editor" className="text-xs font-black text-surface-primary">
                          Nội dung Đề bài (hỗ trợ KaTeX, LaTeX):
                        </label>
                        <span className="text-[11px] text-surface-secondary">
                          Xem trước RichText trực tiếp phía dưới
                        </span>
                      </div>
                      <textarea
                        id="q-prompt-editor"
                        rows={4}
                        value={currentQuestion.prompt}
                        onChange={(e) => handleUpdateCurrentQuestion({ prompt: e.target.value })}
                        className="w-full p-3 rounded-xl bg-brand-bg text-surface-primary font-mono text-xs border-2 border-brand-border outline-none focus:border-brand-blue"
                      />

                      {/* Live Render Preview */}
                      <div className="mt-1.5 p-3 rounded-xl bg-brand-surface border border-brand-border">
                        <span className="text-[10px] font-black uppercase text-surface-secondary block mb-1">
                          Hiển thị đề bài:
                        </span>
                        <div className="text-sm font-medium text-surface-primary">
                          <RichText content={currentQuestion.prompt} />
                        </div>
                      </div>
                    </div>

                    {/* Figure Section */}
                    <div className="p-3 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {currentQuestion.figure?.url ? (
                          <img
                            src={currentQuestion.figure.url}
                            alt="Hình vẽ"
                            className="w-16 h-16 rounded-lg object-contain border border-brand-border bg-black/5"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-brand-border flex items-center justify-center text-surface-muted">
                            <CropIcon className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-black text-surface-primary block">
                            {currentQuestion.figure?.url
                              ? 'Đã gắn hình vẽ minh họa'
                              : 'Chưa có hình vẽ cho câu này'}
                          </span>
                          <span className="text-[11px] text-surface-secondary">
                            {currentQuestion.figure?.caption || 'Hỗ trợ cắt ảnh từ PDF hoặc tải file ảnh trực tiếp'}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<CropIcon className="w-4 h-4 text-brand-blue" />}
                        onClick={() => {
                          setFigureTargetQIdx(selectedQuestionIdx);
                          setIsFigureModalOpen(true);
                        }}
                      >
                        {currentQuestion.figure?.url ? 'Đổi hình' : 'Cắt / Tải hình'}
                      </Button>
                    </div>

                    {/* 4 Options (A, B, C, D) */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-surface-primary">
                        4 Phương án lựa chọn & Đánh dấu đáp án đúng:
                      </label>

                      {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                        const isCorrect = currentQuestion.correctIndex === optIdx;
                        const optionText = currentQuestion.options[optIdx] || '';

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                              isCorrect
                                ? 'bg-green-500/10 border-green-500/60 shadow-sm'
                                : 'bg-brand-bg border-brand-border'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCurrentQuestion({
                                  correctIndex: optIdx,
                                  answerSource: 'user',
                                  verified: true,
                                })
                              }
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-all ${
                                isCorrect
                                  ? 'bg-green-500 text-white shadow'
                                  : 'bg-brand-surface border border-brand-border text-surface-secondary hover:border-brand-blue'
                              }`}
                            >
                              {letter}
                            </button>

                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={optionText}
                                onChange={(e) => {
                                  const newOpts = [...currentQuestion.options];
                                  newOpts[optIdx] = e.target.value;
                                  handleUpdateCurrentQuestion({ options: newOpts });
                                }}
                                title={optionText}
                                aria-label={`Phương án ${letter}`}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-brand-surface text-surface-primary text-xs font-medium border border-brand-border outline-none focus:border-brand-blue"
                              />
                            </div>

                            {/* Option preview badge */}
                            <div className="shrink-0 max-w-[120px] truncate text-xs text-surface-secondary hidden sm:block">
                              <RichText content={optionText} />
                            </div>
                          </div>
                        );
                      })}

                      {/* No answer button */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateCurrentQuestion({
                              correctIndex: null,
                              answerSource: 'none',
                              verified: false,
                            })
                          }
                          className="text-xs text-surface-muted hover:text-amber-500 transition-colors"
                        >
                          Chưa rõ đáp án (đặt là null)
                        </button>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label htmlFor="q-explanation-editor" className="block text-xs font-black text-surface-primary mb-1">
                        Lời giải chi tiết (Explanation)
                      </label>
                      <textarea
                        id="q-explanation-editor"
                        rows={3}
                        value={currentQuestion.explanation || ''}
                        onChange={(e) => handleUpdateCurrentQuestion({ explanation: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-brand-bg text-surface-primary font-mono text-xs border-2 border-brand-border outline-none focus:border-brand-blue"
                      />
                      <div className="mt-1 p-2 rounded-lg bg-brand-surface border border-brand-border text-xs text-surface-secondary">
                        <RichText content={currentQuestion.explanation || 'Chưa có lời giải chi tiết'} />
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="text-center py-16 text-surface-secondary">
                  Chọn câu hỏi bên trái để bắt đầu chỉnh sửa.
                </div>
              )}
            </main>
          </div>

          {/* ===================================================================
              BOTTOM BAR: DESTINATION SELECTION & ATOMIC SAVE BUTTON
              =================================================================== */}
          <Card variant="default" padding="lg" className="bg-brand-surface border-2 border-brand-blue/30 shadow-md">
            <h3 className="text-sm font-black text-surface-primary mb-3 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-brand-blue" />
              Chọn nơi lưu vào Lộ trình học tập
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Subject Destination */}
              <div className="space-y-1.5">
                <label htmlFor="dest-subject-select" className="block text-xs font-black text-surface-primary">
                  1. Môn học
                </label>
                <div className="flex gap-2">
                  <select
                    id="dest-subject-select"
                    value={destSubjectMode === 'existing' ? destSelectedSubjectId : 'NEW'}
                    onChange={(e) => {
                      if (e.target.value === 'NEW') {
                        setDestSubjectMode('new');
                      } else {
                        setDestSubjectMode('existing');
                        handleSubjectChange(e.target.value);
                      }
                    }}
                    title={
                      subjects.find((s) => s.id === destSelectedSubjectId)?.name || 'Chọn môn học'
                    }
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-bold border-2 border-brand-border outline-none focus:border-brand-blue"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id} title={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                    <option value="NEW">+ Tạo môn học mới...</option>
                  </select>
                </div>
                {destSubjectMode === 'new' && (
                  <input
                    type="text"
                    value={destNewSubjectName}
                    onChange={(e) => setDestNewSubjectName(e.target.value)}
                    placeholder="Tên môn mới (VD: Tiếng Anh)"
                    title={destNewSubjectName}
                    className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-brand-bg text-surface-primary text-xs font-medium border border-brand-border"
                  />
                )}
              </div>

              {/* Topic Destination */}
              <div className="space-y-1.5">
                <label htmlFor="dest-topic-select" className="block text-xs font-black text-surface-primary">
                  2. Chuyên đề
                </label>
                <select
                  id="dest-topic-select"
                  value={destTopicMode === 'existing' ? destSelectedTopicId : 'NEW'}
                  onChange={(e) => {
                    if (e.target.value === 'NEW') {
                      setDestTopicMode('new');
                    } else {
                      setDestTopicMode('existing');
                      setDestSelectedTopicId(e.target.value);
                    }
                  }}
                  title={topics.find((t) => t.id === destSelectedTopicId)?.name || 'Chọn chuyên đề'}
                  className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-bold border-2 border-brand-border outline-none focus:border-brand-blue truncate"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id} title={t.name}>
                      {t.name}
                    </option>
                  ))}
                  <option value="NEW">+ Tạo chuyên đề mới...</option>
                </select>
                {destTopicMode === 'new' && (
                  <input
                    type="text"
                    value={destNewTopicName}
                    onChange={(e) => setDestNewTopicName(e.target.value)}
                    placeholder="Tên chuyên đề mới"
                    title={destNewTopicName}
                    className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-brand-bg text-surface-primary text-xs font-medium border border-brand-border"
                  />
                )}
              </div>

              {/* Set Destination */}
              <div className="space-y-1.5">
                <label htmlFor="dest-set-input" className="block text-xs font-black text-surface-primary">
                  3. Tên Bài học / Bộ đề
                </label>
                <input
                  id="dest-set-input"
                  type="text"
                  value={destSetName}
                  onChange={(e) => setDestSetName(e.target.value)}
                  placeholder="Ví dụ: Bài tập áp dụng"
                  title={destSetName}
                  className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-bold border-2 border-brand-border outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            {/* Final Save Button */}
            <div className="mt-5 pt-4 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-surface-secondary">
                {stats.missing > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Lưu ý: Có {stats.missing} câu chưa có đáp án đúng (người dùng sẽ tự làm hoặc xem sau).
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Đầy đủ đáp án! Sẵn sàng đưa vào lộ trình luyện tập.
                  </span>
                )}
              </div>

              <Button
                variant="primary"
                size="lg"
                loading={isSaving}
                disabled={questions.length === 0}
                leftIcon={<Save className="w-5 h-5" />}
                onClick={handleSaveToLesson}
              >
                Lưu vào bài học & Mở Lộ trình
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          DRAWER / MODAL: DANH SÁCH CÂU HỎI CHO MOBILE (<1100px)
          ========================================================================= */}
      <Modal
        isOpen={isQuestionDrawerOpen}
        onClose={() => setIsQuestionDrawerOpen(false)}
        title="Danh sách câu hỏi & Bộ lọc"
        size="md"
      >
        <div className="w-full max-h-[70vh] flex flex-col">
          {renderQuestionList()}
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: NHẬP ĐÁP ÁN NHANH (QUICK ANSWER INPUT & AI DIFF COMPARISON)
          ========================================================================= */}
      <Modal
        isOpen={isQuickAnswerModalOpen}
        onClose={() => setIsQuickAnswerModalOpen(false)}
        title="Nhập đáp án nhanh (Quick Answer)"
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-surface-secondary">
            Nhập chuỗi đáp án từ tài liệu hoặc đáp án chính thức để ghi đè đáp án AI. Hệ thống hỗ trợ mọi định dạng:{' '}
            <code className="text-brand-blue font-bold">1A 2C 3B</code>,{' '}
            <code className="text-brand-blue font-bold">1-A, 2-C</code>,{' '}
            <code className="text-brand-blue font-bold">1.A</code>, mỗi dòng 1 câu, hoặc chuỗi liền{' '}
            <code className="text-brand-blue font-bold">ABCD...</code>
          </p>

          <textarea
            rows={5}
            value={quickAnswerText}
            onChange={(e) => setQuickAnswerText(e.target.value)}
            placeholder="Ví dụ: 1A 2B 3C 4D... hoặc ABCDACBD..."
            className="w-full p-3 rounded-xl bg-brand-bg font-mono text-xs border-2 border-brand-border text-surface-primary outline-none focus:border-brand-blue"
          />

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Search className="w-4 h-4" />}
              onClick={handleAnalyzeQuickAnswer}
            >
              Đối chiếu với AI
            </Button>
          </div>

          {/* Diffs & Warnings Table */}
          {quickAnswerDiffs && (
            <div className="mt-2 space-y-3">
              {quickAnswerWarnings.length > 0 && (
                <div className="space-y-1">
                  {quickAnswerWarnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              <div className="max-h-60 overflow-y-auto border border-brand-border rounded-xl custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-brand-surface text-surface-primary font-black uppercase text-[10px] sticky top-0 border-b border-brand-border">
                    <tr>
                      <th className="p-2.5">Câu số</th>
                      <th className="p-2.5">Đáp án AI</th>
                      <th className="p-2.5">Đáp án Người dùng</th>
                      <th className="p-2.5">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {quickAnswerDiffs.map((diff) => (
                      <tr
                        key={diff.questionNo}
                        className={diff.isConflict ? 'bg-amber-500/10' : ''}
                      >
                        <td className="p-2.5 font-bold">Câu {diff.questionNo}</td>
                        <td className="p-2.5 font-medium">{diff.aiAnswer || 'Chưa có'}</td>
                        <td className="p-2.5 font-bold text-brand-blue">{diff.userAnswer}</td>
                        <td className="p-2.5">
                          {diff.isConflict ? (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              Lệch đáp án AI (sẽ ghi đè)
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-green-600 dark:text-green-400">
                              Trùng khớp / Điền mới
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border">
            <Button variant="ghost" size="sm" onClick={() => setIsQuickAnswerModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!quickAnswerText.trim()}
              leftIcon={<Check className="w-4 h-4" />}
              onClick={handleConfirmQuickAnswers}
            >
              Áp dụng đáp án
            </Button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: FIGURE CROPPER
          ========================================================================= */}
      {figureTargetQIdx !== null && (
        <FigureCropperModal
          isOpen={isFigureModalOpen}
          onClose={() => setIsFigureModalOpen(false)}
          initialFigure={questions[figureTargetQIdx]?.figure || null}
          onSave={(figData) => {
            const updated = [...questions];
            updated[figureTargetQIdx] = {
              ...updated[figureTargetQIdx],
              figure: {
                page: figData.page || 1,
                bbox: figData.bbox || [0, 0, 1, 1],
                url: figData.url,
                caption: figData.caption,
              },
            };
            setPackageData((prev) => ({ ...prev, questions: updated }));
            showSuccessToast('Đã lưu hình ảnh cho câu hỏi!');
          }}
          onRemove={() => {
            const updated = [...questions];
            updated[figureTargetQIdx] = {
              ...updated[figureTargetQIdx],
              figure: null,
            };
            setPackageData((prev) => ({ ...prev, questions: updated }));
            showInfoToast('Đã gỡ bỏ hình ảnh.');
          }}
        />
      )}
    </div>
  );
};
