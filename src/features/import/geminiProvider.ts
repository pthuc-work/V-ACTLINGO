// ==============================================================================
// V-ACT HUB: Gemini API Provider (Hidden & Local Only)
// ==============================================================================
// - Behind feature flag: import.meta.env.VITE_ENABLE_GEMINI === 'true'
// - API Key and Model Name are stored strictly in localStorage.
// - NEVER sent to Supabase, NEVER exported into full JSON backups, NEVER hardcoded.
// - Passes responses into parseAndRepair stream like chatbot JSON.
// ==============================================================================

export const STORAGE_KEY_GEMINI_API_KEY = 'vact_gemini_api_key';
export const STORAGE_KEY_GEMINI_MODEL = 'vact_gemini_model';
export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';

/**
 * Checks whether the Gemini API feature flag is enabled in Vite env.
 * Defaults to false (hidden from UI unless explicitly enabled via VITE_ENABLE_GEMINI=true).
 */
export function isGeminiFeatureEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_GEMINI === 'true';
}

/**
 * Get the locally stored Gemini API key (localStorage only).
 */
export function getGeminiApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_GEMINI_API_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Get the locally stored Gemini model name (default: gemini-1.5-flash).
 */
export function getGeminiModel(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_GEMINI_MODEL) || DEFAULT_GEMINI_MODEL;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
}

/**
 * Save Gemini config locally.
 */
export function saveGeminiConfig(apiKey: string, model: string = DEFAULT_GEMINI_MODEL): void {
  try {
    localStorage.setItem(STORAGE_KEY_GEMINI_API_KEY, (apiKey || '').trim());
    localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, (model || DEFAULT_GEMINI_MODEL).trim());
  } catch (err) {
    console.error('Failed to save Gemini config:', err);
  }
}

/**
 * Clear locally stored Gemini config.
 */
export function clearGeminiConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_GEMINI_API_KEY);
    localStorage.removeItem(STORAGE_KEY_GEMINI_MODEL);
  } catch (err) {
    console.error('Failed to clear Gemini config:', err);
  }
}

/**
 * Returns whether a non-empty Gemini API key is configured.
 */
export function hasConfiguredGeminiKey(): boolean {
  return Boolean(getGeminiApiKey().trim());
}

export interface PdfScanPage {
  pageNumber: number;
  base64Data: string;
  mimeType?: string;
}

export interface PdfPageChunk {
  chunkIndex: number;
  totalChunks: number;
  pageStart: number;
  pageEnd: number;
  pages: Array<{ pageNumber: number; base64Data: string; mimeType: string }>;
}

/**
 * Split scanned pages into manageable chunks (e.g. 3-5 pages per chunk)
 * to avoid exceeding token limits and keep chatbot responses stable.
 */
export function chunkPdfPages(
  pages: PdfScanPage[],
  chunkSize: number = 5
): PdfPageChunk[] {
  if (!pages || pages.length === 0) return [];
  const safeChunkSize = Math.max(1, chunkSize);
  const chunks: PdfPageChunk[] = [];
  const total = Math.ceil(pages.length / safeChunkSize);

  for (let i = 0; i < pages.length; i += safeChunkSize) {
    const slice = pages.slice(i, i + safeChunkSize);
    chunks.push({
      chunkIndex: Math.floor(i / safeChunkSize) + 1,
      totalChunks: total,
      pageStart: slice[0].pageNumber,
      pageEnd: slice[slice.length - 1].pageNumber,
      pages: slice.map((p) => ({
        pageNumber: p.pageNumber,
        base64Data: p.base64Data,
        mimeType: p.mimeType || 'image/jpeg',
      })),
    });
  }
  return chunks;
}

export interface GeminiRequestOptions {
  apiKey?: string;
  model?: string;
  customPrompt?: string;
  subject?: string;
  topic?: string;
  setName?: string;
}

/**
 * Direct call to Gemini REST API generateContent.
 * Strips API key from any thrown errors so it never leaks.
 */
export async function callGeminiApi(
  prompt: string,
  mediaParts?: Array<{ mimeType: string; dataBase64: string }>,
  options?: GeminiRequestOptions
): Promise<string> {
  if (!isGeminiFeatureEnabled()) {
    throw new Error('Tính năng Gemini API chưa được bật trên môi trường này (VITE_ENABLE_GEMINI !== "true").');
  }

  const apiKey = (options?.apiKey || getGeminiApiKey()).trim();
  if (!apiKey) {
    throw new Error('Chưa cấu hình API Key của Gemini trong Cài đặt.');
  }

  const model = (options?.model || getGeminiModel() || DEFAULT_GEMINI_MODEL).trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const parts: any[] = [{ text: prompt }];
  if (mediaParts && mediaParts.length > 0) {
    for (const m of mediaParts) {
      parts.push({
        inlineData: {
          mimeType: m.mimeType,
          data: m.dataBase64,
        },
      });
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    // Ensure API key never appears in error message
    const sanitizedError = errBody.replace(new RegExp(apiKey, 'g'), '***KEY***');
    throw new Error(`Gemini API error (HTTP ${response.status}): ${sanitizedError.slice(0, 300)}`);
  }

  const json = await response.json();
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API không trả về nội dung văn bản hợp lệ.');
  }

  return text;
}

/**
 * Test Gemini API connection with a lightweight prompt.
 */
export async function testGeminiApiKey(
  apiKey?: string,
  model?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await callGeminiApi('Return JSON: {"status":"ok"}', undefined, { apiKey, model });
    return { success: true, message: 'Kết nối Gemini API thành công!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Kết nối thất bại.' };
  }
}

/**
 * Process a PDF scan chunk via Gemini API, passing result through parseAndRepair.
 */
export async function processGeminiChunk(
  chunk: PdfPageChunk,
  options?: GeminiRequestOptions
): Promise<{ rawText: string; parseResult: any }> {
  const defaultPrompt = `Hãy trích xuất tất cả các câu hỏi trắc nghiệm từ các trang scan tài liệu đính kèm (Trang ${chunk.pageStart} đến ${chunk.pageEnd}). Trả về duy nhất một JSON thuần chuẩn schema v1 với schemaVersion: 1, subject: "${options?.subject || 'Tiếng Anh'}", topic: "${options?.topic || 'Chuyên đề 15'}", set: "${options?.setName || 'Bài tập'}", part: { index: ${chunk.chunkIndex}, total: ${chunk.totalChunks} }, passages: [], questions: [ { no: 1, prompt: "...", options: ["A", "B", "C", "D"], correctIndex: null, answerSource: "ai", verified: false, category: "...", formula: "", explanation: "", figure: null } ].`;

  const prompt = options?.customPrompt || defaultPrompt;
  const mediaParts = chunk.pages.map((p) => ({
    mimeType: p.mimeType,
    dataBase64: p.base64Data,
  }));

  const rawText = await callGeminiApi(prompt, mediaParts, options);

  let parseResult: any;
  try {
    const parser = await import('./parseAndRepair');
    if (typeof parser.parseAndRepair === 'function') {
      parseResult = parser.parseAndRepair(rawText);
    } else {
      parseResult = { data: JSON.parse(rawText), repairs: [], errors: [], warnings: [] };
    }
  } catch (err: any) {
    try {
      const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parseResult = { data: JSON.parse(cleaned), repairs: ['fallback clean'], errors: [], warnings: [] };
    } catch (parseErr: any) {
      parseResult = { data: null, repairs: [], errors: [parseErr.message || 'JSON parse failed'], warnings: [] };
    }
  }

  return { rawText, parseResult };
}
