# KỶ YẾU QUYẾT ĐỊNH KỸ THUẬT (DECISIONS.md)

Tài liệu này lưu lại các quyết định kỹ thuật được đưa ra trong quá trình phát triển dự án V-ACT HUB (theo tiêu chí chọn phương án đơn giản, tin cậy nhất và bám sát bối cảnh).

---

### [DEC-001] Lựa chọn giải pháp CSS và Design System
- **Quyết định**: Sử dụng **Tailwind CSS (v3)** kết hợp cùng CSS Variables trong `src/styles/tokens.css`.
- **Lý do**:
  - Tailwind CSS cho phép phát triển nhanh, class rõ ràng, dễ bảo trì và mở rộng trong tương lai.
  - Tích hợp các design tokens (màu nền, màu card, navy đậm, vàng điểm nhấn, xanh Duolingo 3D button...) thông qua CSS variables giúp chuyển đổi sáng/tối (Dark/Light mode) mượt mà mà không bị nháy.
  - Đóng gói font Nunito local để không phụ thuộc mạng ngoại vi/CDN.

### [DEC-002] Quản lý State
- **Quyết định**: Sử dụng **Zustand**.
- **Lý do**: Cực kỳ nhẹ, API đơn giản, không boilerplate, dễ persist state vào localStorage/IndexedDB, phù hợp với kiến trúc React 18/19 hiện đại.

### [DEC-003] Cơ chế Data Access Layer (Repository Pattern)
- **Quyết định**: Tạo interface `DataRepository` với 2 implementation:
  1. `SupabaseRepository`: Sử dụng Supabase Client khi có cấu hình `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
  2. `LocalRepository`: Sử dụng IndexedDB (thư viện `idb` hoặc custom wrapper) khi chưa cấu hình Supabase hoặc khi chạy offline hoàn toàn.
- **Lý do**: Cho phép chạy dev và test ngay lập tức mà không bắt buộc có project Supabase ngay từ đầu, đồng thời hỗ trợ cache offline theo tiêu chí PWA.

### [DEC-004] KaTeX và mhchem
- **Quyết định**: Đóng gói KaTeX và mhchem extension cục bộ qua npm packages (`katex`), nạp CSS local. Component `<RichText>` bọc parse KaTeX an toàn bằng try-catch; nếu có lỗi cú pháp thì hiển thị raw text kèm icon cảnh báo để không làm crash màn hình.

### [DEC-005] Đổi tên ảnh giao diện
- **Quyết định**: Chuẩn hóa tên 10 file ảnh giao diện theo dạng `light-N-[ten].png` và `dark-N-[ten].png` (N từ 1 đến 5), loại bỏ hoàn toàn dấu tiếng Việt và ký tự đặc biệt để tương thích tối đa trên mọi hệ điều hành (Windows, Linux, macOS). Chi tiết ánh xạ được ghi trong `docs/ui/README.md`.

---

### [DEC-006] Đóng gói Logic Trò chơi thành Pure Functions (Đợt 2)
- **Quyết định**: Toàn bộ logic tính sao (`stars.ts`), kinh nghiệm (`xp.ts`), chuỗi ngày streak (`streak.ts`), lượt đóng băng (`freeze.ts`), và mở rương chuyên đề (`chest.ts`) được tách biệt thành các pure functions trong `src/lib/game/`, tách rời UI.
- **Lý do**: Đảm bảo 100% testable, dễ dàng kiểm thử các trường hợp biên thời gian (múi giờ UTC+7 Asia/Ho_Chi_Minh, đổi ngày 23:59 -> 00:01, đổi tuần vào Thứ Hai, bỏ lỡ 1/2/4 ngày).

### [DEC-007] Tổng hợp Âm thanh bằng Web Audio API
- **Quyết định**: Sử dụng Web Audio API tích hợp sẵn trong trình duyệt để phát âm thanh phản hồi (đáp án đúng, sai, hoàn thành bài, đạt mốc sao, trừ lượt đóng băng) thay vì nạp file mp3/wav tĩnh.
- **Lý do**: Zero network latency, không cần tải thêm asset âm thanh, không phụ thuộc kết nối mạng, đồng thời kiểm tra tự động cờ cài đặt âm thanh và `prefers-reduced-motion` của hệ điều hành.

### [DEC-008] Cấu trúc Mục tiêu Ngành Bách Khoa 2026
- **Quyết định**: Ngành mục tiêu được lưu dạng `{ program: 'standard' | 'pfiev', code: string, key: string }`.
- **Lý do**: Tránh xung đột mã ngành giữa 2 chương trình (mã 129 và 115 xuất hiện nhiều lần ở PFIEV với chuyên ngành khác nhau), cho phép đồng bộ mượt mà giữa BenchmarkPage, WelcomePage, và AppShell.

### [DEC-009] Cơ chế Rút khỏi Danh sách Câu sai
- **Quyết định**: Một câu hỏi sai chỉ được rút khỏi hồ sơ luyện tập câu sai (`/review`) khi người dùng trả lời đúng liên tiếp 2 lần trong các lượt ôn tập.
- **Lý do**: Đảm bảo học sinh thực sự hiểu bản chất kiến thức chứ không chỉ là chọn đúng ngẫu nhiên.

### [DEC-010] Bản đồ Lộ trình SVG Sinusoidal Candy Crush
- **Quyết định**: Vẽ đường uốn lượn nối các node bài học dạng hàm sóng sin bằng thẻ SVG mềm mại, các bài học hoàn toàn mở (không khóa), bài chưa làm mờ nhưng vẫn bấm được.
- **Lý do**: Trải nghiệm học tập tự do, thân thiện theo tinh thần của V-ACT HUB, trực quan sinh động trên cả Desktop và Mobile.

---

### [DEC-011] Phân tích và Tự phục hồi JSON Chatbot (Đợt 3)
- **Quyết định**: Xây dựng bộ tự sửa lỗi thuần túy `parseAndRepair.ts` với cơ chế bóc tách markdown code block, tự động escape dấu gạch chéo ngược LaTeX (`\frac` -> `\\frac`), chuẩn hóa ký tự xuống dòng thô trong chuỗi, bỏ dấu phẩy thừa, và thuật toán tự đóng ngoặc khi JSON bị chatbot cắt cụt giữa chừng.
- **Lý do**: Chatbot AI (Gemini, ChatGPT, Claude) thường mắc các lỗi cú pháp JSON kinh điển khi xuất nội dung có công thức toán/hóa hoặc vượt quá giới hạn token. Hệ thống tự sửa giúp người dùng không cần sửa thủ công bằng tay.

### [DEC-012] Quản lý Nhập liệu Nhiều Phần (Multipart Import)
- **Quyết định**: Theo dõi các lượt nhập liệu theo cấu trúc `part: { index, total }`, tự động gộp các đoạn văn đọc hiểu dùng chung và đánh số thứ tự câu hỏi liên tục.
- **Lý do**: Cho phép xử lý các đề thi dài (40-60 câu) vượt quá giới hạn ngữ cảnh xuất một lần của chatbot mà không làm đứt gãy bài thi.

### [DEC-013] Cơ chế Sao lưu & Khôi phục Độc lập, Bảo mật và Không ghi đè mất mát
- **Quyết định**: File sao lưu `vact-backup-YYYYMMDD-HHmm.json` đóng gói toàn bộ dữ liệu ứng dụng nhưng tuyệt đối loại trừ khóa API Gemini. Chế độ khôi phục "Gộp" bảo toàn số sao cao nhất (`Math.max(curStars, backupStars)`) và giữ điểm số tốt hơn.
- **Lý do**: Tránh rò rỉ khóa bí mật cá nhân khi người dùng chia sẻ file backup, đồng thời bảo vệ thành quả học tập khi gộp các phiên ôn luyện từ nhiều thiết bị.

### [DEC-014] Tích hợp API Gemini Ẩn sau Feature Flag
- **Quyết định**: Module `geminiProvider.ts` được cô lập và ẩn hoàn toàn trên giao diện người dùng theo mặc định (`VITE_ENABLE_GEMINI=false`). Khóa API được lưu cục bộ trong `localStorage` trên máy người dùng, không bao giờ gửi lên Supabase hay đưa vào file sao lưu.
- **Lý do**: Tuân thủ tiêu chí Đợt 1 & Đợt 3 ưu tiên trải nghiệm Chatbot không tốn chi phí API, đồng thời chuẩn bị sẵn sàng nền tảng mở rộng khi cần kích hoạt.

---

### [DEC-015] Khung Layout Toàn App & Responsive 4 Breakpoints (Đợt 4)
- **Quyết định**: Xây dựng lại `AppShell.tsx` chiếm 100% chiều rộng viewport và đúng 100dvh, loại bỏ max-width ở root wrapper. Thiết lập 4 breakpoints chuẩn hóa: desktop-wide (≥1440px), desktop-compact (1100-1439px), tablet-compact (768-1099px), mobile (<768px).
- **Lý do**: Tận dụng tối đa không gian màn hình lớn (1536px, 1920px, 2560px), đồng thời tối ưu hóa giao diện di động với bottom nav 5 mục chính và vùng chạm tối thiểu 44px. Panel phải chỉ xuất hiện ở các route học tập (`/`, `/practice`, `/review`, `/stats`) và chuyển thành drawer khi ở màn hình hẹp.

### [DEC-016] Giao diện Nhập liệu Toàn màn hình & Tách biệt Trải nghiệm (Đợt 4)
- **Quyết định**: Mở rộng toàn trang cho `ImportPage.tsx`, bổ sung hỗ trợ kéo thả file Excel (.xlsx), CSV, TXT, JSON, xem trước bảng dữ liệu có thể sửa trực tiếp (Editable Table), modal ánh xạ cột linh hoạt và commit hàng loạt có thanh tiến trình.
- **Lý do**: Đem lại trải nghiệm nhập liệu chuyên nghiệp, dễ kiểm tra đối chiếu đề thi thực tế trước khi lưu vào ngân hàng bài học.

### [DEC-017] Hệ thống Sổ tay Công thức Chuyên đề & Migration Tự động (Đợt 4)
- **Quyết định**: Chuẩn hóa dữ liệu công thức thành `FormulaGroup` gồm `topicId`, `title`, `order`, `items` (hỗ trợ KaTeX LaTeX). Cung cấp chế độ xem kép (Table view và Card view), TOC jump chips, và modal xem nhanh công thức (`FormulaModal`) không làm gián đoạn trạng thái làm bài (timer, câu hỏi, phương án đã chọn). Tự động migrate công thức từ trường `formula` của câu hỏi cũ sang nhóm công thức mới mà không gây trùng lặp.
- **Lý do**: Giúp học sinh tra cứu công thức nhanh chóng ngay trong lúc làm bài thi thử hoặc trên lộ trình học tập mà không bị mất tiến trình bài thi.

### [DEC-018] Thống nhất Nguồn Chân Lý Chuyển Môn & Khôi phục Topic (Đợt 4)
- **Quyết định**: `useCurriculumStore` (persist vào `vact_active_curriculum`) là nguồn duy nhất lưu `{ selectedSubjectId, selectedTopicId, lastTopicBySubject }`. Khi chuyển môn A → B → A, tự động khôi phục đúng chuyên đề đã học của môn A; nếu môn chưa từng học thì chọn chuyên đề đầu tiên; nếu môn trống thì đặt `selectedTopicId = null`. Dropdown chỉ hiển thị các chuyên đề của môn đang chọn. Banner Lộ trình hiển thị `currentTopic.name` và `currentTopic.description` (không hardcode). Môn trống hiển thị Empty State chuẩn kèm nút Import.
- **Lý do**: Khắc phục triệt để lỗi chuyển môn bị reset về câu điều kiện hoặc lộ trình hiển thị sai chuyên đề của môn khác.

### [DEC-019] Chuẩn hóa Cách Tính Tiến độ Chuyên đề (Đợt 4)
- **Quyết định**: Thống nhất hàm pure `calculateTopicProgress(sets, progresses)` trên toàn bộ hệ thống (AppShell, RoadmapPage, StatsPage):
  - Tiến độ bài: `completedSets / totalSets` (ví dụ: '1/3 bài (33%)').
  - Tiến độ câu: `attemptedQuestions / totalQuestions` (ví dụ: '30/90 câu').
  - Độ chính xác trung bình: `totalScore / attemptedQuestions`. Nếu chưa làm câu nào (`attemptedQuestions === 0`), trả về `'—'` (em-dash) thay vì 0% hay 100%.
- **Lý do**: Tránh tình trạng độ chính xác hiển thị ảo 100% hoặc 0% khi người dùng chưa làm bài, đồng thời đảm bảo số liệu thống kê ăn khớp 100% giữa panel phải và các trang chi tiết.

### [DEC-020] Định dạng Sao lưu Version 2 & Tương thích Ngược 100% (Đợt 4)
- **Quyết định**: Nâng cấp định dạng sao lưu lên `version: 2`, bổ sung mảng `formulaGroups` và bản đồ `lastTopicBySubject`. Cơ chế khôi phục tương thích ngược 100%: nếu gặp file backup v1 cũ chưa có các trường này, hệ thống tự động chạy migrate công thức và tự động chọn chuyên đề đầu tiên cho các môn bị thiếu.
- **Lý do**: Đảm bảo chu trình sao lưu và khôi phục giữ nguyên vẹn 100% dữ liệu công thức và trạng thái học tập của người dùng trên mọi thiết bị.


