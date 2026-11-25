import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Sparkles,
  ChevronDown,
  Layers,
  X,
  Maximize2,
  Minimize2,
  Calculator,
  Compass,
} from 'lucide-react';
import { Card, Chip, Button } from '../components/ui';
import { RichText } from '../components/ui/RichText';
import { getRepository } from '../data';
import { Subject, Topic, FormulaGroup } from '../data/types';
import { FormulaGroupCard } from '../components/formula/FormulaGroupCard';
import { migrateFormulasForTopic } from '../lib/formulaMigration';

export const FormulaPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string>('');
  const [formulaGroups, setFormulaGroups] = useState<FormulaGroup[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [allExpanded, setAllExpanded] = useState(true);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [activeNavId, setActiveNavId] = useState<string>('');
  const [showKatexTester, setShowKatexTester] = useState(false);
  const [customKatex, setCustomKatex] = useState<string>('$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$$');

  const contentRef = useRef<HTMLDivElement>(null);

  // 1. Load subjects & topics
  useEffect(() => {
    let mounted = true;
    async function loadInitialData() {
      try {
        setLoading(true);
        const repo = getRepository();
        const allSubjects = await repo.getSubjects();
        if (!mounted) return;
        setSubjects(allSubjects);

        const paramSubId = searchParams.get('subjectId');
        const paramTopicId = searchParams.get('topicId');

        let selectedSub = allSubjects.find((s) => s.id === paramSubId);
        if (!selectedSub && allSubjects.length > 0) {
          selectedSub =
            allSubjects.find(
              (s) => s.code.toLowerCase() === 'eng' || s.name.toLowerCase().includes('tiếng anh')
            ) || allSubjects[0];
        }

        if (selectedSub) {
          setActiveSubjectId(selectedSub.id);
          const subTopics = await repo.getTopics(selectedSub.id);
          if (!mounted) return;
          setTopics(subTopics);

          let selectedTop = subTopics.find((t) => t.id === paramTopicId);
          if (!selectedTop && subTopics.length > 0) {
            selectedTop =
              subTopics.find((t) => t.name.toLowerCase().includes('câu điều kiện')) || subTopics[0];
          }

          if (selectedTop) {
            setActiveTopicId(selectedTop.id);
          }
        }
      } catch (err) {
        console.error('Error loading initial formula page data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. When activeSubjectId changes, reload topics for that subject
  const handleSubjectChange = async (subjectId: string) => {
    setActiveSubjectId(subjectId);
    try {
      const repo = getRepository();
      const subTopics = await repo.getTopics(subjectId);
      setTopics(subTopics);
      if (subTopics.length > 0) {
        const nextTopicId = subTopics[0].id;
        setActiveTopicId(nextTopicId);
        setSearchParams({ subjectId, topicId: nextTopicId });
      } else {
        setActiveTopicId('');
        setFormulaGroups([]);
        setSearchParams({ subjectId });
      }
    } catch (err) {
      console.error('Error changing subject:', err);
    }
  };

  // 3. When activeTopicId changes, load formula groups (and migrate if needed)
  useEffect(() => {
    let mounted = true;
    async function loadGroupsForTopic() {
      if (!activeTopicId) {
        setFormulaGroups([]);
        return;
      }
      try {
        const repo = getRepository();
        // Check if formula groups exist in repo
        let groups = await repo.getFormulaGroups(activeTopicId);

        // If none found, attempt automatic migration from questions
        if (groups.length === 0) {
          await migrateFormulasForTopic(repo, activeTopicId);
          groups = await repo.getFormulaGroups(activeTopicId);
        }

        if (mounted) {
          setFormulaGroups(groups);
          // Initialize expanded state
          const initialExpanded: Record<string, boolean> = {};
          groups.forEach((g) => {
            initialExpanded[g.id] = true;
          });
          setExpandedMap(initialExpanded);
          setAllExpanded(true);
          if (groups.length > 0) {
            setActiveNavId(groups[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading formula groups:', err);
      }
    }

    loadGroupsForTopic();
    return () => {
      mounted = false;
    };
  }, [activeTopicId]);

  // Toggle expand all
  const handleToggleAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const updated: Record<string, boolean> = {};
    formulaGroups.forEach((g) => {
      updated[g.id] = nextState;
    });
    setExpandedMap(updated);
  };

  const handleToggleSingle = (groupId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Filter groups and count formulas
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return formulaGroups;
    const term = searchTerm.toLowerCase();
    return formulaGroups.filter((group) => {
      if (group.title.toLowerCase().includes(term)) return true;
      return group.items.some(
        (it) =>
          it.tag.toLowerCase().includes(term) ||
          it.structure.toLowerCase().includes(term) ||
          (it.usage && it.usage.toLowerCase().includes(term)) ||
          (it.example && it.example.toLowerCase().includes(term)) ||
          (it.note && it.note.toLowerCase().includes(term))
      );
    });
  }, [formulaGroups, searchTerm]);

  const totalFormulaCount = useMemo(() => {
    return formulaGroups.reduce((acc, g) => acc + g.items.length, 0);
  }, [formulaGroups]);

  // Smooth scroll to group
  const scrollToGroup = (groupId: string) => {
    setActiveNavId(groupId);
    const elem = document.getElementById(`formula-group-${groupId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activeTopic = topics.find((t) => t.id === activeTopicId);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 pb-16 px-2 sm:px-4">
      {/* =========================================================================
          TOP BAR & NAVIGATION: Subject Tabs + Topic Dropdown + Search + Expand/Collapse
          ========================================================================= */}
      <div className="flex flex-col gap-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Chip variant="primary" size="sm" icon={<BookOpen className="w-3.5 h-3.5" />}>
                SỔ TAY CÔNG THỨC V-ACT
              </Chip>
              <Chip variant="success" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
                KaTeX + mhchem Sẵn sàng
              </Chip>
              {totalFormulaCount > 0 && (
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-brand-border/60 text-surface-primary">
                  {totalFormulaCount} quy tắc cốt lõi
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
              Bảng công thức & Quy tắc trọng tâm
            </h1>
          </div>

          {/* Toggle KaTeX Tester Button */}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Calculator className="w-4 h-4 text-brand-blue" />}
            onClick={() => setShowKatexTester((prev) => !prev)}
            className="self-start sm:self-auto border border-brand-border text-xs font-black"
          >
            {showKatexTester ? 'Ẩn KaTeX Tester' : 'Khung thử KaTeX'}
          </Button>
        </div>

        {/* KaTeX Interactive Playground (Collapsible) */}
        {showKatexTester && (
          <Card
            variant="3d"
            padding="md"
            className="border-2 border-brand-blue/30 bg-gradient-to-br from-brand-card to-brand-blue/5 animate-fadeIn"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-brand-blue" />
                <h2 className="text-xs sm:text-sm font-black text-surface-primary">
                  Khung kiểm thử công thức KaTeX tương tác
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowKatexTester(false)}
                className="text-surface-muted hover:text-surface-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-semibold text-surface-secondary mb-2">
              Nhập mã LaTeX / KaTeX / mhchem để kiểm tra hiển thị thời gian thực (đóng gói cục bộ):
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={customKatex}
                onChange={(e) => setCustomKatex(e.target.value)}
                placeholder="Ví dụ: $$E = mc^2$$ hoặc $\\ce{Fe + 2HCl -> FeCl2 + H2 ^}$"
                className="w-full px-3 py-2 rounded-xl bg-brand-bg border-2 border-brand-border text-surface-primary text-xs font-mono font-bold outline-none focus:border-brand-blue"
              />
              <div className="p-3 rounded-xl bg-brand-bg border border-brand-border/80 min-h-[44px] flex items-center justify-center">
                <RichText content={customKatex} className="text-sm text-surface-primary" />
              </div>
            </div>
          </Card>
        )}

        {/* Subject Tabs */}
        {subjects.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {subjects.map((s) => {
              const isActive = s.id === activeSubjectId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSubjectChange(s.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap border-2 ${
                    isActive
                      ? 'bg-brand-navy dark:bg-brand-blue text-white border-brand-navy dark:border-brand-blue shadow-sm'
                      : 'bg-brand-card hover:bg-brand-bg text-surface-secondary border-brand-border'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Toolbar: Topic Dropdown + Search Input + Expand/Collapse All */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Topic Dropdown */}
          <div className="md:col-span-4 relative">
            <div className="relative">
              <Layers className="w-4 h-4 text-brand-blue absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={activeTopicId}
                onChange={(e) => {
                  const newTopicId = e.target.value;
                  setActiveTopicId(newTopicId);
                  setSearchParams({ subjectId: activeSubjectId, topicId: newTopicId });
                }}
                disabled={topics.length === 0}
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-brand-card border-2 border-brand-border text-xs sm:text-sm font-black text-surface-primary outline-none focus:border-brand-blue appearance-none cursor-pointer disabled:opacity-50"
              >
                {topics.length === 0 ? (
                  <option value="">Chưa có chuyên đề</option>
                ) : (
                  topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-surface-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Search Box with Clear Button */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-secondary pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Tìm công thức (ví dụ: Loại 3, had, unless, tích phân...)`}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-brand-card border-2 border-brand-border text-surface-primary text-xs sm:text-sm font-bold placeholder:text-surface-muted outline-none focus:border-brand-blue transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-surface-muted hover:text-surface-primary hover:bg-brand-border/40"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Expand / Collapse All Button */}
          <div className="md:col-span-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={
                allExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />
              }
              onClick={handleToggleAll}
              className="w-full md:w-auto text-xs font-black border border-brand-border"
            >
              {allExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
            </Button>
          </div>
        </div>

        {/* Mobile / Tablet Horizontal TOC Chips (< 1100px) */}
        {formulaGroups.length > 1 && (
          <div className="flex xl:hidden items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[11px] font-black uppercase text-surface-muted flex items-center gap-1 shrink-0 mr-1">
              <Compass className="w-3.5 h-3.5 text-brand-blue" />
              Nhóm:
            </span>
            {formulaGroups.map((g) => {
              const isActive = activeNavId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => scrollToGroup(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                      : 'bg-brand-card text-surface-secondary border-brand-border hover:bg-brand-bg'
                  }`}
                >
                  {g.title} ({g.items.length})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MAIN CONTENT AREA: 2 Columns for ≥1100px (Sticky TOC Left + Groups Right)
          ========================================================================= */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-surface-secondary">Đang nạp bảng công thức chuyên đề...</p>
        </div>
      ) : formulaGroups.length === 0 ? (
        /* Empty State */
        <Card
          variant="default"
          padding="lg"
          className="text-center py-16 px-4 border-2 border-dashed border-brand-border bg-brand-card/50"
        >
          <BookOpen className="w-12 h-12 text-surface-muted mx-auto mb-3" />
          <h3 className="text-lg font-black text-surface-primary">Chưa có công thức cho chuyên đề này</h3>
          <p className="text-xs sm:text-sm font-medium text-surface-secondary max-w-md mx-auto mt-1 mb-5">
            {activeTopic?.name
              ? `Chuyên đề "${activeTopic.name}" hiện chưa có cấu trúc công thức hoặc bài học áp dụng.`
              : 'Vui lòng chọn một chuyên đề để xem bảng công thức.'}
          </p>
        </Card>
      ) : filteredGroups.length === 0 ? (
        /* Search Not Found State */
        <Card variant="default" padding="lg" className="text-center py-12 border border-brand-border">
          <Search className="w-8 h-8 text-surface-muted mx-auto mb-2" />
          <p className="text-sm font-bold text-surface-secondary">
            Không tìm thấy công thức nào khớp với từ khóa "{searchTerm}".
          </p>
          <Button variant="ghost" size="sm" className="mt-3 font-bold" onClick={() => setSearchTerm('')}>
            Xóa bộ lọc tìm kiếm
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start" ref={contentRef}>
          {/* =====================================================================
              Left Column (≥1100px / xl: 3 cols): Sticky Knowledge Table of Contents
              ===================================================================== */}
          <aside className="hidden xl:block xl:col-span-3 sticky top-20">
            <Card variant="default" padding="sm" className="border border-brand-border bg-brand-card">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-border/60">
                <Compass className="w-4 h-4 text-brand-blue" />
                <span className="text-xs font-black uppercase text-surface-primary tracking-wider">
                  Mục lục nhóm kiến thức
                </span>
              </div>

              <nav className="p-2 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
                {formulaGroups.map((group) => {
                  const isActive = activeNavId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => scrollToGroup(group.id)}
                      className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${
                        isActive
                          ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/40 shadow-xs'
                          : 'text-surface-secondary hover:text-surface-primary hover:bg-brand-bg'
                      }`}
                    >
                      <span className="truncate">{group.title}</span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-brand-border/40 text-surface-muted ml-2 shrink-0">
                        {group.items.length}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-brand-border/60 bg-brand-bg/40 rounded-b-xl text-[11px] font-semibold text-surface-secondary">
                Tổng cộng: <strong className="text-surface-primary">{totalFormulaCount}</strong> công thức cốt lõi.
              </div>
            </Card>
          </aside>

          {/* =====================================================================
              Right Column (xl: 9 cols): Group Cards (Compact 1-2 columns when wide)
              ===================================================================== */}
          <main className="xl:col-span-9 flex flex-col gap-5">
            {filteredGroups.map((group) => (
              <FormulaGroupCard
                key={group.id}
                group={group}
                isExpanded={expandedMap[group.id]}
                onToggleExpand={() => handleToggleSingle(group.id)}
                searchTerm={searchTerm}
              />
            ))}
          </main>
        </div>
      )}
    </div>
  );
};
