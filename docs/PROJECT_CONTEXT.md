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

## 3. Cập nhật Đợt 2: Học và Chơi (Đã hoàn thiện)

- Đã hoàn thiện toàn bộ luồng tương tác học tập: Lộ trình Candy Crush uốn lượn SVG mở hoàn toàn (không khóa node), Màn làm bài (2 chế độ Luyện tập xem ngay / Thi thử nộp bài, lưới 5 cột lọc câu hỏi, hỗ trợ đoạn văn đọc hiểu và hình ảnh, phím tắt A-D/1-4/arrows/F, nhãn AI & sửa đáp án tức thì, tự lưu `resume_state`), Màn hoàn thành (3 sao, thẻ thống kê, pháo giấy, xuất phiếu điểm TXT).
- Hoàn thiện game mechanics: Sao (50/70/90%), XP (+10 câu đúng lượt đầu, +20 hoàn thành, +10 sao mới), Streak múi giờ Việt Nam Asia/Ho_Chi_Minh (làm >=1 bài/ngày), 3 lượt đóng băng tuần làm mới mỗi thứ Hai + lượt dự trữ nhận từ rương chuyên đề (+50 XP, +1 lượt dự trữ vĩnh viễn).
- Bảng điểm chuẩn Bách Khoa 2026 chính thức (29 ngành đại trà, 7 ngành PFIEV) với cơ chế lưu `{program, code, key}` đồng bộ đa thiết bị.
- Hệ thống hỗ trợ học tập: Ôn câu sai (rút khỏi danh sách khi đúng 2 lần liên tiếp), Thống kê Category (điểm mạnh >=80%, điểm yếu <60%), Nhắc ôn bài cũ Spaced Repetition (1/3/7/14 ngày), Sổ tay công thức KaTeX/mhchem và Hiệu ứng âm thanh procedural Web Audio API.

## 4. Cập nhật Đợt 3: Import và Quản lý (Đã hoàn thiện trọn vẹn)

- Đã hoàn thiện quy trình nhập liệu không tốn API: Trình tạo prompt chuẩn cho Chatbot (`promptBuilder.ts`), bộ phân tích và tự sửa lỗi JSON thông minh (`parseAndRepair.ts` xử lý markdown fence, LaTeX escape `\\`, ký tự xuống dòng thô, nháy cong, tự động khôi phục JSON bị cắt cụt giữa chừng), hỗ trợ ghép nối nhiều phần (`multipart.ts`).
- Màn hình Import trực quan 3 tab: Tạo Prompt -> Nhập JSON (minh bạch nhật ký sửa lỗi) -> Xem trước & Sửa 2 cột với `<RichText>` KaTeX, Modal Nhập đáp án nhanh (`quickAnswerInput.ts` đa định dạng, ghi đè AI, bảng so sánh diffs), Modal cắt/tải hình ảnh (`figureCrop.ts` cắt trực quan từ PDF gốc qua canvas). Nối thành công các ô "đám mây" từ Lộ trình tự điền môn/chuyên đề.
- Cây quản lý môn/chuyên đề/bài học (`ManagePage.tsx`): Kéo thả trực quan VÀ nút Lên/Xuống bấm nhạy trên mobile, đổi tên, xóa có hộp cảnh báo chi tiết, chuyển bài sang chuyên đề khác, đồng bộ ngay với Lộ trình, trình sửa câu hỏi nhanh.
- Hệ thống Sao lưu & Khôi phục JSON đầy đủ (`backupService.ts`): Xuất file chuẩn `vact-backup-YYYYMMDD-HHmm.json` (tuyệt đối không chứa API key), khôi phục với 2 chế độ "Thay thế toàn bộ" và "Gộp thông minh" (`Math.max` số sao), đọc và chuyển đổi tự động file backup của app cũ `V-ACT_app.html`.
- Cài đặt, PWA và API Gemini: Trang Cài đặt hoàn thiện, hướng dẫn cài PWA Shortcut cho Desktop/Android/iOS kèm nút cài đặt trực tiếp, module Gemini API (`geminiProvider.ts`) ẩn sau feature flag `VITE_ENABLE_GEMINI=false` lưu key duy nhất tại `localStorage`.
- Toàn bộ 158 tests Vitest (13 suites) pass 100%, build production thành công sạch sẽ.

