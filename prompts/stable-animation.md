# ĐÃ LOẠI — bản rig một ảnh v7

Người dùng đã yêu cầu bỏ phương án dưới đây. Tài liệu hiện hành là [drawn-cels.md](drawn-cels.md), dùng sáu ảnh vẽ riêng. Không áp dụng quy tắc rig trong tài liệu cũ này.

Người dùng nhận xét bản sáu hình sinh độc lập vẫn giật do dao động cả người. Bản đang chạy giữ **một mẫu vẽ cố định cho mỗi emote** từ nguồn ImageGen đã lưu, sau đó tạo sáu tư thế bằng cùng một mô hình chuyển động theo khớp.

## Prompt ảnh nguồn cho các lần tạo tiếp theo

Use case: stylized-concept. Create ONE full-body transparent Hanni emote pose using the attached original Hanni as the exact character reference. Preserve the red-orange plush fur, cream muzzle and tail tip, brown paws/ear tips, cream-red-gold Hanfu and 汉 pendant. The book, when present, reads exactly “HanNi”. Fixed camera and proportions. Feet planted, torso balanced, no leaning or jump. Exactly two arms, two paws, two feet and one tail. Clearly separate the acting paw/sleeve from the face and torso so a small joint motion can be applied in code. Use the selected emote action from the catalogue. E39: one hand supports ONE notebook, the other holds ONE pen, NO extra book. No background, shadows, labels, motion blur or extra limbs. Leave generous padding around ears, paws, tail and props. Do not generate independent redraws of animation frames.

Ảnh hiện dùng đã tạo bằng **built-in ImageGen**, prompt thực tế của sheet nguồn giữ nguyên trong `emotes-six-frame.json` để truy xuất. Đoạn trên là quy ước cho lần tạo ảnh nguồn tiếp theo, không giả nhận đã gọi sinh lại ảnh bằng prompt này.

## Quy tắc chuyển động đang áp dụng

- Định nghĩa chính xác ở `rig-motion.js`; ảnh nguồn cố định ở `assets/emotes/v7/base/`.
- Sáu PNG lấy tại pha 0°, 60°, 120°, 180°, 240°, 300°. 360° trùng 0° về cả vị trí và vận tốc; không thêm hình đầu làm hình thứ bảy.
- Đầu chỉ nghiêng 0,25–0,8 độ, tay tối đa 4 độ, đuôi 1,5 độ. Cả thân không nhún, không đổi tỉ lệ hay trôi ngang.
- Mặt nạ khớp có biên mềm liên tục cả giá trị và đạo hàm. Không chắp các mảng mặt từ những hình khác nhau, không crossfade, không optical flow.
- Runtime WebGL chạy liên tục theo cùng phương trình; không hoán đổi ảnh trong khi phát. Sáu PNG/WebP là bản xuất theo mốc cho môi trường cần sprite.
- Không cộng thêm hiệu ứng thở/lắc/scale toàn thân. Tắt “Chuyển động liên tục” để duyệt đúng sáu tư thế.
- Vùng chân y ≥ 430/512 khóa hoàn toàn. Kiểm tra thân áo, chi tiết mặt và vai trò hai tay ở mọi pha.

Đủ 12 emote, gồm sáu P0 E00/E01/E02/E10/E39/E42. Avatar cạnh tin nhắn và nút mở trợ lý vẫn dùng ảnh tĩnh.
