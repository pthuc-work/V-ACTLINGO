import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Copy,
  Check,
  Sparkles,
  Atom,
  Calculator,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { Card, Chip } from '../components/ui';
import { RichText } from '../components/ui/RichText';
import { getRepository } from '../data';
import { Topic, Question } from '../data/types';

interface FormulaCardItem {
  id: string;
  category: string;
  title: string;
  formula: string;
  example?: string;
  explanation?: string;
  isCustom?: boolean;
}

const DEFAULT_REFERENCE_FORMULAS: FormulaCardItem[] = [
  {
    id: 'ref-k1',
    category: 'Toán học (KaTeX Test)',
    title: 'Nghiệm phương trình bậc hai',
    formula: 'Phương trình $ax^2 + bx + c = 0$ có nghiệm: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$',
    example: 'Với $a = 1, b = -3, c = 2 \\implies x_1 = 2, x_2 = 1$',
    isCustom: true,
  },
  {
    id: 'ref-k2',
    category: 'Toán học (KaTeX Test)',
    title: 'Tích phân xác định',
    formula: 'Diện tích hình phẳng giới hạn: $$\\int_0^\\pi \\sin(x) dx = [-\\cos(x)]_0^\\pi = 2$$',
    example: 'Ứng dụng trong bài toán hình học giải tích V-ACT.',
    isCustom: true,
  },
  {
    id: 'ref-k3',
    category: 'Hóa học (mhchem Test)',
    title: 'Phản ứng oxy hóa - khử & Cân bằng ion',
    formula: 'Phương trình: $\\ce{Fe + 2HCl -> FeCl2 + H2 ^}$ và $\\ce{2MnO4- + 5SO3^2- + 6H+ -> 2Mn^2+ + 5SO4^2- + 3H2O}$',
    example: 'mhchem extension nạp cục bộ cho phần Khoa học tự nhiên.',
    isCustom: true,
  },
  {
    id: 'ref-k4',
    category: 'Khả năng phục hồi lỗi (Fault Tolerance)',
    title: 'Biểu thức LaTeX kiểm thử lỗi cú pháp',
    formula: 'Thử nghiệm công thức gõ sai cú pháp: $\\frac{chua_dong_ngoac$',
    example: 'Hệ thống tự động hiển thị biểu tượng cảnh báo và giữ nguyên văn bản, không làm crash trang.',
    isCustom: true,
  },
];

export const FormulaPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string>('');
  const [topicQuestions, setTopicQuestions] = useState<Question[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customKatex, setCustomKatex] = useState<string>('$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$$');

  // Load topics
  useEffect(() => {
    let mounted = true;
    async function loadTopics() {
      try {
        const repo = getRepository();
        const allTopics = await repo.getTopics();
        if (!mounted) return;
        setTopics(allTopics);

        // Determine active topic: from searchParams or first topic
        const paramTopicId = searchParams.get('topicId');
        if (paramTopicId && allTopics.some((t) => t.id === paramTopicId)) {
          setActiveTopicId(paramTopicId);
        } else if (allTopics.length > 0) {
          // Default to topic containing "Câu điều kiện" or first topic
          const defaultTopic =
            allTopics.find((t) => t.name.toLowerCase().includes('câu điều kiện')) || allTopics[0];
          setActiveTopicId(defaultTopic.id);
        }
      } catch (err) {
        console.error('Error loading topics in FormulaPage:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadTopics();
    return () => {
      mounted = false;
    };
  }, []);

  // When activeTopicId changes, load questions of that topic
  useEffect(() => {
    let mounted = true;
    async function loadQuestionsForTopic() {
      if (!activeTopicId) return;
      try {
        const repo = getRepository();
        const sets = await repo.getSets(activeTopicId);
        const questionsPromises = sets.map((s) => repo.getQuestions(s.id));
        const questionsNested = await Promise.all(questionsPromises);
        const flatQuestions = questionsNested.flat();
        if (mounted) {
          setTopicQuestions(flatQuestions);
        }
      } catch (err) {
        console.error('Error loading questions for topic:', err);
      }
    }
    loadQuestionsForTopic();
    return () => {
      mounted = false;
    };
  }, [activeTopicId]);

  // Aggregate formula fields of the active topic, deduplicating identical formulas
  const aggregatedFormulas: FormulaCardItem[] = useMemo(() => {
    const list: FormulaCardItem[] = [];
    const seenFormulas = new Set<string>();

    for (const q of topicQuestions) {
      const formulaText = q.formula?.trim();
      if (!formulaText) continue;

      // Deduplicate identical formulas within the same category
      const key = `${q.category || ''}:::${formulaText}`;
      if (seenFormulas.has(key)) continue;
      seenFormulas.add(key);

      list.push({
        id: q.id,
        category: q.category?.trim() || 'Chung',
        title: q.category ? `Quy tắc: ${q.category}` : `Công thức #${q.no}`,
        formula: formulaText,
        example: q.prompt,
        explanation: q.explanation,
      });
    }

    // Append reference KaTeX / mhchem test items
    return [...list, ...DEFAULT_REFERENCE_FORMULAS];
  }, [topicQuestions]);

  // Filter formulas by search term
  const filteredFormulas = useMemo(() => {
    if (!searchTerm.trim()) return aggregatedFormulas;
    const term = searchTerm.toLowerCase();
    return aggregatedFormulas.filter(
      (f) =>
        f.title.toLowerCase().includes(term) ||
        f.formula.toLowerCase().includes(term) ||
        f.category.toLowerCase().includes(term) ||
        (f.example && f.example.toLowerCase().includes(term))
    );
  }, [aggregatedFormulas, searchTerm]);

  // Group filtered formulas by category
  const groupedFormulas = useMemo(() => {
    const map = new Map<string, FormulaCardItem[]>();
    for (const item of filteredFormulas) {
      const cat = item.category || 'Khác';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [filteredFormulas]);

  const handleCopy = (id: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const activeTopic = topics.find((t) => t.id === activeTopicId);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12">
      {/* Page Title & Intro */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Chip variant="primary" size="sm" icon={<BookOpen className="w-3.5 h-3.5" />}>
            SỔ TAY CÔNG THỨC
          </Chip>
          <Chip variant="success" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            KaTeX + mhchem Sẵn sàng
          </Chip>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
          Bảng công thức & Quy tắc cốt lõi
        </h1>
        <p className="text-xs sm:text-sm font-bold text-surface-secondary mt-1">
          Tự động tổng hợp toàn bộ trường công thức của chuyên đề đang học, nhóm theo dạng bài, hỗ trợ tìm kiếm tức thì và render chuẩn KaTeX + mhchem.
        </p>
      </div>

      {/* Active Topic Selector */}
      {topics.length > 0 && (
        <Card variant="default" padding="sm" className="border border-brand-border bg-brand-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-blue" />
              <span className="text-xs font-black text-surface-secondary uppercase">
                Chuyên đề đang xem:
              </span>
            </div>

            <div className="relative w-full sm:w-72">
              <select
                value={activeTopicId}
                onChange={(e) => {
                  setActiveTopicId(e.target.value);
                  setSearchParams({ topicId: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-brand-bg border-2 border-brand-border text-xs font-black text-surface-primary outline-none focus:border-brand-blue appearance-none cursor-pointer pr-8"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-surface-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </Card>
      )}

      {/* KaTeX Interactive Playground */}
      <Card
        variant="3d"
        padding="md"
        className="border-2 border-brand-blue/30 bg-gradient-to-br from-brand-card to-brand-blue/5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-4 h-4 text-brand-blue" />
          <h2 className="text-sm font-black text-surface-primary">Khung kiểm thử công thức KaTeX tương tác</h2>
        </div>
        <p className="text-xs font-semibold text-surface-secondary mb-2">
          Nhập mã LaTeX / KaTeX / mhchem để kiểm tra hiển thị thời gian thực (đóng gói cục bộ, không CDN):
        </p>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={customKatex}
            onChange={(e) => setCustomKatex(e.target.value)}
            placeholder="Ví dụ: $$E = mc^2$$ hoặc $\\ce{H2O}$"
            className="w-full px-4 py-2 rounded-xl bg-brand-bg border-2 border-brand-border text-surface-primary text-xs font-mono font-bold outline-none focus:border-brand-blue"
          />
          <div className="p-3 rounded-xl bg-brand-bg border border-brand-border/80 min-h-[48px] flex items-center justify-center">
            <RichText content={customKatex} className="text-sm text-surface-primary" />
          </div>
        </div>
      </Card>

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-secondary" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Tìm công thức trong ${activeTopic?.name || 'chuyên đề'} (ví dụ: Loại 3, had, tích phân...)`}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-brand-card border-2 border-brand-border text-surface-primary text-sm font-bold placeholder:text-surface-muted outline-none focus:border-brand-blue transition-colors"
        />
      </div>

      {/* Grouped Formula List */}
      {groupedFormulas.length === 0 ? (
        <Card variant="default" padding="lg" className="text-center py-10 border border-brand-border">
          <p className="text-sm font-bold text-surface-secondary">
            Không tìm thấy công thức nào phù hợp với từ khóa "{searchTerm}".
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groupedFormulas.map(([category, items]) => (
            <div key={category} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
                <h2 className="text-base font-black text-brand-navy dark:text-brand-blue tracking-tight">
                  {category}
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-border/40 text-surface-secondary">
                  {items.length} công thức
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {items.map((item) => (
                  <Card key={item.id} variant="3d" padding="md">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Chip
                          variant={item.isCustom ? 'success' : 'yellow'}
                          size="sm"
                          className="mb-1.5"
                          icon={item.isCustom ? <Atom className="w-3 h-3" /> : undefined}
                        >
                          {item.category}
                        </Chip>
                        <h3 className="text-sm sm:text-base font-black text-surface-primary">
                          {item.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.formula)}
                        className="p-2 rounded-xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 transition-colors shrink-0"
                        title="Sao chép công thức"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-brand-green" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="mt-3 p-3.5 rounded-2xl bg-brand-bg border border-brand-border/80 text-sm font-bold text-brand-blue dark:text-brand-yellow">
                      <RichText content={item.formula} />
                    </div>

                    {item.example && (
                      <div className="mt-2.5 text-xs font-semibold text-surface-secondary">
                        <strong className="text-surface-primary">Ví dụ / Câu mẫu: </strong>
                        <RichText content={item.example} as="span" />
                      </div>
                    )}

                    {item.explanation && (
                      <div className="mt-1 text-[11px] text-surface-muted italic">
                        &bull; {item.explanation}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
