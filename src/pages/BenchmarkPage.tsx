import React, { useState } from 'react';
import { Search, Star, GraduationCap, Award, CheckCircle2, Filter } from 'lucide-react';
import { Button, Card, Chip, Tabs } from '../components/ui';
import { BENCHMARK_2026_MAJORS, Major } from '../data/benchmarkData';
import { useTargetMajorStore } from '../store/targetMajorStore';

export const BenchmarkPage: React.FC = () => {
  const { targetCode, setTargetCode, getTargetMajor } = useTargetMajorStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<'all' | 'daitra' | 'pfiev'>('all');

  const targetMajor = getTargetMajor();

  const filteredMajors = BENCHMARK_2026_MAJORS.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.baseCode && m.baseCode.includes(searchTerm));
    const matchesProgram = selectedProgram === 'all' || m.program === selectedProgram;
    return matchesSearch && matchesProgram;
  });

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-6 h-6 object-contain" />
            <span className="text-xs font-black uppercase tracking-wider text-brand-blue">
              ĐẠI HỌC BÁCH KHOA - ĐHQG TP.HCM
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
            Điểm chuẩn Bách Khoa TP.HCM 2026
          </h2>
          <p className="text-xs sm:text-sm font-bold text-surface-secondary mt-1">
            Tra cứu điểm chuẩn phương thức kết hợp ĐGNL V-ACT & học bạ THPT (Chương trình Tiêu chuẩn & Kỹ sư Việt – Pháp PFIEV).
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
            <div className="p-3 rounded-2xl bg-brand-navy text-white shrink-0 shadow-sm flex items-center justify-center">
              <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Chip variant="yellow" size="sm">
                  NGÀNH MỤC TIÊU CỦA BẠN
                </Chip>
                <span className="text-xs font-bold text-surface-secondary">
                  Mã ngành: <strong className="text-brand-blue">{targetMajor.code}</strong>
                  {targetMajor.baseCode && ` (Mã xét sàn: ${targetMajor.baseCode})`}
                </span>
                <Chip variant={targetMajor.program === 'pfiev' ? 'primary' : 'neutral'} size="sm">
                  {targetMajor.program === 'pfiev' ? 'PFIEV Việt – Pháp' : 'Đại trà'}
                </Chip>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-surface-primary mt-1">
                {targetMajor.name}
              </h3>
              <p className="text-xs font-bold text-surface-secondary mt-0.5">
                Trường Đại học Bách Khoa - ĐHQG TP.HCM
                {targetMajor.floorScore && ` • Điểm sàn xét tuyển: ${targetMajor.floorScore.toFixed(2)}`}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right flex flex-col sm:items-end shrink-0">
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
            placeholder="Tìm theo tên ngành hoặc mã ngành (106, 107, PFIEV...)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-brand-card border-2 border-brand-border text-surface-primary text-sm font-bold placeholder:text-surface-muted outline-none focus:border-brand-blue transition-colors"
          />
        </div>

        <Tabs
          tabs={[
            { id: 'all', label: `Tất cả (${BENCHMARK_2026_MAJORS.length})` },
            { id: 'daitra', label: 'Đại trà (29)' },
            { id: 'pfiev', label: 'PFIEV Việt – Pháp (7)' },
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
                <th className="py-3 px-4 w-28">Mã tuyển sinh</th>
                <th className="py-3 px-4">Tên ngành / Chuyên ngành đào tạo</th>
                <th className="py-3 px-4 w-36">Chương trình</th>
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
                        className="p-1 rounded-lg hover:scale-110 active:scale-90 transition-transform cursor-pointer"
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
                      <div>{m.code}</div>
                      {m.baseCode && (
                        <div className="text-[11px] font-sans font-semibold text-surface-muted">
                          Sàn: {m.baseCode} ({m.floorScore?.toFixed(2)})
                        </div>
                      )}
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
                          PFIEV Việt – Pháp
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
