# Báo cáo di trú dữ liệu: V-ACT Legacy Library (Schema v1)

- **Thời gian thực hiện**: 2026-11-23T12:29:49.211Z
- **Nguồn dữ liệu**: `docs\legacy\V-ACT_app.html`
- **Tập tin đích**: `data\seed\legacy-library.json`
- **Tổng số câu hỏi**: **130** câu
- **Trạng thái xác thực**: 🟢 **THÀNH CÔNG (0 LỖI)**

## 1. Phân bổ theo bộ đề (Set Breakdown)

| Tên bộ đề | Số lượng câu hỏi | Trạng thái |
| :--- | :--- | :--- |
| Bài tập áp dụng | 30 câu | ✅ Hợp lệ |
| Bài luyện tập số 1 | 50 câu | ✅ Hợp lệ |
| Bài luyện tập số 2 | 50 câu | ✅ Hợp lệ |

## 2. Tiêu chí kiểm tra tính toàn vẹn (Validation Rules)

- [x] Đã trích xuất chính xác 130 câu hỏi từ Chuyên đề 15: Câu điều kiện (Tiếng Anh).
- [x] Mỗi câu hỏi có đúng 4 phương án lựa chọn (A, B, C, D).
- [x] Mỗi câu hỏi có `correctIndex` hợp lệ (nằm trong đoạn 0 - 3).
- [x] Đã loại bỏ hoàn toàn mã độc/tiêm từ Firebase, Bard client injected scripts và empty Gemini API key calls.
- [x] Định dạng chuẩn hóa đúng theo Schema v1 (`schemaVersion: 1`, `part`, `passages: []`, `answerSource: "document"`).
- [x] Đầy đủ phân loại (`category`), công thức ghi nhớ (`formula`), và giải thích chi tiết (`explanation`).

## 3. Phân bổ theo dạng câu hỏi (`category`)

| Chuyên mục / Cấu trúc ngữ pháp | Số lượng |
| :--- | :--- |
| ĐK Loại 2 | 17 |
| Đảo ngữ ĐK Loại 3 | 16 |
| ĐK Loại 3 | 11 |
| ĐK Trộn (3 - 2) | 9 |
| Đảo ngữ ĐK Loại 2 | 9 |
| Đảo ngữ ĐK Trộn (3 - 2) | 8 |
| Cấu trúc Unless (Loại 1) | 7 |
| Đảo ngữ ĐK Loại 1 | 7 |
| Cấu trúc Otherwise (Loại 3) | 6 |
| Cấu trúc But for (Loại 3) | 5 |
| ĐK Loại 0 | 4 |
| Cấu trúc Or / Otherwise (Loại 1) | 4 |
| Đảo ngữ But for (Loại 3) | 3 |
| Từ tương đương If (Loại 1) | 3 |
| ĐK Trộn (2 - 3) | 3 |
| Đảo ngữ ĐK Trộn (2 - 3) | 2 |
| Cấu trúc Unless (Loại 0/1) | 2 |
| Cấu trúc Without (Loại 2) | 2 |
| Cấu trúc Without (Loại 3) | 2 |
| ĐK Loại 3 (Tiếp diễn) | 2 |
| Đảo ngữ Without (Trộn 3 - 2) | 1 |
| Từ tương đương If (Loại 2) | 1 |
| Cấu trúc If it were not for (Loại 2) | 1 |
| ĐK Loại 1 với Should | 1 |
| ĐK Loại 1 / Mệnh đề thời gian | 1 |
| Từ tương đương If (Loại 0/1) | 1 |
| Cấu trúc Otherwise (Loại 1) | 1 |
| ĐK Loại 2 (Lời khuyên) | 1 |


