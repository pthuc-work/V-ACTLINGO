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
