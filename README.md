# Hanni — 12 emote, mỗi emote 6 ảnh vẽ riêng

Bản đang dùng là **v11**: mỗi emote có sáu hình được vẽ riêng bằng built-in ImageGen, phát `1 → 2 → 3 → 4 → 5 → 6 → 1`. Trình phát chỉ đổi ô ảnh, không điều khiển một hình bằng rig, shader, xoay, kéo giãn hoặc uốn ảnh.

- Sáu P0: E00 Nghỉ, E01 Chào, E02 Suy nghĩ, E10 Giảng bài, E39 Ghi chú, E42 Chăm chú.
- Sáu emote học tập: E04 Vui mừng, E05 Cố lên, E09 Lắng nghe, E11 À ha, E16 Đọc sách, E19 Tìm kiếm.
- Avatar là một ảnh tĩnh cạnh tin nhắn. Nút trợ lý có ba cử động ngắn: nháy mắt, vẫy tay và ló lên; mỗi cử động dùng sáu ảnh riêng.

E19 giảm chuyển động kính còn một đoạn quét ngắn, bỏ gật đầu. E42 giữ dáng ngồi theo lựa chọn người dùng, nét mặt tươi và nháy mắt; đầu/thân/sách giữ ổn định. Hai bộ dùng một tỉ lệ xuất chung qua sáu frame để tránh nhún do resize theo độ cúi đầu. Mười emote còn lại giữ ảnh từ v10.

## Xem demo

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Mở <http://127.0.0.1:4173/?emote=e01-chao&motion=1#preview>. Có tạm dừng, chọn từng frame, tua, tốc độ 0,25× / 0,5× / 1×, nền sáng/tối/caro và mô phỏng tình huống trong chat. `motion=1` cho phép chủ động xem chuyển động cả khi hệ điều hành bật giảm chuyển động.

## Asset đang dùng

- `assets/manifest-v11.json`: danh mục, thời lượng, tình huống và đường dẫn tới sáu PNG của từng emote.
- `assets/emotes/sheets/v11/`: sheet sáu hình do ImageGen vẽ.
- `assets/emotes/v11/frames/<emote>@512/frame-01.png` … `frame-06.png`: sáu PNG RGBA, có thêm bộ 256 px.
- `assets/emotes/v11/webp/hanni-fox-<emote>-giu@512.webp`: WebP sáu frame trong suốt tự lặp, có bộ 256 px.
- `assets/emotes/v11/atlases/hanni-fox-<emote>@512.webp`: atlas ngang sáu ô cho Canvas; có bản PNG và bộ 256 px.
- `assets/emotes/v11/png/`: ảnh đầu vòng làm poster.

Các frame giữ dáng thân gần nhau, thay đổi tay, mắt, miệng hoặc trang sách theo động tác. E39 đúng hai tay: một tay giữ sổ, một tay cầm bút. Khâu xuất chỉ tách ảnh, căn tâm chân/vạch chân và resize đồng tỉ lệ. Sáu hình phát nguyên vẹn, không ghép mảng mặt hoặc nội suy biến dạng.

Đây là hoạt hình theo sáu cel; vẫn có nhịp chuyển hình, không phải 60 hình vẽ mỗi giây. Duyệt cảm giác chuyển động thực tế cùng với báo cáo kỹ thuật.

## Nút trợ lý cử động thỉnh thoảng

`assets/assistant-button/manifest-v10.json` trỏ tới ba đoạn sáu ảnh ở `assets/assistant-button/v10/`. Sheet nguồn nằm trong `assets/assistant-button/sheets/v10/`, bố cục 2 cột × 3 hàng để giữ trọn vòng tròn. Khâu xuất căn theo phần bát đỏ, không căn theo đỉnh đầu đang ló lên.

`launcher-idle.js` giữ nguyên ảnh lúc nghỉ; sau 5 giây đầu tiên phát nháy mắt, rồi chờ ngẫu nhiên 12–20 giây giữa các đoạn. Mỗi đoạn phát một lần và giữ frame cuối. Đưa chuột vào nút có thể gọi động tác chào, có thời gian nghỉ tối thiểu 8 giây để tránh lặp khi rê chuột. Nút “Thử cử động nút” trong demo lần lượt phát chào → ló lên → nháy mắt, không cần chờ.

Tự dừng đặt lịch khi tab bị ẩn hoặc người dùng bật giảm chuyển động. `motion=1` hay thao tác thử cử động là lựa chọn chủ động xem hoạt hình. Canvas chỉ đổi giữa các hình đã vẽ; không uốn ảnh hoặc dịch chuyển toàn bộ nút bằng CSS.

## Tích hợp

Nạp `mascot-player.js`, rồi:

```js
const manifest = await fetch('assets/manifest-v11.json').then(r => r.json());
const player = new MascotPlayer(document.querySelector('canvas'));
await player.play(manifest.emotes['e01-chao'].clips[0], { size: 512 });
// Khi bỏ canvas khỏi giao diện: player.destroy();
```

Atlas được giải mã một lần, phát trên đồng hồ `requestAnimationFrame`. Mỗi bước chỉ dùng `clearRect` và `drawImage` với khung đích cố định. WebP tự lặp dùng cùng sáu hình và thời lượng.

## Build và kiểm tra

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python tools/build-six.py --bank v11
.venv/bin/python tools/build-launcher.py
.venv/bin/python tools/check-six.py
.venv/bin/python tools/check-launcher-assets.py
node tools/check-player.cjs
node tools/check-launcher.cjs
```

Build dùng sheet đã lưu, không gọi API sinh ảnh. Báo cáo `reports/manifest-v11-checks.json` kiểm tra sáu frame riêng biệt, alpha, biên ảnh, vạch chân, bước nối 6→1, nhịp và dung lượng WebP. Kiểm tra player xác nhận thứ tự 1→6→1, khung vẽ cố định, tạm dừng/tua, thời gian tab nền và callback kết thúc.

Prompt đang dùng của đủ 12 emote và ba cử động nút: `prompts/active-assets.json` (built-in ImageGen, kèm ảnh tham chiếu và sheet nguồn). Tài liệu riêng của hai emote mới: `prompts/reduced-motion-cels-v11.json`. Quy ước chung: đầu `prompt-tao-emote.txt` và `prompts/drawn-cels.md`.

Các bản v6, v7 và bốn frame cũ giữ để đối chiếu. **v7 là bản rig đã bị loại**; trang hiện tại không nạp `rig-player.js`, `rig-motion.js` hoặc manifest v7. Không dùng pipeline v7 cho asset bàn giao hiện tại.
