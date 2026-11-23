# BÀN GIAO ĐỢT 1/3: NỀN MÓNG (V-ACT HUB)

Tài liệu này là nguồn sự thật bàn giao kỹ thuật giữa Đợt 1 và Đợt 2. Được tạo tự động và kiểm tra kỹ lưỡng bởi Kỹ sư trưởng sau khi hoàn thành toàn bộ 4 luồng song song qua `/swarm`.

---

## 1. Đã làm xong & Chưa làm (Nói thật 100%)

### Đã làm xong hoàn chỉnh:
- **Chuẩn bị đầu vào & Docs**:
  - Sao chép 10 file ảnh mẫu vào `docs/ui/` với quy ước tên không dấu (`light-1..5`, `dark-1..5`), tạo bảng ánh xạ tại `docs/ui/README.md`.
  - Sao chép nguyên vẹn mã nguồn cũ vào `docs/legacy/V-ACT_app.html`.
  - Tạo `docs/PROJECT_CONTEXT.md` chép nguyên văn mục 1 & 2 từ đề bài làm kim chỉ nam cho Đợt 2 & 3.
  - Ghi nhận kỷ yếu quyết định kỹ thuật trong `docs/DECISIONS.md`.
- **Luồng A (Giao diện & Design System)**:
  - Trích xuất toàn bộ bảng màu, độ đổ bóng 3D Duolingo (viền đáy 4px, nhấn lún 3px), bo góc tròn lớn và font Nunito vào `src/styles/tokens.css` và `tailwind.config.js`.
  - Xây dựng trọn bộ UI components nguyên tử: `Button` (3D bấm lún), `Card` (3D/elevated), `Chip`, `ProgressBar` (bóng gương), `Modal`, `Toggle`, `Tabs`, `StarRating` (ngưỡng 50%/70%/90%), `Toast` (`ToastProvider` + `useToast`).
  - Dựng khung chuẩn `AppShell` theo đúng ảnh `light-1-lo-trinh.png` & `dark-1-lo-trinh.png`:
    - Sidebar trái (Logo BK, Lộ trình, Import tài liệu AI, Bảng công thức, Quản lý bài, Điểm chuẩn BK 2026, nút chuyển Theme sáng/tối, nút Cài đặt App).
    - Cột giữa (Scroll container chính).
    - Sidebar phải (Streak widget với 3 lượt đóng băng tuần, XP/Level widget, Daily Goal 20/30 câu, Ngành mục tiêu Khoa học Máy tính 106 - 85.45 ⭐).
    - Responsive 3 cột: Desktop 3 cột, Tablet thu gọn cột phải, Mobile thanh điều hướng đáy + header trên.
  - Hệ thống theme `src/store/themeStore.ts` (Light/Dark/System) lưu localStorage, kèm inline script chống chớp nháy (no-flash) trong `index.html`.
  - Dựng khung các trang router: Lộ trình, Làm bài, Hoàn thành, Chào mừng, Điểm chuẩn BK 2026, Import, Quản lý, Sổ tay công thức, Cài đặt.
- **Luồng B (Dữ liệu & Supabase)**:
  - File migration hoàn chỉnh `supabase/migrations/0001_init.sql` gồm 9 bảng (`subjects`, `topics`, `sets`, `passages`, `questions`, `set_progress`, `question_attempts`, `user_stats`, `settings`) với cascade foreign keys, updated_at triggers, index tăng tốc, bật RLS 100% với policy `auth.uid() = user_id`, và storage bucket `figures` (chỉ cho phép user đọc/ghi thư mục `user_id/`).
  - Lớp trừu tượng dữ liệu `src/data/repository.ts` (`DataRepository` interface).
  - Bản cài đặt `LocalRepository` (`src/data/localRepository.ts`): IndexedDB thông qua thư viện `idb`, hỗ trợ fallback in-memory khi test môi trường Node/Vitest, đầy đủ CRUD, cascade xóa, import gói V1, export/import full JSON backup.
  - Bản cài đặt `SupabaseRepository` (`src/data/supabaseRepository.ts`): Kết nối Supabase SDK, hỗ trợ bộ đệm đọc (read cache) và hàng đợi ghi ngoại tuyến (`syncQueue.ts`) tự động phát lại khi có mạng.
  - Tự động chọn repository qua `getRepository()`: Ưu tiên Supabase khi có `.env`, fallback về Local IndexedDB khi chưa cấu hình.
  - Form xác thực `src/components/auth/AuthModal.tsx`: Đăng nhập, đăng ký bằng email/mật khẩu, gửi Magic Link, có chỉ báo Offline mode, giao diện chuẩn 3D.
  - Hướng dẫn chi tiết từng bước tạo dự án, chạy migration, bật Auth và kiểm thử RLS tại `docs/SUPABASE_SETUP.md`.
- **Luồng C (Chuyển dữ liệu cũ & Seed)**:
  - Script `scripts/migrate-legacy.ts` đọc `docs/legacy/V-ACT_app.html`, bóc tách 130 câu Tiếng Anh Chuyên đề 15: Câu điều kiện.
  - Loại bỏ sạch sẽ 100% mã Firebase/Google injects và các lệnh gọi Gemini API rỗng cũ.
  - Kiểm tra 100% hợp lệ: 130 câu, mỗi câu đủ 4 lựa chọn, `correctIndex` từ 0-3, chia đúng 3 bộ:
    - "Bài tập áp dụng": 30 câu
    - "Bài luyện tập số 1": 50 câu
    - "Bài luyện tập số 2": 50 câu
  - Xuất file seed chuẩn schema v1 tại `data/seed/legacy-library.json` và báo cáo `data/seed/validation-report.md`.
  - Module nạp seed `src/data/seed.ts` và gắn nút "Nạp dữ liệu mẫu (130 câu)", "Nạp lại từ đầu" ngay trong trang Cài đặt (`SettingsPage.tsx`) có báo trạng thái và số câu nạp thành công.
- **Luồng D (PWA, KaTeX & Hạ tầng)**:
  - Đóng gói KaTeX + mhchem 100% cục bộ trong bundle (zero CDN, không phụ thuộc internet).
  - Component `<RichText>` (`src/components/ui/RichText.tsx`) hỗ trợ văn bản trộn inline math `$...$`, block math `$$...$$`, và hóa học `\ce{...}`. Khi công thức gõ sai cú pháp, hệ thống bắt lỗi an toàn (try-catch), giữ nguyên raw text kèm icon cảnh báo `AlertTriangle`, không bao giờ làm vỡ trang.
  - Trang kiểm thử công thức trực tiếp tại `src/pages/FormulaPage.tsx` có khung nhập LaTeX / mhchem realtime và các bài mẫu Toán / Hóa / Error fallback.
  - PWA: Cấu hình `vite-plugin-pwa` với service worker, precache 79 assets phục vụ offline, Web App Manifest đầy đủ logo BK TP.HCM (`public/icons/`).
  - Hạ tầng chuẩn hóa: `.eslintrc.cjs`, `.prettierrc`, `netlify.toml` (SPA rewrite), `vitest.config.ts`. Toàn bộ 29 tests pass, build production thành công.

### Chưa làm / Dành cho Đợt 2 & 3 (Theo đúng phân kỳ):
- Logic tính điểm làm bài tương tác, chọn đáp án, bấm nộp bài, hiện giải thích chi tiết khi làm (Đợt 2).
- Bản đồ lộ trình Canvas uốn lượn Candy Crush thật (Đợt 2).
- Hệ thống streak logic hàng ngày theo múi giờ `Asia/Ho_Chi_Minh`, trừ lượt đóng băng thật khi bỏ lỡ ngày (Đợt 2).
- Bảng tra cứu điểm chuẩn Bách Khoa 2026: Đã hoàn thiện 100% dữ liệu chính thức chuẩn xác từ 2 tập tin trích xuất trong `logo_diemchuan/` (gồm 29 ngành Tiêu chuẩn/Đại trà và 7 chuyên ngành Kỹ sư Chất lượng cao Việt – Pháp PFIEV), logo chính thức `logobachkhoa.webp` đã được tích hợp vào toàn bộ thanh điều hướng, favicon và PWA. Ngành mục tiêu đồng bộ qua `useTargetMajorStore` (mặc định 106 Khoa học Máy tính 85.45 ⭐, bấm đổi trực tiếp trên bảng điểm).
- Trình nhập liệu đề bằng AI chatbot không tốn API (Đợt 3).
- Kéo thả sắp xếp danh mục và tính năng sao lưu/phục hồi file JSON trên UI quản lý (Đợt 3).

---

## 2. Đường dẫn file quan trọng (Cây thư mục rút gọn)

```text
VACTLINGO/
├── data/
│   └── seed/
│       ├── legacy-library.json         # 130 câu hỏi chuẩn schema v1 đã bóc tách từ file HTML cũ
│       └── validation-report.md        # Báo cáo nghiệm thu tính hợp lệ của 130 câu
├── docs/
│   ├── PROJECT_CONTEXT.md              # Nguồn sự thật nguyên văn mục 1 & 2 của dự án
│   ├── DECISIONS.md                    # Kỷ yếu các quyết định kiến trúc kỹ thuật
│   ├── HANDOFF.md                      # Tài liệu bàn giao này
│   ├── SUPABASE_SETUP.md               # Hướng dẫn chi tiết tạo project Supabase, migration & test RLS
│   ├── legacy/
│   │   └── V-ACT_app.html              # File HTML ứng dụng cũ gốc
│   └── ui/                             # 10 ảnh tham chiếu giao diện đổi tên chuẩn không dấu
│       ├── README.md                   # Bảng ánh xạ tên ảnh cũ và mới
│       ├── light-1..5-*.png            # 5 màn hình giao diện Sáng
│       └── dark-1..5-*.png             # 5 màn hình giao diện Tối
├── public/
│   ├── favicon.ico
│   └── icons/                          # Bộ icon PWA & Logo BK TP.HCM (SVG, PNG 192, 512, apple-touch)
├── scripts/
│   ├── migrate-legacy.ts               # Script bóc tách, làm sạch và chuẩn hóa dữ liệu cũ
│   └── generate-icons.cjs              # Script sinh icon PNG từ SVG cho PWA
├── src/
│   ├── components/
│   │   ├── auth/AuthModal.tsx          # Modal đăng nhập/đăng ký Supabase & offline
│   │   ├── layout/AppShell.tsx         # Khung 3 cột responsive chuẩn theo mẫu thiết kế
│   │   └── ui/                         # Bộ UI components: Button 3D, Card, Modal, RichText, Toast...
│   ├── data/
│   │   ├── types.ts                    # Toàn bộ interface dữ liệu, câu hỏi, lộ trình, stats
│   │   ├── repository.ts               # Interface DataRepository thống nhất
│   │   ├── localRepository.ts          # Triển khai IndexedDB offline hoàn chỉnh (idb)
│   │   ├── supabaseRepository.ts       # Triển khai Supabase online + offline read cache
│   │   ├── syncQueue.ts                # Hàng đợi ghi offline tự động đồng bộ khi online
│   │   ├── seed.ts                     # Hàm nạp 130 câu mẫu vào repository đang kích hoạt
│   │   └── index.ts                    # Factory tự động chọn repository (getRepository)
│   ├── lib/supabase.ts                 # Khởi tạo Supabase client an toàn
│   ├── pages/                          # Các trang ứng dụng (Roadmap, Practice, Formula, Settings...)
│   ├── store/themeStore.ts             # Zustand store quản lý theme Sáng / Tối / Hệ thống
│   ├── styles/tokens.css               # Toàn bộ CSS variables và màu sắc Duolingo trích xuất từ ảnh
│   ├── App.tsx                         # Router chính & kết nối AppShell
│   └── main.tsx                        # Entrypoint ứng dụng
├── supabase/
│   └── migrations/
│       └── 0001_init.sql               # Script SQL tạo 9 bảng, RLS, Trigger, Index & Storage figures
├── netlify.toml                        # Cấu hình deploy Netlify SPA
├── package.json                        # Cấu hình dự án & scripts npm
├── tailwind.config.js                  # Tích hợp token màu thương hiệu & font Nunito
└── vite.config.ts                      # Cấu hình Vite, PWA offline caching & alias @
```

---

## 3. Cách chạy dự án

### Các lệnh chính:
```bash
# 1. Cài đặt dependencies (đã chạy sẵn trong repo)
npm install

# 2. Khởi động môi trường phát triển local
npm run dev

# 3. Chạy toàn bộ 29 unit tests (Vitest)
npm test

# 4. Kiểm tra cú pháp và kiểu mã nguồn
npm run lint

# 5. Build bản phát hành production (kiểm tra TypeScript và đóng gói PWA)
npm run build

# 6. Chạy lại script trích xuất dữ liệu cũ nếu cần
npm run migrate:legacy
```

### Biến môi trường (`.env`):
- Để chạy chế độ **Local hoàn toàn (mặc định)**: Không cần file `.env`, app tự dùng IndexedDB.
- Để kích hoạt **Supabase**: Tạo file `.env` từ `.env.example`:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  ```

---

## 4. Mô hình dữ liệu & Quy ước

### 9 Bảng trong Database (`supabase/migrations/0001_init.sql`):
1. `subjects`: Môn học (`id`, `name`, `code`, `icon`, `position`, `visibility`, `user_id`).
2. `topics`: Chuyên đề (`id`, `subject_id`, `name`, `code`, `position`, `visibility`, `user_id`).
3. `sets`: Bộ bài luyện (`id`, `topic_id`, `name`, `position`, `visibility`, `user_id`).
4. `passages`: Đoạn văn đọc hiểu dùng chung (`id`, `topic_id`, `title`, `content`, `user_id`).
5. `questions`: Câu hỏi trắc nghiệm (`id`, `set_id`, `passage_id`, `no`, `prompt`, `options jsonb` [4 phần tử], `correct_index`, `answer_source`, `verified`, `category`, `formula`, `explanation`, `figure jsonb`, `position`, `user_id`).
6. `set_progress`: Tiến độ bộ đề (`id`, `set_id`, `stars` [1-3], `best_percent`, `attempts`, `last_done_at`, `resume_state jsonb`, `user_id`).
7. `question_attempts`: Lịch sử trả lời từng câu (`id`, `question_id`, `chosen_index`, `is_correct`, `attempted_at`, `mode`, `user_id`).
8. `user_stats`: Chỉ số người học (`user_id`, `xp`, `streak`, `last_active_date`, `freeze_weekly`, `freeze_reserve`, `week_start`, `daily_goal_xp`).
9. `settings`: Cấu hình người dùng (`user_id`, `data jsonb` chứa theme, sound, target_major...).

### Kiến trúc Repository (`src/data/repository.ts`):
- Toàn bộ component và trang **chỉ gọi qua interface `DataRepository`** bằng cách gọi:
  ```ts
  import { getRepository } from '@/data';
  const repo = getRepository();
  const subjects = await repo.getSubjects();
  ```
- Không bao giờ gọi trực tiếp SDK Supabase trong UI components để đảm bảo hoạt động trong suốt giữa Online và Offline.

---

## 5. Quyết định kỹ thuật & Lệch so với prompt (kèm lý do)

1. **Tailwind CSS + CSS Variables**: Thay vì CSS thuần hoặc Tailwind rời rạc, dự án kết hợp Tailwind CSS với CSS Variables trong `tokens.css`. Điều này cho phép áp dụng đúng các biến màu trích xuất từ 10 ảnh tham chiếu và chuyển theme tức thời.
2. **Schema V1 linh hoạt**: Trong `V1ImportPackage`, các trường `subject`, `topic`, `set` chấp nhận cả dạng chuỗi (e.g. `"Tiếng Anh"`) lẫn dạng object `{ name: string }` để dễ dàng tương thích với dữ liệu chatbot sinh ra ở Đợt 3.
3. **In-memory fallback cho LocalRepository**: Trong môi trường Node (khi chạy Vitest), IndexedDB của trình duyệt không có sẵn; repository tự động chuyển sang cấu trúc Map in-memory để kiểm thử 100% logic CRUD mà không cần cài đặt browser giả lập nặng nề.

---

## 6. Lỗi đã biết & Việc người dùng cần tự làm

1. **Tạo tài khoản Supabase**:
   - Nếu muốn dùng tính năng đồng bộ đám mây và đăng nhập nhiều máy, người dùng tạo một project miễn phí trên Supabase, vào SQL Editor dán nội dung `supabase/migrations/0001_init.sql` và chạy (Run).
   - Điền URL và Anon Key vào `.env` (Xem chi tiết từng bước trong [SUPABASE_SETUP.md](file:///d:/VACTLINGO/docs/SUPABASE_SETUP.md)).
2. **Cài PWA trên máy**:
   - Khi chạy `npm run dev` trên Chrome/Edge, người dùng có thể bấm vào nút "Cài đặt ứng dụng" trên thanh địa chỉ hoặc trong menu sidebar để cài V-ACT HUB thành ứng dụng độc lập trên máy tính.

---

## 7. Điều kiện đầu vào cho Đợt 2 (Được phép giả định đã có)

Đợt 2 hoàn toàn có thể bắt đầu ngay và giả định các nền tảng sau đã hoạt động ổn định:
1. Bộ tokens màu, fonts Nunito và khung giao diện `AppShell` 3 cột chuẩn Duolingo responsive đã có sẵn và hoạt động trơn tru.
2. Toàn bộ UI components (`Button`, `Card`, `Modal`, `Tabs`, `StarRating`, `Toast`...) sẵn sàng import từ `@/components/ui`.
3. Component `<RichText>` hiển thị công thức Toán học KaTeX và Hóa học mhchem đã được đóng gói và test an toàn.
4. Data Repository (`getRepository()`) sẵn sàng với đầy đủ hàm truy vấn môn, chuyên đề, bài học, tiến độ, sao và lịch sử câu sai.
5. Bộ dữ liệu mẫu 130 câu Tiếng Anh Chuyên đề 15 đã nằm sẵn tại `data/seed/legacy-library.json` và có hàm `loadSeedData()`.

---

## 8. CÂU LỆNH MỞ ĐẦU CHO CUỘC TRÒ CHUYỆN MỚI (ĐỢT 2)

Copy và dán nguyên văn đoạn dưới đây vào Antigravity khi bắt đầu phiên làm việc Đợt 2:

```text
Đọc docs/PROJECT_CONTEXT.md, docs/HANDOFF.md, docs/DECISIONS.md rồi mới làm; chờ prompt Đợt 2.
```
