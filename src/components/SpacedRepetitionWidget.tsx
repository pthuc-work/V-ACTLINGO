import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, RotateCcw, Flame, CheckCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, Chip, Button, StarRating } from './ui';
import { getRepository } from '../data';
import { SetEntity, SetProgress, Question, QuestionAttempt } from '../data/types';
import { calculateSpacedRepetition, SpacedRepetitionItem } from '../lib/review';

interface SpacedRepetitionWidgetProps {
  className?: string;
  limit?: number;
  onSelectSet?: (setId: string) => void;
}

export const SpacedRepetitionWidget: React.FC<SpacedRepetitionWidgetProps> = ({
  className = '',
  limit = 4,
  onSelectSet,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SpacedRepetitionItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const repo = getRepository();
        const [sets, progressList, questions, attempts] = await Promise.all([
          repo.getSets(),
          repo.getAllSetProgress(),
          repo.getQuestions(),
          repo.getAttempts(),
        ]);

        if (!mounted) return;
        const dueItems = calculateSpacedRepetition(sets, progressList, questions, attempts);
        setItems(dueItems);
      } catch (err) {
        console.error('Failed to load spaced repetition data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handlePractice = (item: SpacedRepetitionItem) => {
    if (onSelectSet) {
      onSelectSet(item.set.id);
    } else {
      navigate(`/practice?setId=${item.set.id}`);
    }
  };

  if (loading) {
    return (
      <Card variant="default" padding="md" className={`animate-pulse ${className}`}>
        <div className="h-4 bg-brand-border/40 rounded w-1/3 mb-3" />
        <div className="h-16 bg-brand-border/20 rounded-xl" />
      </Card>
    );
  }

  const displayedItems = limit ? items.slice(0, limit) : items;

  return (
    <Card variant="3d" padding="md" className={`border-2 border-brand-yellow/40 bg-gradient-to-br from-brand-card to-amber-500/5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-surface-primary flex items-center gap-1.5">
              Nên ôn hôm nay
              {items.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-black rounded-full bg-amber-500 text-white">
                  {items.length}
                </span>
              )}
            </h3>
            <p className="text-xs font-semibold text-surface-secondary">
              Ôn ngắt quãng (1 - 3 - 7 - 14 ngày) để ghi nhớ vĩnh viễn
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/review')}
            className="text-xs text-brand-blue font-bold"
          >
            Xem kho câu sai →
          </Button>
        )}
      </div>

      {/* Content */}
      {displayedItems.length === 0 ? (
        <div className="p-4 rounded-2xl bg-brand-bg border border-brand-border/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-surface-secondary">
            <span className="font-bold text-surface-primary block text-sm">Trí nhớ đạt 100%!</span>
            Chưa có bộ đề nào cần ôn ngắt quãng hôm nay. Bạn đang làm rất tốt!
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {displayedItems.map((item) => (
            <div
              key={item.set.id}
              className="p-3 rounded-2xl bg-brand-bg border border-brand-border/80 hover:border-amber-400/60 transition-all flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-sm text-surface-primary truncate">
                    {item.set.name}
                  </span>
                  {item.progress && (
                    <StarRating stars={item.progress.stars} maxStars={3} size="sm" />
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                  {item.daysSinceLastAttempt > 0 ? (
                    <Chip variant="yellow" size="sm">
                      Đã làm {item.daysSinceLastAttempt} ngày trước
                    </Chip>
                  ) : (
                    <Chip variant="neutral" size="sm">
                      Làm hôm nay
                    </Chip>
                  )}

                  {item.remainingMistakesCount > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Còn {item.remainingMistakesCount} câu sai
                    </span>
                  ) : (
                    <span className="text-surface-secondary">
                      {item.reason}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handlePractice(item)}
                className="shrink-0 text-xs px-3 py-1.5"
              >
                Ôn ngay
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
