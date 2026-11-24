// ==============================================================================
// V-ACT HUB: Prompt Builder for AI Chatbots (Gemini / ChatGPT / Claude)
// Generates strict, battle-tested Vietnamese prompts for digitizing PDF exams into Schema v1.
// ==============================================================================

export type SupportedSubject = 'Tiếng Anh' | 'Tiếng Việt' | 'Toán học' | 'Vật lí' | 'Hóa học' | string;

export interface PromptBuilderOptions {
  subject: SupportedSubject;
  topic?: string;
  set?: string;
  chunkSize?: number; // 20-30 questions per turn (default: 25)
  totalPartsExpected?: number; // Optional hint of total parts
  customInstructions?: string;
}

export const DEFAULT_SUBJECTS: { code: string; name: SupportedSubject; description: string }[] = [
  {
    code: 'ENG',
    name: 'Tiếng Anh',
    description: 'Đề thi Tiếng Anh ĐGNL V-ACT / THPT: Ngữ pháp, từ vựng, bài đọc hiểu, điền từ.',
  },
  {
    code: 'VIE',
    name: 'Tiếng Việt',
    description: 'Đề thi Tiếng Việt ĐGNL V-ACT: Đọc hiểu ngữ liệu, phân tích tác phẩm, phong cách ngôn ngữ, biện pháp tu từ.',
  },
  {
    code: 'MATH',
    name: 'Toán học',
    description: 'Đề thi Toán học: Công thức KaTeX, giải phương trình, hình học, xác suất, đồ thị hàm số.',
  },
  {
    code: 'PHYS',
    name: 'Vật lí',
    description: 'Đề thi Vật lí: Cơ, Nhiệt, Điện, Quang, Hạt nhân, sơ đồ mạch và công thức vật lý.',
  },
  {
    code: 'CHEM',
    name: 'Hóa học',
    description: 'Đề thi Hóa học: Phương trình phản ứng KaTeX mhchem (\\ce{...}), hóa học hữu cơ/vô cơ.',
  },
];

/**
 * Returns a standard JSON Schema v1 compliant sample for prompt embedding.
 */
export function getSampleSchemaV1Json(): string {
  const sample = {
    schemaVersion: 1,
    subject: "Tiếng Anh",
    topic: "Chuyên đề 15: Câu điều kiện (Conditional Sentences)",
    set: "Bài tập rèn luyện 01",
    part: { index: 1, total: 3 },
    passages: [
      {
        id: "passage-1",
        title: "Climate Change and Coastal Wetlands",
        content: "Coastal wetlands are among the most productive ecosystems on Earth. However, they face acute risks from sea-level rise and human coastal encroachment. Restoring mangrove buffers is essential for sustainable resilience."
      }
    ],
    questions: [
      {
        no: 1,
        prompt: "If we _____ immediate action to cut emissions, global temperatures will continue to surge.",
        options: [
          "do not take",
          "will not take",
          "did not take",
          "had not taken"
        ],
        correctIndex: 0,
        answerSource: "document",
        category: "Câu điều kiện loại 1",
        formula: "If + S + V(hiện tại đơn), S + will + V-inf",
        explanation: "Mệnh đề chính dùng 'will continue' nên mệnh đề điều kiện ở hiện tại đơn (loại 1).",
        passageId: null,
        figure: null
      },
      {
        no: 2,
        prompt: "According to the passage, why are mangrove buffers essential?",
        options: [
          "They promote industrial fishing",
          "They provide sustainable coastal resilience",
          "They speed up urban expansion",
          "They replace artificial seawalls completely"
        ],
        correctIndex: 1,
        answerSource: "ai",
        category: "Đọc hiểu chi tiết",
        formula: "",
        explanation: "Câu cuối đoạn văn nêu rõ: 'Restoring mangrove buffers is essential for sustainable resilience.'",
        passageId: "passage-1",
        figure: null
      },
      {
        no: 3,
        prompt: "Cho hàm số $y = \\frac{2x + 1}{x - 1}$. Tiệm cận ngang của đồ thị hàm số có phương trình là:",
        options: [
          "$y = 2$",
          "$x = 1$",
          "$y = -1$",
          "$y = \\frac{1}{2}$"
        ],
        correctIndex: 0,
        answerSource: "ai",
        category: "Tiệm cận đồ thị hàm số",
        formula: "y = \\lim_{x \\to \\pm\\infty} f(x) = \\frac{a}{c}",
        explanation: "Hàm nhất biến $y = \\frac{ax+b}{cx+d}$ có tiệm cận ngang $y = \\frac{a}{c} = \\frac{2}{1} = 2$.",
        passageId: null,
        figure: null
      }
    ]
  };

  return JSON.stringify(sample, null, 2);
}

/**
 * Builds a prompt for chatbot models to convert PDF scans / exam text into Schema v1.
 */
export function buildImportPrompt(options: PromptBuilderOptions): string {
  const subject = options.subject || 'Tiếng Anh';
  const topic = options.topic || `Chuyên đề ${subject}`;
  const set = options.set || 'Bộ đề luyện tập 01';
  const chunkSize = options.chunkSize || 25;
  const sampleJson = getSampleSchemaV1Json();

  // Subject-specific hints
  let subjectHints = '';
  switch (subject) {
    case 'Tiếng Anh':
      subjectHints = `
- ĐỐI VỚI MÔN TIẾNG ANH:
  + Giữ nguyên chính xác từ vựng, giới từ, dấu gạch chân, chỗ trống (_____).
  + Các bài đọc hiểu (Reading Comprehension / Cloze test): Tách toàn bộ bài đọc vào mảng "passages" với "id" duy nhất (ví dụ "passage-1"). Các câu hỏi thuộc bài đọc phải gán "passageId": "passage-1".
  + Các dạng bài thường gặp: Ngữ pháp, Từ vựng, Điền từ vào đoạn văn, Đọc hiểu, Tìm lỗi sai, Đồng nghĩa/Trái nghĩa, Giao tiếp.`;
      break;

    case 'Tiếng Việt':
      subjectHints = `
- ĐỐI VỚI MÔN TIẾNG VIỆT (ĐGNL V-ACT):
  + Đối với các đoạn ngữ liệu văn học, trích đoạn văn bản báo chí hoặc thơ: Đưa trích đoạn vào mảng "passages" với "id" duy nhất (ví dụ "passage-1"), gán "passageId" cho các câu hỏi phân tích trích đoạn đó.
  + Các dạng bài: Đọc hiểu ngữ liệu, Phong cách ngôn ngữ, Biện pháp tu từ, Nghĩa của từ Hán-Việt, Lỗi dùng từ/đặt câu, Liên kết câu và đoạn văn.`;
      break;

    case 'Toán học':
      subjectHints = `
- ĐỐI VỚI MÔN TOÁN HỌC:
  + Mọi công thức toán học PHẢI viết bằng cú pháp KaTeX/LaTeX kẹp giữa dấu $...$ (inline) hoặc $$...$$ (display).
  + QUAN TRỌNG: Mọi dấu gạch chéo ngược (\\) trong chuỗi JSON BẮT BUỘC phải escape thành \\\\ (ví dụ: "\\\\frac{a}{b}", "\\\\sqrt{x}", "\\\\alpha", "\\\\le").
  + Câu hỏi có đồ thị hoặc hình vẽ minh họa trong file PDF scan: Ghi nhận trường "figure": {"page": <số trang PDF>, "bbox": [x0, y0, x1, y1]} với tọa độ chuẩn hóa từ 0.0 đến 1.0; nếu không có hình thì ghi null.
  + Điền trường "formula" tóm tắt công thức hoặc định lý then chốt dùng để giải câu đó.`;
      break;

    case 'Vật lí':
      subjectHints = `
- ĐỐI VỚI MÔN VẬT LÍ:
  + Công thức, đơn vị ($\\Omega$, $\\mu F$, $m/s^2$) viết bằng KaTeX/LaTeX và escape '\\\\' đầy đủ.
  + Câu hỏi có sơ đồ mạch điện, đồ thị dao động: Ghi nhận "figure": {"page": <số trang>, "bbox": [x0, y0, x1, y1]} hoặc null.
  + Trường "formula" ghi công thức vật lý cốt lõi.`;
      break;

    case 'Hóa học':
      subjectHints = `
- ĐỐI VỚI MÔN HÓA HỌC:
  + Phương trình hóa học và công thức chất dùng KaTeX mhchem, escape '\\\\' (ví dụ: "$\\\\ce{Fe + 2HCl -> FeCl2 + H2 ^}$").
  + Câu hỏi có sơ đồ thí nghiệm: ghi "figure": {"page": <số trang>, "bbox": [x0,y0,x1,y1]} hoặc null.`;
      break;

    default:
      subjectHints = `
- ĐỐI VỚI MÔN ${subject.toUpperCase()}:
  + Công thức khoa học viết bằng KaTeX/LaTeX và escape '\\\\' đầy đủ.
  + Nếu có hình ảnh minh họa trong PDF scan, xác định {"page": <trang>, "bbox": [x0,y0,x1,y1]} hoặc null.`;
  }

  const customBlock = options.customInstructions ? `\n- HƯỚNG DẪN BỔ SUNG CỦA NGƯỜI DÙNG:\n  ${options.customInstructions}\n` : '';

  return `Bạn là chuyên gia số hóa đề thi cho nền tảng luyện thi V-ACT HUB (học theo lộ trình Duolingo).
Hãy đọc kỹ tài liệu đề thi đính kèm (file PDF scan / hình ảnh / văn bản đề thi) và chuyển đổi thành dữ liệu JSON chuẩn Schema v1 (schemaVersion: 1) theo các quy tắc nghiêm ngặt sau:

========================================
1. QUY TẮC PHÂN CHIA LƯỢT XUẤT (MULTIPART):
========================================
- Mỗi lượt trả lời, bạn CHỈ xuất tối đa ${chunkSize} câu hỏi (từ 20 đến 30 câu).
- Khai báo trường "part": {"index": X, "total": N} (Ví dụ lượt đầu: {"index": 1, "total": 3}).
- Khi hoàn thành lượt câu hỏi hiện tại, HÃY DỪNG LẠI và CHỜ người dùng nhắn "tiếp" (hoặc "tiếp từ câu ...") mới xuất tiếp phần tiếp theo. Không tự động xuất dồn dập vượt quá ${chunkSize} câu một lần để tránh bị cắt cụt token.

========================================
2. ĐỊNH DẠNG ĐẦU RA - CHỈ JSON THUẦN:
========================================
- BẠN CHỈ ĐƯỢC PHÉP TRẢ VỀ DUY NHẤT MỘT KHỐI JSON HỢP LỆ.
- TUYỆT ĐỐI KHÔNG viết lời chào, lời dẫn (ví dụ: "Dưới đây là JSON...", "Hy vọng giúp ích...").
- TUYỆT ĐỐI KHÔNG bọc JSON trong khối markdown \`\`\`json hoặc \`\`\`. Chỉ bắt đầu bằng ký tự { và kết thúc bằng ký tự }.

========================================
3. QUY TẮC ESCAPE LATEX TRONG JSON (BẮT BUỘC):
========================================
- Chuẩn JSON yêu cầu mọi dấu gạch chéo ngược (\\) phải được escape thành \\\\.
- Ví dụ: 
  + "\\frac{1}{2}" trong JSON PHẢI viết là "\\\\frac{1}{2}"
  + "\\sqrt{x}" PHẢI viết là "\\\\sqrt{x}"
  + "\\alpha" PHẢI viết là "\\\\alpha"
  + "\\ce{H2O}" PHẢI viết là "\\\\ce{H2O}"
- Không được để dấu gạch chéo ngược đơn độc (\\) vì sẽ làm hỏng JSON parser.

========================================
4. QUY TẮC ĐÁP ÁN & NGUỒN ĐÁP ÁN:
========================================
- Nếu tài liệu CÓ sẵn bảng đáp án:
  + "correctIndex": số nguyên từ 0 đến 3 (0: A, 1: B, 2: C, 3: D).
  + "answerSource": "document".
- Nếu tài liệu KHÔNG có đáp án và bạn tự giải:
  + "correctIndex": số nguyên 0 đến 3 mà bạn giải được.
  + "answerSource": "ai".
- Nếu câu hỏi bị mờ, thiếu dữ kiện, không thể giải chắc chắn:
  + "correctIndex": null.
  + "answerSource": "none".

========================================
5. CHI TIẾT CÁC TRƯỜNG DỮ LIỆU CỦA MỖI CÂU HỎI:
========================================
- "no": Số thứ tự câu trong đề thi (1, 2, 3...).
- "prompt": Đề bài đầy đủ (đã loại bỏ chữ "Câu 1.", "Question 1.").
- "options": Mảng đúng 4 phần tử [A, B, C, D] (đã loại bỏ tiền tố "A.", "B.", "C.", "D.").
- "correctIndex": 0, 1, 2, 3 hoặc null.
- "answerSource": "document" | "ai" | "none".
- "category": Phân loại dạng bài / kiến thức chi tiết (ví dụ: "Câu điều kiện loại 2", "Từ đồng nghĩa", "Tiệm cận đồ thị").
- "formula": Công thức cốt lõi, quy tắc ngữ pháp hoặc định lý áp dụng (chuỗi rỗng "" nếu không có).
- "explanation": Lời giải thích ngắn gọn, súc tích vì sao chọn đáp án đó.
- "passageId": Nếu câu hỏi thuộc bài đọc hiểu hoặc đoạn văn dùng chung, điền "id" của passage đó trong mảng "passages" (ví dụ: "passage-1"); nếu không thuộc bài đọc nào, ghi null.
- "figure": Nếu có hình vẽ, sơ đồ trong PDF: {"page": <trang_bắt_đầu_từ_1>, "bbox": [x0, y0, x1, y1]} với tọa độ chuẩn hóa từ 0.0 đến 1.0; nếu không có hình vẽ thì ghi null.
${subjectHints}
${customBlock}
========================================
6. THÔNG TIN BỘ ĐỀ ĐANG THỰC HIỆN:
========================================
- Môn học (subject): "${subject}"
- Chuyên đề (topic): "${topic}"
- Bài học / Bộ đề (set): "${set}"

========================================
7. VÍ DỤ CẤU TRÚC JSON MẪU CHUẨN SCHEMA V1:
========================================
${sampleJson}

BẮT ĐẦU NGAY BÂY GIỜ. Hãy xuất Phần 1 (${chunkSize} câu đầu tiên) dưới dạng JSON thuần túy:`;
}
