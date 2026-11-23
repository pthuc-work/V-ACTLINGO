import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle2, AlertTriangle, ArrowRight, UploadCloud } from 'lucide-react';
import { Button, Card, Chip } from '../components/ui';

export const ImportPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Chip variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            AI TRỢ LÝ
          </Chip>
          <span className="text-xs font-bold text-surface-secondary">Chuẩn Schema v1</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
          Import tài liệu (AI)
        </h2>
        <p className="text-xs sm:text-sm font-bold text-surface-secondary mt-1">
          Dán nội dung văn bản đề thi trắc nghiệm (Tiếng Anh, Tiếng Việt V-ACT) hoặc prompt chuẩn để AI tự động chuyển hóa thành bộ đề Duolingo.
        </p>
      </div>

      <Card variant="default" padding="lg">
        <label className="block text-sm font-black text-surface-primary mb-2">
          Dán nội dung JSON hoặc Văn bản đề thi:
        </label>
        <textarea
          rows={10}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`{\n  "schemaVersion": 1,\n  "subject": "Tiếng Anh",\n  "topic": "Chuyên đề 15: Câu điều kiện",\n  "set": "Bài tập áp dụng",\n  "questions": [...]\n}`}
          className="w-full p-4 rounded-2xl bg-brand-bg font-mono text-xs sm:text-sm border-2 border-brand-border text-surface-primary outline-none focus:border-brand-blue transition-colors custom-scrollbar"
        />

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-brand-border">
          <div className="flex items-center gap-2 text-xs font-bold text-surface-secondary">
            <UploadCloud className="w-4 h-4 text-brand-blue" />
            <span>Hỗ trợ kéo thả file .json / .txt (giai đoạn 1)</span>
          </div>

          <Button
            variant="primary"
            size="md"
            loading={isProcessing}
            disabled={!inputText.trim()}
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={() => {
              setIsProcessing(true);
              setTimeout(() => setIsProcessing(false), 1200);
            }}
          >
            Chuyển thành bộ đề
          </Button>
        </div>
      </Card>
    </div>
  );
};
