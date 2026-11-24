import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderTree,
  MoveUp,
  MoveDown,
  Edit2,
  Trash2,
  Download,
  Upload,
  Plus,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Folder,
  FileQuestion,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRightLeft,
  Settings2,
  Star,
  RefreshCw,
  Save,
  Check,
  X,
  GripVertical,
} from 'lucide-react';
import { Button, Card, Chip, Modal, useToast } from '../components/ui';
import { getRepository } from '../data';
import { Subject, Topic, SetEntity, Question, SetProgress } from '../data/types';
import {
  exportFullBackupToFile,
  inspectBackupFile,
  restoreFullBackup,
  BackupInspectionResult,
} from '../lib/backup';

export const ManagePage: React.FC = () => {
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();
  const repo = useMemo(() => getRepository(), []);

  // Data State
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sets, setSets] = useState<SetEntity[]>([]);
  const [questionCountBySet, setQuestionCountBySet] = useState<Record<string, number>>({});
  const [progressBySet, setProgressBySet] = useState<Record<string, SetProgress>>({});

  // Tree UI State
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // Rename Modal State
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    type: 'subject' | 'topic' | 'set';
    id: string;
    currentName: string;
  } | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  // Move Set to Topic Modal State
  const [moveSetModalOpen, setMoveSetModalOpen] = useState(false);
  const [moveSetTarget, setMoveSetTarget] = useState<SetEntity | null>(null);
  const [targetTopicId, setTargetTopicId] = useState<string>('');

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'subject' | 'topic' | 'set';
    id: string;
    name: string;
    details: string;
  } | null>(null);

  // Question Editor Modal State
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<SetEntity | null>(null);
  const [questionsInSet, setQuestionsInSet] = useState<Question[]>([]);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number>(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionEditorForm, setQuestionEditorForm] = useState<Partial<Question>>({});

  // Add Item Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addContext, setAddContext] = useState<{
    type: 'subject' | 'topic' | 'set';
    parentId?: string;
  } | null>(null);
  const [addNameInput, setAddNameInput] = useState('');

  // Backup / Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectResult, setInspectResult] = useState<BackupInspectionResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{
    type: 'subject' | 'topic' | 'set';
    id: string;
    parentId?: string;
  } | null>(null);

  // Load curriculum data from repository
  const loadCurriculum = async () => {
    try {
      setLoading(true);
      const [allSubjects, allTopics, allSets, allQuestions, allProgress] = await Promise.all([
        repo.getSubjects(),
        repo.getTopics(),
        repo.getSets(),
        repo.getQuestions(),
        repo.getAllSetProgress(),
      ]);

      setSubjects(allSubjects.sort((a, b) => a.position - b.position));
      setTopics(allTopics.sort((a, b) => a.position - b.position));
      setSets(allSets.sort((a, b) => a.position - b.position));

      // Calculate question count map
      const qCountMap: Record<string, number> = {};
      for (const q of allQuestions) {
        qCountMap[q.setId] = (qCountMap[q.setId] || 0) + 1;
      }
      setQuestionCountBySet(qCountMap);

      // Progress map
      const pMap: Record<string, SetProgress> = {};
      for (const p of allProgress) {
        pMap[p.setId] = p;
      }
      setProgressBySet(pMap);

      // Expand all subjects and topics by default on first load
      const subExpand: Record<string, boolean> = {};
      for (const s of allSubjects) subExpand[s.id] = true;
      setExpandedSubjects((prev) => (Object.keys(prev).length === 0 ? subExpand : prev));

      const topExpand: Record<string, boolean> = {};
      for (const t of allTopics) topExpand[t.id] = true;
      setExpandedTopics((prev) => (Object.keys(prev).length === 0 ? topExpand : prev));
    } catch (err: any) {
      console.error('Failed to load curriculum:', err);
      showErrorToast('Lỗi tải dữ liệu: ' + (err?.message || 'Không thể đọc kho bài học'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum();
  }, []);

  // ----------------------------------------------------------------------------
  // Reordering: Move Up & Move Down & Drag-and-Drop
  // ----------------------------------------------------------------------------
  const handleMoveSubject = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;

    const reordered = [...subjects];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setSubjects(reordered);
    const orderedIds = reordered.map((s) => s.id);
    await repo.reorderSubjects(orderedIds);
    showSuccessToast('Đã cập nhật vị trí môn học!');
  };

  const handleMoveTopic = async (subjectId: string, index: number, direction: -1 | 1) => {
    const topicsInSubj = topics.filter((t) => t.subjectId === subjectId);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= topicsInSubj.length) return;

    const reorderedInSubj = [...topicsInSubj];
    const temp = reorderedInSubj[index];
    reorderedInSubj[index] = reorderedInSubj[targetIndex];
    reorderedInSubj[targetIndex] = temp;

    const otherTopics = topics.filter((t) => t.subjectId !== subjectId);
    const newTopics = [...otherTopics, ...reorderedInSubj];
    setTopics(newTopics);

    const orderedIds = reorderedInSubj.map((t) => t.id);
    await repo.reorderTopics(orderedIds);
    showSuccessToast('Đã cập nhật vị trí chuyên đề!');
  };

  const handleMoveSet = async (topicId: string, index: number, direction: -1 | 1) => {
    const setsInTopic = sets.filter((s) => s.topicId === topicId);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= setsInTopic.length) return;

    const reorderedInTopic = [...setsInTopic];
    const temp = reorderedInTopic[index];
    reorderedInTopic[index] = reorderedInTopic[targetIndex];
    reorderedInTopic[targetIndex] = temp;

    const otherSets = sets.filter((s) => s.topicId !== topicId);
    const newSets = [...otherSets, ...reorderedInTopic];
    setSets(newSets);

    const orderedIds = reorderedInTopic.map((s) => s.id);
    await repo.reorderSets(orderedIds);
    showSuccessToast('Đã cập nhật vị trí bài học!');
  };

  const handleDragStart = (type: 'subject' | 'topic' | 'set', id: string, parentId?: string) => {
    setDraggedItem({ type, id, parentId });
  };

  const handleDrop = async (
    targetType: 'subject' | 'topic' | 'set',
    targetId: string,
    targetParentId?: string
  ) => {
    if (!draggedItem || draggedItem.type !== targetType) return;
    if (draggedItem.id === targetId) return;

    if (targetType === 'subject') {
      const srcIdx = subjects.findIndex((s) => s.id === draggedItem.id);
      const dstIdx = subjects.findIndex((s) => s.id === targetId);
      if (srcIdx === -1 || dstIdx === -1) return;

      const reordered = [...subjects];
      const [removed] = reordered.splice(srcIdx, 1);
      reordered.splice(dstIdx, 0, removed);
      setSubjects(reordered);
      await repo.reorderSubjects(reordered.map((s) => s.id));
      showSuccessToast('Đã kéo thả đổi thứ tự môn học!');
    } else if (targetType === 'topic' && draggedItem.parentId === targetParentId) {
      const topicList = topics.filter((t) => t.subjectId === targetParentId);
      const srcIdx = topicList.findIndex((t) => t.id === draggedItem.id);
      const dstIdx = topicList.findIndex((t) => t.id === targetId);
      if (srcIdx === -1 || dstIdx === -1) return;

      const reordered = [...topicList];
      const [removed] = reordered.splice(srcIdx, 1);
      reordered.splice(dstIdx, 0, removed);

      const otherTopics = topics.filter((t) => t.subjectId !== targetParentId);
      setTopics([...otherTopics, ...reordered]);
      await repo.reorderTopics(reordered.map((t) => t.id));
      showSuccessToast('Đã kéo thả đổi thứ tự chuyên đề!');
    } else if (targetType === 'set' && draggedItem.parentId === targetParentId) {
      const setList = sets.filter((s) => s.topicId === targetParentId);
      const srcIdx = setList.findIndex((s) => s.id === draggedItem.id);
      const dstIdx = setList.findIndex((s) => s.id === targetId);
      if (srcIdx === -1 || dstIdx === -1) return;

      const reordered = [...setList];
      const [removed] = reordered.splice(srcIdx, 1);
      reordered.splice(dstIdx, 0, removed);

      const otherSets = sets.filter((s) => s.topicId !== targetParentId);
      setSets([...otherSets, ...reordered]);
      await repo.reorderSets(reordered.map((s) => s.id));
      showSuccessToast('Đã kéo thả đổi thứ tự bài học!');
    }

    setDraggedItem(null);
  };

  // ----------------------------------------------------------------------------
  // Rename Item
  // ----------------------------------------------------------------------------
  const openRenameModal = (type: 'subject' | 'topic' | 'set', id: string, currentName: string) => {
    setRenameTarget({ type, id, currentName });
    setRenameInputValue(currentName);
    setRenameModalOpen(true);
  };

  const handleSaveRename = async () => {
    if (!renameTarget || !renameInputValue.trim()) return;
    try {
      if (renameTarget.type === 'subject') {
        await repo.updateSubject(renameTarget.id, { name: renameInputValue.trim() });
        setSubjects((prev) =>
          prev.map((s) => (s.id === renameTarget.id ? { ...s, name: renameInputValue.trim() } : s))
        );
      } else if (renameTarget.type === 'topic') {
        await repo.updateTopic(renameTarget.id, { name: renameInputValue.trim() });
        setTopics((prev) =>
          prev.map((t) => (t.id === renameTarget.id ? { ...t, name: renameInputValue.trim() } : t))
        );
      } else if (renameTarget.type === 'set') {
        await repo.updateSet(renameTarget.id, { name: renameInputValue.trim() });
        setSets((prev) =>
          prev.map((s) => (s.id === renameTarget.id ? { ...s, name: renameInputValue.trim() } : s))
        );
      }
      showSuccessToast('Đã đổi tên thành công!');
      setRenameModalOpen(false);
    } catch (err: any) {
      showErrorToast('Lỗi khi đổi tên: ' + err?.message);
    }
  };

  // ----------------------------------------------------------------------------
  // Move Set to another Topic
  // ----------------------------------------------------------------------------
  const openMoveSetModal = (setItem: SetEntity) => {
    setMoveSetTarget(setItem);
    setTargetTopicId(setItem.topicId);
    setMoveSetModalOpen(true);
  };

  const handleConfirmMoveSet = async () => {
    if (!moveSetTarget || !targetTopicId || targetTopicId === moveSetTarget.topicId) {
      setMoveSetModalOpen(false);
      return;
    }
    try {
      await repo.updateSet(moveSetTarget.id, { topicId: targetTopicId });
      setSets((prev) =>
        prev.map((s) => (s.id === moveSetTarget.id ? { ...s, topicId: targetTopicId } : s))
      );
      showSuccessToast('Đã chuyển bài học sang chuyên đề mới!');
      setMoveSetModalOpen(false);
    } catch (err: any) {
      showErrorToast('Lỗi khi chuyển bài: ' + err?.message);
    }
  };

  // ----------------------------------------------------------------------------
  // Delete Item with Confirmation
  // ----------------------------------------------------------------------------
  const openDeleteModal = (type: 'subject' | 'topic' | 'set', id: string, name: string) => {
    let details = '';
    if (type === 'subject') {
      const subTopics = topics.filter((t) => t.subjectId === id);
      const subTopicIds = new Set(subTopics.map((t) => t.id));
      const subSets = sets.filter((s) => subTopicIds.has(s.topicId));
      let qCount = 0;
      for (const st of subSets) qCount += questionCountBySet[st.id] || 0;
      details = `Bao gồm ${subTopics.length} chuyên đề, ${subSets.length} bài học, ${qCount} câu hỏi và toàn bộ điểm số/tiến độ làm bài!`;
    } else if (type === 'topic') {
      const topSets = sets.filter((s) => s.topicId === id);
      let qCount = 0;
      for (const st of topSets) qCount += questionCountBySet[st.id] || 0;
      details = `Bao gồm ${topSets.length} bài học, ${qCount} câu hỏi và toàn bộ tiến độ làm bài thuộc chuyên đề này!`;
    } else {
      const qCount = questionCountBySet[id] || 0;
      details = `Bao gồm ${qCount} câu hỏi và toàn bộ số sao, điểm số tốt nhất, lịch sử làm bài của bài học này!`;
    }

    setDeleteTarget({ type, id, name, details });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'subject') {
        await repo.deleteSubject(deleteTarget.id);
        await loadCurriculum();
      } else if (deleteTarget.type === 'topic') {
        await repo.deleteTopic(deleteTarget.id);
        await loadCurriculum();
      } else {
        await repo.deleteSet(deleteTarget.id);
        await loadCurriculum();
      }
      showSuccessToast(`Đã xóa thành công ${deleteTarget.name}!`);
      setDeleteModalOpen(false);
    } catch (err: any) {
      showErrorToast('Lỗi khi xóa: ' + err?.message);
    }
  };

  // ----------------------------------------------------------------------------
  // Add Subject / Topic / Set
  // ----------------------------------------------------------------------------
  const openAddModal = (type: 'subject' | 'topic' | 'set', parentId?: string) => {
    setAddContext({ type, parentId });
    setAddNameInput('');
    setAddModalOpen(true);
  };

  const handleConfirmAdd = async () => {
    if (!addContext || !addNameInput.trim()) return;
    try {
      const name = addNameInput.trim();
      if (addContext.type === 'subject') {
        const newSubj = await repo.createSubject({
          name,
          code: name.substring(0, 4).toUpperCase(),
          position: subjects.length,
          visibility: 'private',
        });
        setSubjects((prev) => [...prev, newSubj]);
        setExpandedSubjects((prev) => ({ ...prev, [newSubj.id]: true }));
      } else if (addContext.type === 'topic') {
        const subjectId = addContext.parentId || subjects[0]?.id;
        if (!subjectId) return;
        const newTopic = await repo.createTopic({
          subjectId,
          name,
          position: topics.filter((t) => t.subjectId === subjectId).length,
          visibility: 'private',
        });
        setTopics((prev) => [...prev, newTopic]);
        setExpandedTopics((prev) => ({ ...prev, [newTopic.id]: true }));
      } else if (addContext.type === 'set') {
        const topicId = addContext.parentId || topics[0]?.id;
        if (!topicId) return;
        const newSet = await repo.createSet({
          topicId,
          name,
          position: sets.filter((s) => s.topicId === topicId).length,
          visibility: 'private',
        });
        setSets((prev) => [...prev, newSet]);
      }
      showSuccessToast('Đã thêm mới thành công!');
      setAddModalOpen(false);
    } catch (err: any) {
      showErrorToast('Lỗi khi thêm: ' + err?.message);
    }
  };

  // ----------------------------------------------------------------------------
  // Question Editor
  // ----------------------------------------------------------------------------
  const openQuestionEditor = async (setItem: SetEntity) => {
    setEditingSet(setItem);
    setLoadingQuestions(true);
    setQuestionEditorOpen(true);
    try {
      const qs = await repo.getQuestions(setItem.id);
      setQuestionsInSet(qs);
      setSelectedQuestionIdx(0);
      if (qs.length > 0) {
        setQuestionEditorForm({ ...qs[0] });
      } else {
        setQuestionEditorForm({
          prompt: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          category: '',
          formula: '',
          explanation: '',
          answerSource: 'document',
          verified: true,
        });
      }
    } catch (err: any) {
      showErrorToast('Lỗi tải câu hỏi: ' + err?.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectQuestion = (idx: number) => {
    setSelectedQuestionIdx(idx);
    setQuestionEditorForm({ ...questionsInSet[idx] });
  };

  const handleAddQuestionToSet = () => {
    if (!editingSet) return;
    const newIdx = questionsInSet.length;
    const newQ: Question = {
      id: `q_${Date.now()}`,
      userId: 'local_user',
      setId: editingSet.id,
      no: newIdx + 1,
      prompt: 'Câu hỏi mới',
      options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
      correctIndex: 0,
      answerSource: 'user',
      verified: true,
      category: '',
      formula: '',
      explanation: '',
      position: newIdx,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextList = [...questionsInSet, newQ];
    setQuestionsInSet(nextList);
    setSelectedQuestionIdx(newIdx);
    setQuestionEditorForm({ ...newQ });
  };

  const handleDeleteQuestionFromSet = async (idx: number) => {
    const q = questionsInSet[idx];
    if (!q) return;
    try {
      if (q.id && !q.id.startsWith('q_tmp_')) {
        await repo.deleteQuestion(q.id);
      }
      const nextList = questionsInSet.filter((_, i) => i !== idx);
      setQuestionsInSet(nextList);
      const nextIdx = Math.max(0, idx - 1);
      setSelectedQuestionIdx(nextIdx);
      if (nextList.length > 0) {
        setQuestionEditorForm({ ...nextList[nextIdx] });
      }
      showSuccessToast('Đã xóa câu hỏi!');
      loadCurriculum();
    } catch (err: any) {
      showErrorToast('Lỗi khi xóa câu hỏi: ' + err?.message);
    }
  };

  const handleSaveCurrentQuestion = async () => {
    if (!editingSet || !questionEditorForm) return;
    try {
      const currentQ = questionsInSet[selectedQuestionIdx];
      const payload: Question = {
        id: currentQ?.id || `q_${Date.now()}`,
        userId: 'local_user',
        setId: editingSet.id,
        no: currentQ?.no || selectedQuestionIdx + 1,
        prompt: questionEditorForm.prompt || '',
        options: questionEditorForm.options || ['', '', '', ''],
        correctIndex: typeof questionEditorForm.correctIndex === 'number' ? questionEditorForm.correctIndex : null,
        answerSource: questionEditorForm.answerSource || 'document',
        verified: questionEditorForm.verified ?? true,
        category: questionEditorForm.category || '',
        formula: questionEditorForm.formula || '',
        explanation: questionEditorForm.explanation || '',
        figure: questionEditorForm.figure || null,
        position: selectedQuestionIdx,
        createdAt: currentQ?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existing = await repo.getQuestion(payload.id);
      if (existing) {
        await repo.updateQuestion(payload.id, payload);
      } else {
        await repo.createQuestion(payload);
      }

      const nextList = [...questionsInSet];
      nextList[selectedQuestionIdx] = payload;
      setQuestionsInSet(nextList);
      showSuccessToast('Đã lưu nội dung câu hỏi!');
      loadCurriculum();
    } catch (err: any) {
      showErrorToast('Lỗi lưu câu hỏi: ' + err?.message);
    }
  };

  // ----------------------------------------------------------------------------
  // Full Backup & Restore Handlers
  // ----------------------------------------------------------------------------
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const { fileName } = await exportFullBackupToFile(repo);
      showSuccessToast(`Đã xuất sao lưu thành công tệp ${fileName}!`);
    } catch (err: any) {
      showErrorToast('Lỗi khi xuất sao lưu: ' + err?.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const inspection = inspectBackupFile(text);
        if (!inspection.isValid) {
          showErrorToast(inspection.error || 'Tệp sao lưu không đúng định dạng!');
          return;
        }
        setInspectResult(inspection);
        setInspectModalOpen(true);
      } catch (err: any) {
        showErrorToast('Lỗi đọc tệp: ' + err?.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!inspectResult || !inspectResult.data) return;
    try {
      setIsRestoring(true);
      const result = await restoreFullBackup(inspectResult.data, restoreMode, repo);
      showSuccessToast(result.message);
      setInspectModalOpen(false);
      await loadCurriculum();
    } catch (err: any) {
      showErrorToast('Lỗi khôi phục: ' + err?.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      {/* Hidden file input for backup restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleSelectRestoreFile}
      />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Chip variant="primary" size="sm" icon={<FolderTree className="w-3.5 h-3.5" />}>
              KHO TÀI LIỆU
            </Chip>
            <span className="text-xs font-bold text-surface-secondary">Cây phân cấp học tập</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
            Quản lý & Sắp xếp bài học
          </h2>
          <p className="text-xs sm:text-sm font-bold text-surface-secondary mt-1">
            Điều chỉnh thứ tự hiển thị trên Lộ trình, sửa tên, di chuyển bài, chỉnh sửa câu hỏi và sao lưu / khôi phục dữ liệu toàn diện.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            loading={isExporting}
            onClick={handleExportBackup}
            leftIcon={<Download className="w-4 h-4 text-brand-blue" />}
          >
            Sao lưu JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<Upload className="w-4 h-4 text-emerald-500" />}
          >
            Khôi phục JSON
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openAddModal('subject')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Thêm Môn học
          </Button>
        </div>
      </div>

      {/* Main Hierarchy Tree View */}
      {loading ? (
        <Card variant="flat" padding="lg" className="flex items-center justify-center p-12 text-surface-secondary">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-blue" />
            <p className="text-sm font-bold">Đang tải cây học liệu...</p>
          </div>
        </Card>
      ) : subjects.length === 0 ? (
        <Card variant="default" padding="lg" className="text-center p-12">
          <FolderTree className="w-12 h-12 text-surface-muted mx-auto mb-3" />
          <h3 className="text-lg font-black text-surface-primary">Kho bài học đang trống</h3>
          <p className="text-xs sm:text-sm text-surface-secondary mt-1 mb-4">
            Bạn có thể nạp dữ liệu mẫu ban đầu từ Cài đặt hoặc bấm Khôi phục JSON.
          </p>
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="primary" onClick={() => openAddModal('subject')}>
              Tạo môn học đầu tiên
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {subjects.map((subj, sIdx) => {
            const isSubjExpanded = expandedSubjects[subj.id] ?? true;
            const subjTopics = topics.filter((t) => t.subjectId === subj.id);

            return (
              <div
                key={subj.id}
                draggable
                onDragStart={() => handleDragStart('subject', subj.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop('subject', subj.id)}
                className="bg-brand-card border-2 border-brand-border rounded-3xl overflow-hidden shadow-sm transition-all"
              >
                {/* Subject Header */}
                <div className="flex items-center justify-between p-4 bg-slate-50/80 dark:bg-slate-900/40 border-b border-brand-border gap-2">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSubjects((prev) => ({ ...prev, [subj.id]: !isSubjExpanded }))
                      }
                      className="p-1 rounded-xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 transition-colors"
                    >
                      {isSubjExpanded ? (
                        <ChevronDown className="w-5 h-5 text-brand-blue" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-surface-muted" />
                      )}
                    </button>

                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-brand-blue shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-surface-primary truncate">
                          {subj.name}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue shrink-0">
                          {subj.code}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-surface-muted">
                        {subjTopics.length} chuyên đề
                      </span>
                    </div>
                  </div>

                  {/* Subject Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={sIdx === 0}
                      onClick={() => handleMoveSubject(sIdx, -1)}
                      className="p-2 rounded-xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Di chuyển lên"
                    >
                      <MoveUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={sIdx === subjects.length - 1}
                      onClick={() => handleMoveSubject(sIdx, 1)}
                      className="p-2 rounded-xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Di chuyển xuống"
                    >
                      <MoveDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddModal('topic', subj.id)}
                      className="p-2 rounded-xl text-surface-secondary hover:text-brand-blue hover:bg-brand-border/40 transition-colors text-xs font-bold flex items-center gap-1"
                      title="Thêm Chuyên đề"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Chuyên đề</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openRenameModal('subject', subj.id, subj.name)}
                      className="p-2 rounded-xl text-surface-secondary hover:text-brand-blue hover:bg-brand-border/40 transition-colors"
                      title="Đổi tên môn học"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal('subject', subj.id, subj.name)}
                      className="p-2 rounded-xl text-surface-secondary hover:text-brand-red hover:bg-brand-border/40 transition-colors"
                      title="Xóa môn học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Topics List under Subject */}
                {isSubjExpanded && (
                  <div className="p-3 sm:p-4 flex flex-col gap-3">
                    {subjTopics.length === 0 ? (
                      <p className="text-xs font-bold text-surface-muted italic py-2 pl-4">
                        Chưa có chuyên đề nào. Nhấn "+ Chuyên đề" để thêm.
                      </p>
                    ) : (
                      subjTopics.map((topic, tIdx) => {
                        const isTopicExpanded = expandedTopics[topic.id] ?? true;
                        const topicSets = sets.filter((s) => s.topicId === topic.id);

                        return (
                          <div
                            key={topic.id}
                            draggable
                            onDragStart={() => handleDragStart('topic', topic.id, subj.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop('topic', topic.id, subj.id)}
                            className="bg-brand-bg/60 border border-brand-border rounded-2xl overflow-hidden transition-all"
                          >
                            {/* Topic Row Header */}
                            <div className="flex items-center justify-between p-3 bg-brand-border/20 gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedTopics((prev) => ({
                                      ...prev,
                                      [topic.id]: !isTopicExpanded,
                                    }))
                                  }
                                  className="p-1 rounded-lg text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40"
                                >
                                  {isTopicExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-surface-muted" />
                                  )}
                                </button>
                                <Folder className="w-4 h-4 text-emerald-500 shrink-0" />
                                <div className="truncate">
                                  <h4 className="text-sm font-extrabold text-surface-primary truncate">
                                    {topic.name}
                                  </h4>
                                  <span className="text-[11px] font-semibold text-surface-muted">
                                    {topicSets.length} bài học
                                  </span>
                                </div>
                              </div>

                              {/* Topic Controls */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={tIdx === 0}
                                  onClick={() => handleMoveTopic(subj.id, tIdx, -1)}
                                  className="p-1.5 rounded-lg text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 disabled:opacity-30 disabled:pointer-events-none"
                                  title="Di chuyển lên"
                                >
                                  <MoveUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={tIdx === subjTopics.length - 1}
                                  onClick={() => handleMoveTopic(subj.id, tIdx, 1)}
                                  className="p-1.5 rounded-lg text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 disabled:opacity-30 disabled:pointer-events-none"
                                  title="Di chuyển xuống"
                                >
                                  <MoveDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAddModal('set', topic.id)}
                                  className="p-1.5 rounded-lg text-surface-secondary hover:text-emerald-500 hover:bg-brand-border/40 text-xs font-bold flex items-center gap-1"
                                  title="Thêm Bài học"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline">Bài học</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRenameModal('topic', topic.id, topic.name)}
                                  className="p-1.5 rounded-lg text-surface-secondary hover:text-brand-blue hover:bg-brand-border/40"
                                  title="Đổi tên chuyên đề"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteModal('topic', topic.id, topic.name)}
                                  className="p-1.5 rounded-lg text-surface-secondary hover:text-brand-red hover:bg-brand-border/40"
                                  title="Xóa chuyên đề"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Sets inside Topic */}
                            {isTopicExpanded && (
                              <div className="p-2 sm:p-3 flex flex-col gap-2">
                                {topicSets.length === 0 ? (
                                  <p className="text-xs font-semibold text-surface-muted italic py-1 pl-4">
                                    Chưa có bài học nào trong chuyên đề này.
                                  </p>
                                ) : (
                                  topicSets.map((setItem, setIdx) => {
                                    const qCount = questionCountBySet[setItem.id] || 0;
                                    const prog = progressBySet[setItem.id];
                                    const stars = prog?.stars || 0;

                                    return (
                                      <div
                                        key={setItem.id}
                                        draggable
                                        onDragStart={() => handleDragStart('set', setItem.id, topic.id)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleDrop('set', setItem.id, topic.id)}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-brand-card hover:bg-brand-card/90 border border-brand-border/80 gap-3 transition-colors"
                                      >
                                        {/* Set Info */}
                                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                          <GripVertical className="w-4 h-4 text-surface-muted cursor-grab hidden sm:block shrink-0" />
                                          <span className="w-6 h-6 rounded-lg bg-brand-border/50 text-surface-secondary font-black text-xs flex items-center justify-center shrink-0">
                                            {setIdx + 1}
                                          </span>
                                          <div className="truncate">
                                            <h5 className="text-sm font-bold text-surface-primary truncate">
                                              {setItem.name}
                                            </h5>
                                            <div className="flex items-center gap-2 text-[11px] font-semibold text-surface-secondary mt-0.5">
                                              <span>{qCount} câu hỏi</span>
                                              {stars > 0 && (
                                                <span className="flex items-center text-amber-500 font-bold">
                                                  ★ {stars}/3
                                                </span>
                                              )}
                                              {prog?.completed && (
                                                <span className="text-emerald-500 font-bold">
                                                  Hoàn thành
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Set Action Buttons */}
                                        <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                                          <button
                                            type="button"
                                            disabled={setIdx === 0}
                                            onClick={() => handleMoveSet(topic.id, setIdx, -1)}
                                            className="p-1.5 rounded-lg text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 disabled:opacity-30 disabled:pointer-events-none"
                                            title="Di chuyển lên"
                                          >
                                            <MoveUp className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={setIdx === topicSets.length - 1}
                                            onClick={() => handleMoveSet(topic.id, setIdx, 1)}
                                            className="p-1.5 rounded-lg text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 disabled:opacity-30 disabled:pointer-events-none"
                                            title="Di chuyển xuống"
                                          >
                                            <MoveDown className="w-3.5 h-3.5" />
                                          </button>

                                          {/* Sửa câu hỏi Button */}
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => openQuestionEditor(setItem)}
                                            className="text-xs px-2.5 py-1 font-bold h-8"
                                            leftIcon={<FileQuestion className="w-3.5 h-3.5 text-brand-blue" />}
                                          >
                                            Sửa câu hỏi
                                          </Button>

                                          {/* Chuyển chuyên đề Button */}
                                          <button
                                            type="button"
                                            onClick={() => openMoveSetModal(setItem)}
                                            className="p-1.5 rounded-lg text-surface-secondary hover:text-brand-blue hover:bg-brand-border/40"
                                            title="Chuyển sang chuyên đề khác"
                                          >
                                            <ArrowRightLeft className="w-3.5 h-3.5" />
                                          </button>

                                          {/* Đổi tên Button */}
                                          <button
                                            type="button"
                                            onClick={() => openRenameModal('set', setItem.id, setItem.name)}
                                            className="p-1.5 rounded-lg text-surface-secondary hover:text-brand-blue hover:bg-brand-border/40"
                                            title="Đổi tên bài học"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>

                                          {/* Xóa Button */}
                                          <button
                                            type="button"
                                            onClick={() => openDeleteModal('set', setItem.id, setItem.name)}
                                            className="p-1.5 rounded-lg text-surface-secondary hover:text-brand-red hover:bg-brand-border/40"
                                            title="Xóa bài học"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 1. Modal: Rename Node */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="Đổi tên"
        description={
          renameTarget?.type === 'subject'
            ? 'Cập nhật tên môn học'
            : renameTarget?.type === 'topic'
            ? 'Cập nhật tên chuyên đề'
            : 'Cập nhật tên bài học'
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setRenameModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveRename}>
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <label className="block text-xs font-bold text-surface-secondary mb-1">
            Tên hiển thị mới:
          </label>
          <input
            type="text"
            value={renameInputValue}
            onChange={(e) => setRenameInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename();
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-brand-border bg-brand-bg text-surface-primary text-sm font-semibold outline-none focus:border-brand-blue"
            autoFocus
          />
        </div>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* 2. Modal: Move Set to another Topic */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={moveSetModalOpen}
        onClose={() => setMoveSetModalOpen(false)}
        title="Chuyển bài học sang chuyên đề khác"
        description={`Chuyển bài: "${moveSetTarget?.name}"`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setMoveSetModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmMoveSet}>
              Xác nhận chuyển
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <label className="block text-xs font-bold text-surface-secondary mb-2">
            Chọn chuyên đề đích:
          </label>
          <select
            value={targetTopicId}
            onChange={(e) => setTargetTopicId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-brand-border bg-brand-card text-surface-primary text-sm font-semibold outline-none focus:border-brand-blue"
          >
            {subjects.map((subj) => (
              <optgroup key={subj.id} label={subj.name}>
                {topics
                  .filter((t) => t.subjectId === subj.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* 3. Modal: Delete Confirmation with Impact Warning */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-brand-red">
            <AlertTriangle className="w-5 h-5 text-brand-red" />
            <span>Xác nhận xóa</span>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
              Xóa vĩnh viễn
            </Button>
          </div>
        }
      >
        <div className="py-2 flex flex-col gap-3">
          <p className="text-sm font-bold text-surface-primary">
            Bạn có chắc chắn muốn xóa{' '}
            <span className="text-brand-red font-black">"{deleteTarget?.name}"</span>?
          </p>
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-brand-red/30 text-xs font-semibold text-brand-red leading-relaxed">
            ⚠️ <strong>Cảnh báo mất mát dữ liệu:</strong> {deleteTarget?.details}
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* 4. Modal: Add Node (Subject / Topic / Set) */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={
          addContext?.type === 'subject'
            ? 'Thêm Môn học mới'
            : addContext?.type === 'topic'
            ? 'Thêm Chuyên đề mới'
            : 'Thêm Bài học mới'
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setAddModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmAdd}>
              Tạo mới
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <label className="block text-xs font-bold text-surface-secondary mb-1">
            Tên:
          </label>
          <input
            type="text"
            value={addNameInput}
            onChange={(e) => setAddNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmAdd();
            }}
            placeholder="Nhập tên..."
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-brand-border bg-brand-bg text-surface-primary text-sm font-semibold outline-none focus:border-brand-blue"
            autoFocus
          />
        </div>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* 5. Modal: Question Editor for a Set */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={questionEditorOpen}
        onClose={() => setQuestionEditorOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-brand-blue" />
            <span>Chỉnh sửa câu hỏi: {editingSet?.name}</span>
          </div>
        }
        description={`Tổng số ${questionsInSet.length} câu hỏi trong bài`}
        size="xl"
      >
        {loadingQuestions ? (
          <div className="p-8 text-center text-surface-secondary">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-blue" />
            <p className="text-xs font-bold">Đang tải danh sách câu hỏi...</p>
          </div>
        ) : questionsInSet.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm font-semibold text-surface-secondary mb-3">
              Bài học này chưa có câu hỏi nào.
            </p>
            <Button size="sm" variant="primary" onClick={handleAddQuestionToSet}>
              + Tạo câu hỏi đầu tiên
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar p-1">
            {/* Top Question Selector Bar */}
            <div className="flex items-center justify-between gap-2 border-b border-brand-border pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1 flex-1">
                {questionsInSet.map((q, idx) => (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => handleSelectQuestion(idx)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 transition-colors ${
                      idx === selectedQuestionIdx
                        ? 'bg-brand-blue text-white shadow-sm'
                        : 'bg-brand-border/40 text-surface-secondary hover:bg-brand-border/80'
                    }`}
                  >
                    Câu {idx + 1}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={handleAddQuestionToSet}>
                  + Thêm câu
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDeleteQuestionFromSet(selectedQuestionIdx)}
                >
                  Xóa câu
                </Button>
              </div>
            </div>

            {/* Question Detail Form */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-surface-secondary mb-1">
                  Đề bài (Prompt / Câu hỏi):
                </label>
                <textarea
                  rows={3}
                  value={questionEditorForm.prompt || ''}
                  onChange={(e) =>
                    setQuestionEditorForm((prev) => ({ ...prev, prompt: e.target.value }))
                  }
                  className="w-full p-3 rounded-xl border-2 border-brand-border bg-brand-bg text-surface-primary text-xs sm:text-sm font-medium outline-none focus:border-brand-blue"
                  placeholder="Nhập nội dung câu hỏi..."
                />
              </div>

              {/* 4 Options */}
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-bold text-surface-secondary">
                  4 Phương án lựa chọn (Click radio để chọn đáp án đúng):
                </label>
                {(questionEditorForm.options || ['', '', '', '']).map((opt, oIdx) => {
                  const isCorrect = questionEditorForm.correctIndex === oIdx;
                  return (
                    <div
                      key={oIdx}
                      className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-colors ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-brand-border bg-brand-card'
                      }`}
                    >
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={isCorrect}
                        onChange={() =>
                          setQuestionEditorForm((prev) => ({ ...prev, correctIndex: oIdx }))
                        }
                        className="w-4 h-4 text-emerald-500 cursor-pointer"
                      />
                      <span className="font-black text-xs text-surface-secondary w-5">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const nextOpts = [...(questionEditorForm.options || ['', '', '', ''])];
                          nextOpts[oIdx] = e.target.value;
                          setQuestionEditorForm((prev) => ({ ...prev, options: nextOpts }));
                        }}
                        className="flex-1 bg-transparent text-surface-primary text-xs sm:text-sm font-semibold outline-none"
                        placeholder={`Nội dung phương án ${String.fromCharCode(65 + oIdx)}...`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Category & Formula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-secondary mb-1">
                    Phân loại / Dạng bài (Category):
                  </label>
                  <input
                    type="text"
                    value={questionEditorForm.category || ''}
                    onChange={(e) =>
                      setQuestionEditorForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    placeholder="VD: ĐK Loại 3, Câu bị động..."
                    className="w-full px-3 py-2 rounded-xl border-2 border-brand-border bg-brand-bg text-surface-primary text-xs font-semibold outline-none focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-surface-secondary mb-1">
                    Công thức / Quy tắc (Formula):
                  </label>
                  <input
                    type="text"
                    value={questionEditorForm.formula || ''}
                    onChange={(e) =>
                      setQuestionEditorForm((prev) => ({ ...prev, formula: e.target.value }))
                    }
                    placeholder="VD: If + S + had + P2, S + would + have + P2"
                    className="w-full px-3 py-2 rounded-xl border-2 border-brand-border bg-brand-bg text-surface-primary text-xs font-semibold outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-bold text-surface-secondary mb-1">
                  Lời giải chi tiết (Explanation):
                </label>
                <textarea
                  rows={2}
                  value={questionEditorForm.explanation || ''}
                  onChange={(e) =>
                    setQuestionEditorForm((prev) => ({ ...prev, explanation: e.target.value }))
                  }
                  placeholder="Giải thích vì sao chọn đáp án này..."
                  className="w-full p-3 rounded-xl border-2 border-brand-border bg-brand-bg text-surface-primary text-xs font-medium outline-none focus:border-brand-blue"
                />
              </div>

              {/* Footer Save Button */}
              <div className="flex justify-end gap-2 pt-2 border-t border-brand-border">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveCurrentQuestion}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Lưu câu {selectedQuestionIdx + 1}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* 6. Modal: Backup File Inspection & Restore Mode Selection */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-blue" />
            <span>Xem trước & Khôi phục dữ liệu</span>
          </div>
        }
        description="Kiểm tra thông tin bản sao lưu trước khi nạp vào hệ thống"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setInspectModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isRestoring}
              onClick={handleConfirmRestore}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Tiến hành khôi phục
            </Button>
          </div>
        }
      >
        {inspectResult && (
          <div className="py-2 flex flex-col gap-4">
            {/* Format info */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-bg border border-brand-border text-xs font-bold">
              <span>Định dạng phát hiện:</span>
              <Chip
                variant={inspectResult.format === 'full_backup' ? 'success' : 'primary'}
                size="sm"
              >
                {inspectResult.format === 'full_backup'
                  ? 'Bản sao lưu đầy đủ (Full Backup v1)'
                  : inspectResult.format === 'legacy_library'
                  ? 'Thư viện di sản (V-ACT library)'
                  : 'Gói bài học (V1 Package)'}
              </Chip>
            </div>

            {/* Counts preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-blue-500/10 text-center">
                <div className="text-xl font-black text-brand-blue">
                  {inspectResult.summary.subjectsCount}
                </div>
                <div className="text-[11px] font-bold text-surface-secondary">Môn học</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
                <div className="text-xl font-black text-emerald-500">
                  {inspectResult.summary.topicsCount}
                </div>
                <div className="text-[11px] font-bold text-surface-secondary">Chuyên đề</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-center">
                <div className="text-xl font-black text-amber-500">
                  {inspectResult.summary.setsCount}
                </div>
                <div className="text-[11px] font-bold text-surface-secondary">Bài học</div>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-center">
                <div className="text-xl font-black text-purple-500">
                  {inspectResult.summary.questionsCount}
                </div>
                <div className="text-[11px] font-bold text-surface-secondary">Câu hỏi</div>
              </div>
            </div>

            {/* Warnings if any */}
            {inspectResult.warnings && inspectResult.warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex flex-col gap-1">
                {inspectResult.warnings.map((w, idx) => (
                  <p key={idx}>ℹ️ {w}</p>
                ))}
              </div>
            )}

            {/* Restore Mode Choice */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-surface-primary">
                Chọn chế độ khôi phục:
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-colors ${
                  restoreMode === 'merge'
                    ? 'border-brand-blue bg-blue-500/10'
                    : 'border-brand-border bg-brand-card'
                }`}
              >
                <input
                  type="radio"
                  name="restoreMode"
                  value="merge"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-black text-surface-primary block">
                    Gộp dữ liệu (Merge - Khuyên dùng)
                  </span>
                  <span className="font-semibold text-surface-secondary mt-0.5 block">
                    Bổ sung các bài học mới, giữ nguyên số sao cao nhất (Math.max), bảo toàn điểm số và chuỗi streak hiện tại.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-colors ${
                  restoreMode === 'replace'
                    ? 'border-brand-red bg-red-500/10'
                    : 'border-brand-border bg-brand-card'
                }`}
              >
                <input
                  type="radio"
                  name="restoreMode"
                  value="replace"
                  checked={restoreMode === 'replace'}
                  onChange={() => setRestoreMode('replace')}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-black text-surface-primary block">
                    Thay thế hoàn toàn (Replace)
                  </span>
                  <span className="font-semibold text-surface-secondary mt-0.5 block text-brand-red">
                    Xóa sạch dữ liệu trên thiết bị và thay thế toàn bộ bằng dữ liệu từ tệp sao lưu này (khóa API Gemini cá nhân vẫn được bảo lưu).
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
