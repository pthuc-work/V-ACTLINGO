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
} from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  Tabs,
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

type TabType = 'prompt' | 'input' | 'preview';

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

  // Load existing subjects and topics
  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        const repo = getRepository();
        const subs = await repo.getSubjects();
        setSubjects(subs);

        let initialSubId = querySubjectId;
        if (!initialSubId && subs.length > 0) {
          const matchSub = subs.find(
            (s) => s.name.toLowerCase() === (querySubjectName || 'tiếng anh').toLowerCase()
          );
          initialSubId = matchSub ? matchSub.id : subs[0].id;
        }
        setDestSelectedSubjectId(initialSubId);

        if (initialSubId) {
          const tops = await repo.getTopics(initialSubId);
          setTopics(tops);

          let initialTopId = queryTopicId;
          if (!initialTopId && tops.length > 0) {
            const matchTop = tops.find(
              (t) => t.name.toLowerCase() === (queryTopicName || '').toLowerCase()
            );
            initialTopId = matchTop ? matchTop.id : tops[0].id;
          }
          setDestSelectedTopicId(initialTopId);
        }
      } catch (err) {
        console.error('Error loading subjects/topics:', err);
      }
    };
    loadCurriculum();
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
        // If data is single part or multipart
        const newPart = result.data;
        const updatedParts = [...receivedParts, newPart];
        setReceivedParts(updatedParts);

        // Check if multiple parts or single
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
    // Renumber
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

    // Renumber
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

    // Determine target Subject Name
    let finalSubjectName = '';
    if (destSubjectMode === 'existing') {
      const match = subjects.find((s) => s.id === destSelectedSubjectId);
      finalSubjectName = match ? match.name : packageData.subject || 'Tiếng Anh';
    } else {
      finalSubjectName = destNewSubjectName.trim() || packageData.subject || 'Tiếng Anh';
    }

    // Determine target Topic Name
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

      // Construct atomic V1ImportPackage
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

      // Navigate to Roadmap with query parameters
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

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Chip variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
              AI TRỢ LÝ SỐ HÓA
            </Chip>
            <span className="text-xs font-bold text-surface-secondary">
              Định dạng chuẩn Schema v1
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
            Số hóa đề thi bằng AI
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-surface-secondary mt-0.5">
            Tạo prompt chuẩn, tự động sửa lỗi JSON, cắt hình minh họa, kiểm tra đáp án và lưu thẳng vào Lộ trình.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="shrink-0">
          <Tabs
            size="md"
            tabs={[
              { id: 'prompt', label: '1. Tạo Prompt', icon: <FileText className="w-4 h-4" /> },
              {
                id: 'input',
                label: '2. Nhập JSON',
                icon: <UploadCloud className="w-4 h-4" />,
                badge: receivedParts.length > 0 ? `${receivedParts.length} phần` : undefined,
              },
              {
                id: 'preview',
                label: '3. Xem trước & Sửa',
                icon: <Edit3 className="w-4 h-4" />,
                badge: questions.length > 0 ? `${questions.length} câu` : undefined,
              },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as TabType)}
          />
        </div>
      </div>

      {/* =========================================================================
          TAB 1: TẠO PROMPT
          ========================================================================= */}
      {activeTab === 'prompt' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <Card variant="default" padding="lg">
              <h3 className="text-base font-black text-surface-primary mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-blue" />
                Cấu hình thông tin đề thi
              </h3>

              <div className="space-y-4">
                {/* Subject Selector */}
                <div>
                  <label className="block text-xs font-black text-surface-primary mb-1">
                    Môn học
                  </label>
                  <select
                    value={selectedSubjectName}
                    onChange={(e) => setSelectedSubjectName(e.target.value as SupportedSubject)}
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
                  <label className="block text-xs font-black text-surface-primary mb-1">
                    Tên Chuyên đề
                  </label>
                  <input
                    type="text"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder="Ví dụ: Chuyên đề 15: Câu điều kiện"
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue transition-colors"
                  />
                </div>

                {/* Set / Lesson Name */}
                <div>
                  <label className="block text-xs font-black text-surface-primary mb-1">
                    Tên Bài học / Bộ đề
                  </label>
                  <input
                    type="text"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    placeholder="Ví dụ: Bài tập áp dụng"
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue transition-colors"
                  />
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-xs font-black text-surface-primary mb-1">
                    Đặc thù tài liệu
                  </label>
                  <select
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
                    <label className="block text-xs font-black text-surface-primary mb-1">
                      Số câu / lượt
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={50}
                      value={chunkSize}
                      onChange={(e) => setChunkSize(parseInt(e.target.value) || 25)}
                      className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-surface-primary mb-1">
                      Gợi ý số phần
                    </label>
                    <input
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
                  <label className="block text-xs font-black text-surface-primary mb-1">
                    Ghi chú bổ sung cho chatbot (tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    value={customPromptNote}
                    onChange={(e) => setCustomPromptNote(e.target.value)}
                    placeholder="Ví dụ: Bỏ qua các câu 12-15 vì bị nhòe mực..."
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-brand-border flex items-center justify-between gap-3">
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

          {/* Generated Prompt Preview Column */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-surface-primary uppercase tracking-wider">
                Nội dung Prompt Tiếng Việt chuẩn hóa:
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                  onClick={handleCopyPrompt}
                >
                  Sao chép
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => setActiveTab('input')}
                >
                  Sang Tab Nhập JSON
                </Button>
              </div>
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={22}
                value={generatedPrompt}
                className="w-full p-4 rounded-2xl bg-brand-bg font-mono text-xs border-2 border-brand-border text-surface-primary outline-none focus:border-brand-blue custom-scrollbar shadow-inner select-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: NHẬP JSON & GHÉP MULTIPART
          ========================================================================= */}
      {activeTab === 'input' && (
        <div className="flex flex-col gap-6">
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
          TAB 3: XEM TRƯỚC & CHỈNH SỬA
          ========================================================================= */}
      {activeTab === 'preview' && (
        <div className="flex flex-col gap-6">
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

          {/* Main 2-Column Editing Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* -----------------------------------------------------------------
                LEFT COLUMN: QUESTION LIST
                ----------------------------------------------------------------- */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <Card variant="default" padding="sm" className="overflow-hidden">
                {/* Search & Filter Header */}
                <div className="p-2 border-b border-brand-border space-y-2">
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
                  </div>
                </div>

                {/* List Items */}
                <div className="max-h-[560px] overflow-y-auto p-2 space-y-2 custom-scrollbar">
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
                          onClick={() => setSelectedQuestionIdx(idx)}
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
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-border/60 text-surface-secondary truncate max-w-[120px]">
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
              </Card>
            </div>

            {/* -----------------------------------------------------------------
                RIGHT COLUMN: DETAILED QUESTION FORM & LIVE RICHTEXT PREVIEW
                ----------------------------------------------------------------- */}
            <div className="lg:col-span-8 flex flex-col gap-4">
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
                        <label className="block text-xs font-black text-surface-primary mb-1">
                          Chuyên đề nhỏ / Phân loại (Category)
                        </label>
                        <input
                          type="text"
                          value={currentQuestion.category || ''}
                          onChange={(e) => handleUpdateCurrentQuestion({ category: e.target.value })}
                          placeholder="Ví dụ: Câu điều kiện loại 3, Từ vựng..."
                          className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-surface-primary mb-1">
                          Công thức / Điểm ngữ pháp (Formula)
                        </label>
                        <input
                          type="text"
                          value={currentQuestion.formula || ''}
                          onChange={(e) => handleUpdateCurrentQuestion({ formula: e.target.value })}
                          placeholder="Ví dụ: If + had + V3, would have + V3"
                          className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                        />
                      </div>
                    </div>

                    {/* Passage selection (if passages exist) */}
                    {packageData.passages && packageData.passages.length > 0 && (
                      <div>
                        <label className="block text-xs font-black text-surface-primary mb-1">
                          Đoạn văn đọc hiểu liên kết (Passage)
                        </label>
                        <select
                          value={currentQuestion.passageId || ''}
                          onChange={(e) =>
                            handleUpdateCurrentQuestion({ passageId: e.target.value || null })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue"
                        >
                          <option value="">-- Không liên kết đoạn văn --</option>
                          {packageData.passages.map((p, pIdx) => (
                            <option key={p.id || pIdx} value={p.id}>
                              {p.title || `Đoạn văn #${pIdx + 1} (${p.id})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Question Prompt Editor */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-black text-surface-primary">
                          Nội dung Đề bài (hỗ trợ KaTeX, LaTeX):
                        </label>
                        <span className="text-[11px] text-surface-secondary">
                          Xem trước RichText trực tiếp phía dưới
                        </span>
                      </div>
                      <textarea
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

                            <div className="flex-1">
                              <input
                                type="text"
                                value={optionText}
                                onChange={(e) => {
                                  const newOpts = [...currentQuestion.options];
                                  newOpts[optIdx] = e.target.value;
                                  handleUpdateCurrentQuestion({ options: newOpts });
                                }}
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
                      <label className="block text-xs font-black text-surface-primary mb-1">
                        Lời giải chi tiết (Explanation)
                      </label>
                      <textarea
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
            </div>
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
                <label className="block text-xs font-black text-surface-primary">
                  1. Môn học
                </label>
                <div className="flex gap-2">
                  <select
                    value={destSubjectMode === 'existing' ? destSelectedSubjectId : 'NEW'}
                    onChange={(e) => {
                      if (e.target.value === 'NEW') {
                        setDestSubjectMode('new');
                      } else {
                        setDestSubjectMode('existing');
                        handleSubjectChange(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-bold border-2 border-brand-border outline-none focus:border-brand-blue"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
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
                    className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-brand-bg text-surface-primary text-xs font-medium border border-brand-border"
                  />
                )}
              </div>

              {/* Topic Destination */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-surface-primary">
                  2. Chuyên đề
                </label>
                <select
                  value={destTopicMode === 'existing' ? destSelectedTopicId : 'NEW'}
                  onChange={(e) => {
                    if (e.target.value === 'NEW') {
                      setDestTopicMode('new');
                    } else {
                      setDestTopicMode('existing');
                      setDestSelectedTopicId(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-bold border-2 border-brand-border outline-none focus:border-brand-blue"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
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
                    className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-brand-bg text-surface-primary text-xs font-medium border border-brand-border"
                  />
                )}
              </div>

              {/* Set Destination */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-surface-primary">
                  3. Tên Bài học / Bộ đề
                </label>
                <input
                  type="text"
                  value={destSetName}
                  onChange={(e) => setDestSetName(e.target.value)}
                  placeholder="Ví dụ: Bài tập áp dụng"
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
