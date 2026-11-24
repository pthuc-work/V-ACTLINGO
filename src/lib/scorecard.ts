import { Question } from '../data/types';

export interface ScorecardData {
  setName: string;
  topicName?: string;
  subjectName?: string;
  timeSpentSeconds: number;
  totalQuestions: number;
  scoredQuestions: number;
  correctCount: number;
  stars: number;
  earnedXp: number;
  questions: Question[];
  answers: Record<string, number | null>;
  flags?: Record<string, boolean>;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function generateScorecardText(data: ScorecardData): string {
  const percentage = data.scoredQuestions > 0
    ? Math.round((data.correctCount / data.scoredQuestions) * 100)
    : 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const starIcons = '★'.repeat(data.stars) + '☆'.repeat(Math.max(0, 3 - data.stars));

  let text = '';
  text += '================================================================================\n';
  text += '                    V-ACT HUB - PHIẾU KẾT QUẢ BÀI LUYỆN TẬP\n';
  text += '================================================================================\n\n';

  text += `Bộ đề:            ${data.setName}\n`;
  if (data.topicName) {
    text += `Chuyên đề:        ${data.topicName}\n`;
  }
  if (data.subjectName) {
    text += `Môn học:          ${data.subjectName}\n`;
  }
  text += `Ngày hoàn thành:  ${dateStr}\n`;
  text += `Thời gian làm:    ${formatDuration(data.timeSpentSeconds)} (${data.timeSpentSeconds} giây)\n`;
  text += `Kết quả đạt được: ${data.correctCount} / ${data.scoredQuestions} câu đúng (${percentage}%)\n`;
  text += `Tổng số câu hỏi:  ${data.totalQuestions} câu\n`;
  text += `Đánh giá sao:     ${starIcons} (${data.stars}/3 Sao)\n`;
  text += `Kinh nghiệm (XP): +${data.earnedXp} XP\n\n`;

  text += '================================================================================\n';
  text += '                         CHI TIẾT TỪNG CÂU HỎI\n';
  text += '================================================================================\n\n';

  data.questions.forEach((q, idx) => {
    const selected = data.answers[q.id];
    const isAnswered = selected !== null && selected !== undefined;
    const isCorrect = isAnswered && q.correctIndex !== null && selected === q.correctIndex;
    const isFlagged = data.flags?.[q.id] || false;

    let statusText = 'CHƯA LÀM';
    if (q.correctIndex === null) {
      statusText = 'KHÔNG TÍNH ĐIỂM';
    } else if (isCorrect) {
      statusText = 'ĐÚNG';
    } else if (isAnswered) {
      statusText = 'SAI';
    }

    const flagTag = isFlagged ? ' [GẮN CỜ ⚑]' : '';

    text += `--------------------------------------------------------------------------------\n`;
    text += `Câu ${idx + 1} / ${data.totalQuestions} [${statusText}]${flagTag}\n`;
    if (q.category) {
      text += `Dạng bài: ${q.category}\n`;
    }
    text += `Nội dung: ${q.prompt.replace(/\n/g, ' ')}\n\n`;

    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, oIdx) => {
      const letter = letters[oIdx] || `(${oIdx + 1})`;
      const isChosen = selected === oIdx;
      const isRight = q.correctIndex === oIdx;

      let marker = '  ';
      if (isChosen && isRight) marker = '✓ (Bạn chọn & Đúng)';
      else if (isChosen && !isRight) marker = '✗ (Bạn chọn)';
      else if (isRight) marker = '★ (Đáp án đúng)';

      text += `  ${letter}. ${opt} ${marker}\n`;
    });

    if (q.formula) {
      text += `\nCông thức: ${q.formula}\n`;
    }
    if (q.explanation) {
      text += `Giải thích: ${q.explanation}\n`;
    }
    text += '\n';
  });

  text += '================================================================================\n';
  text += '            CHÚC BẠN ÔN LUYỆN TỐT & ĐỖ NGUYỆN VỌNG BÁCH KHOA 2026!\n';
  text += '================================================================================\n';

  return text;
}

export function downloadScorecardFile(data: ScorecardData, filename?: string): void {
  const text = generateScorecardText(data);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  const safeSetName = data.setName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.download = filename || `phieu-ket-qua-${safeSetName || 'vact'}.txt`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
