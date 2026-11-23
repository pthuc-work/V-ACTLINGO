import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Check, Lock, Sparkles, Trophy, BookOpen, Star, HelpCircle } from 'lucide-react';
import { Button, Card, Chip, StarRating } from '../components/ui';

interface RoadmapNode {
  id: string;
  title: string;
  stars: number;
  status: 'completed' | 'current' | 'locked' | 'cloud';
  questionsCount: number;
  offset: number; // -1 (left), 0 (center), 1 (right)
}

const NODES: RoadmapNode[] = [
  { id: '1', title: 'Bài tập áp dụng: Loại 1 & 2', stars: 3, status: 'completed', questionsCount: 30, offset: 0 },
  { id: '2', title: 'Bài luyện tập số 1: Loại 3 & Đảo ngữ', stars: 2, status: 'completed', questionsCount: 50, offset: 1 },
  { id: '3', title: 'Bài luyện tập số 2: Câu điều kiện hỗn hợp', stars: 0, status: 'current', questionsCount: 50, offset: 0 },
  { id: '4', title: 'Đọc hiểu & Điền từ (Ngữ cảnh)', stars: 0, status: 'locked', questionsCount: 20, offset: -1 },
  { id: '5', title: 'Đề tổng hợp nâng cao V-ACT', stars: 0, status: 'cloud', questionsCount: 25, offset: 0 },
];

export const RoadmapPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto w-full">
      {/* Top Header Navy Banner */}
      <div className="w-full rounded-3xl bg-brand-navy p-6 sm:p-8 text-white shadow-pop relative overflow-hidden mb-8 border border-brand-navy-dark">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-brand-yellow/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Chip variant="yellow" size="sm">
              MÔN TIẾNG ANH
            </Chip>
            <span className="text-xs font-bold text-blue-200">Phần 1 · V-ACT 2026</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Chuyên đề 15: Câu điều kiện
          </h2>
          <p className="text-sm font-semibold text-blue-100 mt-2 max-w-lg leading-relaxed">
            Nắm vững cấu trúc If type 1, 2, 3, đảo ngữ và các dạng điều kiện hỗn hợp thường xuất hiện trong đề ĐGNL ĐHQG-HCM.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              variant="yellow"
              size="md"
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              onClick={() => navigate('/practice')}
            >
              Tiếp tục học bài 3
            </Button>
            <Button
              variant="ghost"
              size="md"
              leftIcon={<BookOpen className="w-4 h-4 text-blue-200" />}
              onClick={() => navigate('/formulas')}
              className="text-white hover:bg-white/10"
            >
              Xem tóm tắt lý thuyết
            </Button>
          </div>
        </div>
      </div>

      {/* Candy Crush Style Roadmap Nodes */}
      <div className="relative w-full flex flex-col items-center py-4 gap-8">
        {/* Connecting SVG Path Line */}
        <svg
          className="absolute top-8 bottom-12 left-0 right-0 w-full h-[calc(100%-4rem)] pointer-events-none stroke-brand-border dark:stroke-slate-800"
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="16 12"
        >
          <path d="M 336 40 Q 450 140 336 240 T 200 440 T 336 640" className="opacity-40" />
        </svg>

        {NODES.map((node, index) => {
          const isCompleted = node.status === 'completed';
          const isCurrent = node.status === 'current';
          const isLocked = node.status === 'locked';
          const isCloud = node.status === 'cloud';

          // Horizontal offset translation
          const offsetStyle =
            node.offset === -1
              ? '-translate-x-16 sm:-translate-x-24'
              : node.offset === 1
              ? 'translate-x-16 sm:translate-x-24'
              : 'translate-x-0';

          return (
            <div
              key={node.id}
              className={`relative z-10 flex flex-col items-center transition-all ${offsetStyle}`}
            >
              {/* Node Star Rating (for completed) */}
              {isCompleted && (
                <div className="mb-2 animate-in zoom-in-50 duration-200">
                  <StarRating stars={node.stars} size="sm" />
                </div>
              )}

              {/* Node Circular Button */}
              {isCurrent ? (
                <div className="relative group">
                  {/* Pulsing ring for current node */}
                  <span className="absolute -inset-2.5 rounded-full bg-brand-yellow/40 animate-ping" />
                  <button
                    type="button"
                    onClick={() => navigate('/practice')}
                    className="relative w-20 h-20 rounded-full bg-brand-yellow text-slate-900 border-4 border-white dark:border-slate-900 shadow-pop flex flex-col items-center justify-center font-black active:translate-y-1 transition-transform cursor-pointer"
                    aria-label={`Bắt đầu ${node.title}`}
                  >
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </button>
                  {/* Tooltip / Label */}
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-brand-card border-2 border-brand-yellow px-3 py-1.5 rounded-2xl shadow-pop text-xs font-black text-surface-primary pointer-events-none">
                    Bài tiếp theo!
                  </div>
                </div>
              ) : isCompleted ? (
                <button
                  type="button"
                  onClick={() => navigate('/practice')}
                  className="w-16 h-16 rounded-full bg-brand-green text-white border-4 border-brand-green-press shadow-card flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  aria-label={`Ôn lại ${node.title}`}
                >
                  <Check className="w-8 h-8 stroke-[3]" />
                </button>
              ) : isCloud ? (
                <div
                  onClick={() => navigate('/import')}
                  className="w-16 h-16 rounded-3xl bg-brand-card/80 border-2 border-dashed border-brand-blue/50 text-brand-blue flex items-center justify-center shadow-sm cursor-pointer hover:bg-brand-blue-light/50 transition-colors"
                  title="Bấm để Import thêm bài bằng AI"
                >
                  <Sparkles className="w-7 h-7" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/practice')}
                  className="w-16 h-16 rounded-full bg-brand-card border-2 border-brand-border text-surface-muted shadow-sm flex items-center justify-center hover:border-brand-blue transition-colors cursor-pointer"
                  aria-label={node.title}
                >
                  <Lock className="w-6 h-6" />
                </button>
              )}

              {/* Node Title & Info */}
              <div className="mt-2 text-center max-w-[200px]">
                <h4 className="text-xs font-black text-surface-primary leading-tight">
                  {node.title}
                </h4>
                <span className="text-[11px] font-bold text-surface-secondary">
                  {node.questionsCount} câu hỏi
                </span>
              </div>
            </div>
          );
        })}

        {/* End of Road: Treasure Chest */}
        <div className="relative z-10 flex flex-col items-center mt-6">
          <div className="p-5 rounded-3xl bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow-pop border-4 border-amber-300 animate-bounce duration-1000 cursor-pointer">
            <Trophy className="w-10 h-10 fill-amber-200 text-amber-900" />
          </div>
          <span className="text-sm font-black text-surface-primary mt-2">
            Rương Hoàn Thành Chuyên Đề
          </span>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            +1 Đóng Băng Vĩnh Viễn & 100 XP
          </span>
        </div>
      </div>
    </div>
  );
};
