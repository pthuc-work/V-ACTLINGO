# BÀN GIAO ĐỢT 4: NÂNG CẤP TOÀN DIỆN TRẢI NGHIỆM, RESPONSIVE, IMPORT, CÔNG THỨC & TIẾN ĐỘ (V-ACT HUB)

Tài liệu này là nguồn sự thật bàn giao kỹ thuật toàn diện khi kết thúc Đợt 4 của dự án V-ACT HUB. Được hoàn thành và kiểm định toàn diện sau khi 4 luồng song song qua `/swarm` (Luồng A, Luồng B, Luồng C, Luồng D) hoàn tất 100% chỉ tiêu với **216/216 tests Vitest (17 test files) vượt qua 100%** và build production thành công sạch sẽ.

---

## 1. Đã làm xong & Chưa làm (Nói thật 100%)

### Đã làm xong hoàn chỉnh:

- **Luồng A: Khung Layout Toàn App & Responsive (Mục 1 & 5)**:
  - `src/components/layout/AppShell.tsx`:
    + Tràn 100% chiều rộng cửa sổ, chiều cao đúng 100dvh, loại bỏ hoàn toàn `max-width` và `margin:auto` ở root wrapper. Chỉ có vùng nội dung cuộn độc lập.
    + Bố cục CSS Grid 3 vùng: sidebar trái (272px) | nội dung trung tâm (`minmax(0, 1fr)`) | panel phải (336px). Đường phân cách mảnh tinh tế, không viền hộp nhốt khung.
    + Panel phải CHỈ xuất hiện ở các route học tập: Lộ trình (`/`), Làm bài (`/practice`), Kho câu sai (`/review`), Thống kê (`/stats`). Ẩn hoàn toàn ở `/import`, `/formulas`, `/manage`, `/settings`, `/welcome`.
    + Topbar hiển thị chip nhỏ gồm Streak, XP, Mục tiêu BK kèm mở Right Drawer khi panel bị ẩn hoặc màn hình hẹp.
    + Đáp ứng chuẩn 4 Breakpoints:
      * Desktop rộng (≥1440px): Sidebar đầy đủ + nội dung + panel phải (khi route hợp lệ).
      * Desktop nhỏ (1100-1439px): Sidebar đầy đủ, panel phải thành drawer mở từ topbar; nội dung mở rộng.
      * Tablet (768-1099px): Sidebar thu nhỏ thành thanh icon 72px có tooltip và overlay mở rộng; panel phải là drawer.
      * Mobile (<768px): Ẩn sidebar, bottom navigation 5 mục chính + nút "Thêm" mở menu phụ, panel phải là drawer; vùng chạm chuẩn ≥44px.
  - `src/pages/RoadmapPage.tsx` & `src/pages/WelcomePage.tsx`:
    + Banner chuyên đề Lộ trình tự co giãn mở rộng theo vùng nội dung, lộ trình SVG sóng sin căn giữa.
    + WelcomePage bố cục 2 cột khi màn hình rộng (cột trái: lời chào + mục tiêu BK; cột phải: thao tác nhanh + tiến độ), không bị co cụm giữa màn hình.
  - `src/test/layoutResponsive.test.ts`: 26 tests tự động kiểm thử 10 độ rộng màn hình (360, 480, 768, 1024, 1100, 1366, 1440, 1536, 1920, 2560px), quy tắc hiển thị/ẩn panel theo route, kích thước chạm và không tràn màn hình.

- **Luồng B: Cải Tiến Màn Import (Mục 2 & 5)**:
  - `src/pages/ImportPage.tsx`:
    + Mở rộng toàn trang full-width, không nhốt khung hẹp.
    + Hỗ trợ kéo thả hoặc chọn file Excel (`.xlsx`), CSV, TXT, JSON trực tiếp hoặc paste nội dung.
    + Màn xem trước dạng bảng tương tác (Editable Table Preview) cho phép chỉnh sửa trực tiếp nội dung đề, 4 đáp án, đáp án đúng, category, formula.
    + Modal ánh xạ cột (Column Mapping Modal) cho phép tùy biến map cột khi file Excel có tiêu đề khác chuẩn.
    + Bộ huy hiệu xác thực: Hợp lệ (xanh), Cảnh báo (vàng), Lỗi (đỏ), hiển thị lý do lỗi chi tiết (thiếu đáp án đúng, trùng lặp đáp án, thiếu đề bài...).
    + Nút Commit hàng loạt (Batch Commit) lưu nguyên tử toàn bộ vào Lesson Repository kèm thanh tiến trình trực quan và tự động điều hướng về Lộ trình.
  - `src/test/importUI.test.ts`: 11 tests kiểm thử kéo thả file, phân tích Excel/CSV, chỉnh sửa bảng xem trước, ánh xạ cột và lưu bài học.

- **Luồng C: Đại Tu Sổ Tay Công Thức & Khôi Phục (Mục 3 & 5)**:
  - `src/data/types.ts` & `src/data/localRepository.ts` & `src/data/supabaseRepository.ts`:
    + Mở rộng cấu trúc `FormulaGroup` và `FormulaItem` phân cấp theo `topicId`, `title`, `order`, `items` (hỗ trợ hiển thị LaTeX KaTeX).
  - `src/lib/formulaMigration.ts`:
    + Thuật toán tự động quét câu hỏi cũ có `formula`, bóc tách tag và gom nhóm kiến thức: "Câu điều kiện", "Đảo ngữ câu điều kiện", "Khác" mà không mất mát bất kỳ công thức nào.
    + Chạy nhiều lần an toàn, không sinh trùng lặp (idempotent deduplication).
  - `src/pages/FormulaPage.tsx`:
    + Hỗ trợ lọc theo môn học và chuyên đề.
    + Hai chế độ hiển thị: Dạng bảng chi tiết (Table View) và Dạng thẻ trực quan (Card View).
    + Tìm kiếm công thức theo tên hoặc cấu trúc, thanh TOC jump chips cuộn mượt đến từng nhóm công thức.
    + Nút "Sửa nhanh" và "Thêm công thức mới" ngay trên giao diện.
  - `src/components/formula/FormulaModal.tsx`:
    + Modal xem nhanh công thức tích hợp trực tiếp trong phòng thi (`PracticePage`) và trên Lộ trình (`RoadmapPage`).
    + Giữ nguyên vẹn 100% trạng thái làm bài (bộ đếm timer chạy liên tục, câu hỏi đang làm, đáp án đã chọn không bị reset).
  - `src/test/formula.test.ts`: 9 tests kiểm thử migrate công thức, khử trùng lặp, mở/đóng modal giữ state và responsive view.

- **Luồng D: Chuyển Môn, Thống Nhất Tiến Độ, Sao Lưu v2 & Tổng Hợp (Mục 4, 5, 6)**:
  - `src/store/curriculumStore.ts`:
    + Là NGUỒN DUY NHẤT lưu `{ selectedSubjectId, selectedTopicId, lastTopicBySubject: Record<string, string> }` (persist vào localStorage `vact_active_curriculum`).
    + Hành vi chuyển môn: Khi chọn môn mới, tự động khôi phục `lastTopicBySubject[subjectId]`. Nếu môn này chưa từng xem thì tự chọn chuyên đề đầu tiên; nếu môn chưa có chuyên đề nào thì đặt `selectedTopicId = null`. Dropdown chuyên đề CHỈ hiển thị chuyên đề của môn đang chọn.
  - `src/components/layout/AppShell.tsx`:
    + Selector Môn học và Chuyên đề đồng bộ 100% với `curriculumStore`. Dropdown chuyên đề bị vô hiệu hóa kèm nhãn "Chưa có chuyên đề" khi môn trống.
    + Nút "TIẾP TỤC LÀM BÀI" tự động trỏ tới bài học tiếp theo của đúng môn/chuyên đề đang chọn, tự động disabled khi chuyên đề trống.
  - `src/pages/RoadmapPage.tsx`:
    + Banner Lộ trình lấy tên chuyên đề từ `currentTopic.name`. Mô tả lấy từ `currentTopic.description` (nếu không có thì để trống/ẩn, loại bỏ hoàn toàn chuỗi text tiếng Anh hardcode 'mệnh đề If...').
    + Xử lý Môn Trống: Khi môn chưa có chuyên đề/bài học, Banner và Lộ trình hiển thị Empty State chuẩn: tên môn, câu "Chưa có bài nào cho môn này" và nút "Import tài liệu" dẫn tới `/import?subjectId=...&subjectName=...`. Nút "Tiếp tục học ngay" bị vô hiệu hóa kèm tooltip gợi ý import.
    + Nút "Bảng công thức" và "Tiếp tục làm bài" luôn thao tác trên đúng môn/chuyên đề đang chọn.
  - `src/lib/progress.ts`:
    + Hàm dùng chung `calculateTopicProgress(sets, progresses)`:
      * Tiến độ bài: `completedSets / totalSets` (ví dụ: '1/3 bài (33%)').
      * Tiến độ câu: `attemptedQuestions / totalQuestions` (ví dụ: '30/90 câu').
      * Độ chính xác trung bình: Tính trên số câu ĐÃ LÀM (`totalScore / attemptedQuestions`). Nếu chưa làm câu nào (`attemptedQuestions === 0`), trả về `'—'` (em-dash) thay vì 0% hay 100%.
    + Áp dụng thống nhất hàm này vào Panel phải (`AppShell.tsx`), Lộ trình (`RoadmapPage.tsx`) và Thống kê (`StatsPage.tsx`).
  - `src/lib/backup/backupService.ts`:
    + Nâng cấp `version: 2`, bổ sung mảng `formulaGroups` và bản đồ `lastTopicBySubject` vào file backup `FullBackupData`.
    + Khôi phục tương thích ngược 100%: File backup v1 cũ chưa có các trường này thì tự động chạy migrate công thức và tự chọn topic đầu tiên cho môn thiếu.
    + Chu trình kiểm tra: Backup -> Xóa sạch -> Khôi phục giữ nguyên vẹn 100% dữ liệu công thức và `lastTopicBySubject`.
  - `src/test/curriculumProgress.test.ts`: 12 tests kiểm thử trọn vẹn đổi môn A → B → A, môn trống không hiện bài môn khác, banner khớp topic, tính toán tiến độ thống nhất và backup roundtrip v2.
  - Tổng số tests toàn hệ thống: **216/216 tests Vitest (17 test files) pass 100%**.
  - `npm run build` hoàn thành không lỗi (TypeScript compile + Vite build thành công sạch sẽ).

---

### Chưa làm / Hướng phát triển tương lai:

- Mở rộng thêm ngân hàng đề mẫu môn Toán, Lí, Hóa, Sinh học với công thức LaTeX và phản ứng hóa học `\ce{}` nâng cao.
- Tính năng AI gợi ý lộ trình học tập cá nhân hóa dựa trên dạng bài yếu (&lt;60%) trong trang Thống kê.
- Tính năng chia sẻ bộ đề qua liên kết công khai (Public link / QR code) theo cột `visibility`.

---

## 2. Đường dẫn file mới & file sửa đổi quan trọng

Mỗi file một dòng:
- `src/store/curriculumStore.ts` (Nguồn chân lý duy nhất lưu active curriculum và lastTopicBySubject)
- `src/lib/progress.ts` (Hàm pure calculateTopicProgress chuẩn hóa tiến độ bài, tiến độ câu và độ chính xác '—')
- `src/lib/formulaMigration.ts` (Engine tự động migrate công thức cũ sang FormulaGroup không trùng lặp)
- `src/lib/backup/backupService.ts` (Engine sao lưu & khôi phục v2, tương thích ngược v1, bảo toàn 100% công thức)
- `src/features/backup/backupService.ts` (Re-export module backupService phục vụ toàn ứng dụng)
- `src/components/layout/AppShell.tsx` (Khung layout 100dvh, 4 breakpoints, grid 3 vùng, panel drawer & selector chuẩn)
- `src/pages/RoadmapPage.tsx` (Lộ trình responsive, banner chuẩn không hardcode, empty state môn trống & formula modal)
- `src/pages/ImportPage.tsx` (Màn nhập liệu full-width, kéo thả Excel/CSV, xem trước bảng sửa trực tiếp, batch commit)
- `src/pages/FormulaPage.tsx` (Sổ tay công thức toàn trang, table/card view, tìm kiếm, TOC jump chips)
- `src/pages/StatsPage.tsx` (Thống kê dạng bài, tích hợp calculateTopicProgress, độ chính xác '—' khi 0 câu)
- `src/components/formula/FormulaModal.tsx` (Modal tra cứu nhanh công thức không mất trạng thái làm bài)
- `src/components/formula/FormulaGroupCard.tsx` (Card hiển thị nhóm công thức render LaTeX KaTeX)
- `src/test/curriculumProgress.test.ts` (12 tests kiểm thử chuyển môn, thống nhất tiến độ & backup v2)
- `src/test/layoutResponsive.test.ts` (26 tests kiểm thử responsive 10 độ rộng màn hình)
- `src/test/importUI.test.ts` (11 tests kiểm thử giao diện nhập liệu Excel & batch commit)
- `src/test/formula.test.ts` (9 tests kiểm thử sổ tay công thức, migrate & modal)
- `src/test/backup.test.ts` (7 tests kiểm thử backup roundtrip và backward compatibility)

---

## 3. Cách chạy dự án & Biến môi trường

### Các lệnh kiểm tra:
```bash
# Chạy toàn bộ 216 unit & integration tests
npm test

# Build production bundle và kiểm tra TypeScript compile
npm run build

# Chạy server phát triển cục bộ
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
- Cơ chế lưu trữ cục bộ (Local IndexedDB qua `localRepository.ts`) đã hỗ trợ đầy đủ 10 bảng dữ liệu bao gồm cả `formulaGroups` và `lastTopicBySubject`.
- Không bắt buộc phải có tài khoản Supabase Cloud để sử dụng toàn bộ tính năng của app.

---

## 4. Hướng dẫn Triển khai Netlify / Vercel từng bước & Cách kiểm tra sau Deploy

### Triển khai lên Netlify:
1. Đẩy mã nguồn lên kho Git (GitHub / GitLab).
2. Đăng nhập Netlify -> **Add new site** -> **Import an existing project**.
3. Cấu hình Build:
   - **Base directory**: `.`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Biến môi trường (Environment Variables):
   - Đặt `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (nếu dùng Supabase Cloud).
   - Đặt `VITE_ENABLE_GEMINI=false`.
5. Đảm bảo file `public/_redirects` có dòng:
   ```text
   /*    /index.html   200
   ```
   (đã có sẵn trong dự án để hỗ trợ định tuyến React Router SPA).

### Triển khai lên Vercel:
1. Đăng nhập Vercel -> **Add New...** -> **Project** -> Chọn kho Git VACTLINGO.
2. Framework Preset: **Vite**.
3. Build Settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Cấu hình file `vercel.json` định tuyến SPA (nếu cần):
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

### Cách kiểm tra sau khi Deploy:
1. **Kiểm tra Layout & Responsive**:
   - Mở app trên desktop rộng (≥1440px) -> sidebar trái, nội dung trung tâm và panel phải hiển thị song song.
   - Thu hẹp cửa sổ (dưới 1100px) -> panel phải tự chuyển thành drawer, có chip trên topbar để mở.
   - Mở trên điện thoại (<768px) -> sidebar biến mất, thanh bottom navigation 5 nút xuất hiện ở đáy màn hình.
2. **Kiểm tra Chuyển Môn & Khôi phục Topic**:
   - Ở panel phải, chuyển từ Tiếng Anh sang môn khác rồi chuyển lại Tiếng Anh -> chuyên đề đang học được khôi phục nguyên vẹn.
   - Chọn một môn chưa có bài (ví dụ tạo mới) -> Banner và Lộ trình hiển thị Empty State chuẩn với nút "Import tài liệu".
3. **Kiểm tra Bảng Công Thức**:
   - Vào `/formulas` -> kiểm tra các nhóm công thức hiển thị LaTeX chuẩn nét KaTeX.
   - Vào `/practice` -> bấm nút "Bảng công thức" trên thanh điều khiển -> modal mở ra tra cứu nhanh, đóng lại timer và bài làm tiếp tục bình thường không bị reset.
4. **Kiểm tra Nhập liệu Excel**:
   - Vào `/import` -> kéo thả file Excel đề thi -> bảng xem trước hiển thị nội dung trực tiếp, bấm "Lưu vào bài học" thành công.
5. **Kiểm tra Sao Lưu & Khôi Phục**:
   - Vào Cài đặt -> Bấm "Sao lưu JSON" -> tải file `vact-backup-...json` về máy.
   - Thử xóa sạch dữ liệu -> Khôi phục lại từ file vừa tải -> toàn bộ môn, chuyên đề, bài học, công thức và tiến độ khôi phục 100%.

---

## 5. Danh sách Lỗi đã biết & Việc người dùng phải tự làm

1. **Âm thanh Web Audio trên trình duyệt di động**:
   - Trình duyệt di động (Safari iOS, Chrome Android) yêu cầu người dùng phải có 1 lần chạm (tap) đầu tiên trên màn hình để cấp quyền phát âm thanh Web Audio tự động.
2. **Kích thước file ảnh / đề thi đính kèm lớn**:
   - Khi nhập đề thi có chứa nhiều hình ảnh dung lượng lớn ở chế độ Local (IndexedDB), trình duyệt có thể bị giới hạn dung lượng quota cục bộ (~50MB - 200MB tùy thiết bị). Khuyến khích tối ưu hóa nén ảnh trước khi tải lên.
3. **File PDF scan chữ quá mờ**:
   - Khi trích xuất đề thi từ file scan độ phân giải thấp qua chatbot AI, chatbot có thể giải sai đáp án. Học sinh nên dùng tính năng **Nhập đáp án nhanh** hoặc nút **Sửa đáp án** để điều chỉnh.

---

## 6. Ý tưởng bước tiếp theo theo thứ tự ưu tiên

1. **Bổ sung Ngân hàng Đề thi Toán học V-ACT** (Ưu tiên 1):
   - Đưa bộ đề thi phần Tư duy Định lượng (Toán) vào hệ thống, ứng dụng trực tiếp trình biên dịch KaTeX và hệ thống Sổ tay Công thức mới xây dựng.
2. **Gợi ý Ôn tập Cá nhân hóa từ Dữ liệu Thống kê** (Ưu tiên 2):
   - Tự động tạo bài tập ôn luyện tập trung vào các dạng bài đang bị xếp vào nhóm "Cần cải thiện" (&lt;60%) trong trang Thống kê.
3. **Chia sẻ Bộ đề qua Mã QR và Liên kết Công khai** (Ưu tiên 3):
   - Kích hoạt tính năng xuất link chia sẻ cho bạn bè theo cờ `visibility: 'public'`.

---

## 7. CÂU LỆNH MỞ ĐẦU CHO CUỘC TRÒ CHUYỆN BẢO TRÌ SAU NÀY

Copy và dán nguyên văn đoạn dưới đây vào Antigravity khi bắt đầu bất kỳ phiên làm việc hoặc bảo trì dự án nào sau này:

```text
Đọc docs/PROJECT_CONTEXT.md, docs/HANDOFF.md, docs/DECISIONS.md rồi mới làm.
```

---

## 8. Lịch sử các đợt phát triển trước

### Lịch sử Đợt 3: Import và Quản lý
- Luồng A (Prompt Chatbot, Schema v1, parseAndRepair, Multipart Merge): Trình tạo prompt tiếng Việt chuẩn, validator Schema v1, thuật toán `parseAndRepair` tự động sửa lỗi markdown/LaTeX/JSON cắt cụt, ghép nối multipart đề dài.
- Luồng B (Màn xem trước & sửa, Nhập đáp án nhanh, Cắt hình, Nối Lộ trình): Tiện ích nhập đáp án nhanh đa định dạng, modal cắt ảnh câu hỏi từ PDF/canvas, 3 tab Import.
- Luồng C (Quản lý Cây bài học, Kéo thả & Nút lên/xuống, Sao lưu & Khôi phục JSON đầy đủ): Giao diện ManagePage cây phân cấp 3 cấp, kéo thả & nút Lên/Xuống trên di động, engine sao lưu đầy đủ `vact-backup-YYYYMMDD-HHmm.json` loại trừ API key, khôi phục thay thế và gộp thông minh.
- Luồng D (Cài đặt, PWA Shortcut, Gemini API ẩn, E2E Test & Kiểm định): Trang SettingsPage, PWA shortcut, module gọi Gemini API an toàn sau feature flag, 158 tests Vitest pass 100%.

### Lịch sử Đợt 2: Học và Chơi
- Luồng C (Logic trò chơi - Pure Functions): Hoàn thành tính sao 50/70/90%, XP (+10/+20/+10), Streak giờ Việt Nam UTC+7, 3 lượt đóng băng tuần làm mới thứ Hai + lượt dự trữ vĩnh viễn từ rương chuyên đề (+50 XP, +1 freeze).
- Luồng A (Lộ trình, Chào mừng, Điểm chuẩn BK 2026): Bảng điểm chuẩn Bách Khoa 2026 chính thức (29 ngành đại trà, 7 ngành PFIEV), màn Chào mừng, Lộ trình Candy Crush SVG hình sin không khóa bài.
- Luồng B (Làm bài và Hoàn thành): PracticePage 2 chế độ (Luyện tập / Thi thử), 4 phương án Duolingo 3D, phím tắt A-D/1-4/arrows/F, hỗ trợ đoạn văn đọc hiểu & ảnh, nhãn AI & sửa đáp án tức thì, tự lưu resume_state, màn hoàn thành có Confetti và xuất phiếu kết quả TXT.
- Luồng D (Ôn tập, Thống kê, Bảng công thức, Âm thanh): Ôn câu sai (rút khỏi danh sách khi đúng 2 lần liên tiếp), Thống kê Category (điểm mạnh >=80%, điểm yếu <60%), Nhắc ôn bài Spaced Repetition (1/3/7/14 ngày), Sổ tay công thức KaTeX/mhchem, âm thanh Web Audio API procedural.

### Lịch sử Đợt 1: Nền tảng & Hạ tầng
- Chuẩn bị đầu vào & Docs: Chép ảnh mẫu `docs/ui/`, lưu `legacy/V-ACT_app.html`, khởi tạo `PROJECT_CONTEXT.md`, `DECISIONS.md`.
- Luồng A (Giao diện & Design System): Trích xuất tokens màu 3D Duolingo, bộ UI component nguyên tử (Button, Card, Chip, Modal, StarRating...), khung AppShell 3 cột responsive, theme Sáng/Tối chống nháy.
- Luồng B (Dữ liệu & Supabase): Migration 9 bảng SQL, repository pattern kép (`LocalRepository` IndexedDB và `SupabaseRepository` online + syncQueue), AuthModal.
- Luồng C (Migration dữ liệu cũ): Trích xuất và làm sạch 130 câu Tiếng Anh Chuyên đề 15 Câu điều kiện, lưu `data/seed/legacy-library.json`, nút nạp seed mẫu trong Cài đặt.
- Luồng D (PWA, KaTeX & Hạ tầng): KaTeX + mhchem đóng gói 100% local, component `<RichText>` chống crash, PWA service worker precache 79 assets, cấu hình Vitest và lint.
