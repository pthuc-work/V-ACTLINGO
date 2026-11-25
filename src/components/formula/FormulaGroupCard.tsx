import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Lightbulb,
  Info,
} from 'lucide-react';
import { FormulaGroup, FormulaItem } from '../../data/types';
import { RichText } from '../ui/RichText';

export interface FormulaGroupCardProps {
  group: FormulaGroup;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  searchTerm?: string;
  className?: string;
}

export function getTagBadgeStyle(tag: string): { bg: string; text: string; border: string } {
  const t = tag.toLowerCase();
  if (t.includes('loại 3')) {
    return {
      bg: 'bg-purple-100 dark:bg-purple-950/60',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-300 dark:border-purple-800',
    };
  }
  if (t.includes('loại 2')) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-950/60',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-800',
    };
  }
  if (t.includes('loại 1') || t.includes('loại 0')) {
    return {
      bg: 'bg-blue-100 dark:bg-blue-950/60',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-800',
    };
  }
  if (t.includes('đảo ngữ')) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-950/60',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-800',
    };
  }
  if (t.includes('trộn')) {
    return {
      bg: 'bg-orange-100 dark:bg-orange-950/60',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-800',
    };
  }
  if (t.includes('unless') || t.includes('but for') || t.includes('without')) {
    return {
      bg: 'bg-cyan-100 dark:bg-cyan-950/60',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-300 dark:border-cyan-800',
    };
  }
  return {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
  };
}

export const FormulaGroupCard: React.FC<FormulaGroupCardProps> = ({
  group,
  isExpanded: controlledExpanded,
  onToggleExpand,
  searchTerm = '',
  className = '',
}) => {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded((prev) => !prev));

  const [copiedGroup, setCopiedGroup] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Filter items by search term if provided
  const filteredItems = React.useMemo(() => {
    if (!searchTerm.trim()) return group.items;
    const term = searchTerm.toLowerCase();
    return group.items.filter(
      (item) =>
        item.tag.toLowerCase().includes(term) ||
        item.structure.toLowerCase().includes(term) ||
        (item.usage && item.usage.toLowerCase().includes(term)) ||
        (item.example && item.example.toLowerCase().includes(term)) ||
        (item.note && item.note.toLowerCase().includes(term))
    );
  }, [group.items, searchTerm]);

  // Copy single formula structure
  const handleCopyItem = (id: string, text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedItemId(id);
    setTimeout(() => setCopiedItemId(null), 1500);
  };

  // Copy entire group as text
  const handleCopyGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    const groupText = [
      `=== ${group.title.toUpperCase()} (${group.items.length} công thức) ===`,
      ...group.items.map((it, idx) => {
        let lines = `${idx + 1}. [${it.tag}] ${it.structure}`;
        if (it.usage) lines += `\n   - Áp dụng: ${it.usage}`;
        if (it.example) lines += `\n   - Ví dụ: ${it.example}`;
        if (it.note) lines += `\n   - Ghi chú: ${it.note}`;
        return lines;
      }),
    ].join('\n\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(groupText);
    }
    setCopiedGroup(true);
    setTimeout(() => setCopiedGroup(false), 2000);
  };

  const toggleNote = (itemId: string) => {
    setExpandedNotes((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  if (filteredItems.length === 0 && searchTerm) {
    return null;
  }

  return (
    <div
      id={`formula-group-${group.id}`}
      className={`rounded-2xl border border-brand-border bg-brand-card shadow-sm transition-all overflow-hidden ${className}`}
    >
      {/* Header Khung */}
      <div
        onClick={toggleExpand}
        className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-brand-bg/60 dark:bg-brand-card/90 cursor-pointer select-none border-b border-brand-border/60 hover:bg-brand-bg/90 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-blue shrink-0" />
          <h3 className="text-sm sm:text-base font-black text-surface-primary truncate">
            {group.title}
          </h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-border/50 text-surface-secondary shrink-0">
            {filteredItems.length} công thức
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Nút Sao chép cả nhóm */}
          <button
            type="button"
            onClick={handleCopyGroup}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 transition-colors"
            title="Sao chép toàn bộ công thức trong nhóm này"
          >
            {copiedGroup ? (
              <>
                <Check className="w-3.5 h-3.5 text-brand-green" />
                <span className="text-brand-green hidden sm:inline">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chép nhóm</span>
              </>
            )}
          </button>

          {/* Nút Thu gọn / Mở rộng */}
          <button
            type="button"
            onClick={toggleExpand}
            className="p-1.5 rounded-xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 transition-colors"
            title={isExpanded ? 'Thu gọn nhóm' : 'Mở rộng nhóm'}
            aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Nội dung Bảng hoặc Card */}
      {isExpanded && (
        <div className="p-3 sm:p-5">
          {/* =========================================================================
              Desktop Table View (≥ 768px): Bảng gọn không tràn ngang
              ========================================================================= */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border/70 text-[11px] uppercase tracking-wider text-surface-muted font-black">
                  <th className="py-2.5 px-3 w-28">Dạng / Loại</th>
                  <th className="py-2.5 px-3">Cấu trúc công thức</th>
                  <th className="py-2.5 px-3 w-1/4">Cách dùng / Ý nghĩa</th>
                  <th className="py-2.5 px-3 w-1/4">Ví dụ thực tế</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 text-xs">
                {filteredItems.map((item) => {
                  const badge = getTagBadgeStyle(item.tag);
                  const isCopied = copiedItemId === item.id;
                  const hasNote = Boolean(item.note);
                  const isNoteOpen = expandedNotes[item.id];

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="group hover:bg-brand-bg/40 transition-colors">
                        {/* Tag */}
                        <td className="py-3 px-3 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-black border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {item.tag}
                          </span>
                        </td>

                        {/* Cấu trúc (font mono, copy hover/chạm, RichText) */}
                        <td className="py-3 px-3 align-top font-mono font-bold text-brand-navy dark:text-brand-blue group/formula relative">
                          <div className="flex items-start justify-between gap-2">
                            <div className="leading-relaxed">
                              <RichText content={item.structure} />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleCopyItem(item.id, item.structure, e)}
                              className="opacity-0 group-hover/formula:opacity-100 p-1 rounded-lg text-surface-muted hover:text-surface-primary hover:bg-brand-border/40 transition-all shrink-0"
                              title="Sao chép cấu trúc"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-brand-green" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Cách dùng */}
                        <td className="py-3 px-3 align-top text-surface-secondary font-medium leading-relaxed">
                          {item.usage ? (
                            <RichText content={item.usage} as="span" />
                          ) : (
                            <span className="text-surface-muted italic">-</span>
                          )}
                        </td>

                        {/* Ví dụ */}
                        <td className="py-3 px-3 align-top text-surface-primary font-medium leading-relaxed">
                          {item.example ? (
                            <div className="text-[11px] text-surface-secondary">
                              <RichText content={item.example} as="span" />
                            </div>
                          ) : (
                            <span className="text-surface-muted italic">-</span>
                          )}
                        </td>

                        {/* Ghi chú toggle button */}
                        <td className="py-3 px-2 align-top text-center">
                          {hasNote ? (
                            <button
                              type="button"
                              onClick={() => toggleNote(item.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isNoteOpen
                                  ? 'text-brand-yellow bg-brand-yellow/10'
                                  : 'text-surface-muted hover:text-brand-yellow hover:bg-brand-border/40'
                              }`}
                              title="Xem ghi chú / mẹo nhớ"
                            >
                              <Lightbulb className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span />
                          )}
                        </td>
                      </tr>

                      {/* Row ghi chú mở rộng */}
                      {hasNote && isNoteOpen && (
                        <tr className="bg-amber-50/60 dark:bg-amber-950/20 border-b border-brand-border/40">
                          <td colSpan={5} className="py-2.5 px-4 text-xs font-semibold text-amber-900 dark:text-amber-200">
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-black text-amber-700 dark:text-amber-300">Ghi chú & Mẹo nhớ: </span>
                                <RichText content={item.note || ''} as="span" />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* =========================================================================
              Mobile Card List (< 768px): Thẻ xếp dọc gọn gàng, không tràn ngang
              ========================================================================= */}
          <div className="block md:hidden space-y-3">
            {filteredItems.map((item) => {
              const badge = getTagBadgeStyle(item.tag);
              const isCopied = copiedItemId === item.id;
              const hasNote = Boolean(item.note);
              const isNoteOpen = expandedNotes[item.id];

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-brand-bg/70 border border-brand-border/80 flex flex-col gap-2"
                >
                  {/* Top: Tag + Copy button */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {item.tag}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyItem(item.id, item.structure, e)}
                      className="min-h-[44px] min-w-[44px] -mr-2 -my-2 flex items-center justify-center rounded-xl text-surface-secondary hover:text-surface-primary active:bg-brand-border/40 transition-colors"
                      title="Sao chép công thức"
                      aria-label="Sao chép công thức"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-brand-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Cấu trúc (RichText + mono) */}
                  <div className="p-2.5 rounded-xl bg-brand-card border border-brand-border/60 text-xs sm:text-sm font-mono font-bold text-brand-blue dark:text-brand-yellow break-words">
                    <RichText content={item.structure} />
                  </div>

                  {/* Cách dùng */}
                  {item.usage && (
                    <div className="text-xs font-semibold text-surface-secondary">
                      <span className="text-surface-primary font-bold">Cách dùng: </span>
                      <RichText content={item.usage} as="span" />
                    </div>
                  )}

                  {/* Ví dụ */}
                  {item.example && (
                    <div className="text-xs font-medium text-surface-secondary">
                      <span className="text-surface-primary font-bold">Ví dụ: </span>
                      <RichText content={item.example} as="span" />
                    </div>
                  )}

                  {/* Ghi chú toggle */}
                  {hasNote && (
                    <div className="pt-1 border-t border-brand-border/40">
                      <button
                        type="button"
                        onClick={() => toggleNote(item.id)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 py-1"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>{isNoteOpen ? 'Thu gọn ghi chú' : 'Xem ghi chú / mẹo nhớ'}</span>
                        {isNoteOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isNoteOpen && (
                        <div className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold text-amber-900 dark:text-amber-200">
                          <RichText content={item.note || ''} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
