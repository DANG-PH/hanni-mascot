# Prompt bộ frame P0

Các sprite sheet trong `assets/emotes/sheets/` được sinh bằng built-in ImageGen, luôn đính kèm `nhan-vat/cao-hanni-goc.png` làm character reference.

## Prompt chung

```text
Use case: stylized-concept
Asset type: production animation sprite sheet for the Hanni mascot
Use the attached image as the exact, locked character model reference. Match the original face, eye shape, muzzle, body proportions, fur rendering, tail volume, Hanfu construction, embroidery placement, book, pendant, and color palette. Do not redesign or make the head larger than the reference.
Style: soft polished 3D chibi render with plush fur exactly like the reference.
Layout: exactly nine distinct full-body keyframes in a three-by-three grid, read left-to-right and top-to-bottom. Three equal square columns by three equal square rows filling a square image. Transparent background, no borders, no gutters, no labels, no numbers, no captions, no shadows, no scenery. Every frame genuinely changes the character pose or facial action; never repeat one image with only scaling. Keep the character centered at identical size with feet on the same baseline. Safe margin inside every cell; one tail only, fully visible.
Consistency: the book cover consistently shows exactly “HanNi” and one gold plum blossom; the pendant consistently shows 汉. Avoid extra fingers, extra limbs, two tails, changing costume, changing face, cropped ears/paws/tail, motion blur, watermark.
```

## Chuỗi pose

- E00 Nghỉ: nghỉ → thở → hạ mí → nháy mắt → nhìn trái → nhìn phải/giật tai → nháy đôi → nghiêng đầu → nghỉ.
- E01 Chào: nghỉ → nhấc tay → bắt đầu vẫy → vẫy trái → vẫy phải → vẫy trái/bật nhẹ → hạ tay → gần nghỉ → nghỉ.
- E02 Suy nghĩ: nghỉ → đưa tay lên cằm → nhìn lên trái → 1 chấm → 2 chấm → 3 chấm → chấm mờ → bóng đèn “à ha” → nghỉ.
- E10 Đọc mẫu: nghỉ → hít vào/mở tay → mở miệng/1 sóng âm → khép miệng → âm miệng khác/2 nốt → gật → vừa đọc vừa chỉ sách → kết câu → nghỉ.
- E39 Ghi chú: nghỉ → lấy sổ và bút → mở sổ → viết dòng 1 → viết dòng 2 → lật trang → gạch chân/chạm → đưa sổ ra → đóng sổ.
- E42 Chăm chú: nghỉ → cúi nhẹ → cúi sâu nhìn input → đọc trái → đọc giữa/gật → đọc phải/giật tai → tựa cằm chờ → đứng thẳng → nghỉ.

Build script cắt từng sheet thành 9 PNG độc lập, lọc nhiễu alpha, rồi chọn các frame phù hợp để ghép clip `vao`, `giu`, `ra`, `bt*`.
