import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  BookOpen,
  Search,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { FormulaGroup, Topic } from '../../data/types';
import { getRepository } from '../../data';
import { FormulaGroupCard } from './FormulaGroupCard';
import { migrateFormulasForTopic } from '../../lib/formulaMigration';

export interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId?: string;
  subjectId?: string;
  title?: string;
}

export const FormulaModal: React.FC<FormulaModalProps> = ({
  isOpen,
  onClose,
  topicId,
  subjectId,
  title,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<FormulaGroup[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNavId, setActiveNavId] = useState<string>('');

  // Load topic & formula groups when opened
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const repo = getRepository();

        let resolvedTopicId = topicId;
        if (!resolvedTopicId) {
          const allTopics = await repo.getTopics(subjectId);
          if (allTopics.length > 0) {
            resolvedTopicId = allTopics[0].id;
          }
        }

        if (resolvedTopicId) {
          const t = await repo.getTopic(resolvedTopicId);
          if (mounted) setTopic(t);

          let fg = await repo.getFormulaGroups(resolvedTopicId);
          if (fg.length === 0) {
            await migrateFormulasForTopic(repo, resolvedTopicId);
            fg = await repo.getFormulaGroups(resolvedTopicId);
          }

          if (mounted) {
            setGroups(fg);
            if (fg.length > 0) setActiveNavId(fg[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading formula modal data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [isOpen, topicId, subjectId]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const term = searchTerm.toLowerCase();
    return groups.filter((g) => {
      if (g.title.toLowerCase().includes(term)) return true;
      return g.items.some(
        (it) =>
          it.tag.toLowerCase().includes(term) ||
          it.structure.toLowerCase().includes(term) ||
          (it.usage && it.usage.toLowerCase().includes(term)) ||
          (it.example && it.example.toLowerCase().includes(term)) ||
          (it.note && it.note.toLowerCase().includes(term))
      );
    });
  }, [groups, searchTerm]);

  const totalFormulas = useMemo(() => {
    return groups.reduce((acc, g) => acc + g.items.length, 0);
  }, [groups]);

  const handleOpenFullPage = () => {
    onClose();
    const subParam = subjectId || (topic ? topic.subjectId : '');
    const topParam = topicId || (topic ? topic.id : '');
    const params = new URLSearchParams();
    if (subParam) params.set('subjectId', subParam);
    if (topParam) params.set('topicId', topParam);
    navigate(`/formulas?${params.toString()}`);
  };

  const scrollToGroup = (groupId: string) => {
    setActiveNavId(groupId);
    const elem = document.getElementById(`formula-group-${groupId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isOpen) return null;

  const displayTitle = title || topic?.name || 'Bảng công thức chuyên đề';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bảng công thức"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[900px] w-[92vw] max-h-[85dvh] bg-surface rounded-t-3xl sm:rounded-3xl border border-brand-border shadow-2xl flex flex-col overflow-hidden animate-scaleUp"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-brand-border/80 bg-brand-bg/70 dark:bg-brand-card shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-surface-primary truncate">
                {displayTitle}
              </h2>
              <p className="text-[11px] font-bold text-surface-secondary hidden sm:block">
                Tổng hợp {totalFormulas} quy tắc & công thức cốt lõi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Link to Full Formula Page */}
            <button
              type="button"
              onClick={handleOpenFullPage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-blue hover:bg-brand-blue/10 border border-brand-blue/30 transition-colors"
              title="Xem ở trang công thức đầy đủ"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trang đầy đủ</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 transition-colors"
              title="Đóng popup (ESC)"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar & TOC Filter */}
        <div className="px-4 sm:px-6 py-3 border-b border-brand-border/60 bg-brand-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-surface-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm công thức, cấu trúc, ví dụ..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-brand-bg border border-brand-border text-xs sm:text-sm font-bold text-surface-primary outline-none focus:border-brand-blue"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-surface-muted hover:text-surface-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick TOC Jump Chips */}
          {groups.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <span className="text-[11px] font-black uppercase text-surface-muted flex items-center gap-1 shrink-0">
                <Compass className="w-3 h-3 text-brand-blue" />
                Mục lục:
              </span>
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => scrollToGroup(g.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border transition-all ${
                    activeNavId === g.id
                      ? 'bg-brand-blue text-white border-brand-blue'
                      : 'bg-brand-bg text-surface-secondary border-brand-border hover:text-surface-primary'
                  }`}
                >
                  {g.title} ({g.items.length})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2.5">
              <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-surface-secondary">Đang tải bảng công thức...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-10 h-10 text-surface-muted mx-auto mb-2" />
              <p className="text-sm font-bold text-surface-secondary">
                Chuyên đề này hiện chưa có công thức nào.
              </p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs sm:text-sm font-bold text-surface-secondary">
                Không tìm thấy công thức phù hợp với từ khóa "{searchTerm}".
              </p>
            </div>
          ) : (
            filteredGroups.map((g) => (
              <FormulaGroupCard key={g.id} group={g} searchTerm={searchTerm} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-2.5 bg-brand-bg/60 border-t border-brand-border/60 flex items-center justify-between text-xs text-surface-secondary shrink-0">
          <span className="font-medium">
            Mẹo: Bấm vào biểu tượng sao chép để chép cấu trúc hoặc cả nhóm.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg font-bold text-surface-primary hover:bg-brand-border/40 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
