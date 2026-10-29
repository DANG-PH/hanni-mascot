# Quy ước hiện tại: sáu ảnh vẽ riêng, không dùng rig

Bộ đang chạy là v11, gồm 12 emote và một nút trợ lý có ba cử động ngắn. Avatar cạnh tin nhắn dùng ảnh tĩnh.

## Ảnh và prompt

Dùng built-in ImageGen. Prompt chính xác, ảnh tham chiếu và sheet nguồn của 15 asset hiện dùng được tập hợp trong `active-assets.json`. E19/E42 được sửa riêng theo `reduced-motion-cels-v11.json`; E42 giữ dáng ngồi theo lựa chọn người dùng.

- Emote: sheet vuông 3 cột × 2 hàng, sáu hình toàn thân, nền trong suốt.
- Nút tròn: sheet vuông 2 cột × 3 hàng để giữ trọn vòng đỏ, tai và tay; sáu hình cho mỗi cử động nháy mắt/chào/ló lên.
- Mỗi frame là một ảnh vẽ riêng. Giữ cùng góc máy, trang phục, tỉ lệ và vai trò hai tay; thay đổi mắt/tay/miệng theo hành động.
- E19 chỉ quét kính ngang một đoạn ngắn trên trang, bỏ gật đầu. E42 giữ yên góc đầu, thân và sách; nét mặt tươi và có nháy mắt.
- E39 đúng hai tay, một sổ và một bút. Kính không đổi tay/che mắt; đuôi không đảo phía.

## Xuất và phát

`tools/build-six.py --bank v11` chỉ tách trọn nhân vật, làm sạch vụn nền, căn hai bàn chân/vạch chân và resize đồng tỉ lệ. Riêng E19/E42 dùng MỘT tỉ lệ chung qua sáu frame để không phóng to/thu nhỏ thân theo góc đầu. Không sửa vùng cơ thể, không optical flow/crossfade hoặc tạo chuyển động bằng biến dạng.

Ảnh emote ở `assets/emotes/v11/`, manifest `assets/manifest-v11.json`. Mười bộ còn lại giữ hình từ v10. Mỗi bộ có sáu PNG 512/256, WebP tự lặp và atlas ngang sáu ô. `mascot-player.js` chỉ vẽ đúng ô ảnh vào một khung cố định.

`tools/build-launcher.py` xuất ba cử động nút vào `assets/assistant-button/v10/`, manifest `assets/assistant-button/manifest-v10.json`. Vòng đỏ là điểm neo, không căn theo đỉnh đầu đang ló lên. Mỗi đoạn/WebP phát một lần, giữ frame cuối.

`launcher-idle.js` chờ 5 giây đầu, rồi nghỉ ngẫu nhiên 12–20 giây giữa các đoạn. Rê chuột có thể gọi chào với thời gian nghỉ tối thiểu 8 giây; nút “Thử cử động nút” gọi chào → ló lên → nháy mắt ngay. Tôn trọng giảm chuyển động và trạng thái tab ẩn. Không thêm hiệu ứng xoay/nhún bằng CSS hoặc uốn một bitmap.

Duyệt đủ sáu ảnh và các bước nối, đặc biệt 6→1. Số liệu chênh lệch pixel chỉ hỗ trợ kiểm tra; sáu cel vẫn có nhịp chuyển hình.
