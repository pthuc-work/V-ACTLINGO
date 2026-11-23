import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Flag, CheckCircle2, AlertCircle, ArrowRight, HelpCircle, BookOpen } from 'lucide-react';
import { Button, Card, Chip, ProgressBar } from '../components/ui';

interface MockQuestion {
  no: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  category: string;
  formula: string;
  explanation: string;
}

const SAMPLE_QUESTION: MockQuestion = {
  no: 12,
  prompt: 'If she had studied harder for the V-ACT exam, she ______ admitted to Ho Chi Minh City University of Technology.',
  options: [
    'would be',
    'would have been',
    'will be',
    'had been',
  ],
  correctIndex: 1,
  category: 'Câu điều kiện loại 3 (Past Unreal)',
  formula: 'If + S + had + V3/ed, S + would/could + have + V3/ed',
  explanation: 'Mệnh đề If dùng thì quá khứ hoàn thành ("had studied"), diễn tả giả định trái ngược với quá khứ. Mệnh đề chính phải có cấu trúc "would have + V3/ed" (bị động: would have been admitted).',
};

export const PracticePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);

  const isCorrect = selectedIndex === SAMPLE_QUESTION.correctIndex;

  const handleSelect = (index: number) => {
    if (!isChecked) {
      setSelectedIndex(index);
    }
  };

  const handleCheck = () => {
    if (selectedIndex !== null) {
      setIsChecked(true);
    }
  };

  const handleNext = () => {
    navigate('/completion');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] max-w-3xl mx-auto w-full pb-32">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4 py-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 rounded-2xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 transition-colors"
          aria-label="Thoát"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex-1 max-w-md">
          <ProgressBar value={12} max={30} color="green" size="md" />
        </div>

        <button
          type="button"
          onClick={() => setIsFlagged(!isFlagged)}
          className={`p-2 rounded-2xl transition-colors ${
            isFlagged
              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-300'
              : 'text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40'
          }`}
          aria-label="Đánh dấu câu hỏi"
          title="Gắn cờ câu hỏi (phím F)"
        >
          <Flag className={`w-5 h-5 ${isFlagged ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Main Question Area */}
      <div className="flex flex-col gap-6 flex-1">
        {/* Badges / Category */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip variant="primary" size="sm">
            Câu {SAMPLE_QUESTION.no} / 30
          </Chip>
          <Chip variant="neutral" size="sm">
            {SAMPLE_QUESTION.category}
          </Chip>
          <Chip variant="verified" size="sm">
            Đã xác minh
          </Chip>
        </div>

        {/* Prompt Card */}
        <Card variant="3d" padding="lg" className="border-brand-border/90">
          <p className="text-lg sm:text-xl font-bold text-surface-primary leading-relaxed">
            {SAMPLE_QUESTION.prompt}
          </p>
        </Card>

        {/* 4 Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {SAMPLE_QUESTION.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            const isSelected = selectedIndex === index;

            let optionStyle =
              'bg-brand-card border-2 border-brand-border hover:border-brand-blue/60 text-surface-primary shadow-sm';

            if (isChecked) {
              if (index === SAMPLE_QUESTION.correctIndex) {
                optionStyle = 'bg-brand-green-soft border-2 border-brand-green text-surface-primary font-bold shadow-md';
              } else if (isSelected) {
                optionStyle = 'bg-brand-red-soft border-2 border-brand-red text-surface-primary font-bold shadow-md';
              } else {
                optionStyle = 'bg-brand-card/60 border border-brand-border/40 opacity-60 text-surface-muted';
              }
            } else if (isSelected) {
              optionStyle =
                'bg-brand-blue-light/50 border-2 border-brand-blue text-brand-blue font-extrabold shadow-pop translate-y-[-1px]';
            }

            return (
              <button
                key={letter}
                type="button"
                onClick={() => handleSelect(index)}
                disabled={isChecked}
                className={`flex items-center gap-3.5 p-4 rounded-2xl text-left transition-all duration-100 cursor-pointer outline-none ${optionStyle}`}
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                    isChecked && index === SAMPLE_QUESTION.correctIndex
                      ? 'bg-brand-green text-white border-brand-green-press'
                      : isChecked && isSelected
                      ? 'bg-brand-red text-white border-brand-red-press'
                      : isSelected
                      ? 'bg-brand-blue text-white border-brand-blue-press'
                      : 'bg-brand-border/40 text-surface-secondary border-brand-border/80'
                  }`}
                >
                  {letter}
                </span>
                <span className="text-base font-bold flex-1 leading-normal">{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          BOTTOM STICKY FEEDBACK SHEET
          ========================================================================= */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 p-4 sm:p-6 transition-all duration-200 border-t ${
          isChecked
            ? isCorrect
              ? 'bg-emerald-50 dark:bg-emerald-950/90 border-brand-green text-slate-900 dark:text-emerald-100 shadow-2xl'
              : 'bg-rose-50 dark:bg-rose-950/90 border-brand-red text-slate-900 dark:text-rose-100 shadow-2xl'
            : 'bg-brand-card/95 backdrop-blur-md border-brand-border shadow-md'
        }`}
      >
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {!isChecked ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-surface-secondary">
                <span>Phím tắt: [1-4] hoặc [A-D] để chọn đáp án</span>
              </div>
              <Button
                variant={selectedIndex !== null ? 'success' : 'outline'}
                size="lg"
                disabled={selectedIndex === null}
                onClick={handleCheck}
                className="w-full sm:w-auto min-w-[160px]"
              >
                Kiểm tra
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 w-full sm:w-auto">
                {isCorrect ? (
                  <CheckCircle2 className="w-8 h-8 text-brand-green shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-brand-red shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className="text-lg font-black leading-tight">
                    {isCorrect ? 'Chính xác! +10 XP 🎉' : 'Chưa đúng rồi!'}
                  </h4>
                  {!isCorrect && (
                    <p className="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 mt-1">
                      Đáp án đúng:{' '}
                      <span className="font-extrabold underline">
                        {String.fromCharCode(65 + SAMPLE_QUESTION.correctIndex)}.{' '}
                        {SAMPLE_QUESTION.options[SAMPLE_QUESTION.correctIndex]}
                      </span>
                    </p>
                  )}
                  {SAMPLE_QUESTION.explanation && (
                    <p className="text-xs font-semibold text-surface-secondary mt-1 max-w-xl">
                      {SAMPLE_QUESTION.explanation}
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant={isCorrect ? 'success' : 'danger'}
                size="lg"
                rightIcon={<ArrowRight className="w-5 h-5" />}
                onClick={handleNext}
                className="w-full sm:w-auto min-w-[160px]"
              >
                Tiếp tục
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
