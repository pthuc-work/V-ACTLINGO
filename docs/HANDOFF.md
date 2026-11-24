# BÀN GIAO ĐỢT 3/3: IMPORT VÀ QUẢN LÝ (V-ACT HUB)

Tài liệu này là nguồn sự thật bàn giao kỹ thuật toàn diện khi kết thúc Đợt 3/3 của dự án V-ACT HUB. Được hoàn thành và kiểm định toàn diện sau khi 4 luồng song song qua `/swarm` (Luồng A, Luồng B, Luồng C, Luồng D) hoàn tất 100% chỉ tiêu với 158/158 tests Vitest vượt qua và build production thành công.

---

## 1. Đã làm xong & Chưa làm (Nói thật 100%)

### Đã làm xong hoàn chỉnh:

- **Luồng A (Prompt Chatbot, Schema v1, parseAndRepair, Multipart Merge)**:
  - `src/features/import/promptBuilder.ts`: Hàm sinh prompt tiếng Việt cho Chatbot (Gemini, ChatGPT, Claude) yêu cầu xuất chunk 20-30 câu, định dạng `part:{index, total}`, CHỈ trả JSON thuần, escape `\\` cho LaTeX, tự giải / trích xuất / none, có sẵn lựa chọn Tiếng Anh, Tiếng Việt V-ACT, và sẵn sàng mở rộng Toán, Lí, Hóa. Kèm ví dụ mẫu JSON Schema v1 chuẩn xác.
  - `src/features/import/schema.ts`: Định nghĩa và validator TypeScript thuần cho Schema v1: kiểm tra 4 đáp án không rỗng, `correctIndex` 0-3 hoặc null, `passageId` tồn tại hợp lệ, `no` không trùng lặp, `passages` không bị rỗng, chuẩn hóa toạ độ bbox [x0, y0, x1, y1].
  - `src/features/import/parseAndRepair.ts`: Hàm thuần khiết `parseAndRepair` phân tích và tự sửa:
    + Loại bỏ rào chắn markdown ```json ... ``` và mọi lời dẫn thừa trước/sau JSON.
    + Sửa dấu `\` đơn trong chuỗi LaTeX (`\frac`, `\ce`, `\alpha`...) thành `\\` mà không làm hỏng các ký tự escape hợp lệ (`\n`, `\"`, `\\`, `\uXXXX`).
    + Xử lý ký tự xuống dòng thô (raw unescaped newlines) trong chuỗi JSON, dấu phẩy thừa cuối mảng/đối tượng (trailing commas), nháy cong kiểu Word/iOS (“ ” ‘ ’).
    + Tự động khôi phục chuỗi JSON bị chatbot cắt cụt giữa chừng (truncated JSON): tự đóng ngoặc, bỏ câu cuối chưa trọn vẹn, ghi nhật ký cảnh báo "đã nhận đến câu số N, hãy yêu cầu chatbot 'tiếp từ câu N+1'".
    + Trả về cấu trúc `{ data, repairs, errors, warnings }` minh bạch hiển thị danh sách các chỗ đã tự sửa cho người dùng (không sửa âm thầm).
  - `src/features/import/multipart.ts`: Xử lý ghép nối nhiều phần (Phần 1/3, 2/3, 3/3): theo dõi các phần đã nhận qua `MultipartTracker`, phát hiện phần thiếu/trùng, tự động đánh số `no` nối tiếp liền mạch, gộp `passages` trùng lặp, cảnh báo khi các phần lệch môn/chuyên đề/bộ đề.
  - `src/test/importParser.test.ts`: Bộ 31 unit tests chuyên biệt bao phủ 100% các tình huống sửa lỗi JSON, escape LaTeX, văn bản tiếng Việt dài có dấu, cắt cụt JSON và ghép multipart.

- **Luồng B (Màn xem trước & sửa, Nhập đáp án nhanh, Cắt hình, Nối Lộ trình)**:
  - `src/features/import/quickAnswerInput.ts`:
    + Phân tích chuỗi đáp án nhanh đa định dạng: `1A 2C 3B`, `1-A, 2-C`, `1.A`, mỗi dòng 1 câu, hoặc chuỗi `ABCD...` viết liền nhau.
    + Áp dụng đáp án người dùng: Đặt `correctIndex`, `answerSource: 'user'`, `verified: true` (ưu tiên hơn AI).
    + Tạo bảng đối chiếu sai khác (`diffs`) giữa đáp án AI và đáp án người dùng (`{ questionNo, aiAnswer, userAnswer, isConflict }`), cảnh báo số câu thừa/thiếu.
  - `src/features/import/figureCrop.ts` & `FigureCropperModal.tsx`:
    + Hỗ trợ tải file PDF gốc (đọc và render trang cục bộ lên canvas bằng PDF.js) hoặc tải ảnh trực tiếp (PNG/JPG/WEBP).
    + Khung kéo cắt ảnh trực quan (drag & resize 4 góc/cạnh và di chuyển khung), tính toán tọa độ bbox chuẩn hóa 0-1 ([x0, y0, x1, y1]).
    + Lưu ảnh PNG vào Supabase Storage bucket `figures` (nếu đăng nhập) hoặc IndexedDB dưới dạng data URL ở chế độ Local.
  - `src/pages/ImportPage.tsx`:
    + Giao diện 3 tab trực quan: Tab 1 (Tạo Prompt) -> Tab 2 (Nhập & Sửa JSON có bảng log repairs) -> Tab 3 (Xem trước & Chỉnh sửa).
    + Màn xem trước 2 cột: Cột trái liệt kê danh sách câu với chip STT, chip category, badge trạng thái ("AI tạo", "Đã xác minh", "Chưa có đáp án"), nút xóa/thêm/sắp xếp; cột phải là form sửa chi tiết (đề, 4 phương án, đáp án đúng, category, formula, explanation, passage).
    + Render công thức và văn bản trực tiếp bằng `<RichText>` (bắt lỗi an toàn, hiển thị raw kèm cảnh báo nếu KaTeX lỗi).
    + Modal "Nhập đáp án nhanh" và Modal "Cắt hình / Tải ảnh" tích hợp mượt mà.
    + Thanh trạng thái (tổng câu, câu thiếu đáp án, câu AI tạo, cảnh báo) và selector chọn nơi lưu (tạo mới hoặc chọn có sẵn).
    + Nút "Lưu vào bài học" thực hiện lưu nguyên tử qua `repository.importV1Package` và tự động chuyển về Lộ trình.
  - `src/pages/RoadmapPage.tsx`: Các ô "đám mây" bài mới đã được nối thật vào `/import?subjectId=...&topicId=...&subjectName=...&topicName=...`, tự động điền sẵn thông tin khi mở trang Import.

- **Luồng C (Quản lý Cây bài học, Kéo thả & Nút lên/xuống, Sao lưu & Khôi phục JSON đầy đủ)**:
  - `src/lib/backup/backupService.ts`:
    + Xuất file sao lưu đầy đủ chuẩn tên `vact-backup-YYYYMMDD-HHmm.json` gồm: môn, chuyên đề, bài học, đoạn văn, câu hỏi (kèm `answer_source`, `verified`), hình ảnh (nhúng base64/data URL), `set_progress` (sao, % tốt nhất, resume_state), `question_attempts` (lịch sử ôn câu sai), `user_stats` (XP, streak, lượt đóng băng tuần & dự trữ, cờ mở rương chuyên đề), `settings` (mục tiêu BK, daily goal, âm thanh, theme).
    + TUYỆT ĐỐI KHÔNG BAO GỒM khóa API Gemini trong file sao lưu!
    + Hàm `inspectBackupFile`: Tự động nhận diện định dạng (backup đầy đủ v1, backup app cũ `V-ACT_app.html` có mảng `library = [...]`, hoặc gói v1_package) và thống kê trước số lượng bản ghi.
    + Hàm `restoreFullBackup`: Hỗ trợ 2 chế độ:
      * `replace`: Xóa sạch và thay thế toàn bộ dữ liệu (bảo lưu API key cá nhân của người dùng).
      * `merge`: Gộp dữ liệu thông minh, giữ số sao cao nhất (`Math.max(curStars, backupStars)`), giữ % điểm cao hơn, XP/streak cao hơn, không ghi đè mất mát.
    + Tự động chuyển đổi file backup app cũ (`library = [...]`) sang kiến trúc chuẩn hóa subject/topic/set/questions.
  - `src/pages/ManagePage.tsx`:
    + Cây quản lý phân cấp: Môn học -> Chuyên đề -> Bài học với đầy đủ huy hiệu số lượng câu và số sao.
    + Hỗ trợ kéo thả đổi thứ tự VÀ có nút Di chuyển Lên / Di chuyển Xuống (bắt buộc, sử dụng hoàn hảo trên điện thoại/cảm ứng).
    + Đổi tên môn, chuyên đề, bài học; chuyển bài học sang chuyên đề khác.
    + Xóa môn/chuyên đề/bài học có Modal xác nhận cảnh báo rõ ràng số lượng câu hỏi và tiến độ sẽ mất.
    + Thay đổi thứ tự bài học lập tức phản ánh đồng bộ lên Lộ trình (`RoadmapPage`).
    + Nút "Sửa câu hỏi" trên từng bài: Mở modal chỉnh sửa chi tiết câu hỏi của bài đó.
    + Tích hợp 2 nút "Sao lưu JSON" và "Khôi phục dữ liệu" kèm modal xem trước số liệu và tùy chọn chế độ Thay thế / Gộp.
  - `src/test/backup.test.ts`: 7 tests kiểm tra roundtrip 100%, test merge mode `Math.max` stars, test legacy library import, test loại bỏ hoàn toàn khóa Gemini API.

- **Luồng D (Cài đặt, PWA Shortcut, Gemini API ẩn, E2E Test & Kiểm định)**:
  - `src/features/import/geminiProvider.ts`: Module gọi Gemini API an toàn, đặt sau biến môi trường `import.meta.env.VITE_ENABLE_GEMINI === 'true'` (mặc định tắt, không xuất hiện trên UI). Khóa API và model name lưu DUY NHẤT trong `localStorage` trên máy người dùng, chia nhỏ cụm trang PDF scan và kết quả chạy vào đúng `parseAndRepair`.
  - `src/pages/SettingsPage.tsx`:
    + Giao diện Theme (Sáng/Tối/Thiết bị).
    + Âm thanh Web Audio bật/tắt kèm nút thử âm "ding".
    + Mục tiêu ngày (20 / 50 / 100 XP) và Mục tiêu Bách Khoa 2026 (chọn 29 ngành đại trà + 7 ngành PFIEV).
    + Nạp dữ liệu mẫu ban đầu (130 câu Chuyên đề 15).
    + Sao lưu & Khôi phục JSON đầy đủ tích hợp `backupService.ts`.
    + PWA: "Cài đặt App / Tạo Shortcut" với nút "Cài đặt ngay" (`beforeinstallprompt`) và hướng dẫn chi tiết từng bước cho Desktop, Android và iOS.
    + Mục Gemini API: CHỈ hiển thị khi `VITE_ENABLE_GEMINI=true`.
  - `src/test/phase3.test.ts`: 6 tests tích hợp end-to-end kiểm tra toàn bộ luồng nghiệp vụ Đợt 3.
  - Tổng số tests toàn dự án: **158/158 tests Vitest (13 test suites) pass 100%**.
  - `npm run build` hoàn thành không có bất kỳ lỗi TypeScript hay Vite bundler nào, PWA precache 79 assets.

---

### Chưa làm / Hướng phát triển tương lai:
- Mở rộng sang môn Toán, Lí, Hóa với nhận diện công thức LaTeX và phản ứng hóa học `\ce{}` nâng cao trong đề thi scan.
- Tính năng AI tóm tắt lý thuyết thành bảng công thức tự động.
- Tính năng chia sẻ bộ đề cho bạn bè qua link công khai (cột `visibility` đã được thiết kế sẵn trong database).

---

## 2. Đường dẫn file mới quan trọng

Mỗi file một dòng:
- `src/features/import/promptBuilder.ts` (Trình tạo prompt tiếng Việt chuẩn cho Chatbot kèm ví dụ JSON Schema v1)
- `src/features/import/schema.ts` (Bộ validator và schema types cho dữ liệu V1 Import Package)
- `src/features/import/parseAndRepair.ts` (Bộ phân tích và tự động sửa lỗi markdown, LaTeX, unescaped newlines, JSON cắt cụt)
- `src/features/import/multipart.ts` (Trình ghép nối và theo dõi các phần multipart 1/3, 2/3...)
- `src/features/import/quickAnswerInput.ts` (Trình phân tích đáp án nhanh đa định dạng, ghi đè và đối chiếu diffs)
- `src/features/import/figureCrop.ts` (Tiện ích render PDF canvas và tính toán tọa độ cắt hình bbox)
- `src/features/import/FigureCropperModal.tsx` (Modal kéo thả cắt ảnh từ PDF hoặc tải ảnh câu hỏi)
- `src/features/import/geminiProvider.ts` (Module gọi API Gemini ẩn sau cờ tính năng VITE_ENABLE_GEMINI)
- `src/features/backup/backupService.ts` (Dịch vụ xuất/nhập sao lưu JSON đầy đủ và khôi phục thông minh)
- `src/lib/backup/backupService.ts` (Core engine sao lưu, gộp sao cao hơn, import app cũ)
- `src/pages/ImportPage.tsx` (Giao diện 3 tab Import: Tạo prompt, Nhập JSON, Xem trước & Chỉnh sửa)
- `src/pages/ManagePage.tsx` (Giao diện quản lý cây bài học, kéo thả & nút Lên/Xuống, sửa bài, sao lưu/khôi phục)
- `src/pages/SettingsPage.tsx` (Giao diện cài đặt hệ thống, PWA shortcut, sao lưu/khôi phục, API Gemini ẩn)
- `src/test/importParser.test.ts` (31 tests kiểm thử parser, repairs và multipart)
- `src/test/quickAnswer.test.ts` (7 tests kiểm thử bộ phân tích đáp án nhanh)
- `src/test/backup.test.ts` (7 tests kiểm thử sao lưu, khôi phục gộp, nạp file app cũ)
- `src/test/phase3.test.ts` (6 tests tích hợp end-to-end nghiệm thu Đợt 3)

---

## 3. Cách chạy dự án & Biến môi trường

### Các lệnh kiểm tra:
```bash
# Chạy toàn bộ 158 unit & integration tests
npm test

# Build production bundle và kiểm tra type TypeScript
npm run build

# Chạy server dev local
npm run dev
```

### Biến môi trường (`.env`):
```env
# Kết nối Supabase (Tùy chọn - nếu không có sẽ tự động chạy chế độ Local IndexedDB 100%)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Cờ tính năng API Gemini (Mặc định: false - tạm ẩn trên giao diện)
VITE_ENABLE_GEMINI=false
```

### Database & Migration:
- **Không phát sinh migration SQL mới**: Bảng `supabase/migrations/0001_init.sql` đã thiết kế đầy đủ 9 bảng, cột `visibility`, và Storage bucket `figures`.
- Chế độ Local (IndexedDB) lưu trữ đầy đủ toàn bộ môn, chuyên đề, bài học, câu hỏi, tiến độ, sao, chuỗi streak, và ảnh dưới dạng data URL/blob.

---

## 4. Hướng dẫn Triển khai Netlify / Vercel từng bước

### Triển khai lên Netlify:
1. Đẩy mã nguồn lên kho Git (GitHub / GitLab).
2. Đăng nhập Netlify -> **Add new site** -> **Import an existing project**.
3. Cấu hình Build:
   - **Base directory**: `.`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Biến môi trường (Environment Variables):
   - Đặt `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (nếu dùng Supabase).
   - Đặt `VITE_ENABLE_GEMINI=false`.
5. Đảm bảo file `public/_redirects` có dòng:
   ```text
   /*    /index.html   200
   ```
   (đã có sẵn trong dự án để hỗ trợ React Router SPA).

### Triển khai lên Vercel:
1. Đăng nhập Vercel -> **Add New...** -> **Project** -> Chọn kho Git VACTLINGO.
2. Framework Preset: **Vite**.
3. Build and Output Settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Cấu hình file `vercel.json` định tuyến SPA (nếu cần):
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

### Cách kiểm tra sau khi Deploy:
1. Mở trang chủ -> xác nhận hiển thị màn Chào mừng hoặc Lộ trình Candy Crush mượt mà.
2. Vào **Cài đặt** -> Bấm **Nạp dữ liệu mẫu** -> xác nhận nạp 130 câu Chuyên đề 15 thành công.
3. Vào **Lộ trình** -> Bấm vào bài 1 -> Làm bài ở chế độ Luyện tập -> Nộp bài -> Nhận sao và pháo giấy.
4. Bấm vào ô **Đám mây** ở cuối Lộ trình -> Chuyển sang **Import** tự điền sẵn tên môn/chuyên đề -> Test dán JSON -> Lưu thành công.
5. Vào **Quản lý** -> Thử bấm nút **Lên / Xuống** trên danh sách bài -> Kiểm tra thứ tự ngoài Lộ trình cập nhật ngay.
6. Thử **Sao lưu JSON** -> Tải file về máy -> Mở file kiểm tra không có khóa API -> Thử **Khôi phục**.
7. Kiểm tra tính năng PWA: Mở trên điện thoại hoặc Chrome Desktop, kiểm tra nút Cài đặt App hoặc banner Add to Home Screen.

---

## 5. Danh sách Lỗi đã biết & Việc người dùng phải tự làm

1. **Âm thanh Web Audio trên trình duyệt di động**:
   - Theo chính sách bảo mật autoplay của iOS Safari và Chrome Android, âm thanh chỉ phát sau tương tác chạm/click đầu tiên của người dùng trên trang.
2. **File PDF Scan có chất lượng ảnh quá mờ**:
   - Khi chatbot nhận dạng văn bản từ file PDF scan độ phân giải thấp, chatbot có thể giải nhầm đáp án. Học sinh cần dùng tính năng **Nhập đáp án nhanh** hoặc bấm **"Đáp án sai?"** trong màn làm bài để chuẩn hóa đáp án.
3. **Cài đặt Storage Bucket `figures` trên Supabase (nếu dùng Cloud)**:
   - Nếu kết nối Supabase Cloud và muốn lưu trữ hình ảnh trên Storage, người dùng cần tạo bucket tên `figures` trong Supabase Dashboard và đặt policy Public Read / Authenticated Upload.

---

## 6. Ý tưởng bước tiếp theo theo thứ tự ưu tiên

1. **Mở rộng sang môn Toán V-ACT** (Ưu tiên 1):
   - Tận dụng hạ tầng KaTeX + mhchem đã tích hợp sẵn để xây dựng bộ câu hỏi phần Tư duy Định lượng (Toán học).
2. **AI Tóm tắt Lý thuyết thành Bảng Công thức** (Ưu tiên 2):
   - Tính năng tự động đọc tài liệu lý thuyết và chiết xuất ra bảng tóm tắt công thức cho trang `/formula`.
3. **Chia sẻ Bộ đề qua liên kết công khai (Public Sharing)** (Ưu tiên 3):
   - Kích hoạt giao diện đổi chế độ `visibility` từ `private` sang `public`/`unlisted` (cột đã có sẵn trong bảng `sets`) để học sinh có thể chia sẻ bộ đề cho nhau bằng mã QR hoặc URL.

---

## 7. CÂU LỆNH MỞ ĐẦU CHO CUỘC TRÒ CHUYỆN BẢO TRÌ SAU NÀY

Copy và dán nguyên văn đoạn dưới đây vào Antigravity khi bắt đầu bất kỳ phiên làm việc hoặc bảo trì dự án nào sau này:

```text
Đọc docs/PROJECT_CONTEXT.md, docs/HANDOFF.md, docs/DECISIONS.md rồi mới làm.
```

---

## Lịch sử Đợt 2: Học và Chơi

- Luồng C (Logic trò chơi - Pure Functions): Hoàn thành tính sao 50/70/90%, XP (+10/+20/+10), Streak giờ Việt Nam UTC+7, 3 lượt đóng băng tuần làm mới thứ Hai + lượt dự trữ vĩnh viễn từ rương chuyên đề (+50 XP, +1 freeze).
- Luồng A (Lộ trình, Chào mừng, Điểm chuẩn BK 2026): Bảng điểm chuẩn Bách Khoa 2026 chính thức (29 ngành đại trà, 7 ngành PFIEV), màn Chào mừng, Lộ trình Candy Crush SVG hình sin không khóa bài.
- Luồng B (Làm bài và Hoàn thành): PracticePage 2 chế độ (Luyện tập / Thi thử), 4 phương án Duolingo 3D, phím tắt A-D/1-4/arrows/F, hỗ trợ đoạn văn đọc hiểu & ảnh, nhãn AI & sửa đáp án tức thì, tự lưu resume_state, màn hoàn thành có Confetti và xuất phiếu kết quả TXT.
- Luồng D (Ôn tập, Thống kê, Bảng công thức, Âm thanh): Ôn câu sai (rút khỏi danh sách khi đúng 2 lần liên tiếp), Thống kê Category (điểm mạnh >=80%, điểm yếu <60%), Nhắc ôn bài Spaced Repetition (1/3/7/14 ngày), Sổ tay công thức KaTeX/mhchem, âm thanh Web Audio API procedural.

---

## Lịch sử Đợt 1: Nền tảng & Hạ tầng

- Chuẩn bị đầu vào & Docs: Chép ảnh mẫu `docs/ui/`, lưu `legacy/V-ACT_app.html`, khởi tạo `PROJECT_CONTEXT.md`, `DECISIONS.md`.
- Luồng A (Giao diện & Design System): Trích xuất tokens màu 3D Duolingo, bộ UI component nguyên tử (Button, Card, Chip, Modal, StarRating...), khung AppShell 3 cột responsive, theme Sáng/Tối chống nháy.
- Luồng B (Dữ liệu & Supabase): Migration 9 bảng SQL, repository pattern kép (`LocalRepository` IndexedDB và `SupabaseRepository` online + syncQueue), AuthModal.
- Luồng C (Migration dữ liệu cũ): Trích xuất và làm sạch 130 câu Tiếng Anh Chuyên đề 15 Câu điều kiện, lưu `data/seed/legacy-library.json`, nút nạp seed mẫu trong Cài đặt.
- Luồng D (PWA, KaTeX & Hạ tầng): KaTeX + mhchem đóng gói 100% local, component `<RichText>` chống crash, PWA service worker precache 79 assets, cấu hình Vitest và lint.
