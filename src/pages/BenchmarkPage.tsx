import React, { useState } from 'react';
import { Search, Star, GraduationCap, Award, CheckCircle2, Filter } from 'lucide-react';
import { Button, Card, Chip, Tabs } from '../components/ui';

interface Major {
  code: string;
  name: string;
  program: 'daitra' | 'pfiev' | 'tientien';
  benchmark: number;
  note?: string;
}

const MAJORS_DATA: Major[] = [
  { code: '106', name: 'Khoa học Máy tính', program: 'daitra', benchmark: 85.45, note: 'Điểm chuẩn cao nhất khối kỹ thuật' },
  { code: '107', name: 'Kỹ thuật Máy tính', program: 'daitra', benchmark: 82.30 },
  { code: '108', name: 'Trí tuệ Nhân tạo (AI)', program: 'tientien', benchmark: 84.10, note: 'Chương trình giảng dạy bằng tiếng Anh' },
  { code: '115', name: 'Kỹ thuật Điện - Điện tử', program: 'daitra', benchmark: 78.50 },
  { code: '118', name: 'Kỹ thuật Điều khiển & Tự động hóa', program: 'daitra', benchmark: 81.25 },
  { code: '120', name: 'Kỹ thuật Cơ điện tử', program: 'daitra', benchmark: 79.80 },
  { code: '121', name: 'Kỹ thuật Cơ khí', program: 'daitra', benchmark: 74.20 },
  { code: '124', name: 'Kỹ thuật Hóa học', program: 'daitra', benchmark: 72.10 },
  { code: '128', name: 'Logistics và Quản lý Chuỗi cung ứng', program: 'daitra', benchmark: 82.90 },
  { code: '135', name: 'Kỹ thuật Xây dựng', program: 'daitra', benchmark: 68.50 },
  { code: '701', name: 'Kỹ thuật Hàng không (PFIEV)', program: 'pfiev', benchmark: 79.50, note: 'Chương trình Kỹ sư chất lượng cao Việt Pháp' },
  { code: '702', name: 'Hệ thống Năng lượng (PFIEV)', program: 'pfiev', benchmark: 76.20, note: 'PFIEV Việt Pháp' },
  { code: '703', name: 'Viễn thông (PFIEV)', program: 'pfiev', benchmark: 78.00, note: 'PFIEV Việt Pháp' },
  { code: '704', name: 'Vật liệu Tiên tiến & Polyme (PFIEV)', program: 'pfiev', benchmark: 73.80, note: 'PFIEV Việt Pháp' },
];

export const BenchmarkPage: React.FC = () => {
  const [targetCode, setTargetCode] = useState<string>('106'); // Default 106 Khoa học Máy tính
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<'all' | 'daitra' | 'pfiev' | 'tientien'>('all');

  const targetMajor = MAJORS_DATA.find((m) => m.code === targetCode) || MAJORS_DATA[0];

  const filteredMajors = MAJORS_DATA.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.includes(searchTerm);
    const matchesProgram = selectedProgram === 'all' || m.program === selectedProgram;
    return matchesSearch && matchesProgram;
  });

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
            Điểm chuẩn Bách Khoa TP.HCM 2026
          </h2>
          <p className="text-xs sm:text-sm font-bold text-surface-secondary mt-1">
            Tra cứu điểm chuẩn phương thức kết hợp ĐGNL V-ACT & học bạ THPT.
          </p>
        </div>
      </div>

      {/* Target Major Highlight Banner */}
      <Card
        variant="3d"
        padding="lg"
        className="bg-gradient-to-r from-brand-card via-blue-50/40 to-amber-50/30 dark:via-blue-950/20 dark:to-amber-950/10 border-brand-blue/40"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-brand-navy text-white shrink-0 shadow-sm">
              <GraduationCap className="w-8 h-8 text-brand-yellow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Chip variant="yellow" size="sm">
                  NGÀNH MỤC TIÊU CỦA BẠN
                </Chip>
                <span className="text-xs font-bold text-surface-secondary">Mã ngành: {targetMajor.code}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-surface-primary mt-1">
                {targetMajor.name}
              </h3>
              <p className="text-xs font-bold text-surface-secondary mt-0.5">
                Trường Đại học Bách Khoa - ĐHQG TP.HCM
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right flex flex-col sm:items-end">
            <span className="text-xs font-black uppercase tracking-wider text-surface-secondary">
              Điểm chuẩn mục tiêu
            </span>
            <span className="text-3xl sm:text-4xl font-black text-amber-500 flex items-center gap-1.5 mt-0.5">
              {targetMajor.benchmark.toFixed(2)}
              <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
            </span>
          </div>
        </div>
      </Card>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên ngành hoặc mã ngành..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-brand-card border-2 border-brand-border text-surface-primary text-sm font-bold placeholder:text-surface-muted outline-none focus:border-brand-blue transition-colors"
          />
        </div>

        <Tabs
          tabs={[
            { id: 'all', label: 'Tất cả' },
            { id: 'daitra', label: 'Đại trà' },
            { id: 'pfiev', label: 'PFIEV (Việt Pháp)' },
            { id: 'tientien', label: 'Tiên tiến' },
          ]}
          activeTab={selectedProgram}
          onChange={(id) => setSelectedProgram(id as any)}
          size="sm"
        />
      </div>

      {/* Majors Table */}
      <Card variant="flat" padding="none" className="overflow-hidden border-2 border-brand-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-brand-border/40 border-b border-brand-border text-xs font-black text-surface-secondary uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Mục tiêu</th>
                <th className="py-3 px-4 w-24">Mã</th>
                <th className="py-3 px-4">Tên ngành đào tạo</th>
                <th className="py-3 px-4 w-32">Chương trình</th>
                <th className="py-3 px-4 w-36 text-right">Điểm chuẩn 2026</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {filteredMajors.map((m) => {
                const isSelected = m.code === targetCode;
                return (
                  <tr
                    key={m.code}
                    className={`hover:bg-brand-blue-light/20 transition-colors ${
                      isSelected ? 'bg-amber-50/60 dark:bg-amber-950/20 font-bold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setTargetCode(m.code)}
                        className="p-1 rounded-lg hover:scale-110 active:scale-90 transition-transform"
                        title={isSelected ? 'Ngành đang chọn làm mục tiêu' : 'Chọn làm ngành mục tiêu'}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isSelected
                              ? 'text-amber-500 fill-amber-400 drop-shadow-sm'
                              : 'text-brand-border hover:text-amber-400'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-surface-secondary">
                      {m.code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-surface-primary">
                      <div>{m.name}</div>
                      {m.note && (
                        <span className="text-[11px] font-semibold text-surface-muted block mt-0.5">
                          {m.note}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {m.program === 'pfiev' ? (
                        <Chip variant="primary" size="sm">
                          PFIEV Việt Pháp
                        </Chip>
                      ) : m.program === 'tientien' ? (
                        <Chip variant="ai" size="sm">
                          Tiên tiến
                        </Chip>
                      ) : (
                        <Chip variant="neutral" size="sm">
                          Đại trà
                        </Chip>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-base text-amber-600 dark:text-amber-400">
                      {m.benchmark.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
