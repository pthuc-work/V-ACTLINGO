# Hướng Dẫn Thiết Lập Supabase Backend Cho V-ACT HUB

Tài liệu này cung cấp hướng dẫn đầy đủ từ A-Z để thiết lập cơ sở dữ liệu Supabase, xác thực tài khoản (Authentication), phân quyền dòng (Row Level Security - RLS), lưu trữ ảnh câu hỏi (Storage Bucket), và cơ chế hoạt động Offline-First với IndexedDB.

---

## 1. Tổng Quan Kiến Trúc Dữ Liệu

V-ACT HUB được thiết kế theo mô hình **Offline-First / Cloud-Sync**:
- **Khi chưa cấu hình Supabase hoặc chạy offline**: Ứng dụng tự động kích hoạt `LocalRepository` dựa trên **IndexedDB** (`idb`), cho phép học sinh làm bài thi, lưu streak, xem thống kê đầy đủ mà không cần kết nối mạng hay đăng nhập.
- **Khi đã kết nối Supabase**: Ứng dụng kích hoạt `SupabaseRepository`. Dữ liệu được đồng bộ lên đám mây, hỗ trợ đăng nhập nhiều thiết bị. Mọi thao tác ghi cục bộ được đưa vào **Write Sync Queue** và tự động đồng bộ khi có mạng.
- **Bảo mật tuyệt đối**: Tất cả các bảng đều được gắn `user_id` liên kết với `auth.users(id)` và được kích hoạt chính sách **Row Level Security (RLS)**, đảm bảo học sinh này không thể xem hoặc sửa dữ liệu của học sinh khác.

---

## 2. Các Bước Thiết Lập

### Bước 1: Tạo Dự Án Mới Trên Supabase
1. Truy cập [https://supabase.com/](https://supabase.com/) và đăng nhập vào tài khoản của bạn.
2. Bấm nút **New Project**.
3. Điền thông tin dự án:
   - **Name**: `v-act-hub` (hoặc tên tùy chọn)
   - **Database Password**: Đặt mật khẩu an toàn và lưu lại.
   - **Region**: Chọn khu vực gần Việt Nam nhất (ví dụ: `Singapore - ap-southeast-1`).
4. Bấm **Create new project** và đợi 1-2 phút để hệ thống khởi tạo.

---

### Bước 2: Lấy Cấu Hình API & Điền File Môi Trường
1. Trong giao diện Supabase Dashboard, vào mục **Project Settings** (biểu tượng bánh răng ở thanh bên trái) -> chọn tab **API**.
2. Tìm hai thông số:
   - **Project URL**: có dạng `https://xxxxxxxxxxxxxxxx.supabase.co`
   - **Project API keys** -> **anon public**: chuỗi JWT dài bắt đầu bằng `eyJ...`
3. Trong thư mục gốc của dự án `VACTLINGO`, sao chép file `.env.example` thành `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Mở file `.env.local` và điền giá trị vừa lấy:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. Khởi động lại server phát triển:
   ```bash
   npm run dev
   ```

---

### Bước 3: Chạy Migration Cơ Sở Dữ Liệu

Tất cả cấu trúc bảng, ràng buộc, chỉ mục (indexes), trigger tự cập nhật thời gian, và chính sách bảo mật RLS đã được viết sẵn trong file:
👉 `supabase/migrations/0001_init.sql`

#### Cách 1: Sử dụng SQL Editor trên Web Dashboard (Đơn giản nhất)
1. Trong Supabase Dashboard, chọn mục **SQL Editor** ở thanh điều hướng bên trái.
2. Bấm **New query**.
3. Mở file `supabase/migrations/0001_init.sql` trong dự án của bạn, sao chép toàn bộ nội dung và dán vào SQL Editor.
4. Bấm nút **Run** (hoặc nhấn `Ctrl + Enter` / `Cmd + Enter`).
5. Kết quả báo `Success. No rows returned` là bạn đã hoàn tất khởi tạo 9 bảng và chính sách bảo mật.

#### Cách 2: Sử dụng Supabase CLI (Dành cho Developer)
```bash
# Đăng nhập vào Supabase CLI
npx supabase login

# Liên kết với project
npx supabase link --project-ref xxxxxxxxxxxxxxxx

# Đẩy migration lên database
npx supabase db push
```

---

### Bước 4: Cấu Hình Xác Thực (Authentication)

1. Trong Supabase Dashboard, vào mục **Authentication** -> chọn **Providers** -> **Email**.
2. Đảm bảo mục **Enable Email provider** đang BẬT (`Enabled`).
3. Tùy chọn cấu hình xác nhận email (Confirm Email):
   - Nếu muốn học sinh đăng ký là đăng nhập được ngay (không cần chờ bấm link xác nhận): **Tắt** mục `Confirm email`.
   - Nếu muốn yêu cầu xác nhận email: **Bật** mục `Confirm email`.
4. Cấu hình **URL Configuration**:
   - Vào **Authentication** -> **URL Configuration**.
   - **Site URL**: `http://localhost:5173` (khi chạy dev) hoặc domain deploy (ví dụ: `https://v-act.netlify.app`).
   - **Redirect URLs**: Thêm:
     - `http://localhost:5173/**`
     - `https://your-production-domain.netlify.app/**`
5. Tính năng **Magic Link** (đăng nhập không cần mật khẩu) hoạt động sẵn thông qua OTP link gửi về email.

---

### Bước 5: Kiểm Tra Storage Bucket Cho Hình Ảnh (`figures`)

File migration `0001_init.sql` đã tự động khởi tạo bucket `figures` với quyền đọc công khai (Public Read) và quyền tải lên/sửa/xóa chỉ dành cho người dùng sở hữu thư mục tương ứng (`auth.uid()`).

Để kiểm tra lại trên Dashboard:
1. Vào mục **Storage** ở thanh bên trái.
2. Bạn sẽ thấy bucket tên **`figures`** với nhãn `Public`.
3. Khi người dùng tải ảnh lên, ảnh sẽ nằm tại đường dẫn: `figures/{user_id}/{filename}`.

---

## 3. Danh Sách Các Bảng & Chính Sách Phân Quyền (RLS)

| Tên Bảng | Mô Tả | RLS Policy |
| :--- | :--- | :--- |
| `subjects` | Danh mục môn thi (Tiếng Anh, Tiếng Việt, Toán...) | `user_id = auth.uid()` |
| `topics` | Chuyên đề bài tập (VD: Chuyên đề 15: Câu điều kiện) | `user_id = auth.uid()` |
| `sets` | Bộ đề / Bài luyện tập cụ thể (VD: Bài luyện tập số 1) | `user_id = auth.uid()` |
| `passages` | Đoạn văn dùng chung cho nhóm câu hỏi đọc hiểu/điền từ | `user_id = auth.uid()` |
| `questions` | Chi tiết câu hỏi trắc nghiệm (đáp án, công thức, giải thích) | `user_id = auth.uid()` |
| `set_progress` | Tiến độ từng bài: số sao (0-3), điểm, số lần làm | `user_id = auth.uid()` |
| `question_attempts` | Lịch sử trả lời: câu sai, gắn cờ (phím F), thời gian | `user_id = auth.uid()` |
| `user_stats` | Thống kê học tập: XP, streak, đóng băng streak, mục tiêu ngành | `user_id = auth.uid()` |
| `settings` | Cài đặt: âm thanh, rung, giao diện sáng/tối, API key | `user_id = auth.uid()` |

---

## 4. Hướng Dẫn Kiểm Tra & Xác Minh RLS (Verification)

Để chứng minh RLS hoạt động chính xác (người dùng A không xem được dữ liệu của người dùng B):

1. Mở SQL Editor trong Supabase và chạy lệnh sau để kiểm tra trạng thái RLS:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```
   *Tất cả 9 bảng trên đều phải có `rowsecurity = true`.*

2. Kiểm tra danh sách chính sách bảo mật:
   ```sql
   SELECT policyname, tablename, cmd, roles 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

3. Thử nghiệm truy vấn ẩn danh (Anonymous Query):
   - Mở cửa sổ ẩn danh trình duyệt và gọi API không có access token -> Trả về danh sách rỗng `[]`, không để lộ bất kỳ thông tin riêng tư nào.

---

## 5. Kiểm Tra Ngoại Tuyến (Offline Mode) & Đồng Bộ

1. Mở ứng dụng trên trình duyệt: `http://localhost:5173`.
2. Mở DevTools (`F12`) -> Tab **Application** -> **IndexedDB** -> kiểm tra database `vact_hub_db`.
3. Bật chế độ **Offline** trong DevTools (Tab **Network** -> chọn **Offline**).
4. Thử hoàn thành một bài luyện tập hoặc thêm câu hỏi mới: Dữ liệu được ghi lập tức vào IndexedDB và xếp vào bảng `syncQueue`.
5. Tắt chế độ Offline: `syncQueueManager` sẽ tự động bắt sự kiện `online` của trình duyệt và đẩy toàn bộ thao tác còn thiếu lên Supabase.
