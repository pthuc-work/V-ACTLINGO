import React, { useState } from 'react';
import { BookOpen, Search, Copy, Check, Sparkles, Atom, Calculator, AlertCircle } from 'lucide-react';
import { Card, Chip } from '../components/ui';
import { RichText } from '../components/ui/RichText';

interface FormulaItem {
  id: string;
  category: string;
  title: string;
  formula: string;
  example: string;
  isKatex?: boolean;
  notes?: string;
}

const FORMULAS_DATA: FormulaItem[] = [
  {
    id: '1',
    category: 'Câu điều kiện',
    title: 'Loại 1 - Điều kiện có thể xảy ra ở hiện tại / tương lai',
    formula: 'If + S + V(hiện tại đơn), S + will/can/may + V(nguyên mẫu)',
    example: 'If it rains tomorrow, we will stay at home.',
  },
  {
    id: '2',
    category: 'Câu điều kiện',
    title: 'Loại 2 - Điều kiện trái ngược với hiện tại',
    formula: 'If + S + V2/ed (were), S + would/could/might + V(nguyên mẫu)',
    example: 'If I were you, I would take the V-ACT exam early.',
    notes: 'To be dùng "were" cho tất cả các ngôi trong văn phong chuẩn.',
  },
  {
    id: '3',
    category: 'Câu điều kiện',
    title: 'Loại 3 - Điều kiện trái ngược với quá khứ',
    formula: 'If + S + had + V3/ed, S + would/could + have + V3/ed',
    example: 'If she had studied harder, she would have passed with high score.',
  },
  {
    id: '4',
    category: 'Đảo ngữ câu điều kiện',
    title: 'Đảo ngữ Loại 3',
    formula: 'Had + S + (not) + V3/ed, S + would/could + have + V3/ed',
    example: 'Had they arrived earlier, they would have caught the train.',
    notes: 'Bỏ "If", đưa trợ động từ "Had" lên trước chủ ngữ.',
  },
  {
    id: 'k1',
    category: 'Toán học (KaTeX Test)',
    title: 'Nghiệm phương trình bậc hai',
    formula: 'Phương trình $ax^2 + bx + c = 0$ có nghiệm: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$',
    example: 'Với $a = 1, b = -3, c = 2 \\implies x_1 = 2, x_2 = 1$',
    isKatex: true,
    notes: 'Render bằng KaTeX bundle cục bộ không qua CDN.',
  },
  {
    id: 'k2',
    category: 'Toán học (KaTeX Test)',
    title: 'Tích phân xác định',
    formula: 'Diện tích hình phẳng giới hạn bởi đường cong: $$\\int_0^\\pi \\sin(x) dx = [-\\cos(x)]_0^\\pi = 2$$',
    example: 'Ứng dụng trong bài toán hình học giải tích V-ACT.',
    isKatex: true,
  },
  {
    id: 'k3',
    category: 'Hóa học (mhchem Test)',
    title: 'Phản ứng oxy hóa - khử & Cân bằng ion',
    formula: 'Phương trình: $\\ce{Fe + 2HCl -> FeCl2 + H2 ^}$ và $\\ce{2MnO4- + 5SO3^2- + 6H+ -> 2Mn^2+ + 5SO4^2- + 3H2O}$',
    example: 'mhchem extension được nạp sẵn sàng cho phần Khoa học tự nhiên.',
    isKatex: true,
  },
  {
    id: 'k4',
    category: 'Khả năng phục hồi lỗi (Fault Tolerance)',
    title: 'Biểu thức LaTeX lỗi cú pháp',
    formula: 'Thử nghiệm công thức cố ý gõ sai cú pháp: $\\frac{chua_dong_ngoac$',
    example: 'Hệ thống tự động hiển thị biểu tượng cảnh báo và giữ nguyên văn bản, không làm crash trang.',
    isKatex: true,
    notes: 'Bảo vệ an toàn 100% cho trải nghiệm người dùng.',
  },
];

export const FormulaPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customKatex, setCustomKatex] = useState<string>('$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$$');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = FORMULAS_DATA.filter(
    (f) =>
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.formula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Chip variant="primary" size="sm" icon={<BookOpen className="w-3.5 h-3.5" />}>
            SỔ TAY CÔNG THỨC
          </Chip>
          <Chip variant="success" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            KaTeX + mhchem Sẵn sàng
          </Chip>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
          Bảng công thức & Quy tắc cốt lõi
        </h2>
        <p className="text-xs sm:text-sm font-bold text-surface-secondary mt-1">
          Tổng hợp công thức ngữ pháp Tiếng Anh, cấu trúc Tiếng Việt và kiểm thử khả năng render công thức Toán - Khoa học tự nhiên (KaTeX & mhchem).
        </p>
      </div>

      {/* KaTeX Interactive Playground */}
      <Card variant="3d" padding="md" className="border-2 border-brand-blue/30 bg-gradient-to-br from-brand-card to-brand-blue/5">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-5 h-5 text-brand-blue" />
          <h3 className="text-base font-black text-surface-primary">Khung kiểm thử công thức KaTeX tương tác</h3>
        </div>
        <p className="text-xs font-semibold text-surface-secondary mb-2">
          Nhập mã LaTeX / KaTeX / mhchem để kiểm tra hiển thị thời gian thực (đóng gói cục bộ, không CDN):
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={customKatex}
            onChange={(e) => setCustomKatex(e.target.value)}
            placeholder="Ví dụ: $$E = mc^2$$ hoặc $\\ce{H2O}$"
            className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border-2 border-brand-border text-surface-primary text-sm font-mono font-bold outline-none focus:border-brand-blue"
          />
          <div className="p-4 rounded-xl bg-brand-bg border border-brand-border/80 min-h-[56px] flex items-center justify-center">
            <RichText content={customKatex} className="text-base text-surface-primary" />
          </div>
        </div>
      </Card>

      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-secondary" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm công thức (ví dụ: Loại 3, tích phân, mhchem...)"
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-brand-card border-2 border-brand-border text-surface-primary text-sm font-bold placeholder:text-surface-muted outline-none focus:border-brand-blue transition-colors"
        />
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map((item) => (
          <Card key={item.id} variant="3d" padding="md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Chip
                  variant={item.isKatex ? 'success' : 'yellow'}
                  size="sm"
                  className="mb-2"
                  icon={item.isKatex ? <Atom className="w-3 h-3" /> : undefined}
                >
                  {item.category}
                </Chip>
                <h4 className="text-base font-black text-surface-primary">{item.title}</h4>
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
              {item.isKatex ? (
                <RichText content={item.formula} />
              ) : (
                <div className="font-mono">{item.formula}</div>
              )}
            </div>

            <div className="mt-3 text-xs font-semibold text-surface-secondary">
              <strong className="text-surface-primary">Ví dụ: </strong>
              {item.isKatex ? (
                <RichText content={item.example} as="span" />
              ) : (
                <span className="italic">{item.example}</span>
              )}
              {item.notes && (
                <div className="mt-1 text-[11px] text-surface-muted">&bull; {item.notes}</div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
