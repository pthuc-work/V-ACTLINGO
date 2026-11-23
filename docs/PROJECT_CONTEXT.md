# PROJECT CONTEXT: V-ACT HUB

## 1. Bối cảnh

App luyện trắc nghiệm "V-ACT HUB" phong cách Duolingo cho kỳ thi V-ACT (ĐHQG TP.HCM), người dùng là học sinh Việt Nam, giao diện tiếng Việt. File cũ `V-ACT_app.html` (~4.700 dòng, 130 câu Tiếng Anh, Chuyên đề 15: Câu điều kiện) có cấu trúc:
`library = [ {id,name,topics:[ {id,name,sets:[ {id,name,questions:[ {id,category,prompt,options[4],correctIndex,formula,explanation} ]} ]} ]} ]`.
Lưu bằng IndexedDB + LocalStorage; sao lưu JSON cũ chỉ lưu library. Phần import AI cũ gọi Gemini với apiKey rỗng và có mã Firebase/Google inject: phải bỏ hết. Phím tắt cũ: A/B/C/D hoặc 1-4 chọn, mũi tên chuyển câu, F gắn cờ.

## 2. Quyết định đã chốt (không bàn lại)

- Giai đoạn 1: chỉ Tiếng Anh + Tiếng Việt V-ACT, chỉ trắc nghiệm 4 đáp án. Thiết kế sẵn nền mở rộng sang Toán (sau đó Lí, Hóa): KaTeX + mhchem, ảnh gắn câu hỏi, import nhiều file, AI tóm tắt lí thuyết thành bảng công thức.
- Ưu tiên máy tính (bố cục theo ảnh), dùng được trên điện thoại, PWA, có chế độ sáng/tối.
- Lộ trình kiểu Candy Crush: đường uốn lượn, KHÔNG khóa bài; bài đã làm sáng + 1-3 sao, bài chưa làm mờ nhưng bấm được; ô chưa có bài nằm trong đám mây, bấm mở import; cuối đường là rương "Hoàn thành chuyên đề".
- Sao theo % đúng: >=50% 1 sao, >=70% 2 sao, >=90% 3 sao.
- Duolingo nhưng KHÔNG có tim. Streak: làm >=1 bài/ngày (giờ Việt Nam, Asia/Ho_Chi_Minh). Đóng băng streak: 3 lượt/tuần (làm mới về 3 mỗi tuần, dùng trước) + cộng 1 lượt dự trữ vĩnh viễn mỗi khi hoàn thành một chuyên đề (chỉ mất khi dùng). Có XP, mục tiêu ngày, hiệu ứng/âm thanh (tắt được).
- Học tập: ôn lại câu sai, thống kê điểm mạnh/yếu theo `category`, nhắc ôn bài cũ.
- Có "nhóm câu hỏi dùng chung đoạn văn" (đọc hiểu, điền từ vào đoạn).
- Quản lý: kéo thả sắp xếp môn/chuyên đề/bài (có nút lên/xuống), đổi tên, xóa, sao lưu/khôi phục JSON ĐẦY ĐỦ (sao, tiến độ, streak, câu sai).
- Bảng điểm chuẩn Bách Khoa TP.HCM 2026 (Đại trà + PFIEV), bấm ngôi sao chọn ngành mục tiêu (mặc định 106 Khoa học Máy tính 85.45). Logo BK TP.HCM.
- Import giai đoạn 1 dùng CHATBOT, không tốn API (làm ở Đợt 3). Định dạng chuẩn v1: `{schemaVersion:1, subject, topic, set, part:{index,total}, passages:[{id,text}], questions:[{no, passageId|null, prompt, options[4], correctIndex|null, answerSource:"document|ai|none", category, formula, explanation, figure|null}]}`.
- Đề Anh/Việt thường không có đáp án: AI tự giải gắn nhãn "AI tạo"; đáp án người dùng nhập ưu tiên hơn; có nhãn "đã xác minh".
- Chế độ API Gemini: để sẵn trong Cài đặt, khóa và tên model do người dùng nhập, lưu trên máy, tạm ẩn.
- Công nghệ: React + Vite + TypeScript, backend Supabase (đăng nhập + đồng bộ nhiều máy). Deploy Netlify/Vercel.
- Dùng một mình lúc đầu, sau mở rộng cho nhiều người: mỗi dòng dữ liệu có `user_id`, bật Row Level Security; bộ đề có trường chế độ chia sẻ (mặc định riêng tư, chỉ để sẵn, chưa làm giao diện).
- Backend lưu: thư viện (môn/chuyên đề/bài/câu/đoạn văn), tiến độ từng bài, sao, XP, streak, câu sai, cài đặt.
