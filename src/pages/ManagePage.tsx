import React, { useState } from 'react';
import { FolderTree, MoveUp, MoveDown, Edit2, Trash2, Download, Upload, Plus } from 'lucide-react';
import { Button, Card, Chip } from '../components/ui';

interface MockSet {
  id: string;
  name: string;
  questionsCount: number;
}

const INITIAL_SETS: MockSet[] = [
  { id: '1', name: 'Bài tập áp dụng: Loại 1 & 2', questionsCount: 30 },
  { id: '2', name: 'Bài luyện tập số 1: Loại 3 & Đảo ngữ', questionsCount: 50 },
  { id: '3', name: 'Bài luyện tập số 2: Câu điều kiện hỗn hợp', questionsCount: 50 },
];

export const ManagePage: React.FC = () => {
  const [sets, setSets] = useState<MockSet[]>(INITIAL_SETS);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...sets];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setSets(next);
  };

  const moveDown = (index: number) => {
    if (index === sets.length - 1) return;
    const next = [...sets];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setSets(next);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Chip variant="primary" size="sm" icon={<FolderTree className="w-3.5 h-3.5" />}>
              KHO TÀI LIỆU
            </Chip>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
            Quản lý & Sắp xếp bài học
          </h2>
          <p className="text-xs sm:text-sm font-bold text-surface-secondary mt-1">
            Sắp xếp thứ tự bài học trong lộ trình, chỉnh sửa tên, xóa hoặc xuất/nhập sao lưu JSON.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4 text-brand-blue" />}
          >
            Sao lưu JSON
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Thêm bài mới
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-black text-surface-primary uppercase tracking-wider">
          Chuyên đề 15: Câu điều kiện ({sets.length} bài)
        </h3>

        {sets.map((item, index) => (
          <Card
            key={item.id}
            variant="flat"
            padding="md"
            className="flex items-center justify-between gap-4 bg-brand-card hover:border-brand-blue/40"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-brand-border/60 text-surface-secondary font-black text-xs flex items-center justify-center">
                {index + 1}
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-surface-primary">{item.name}</h4>
                <span className="text-xs font-bold text-surface-muted">
                  {item.questionsCount} câu hỏi
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveUp(index)}
                className="p-1.5 rounded-xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Di chuyển lên"
              >
                <MoveUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={index === sets.length - 1}
                onClick={() => moveDown(index)}
                className="p-1.5 rounded-xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Di chuyển xuống"
              >
                <MoveDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-xl text-surface-secondary hover:text-brand-blue hover:bg-brand-border/40 transition-colors"
                title="Đổi tên"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-xl text-surface-secondary hover:text-brand-red hover:bg-brand-border/40 transition-colors"
                title="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
