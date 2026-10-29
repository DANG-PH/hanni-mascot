"""Product events and authored timing, shared by the build and demo manifest."""
CATALOGUE = {
    "e00-nghi": dict(code="E00", name="Nghỉ", category="ai", timing=[1200, 70, 80, 70, 180, 180], trigger="Trợ lý đang mở và chờ bạn đặt câu hỏi.", action="Thở nhẹ, nháy mắt, ngó quanh và giật tai."),
    "e01-chao": dict(code="E01", name="Chào", category="ai", timing=[110, 100, 110, 100, 110, 130], trigger="Lần đầu mở khung trợ lý hoặc bắt đầu buổi học.", action="Vẫy cả cẳng tay, nghiêng đầu và đuôi đung đưa."),
    "e02-suy-nghi": dict(code="E02", name="Suy nghĩ", category="ai", timing=[180]*6, trigger="Bạn vừa gửi câu hỏi, AI chưa có câu trả lời.", action="Chạm cằm, nghiêng đầu, mắt nhìn lên và ba chấm theo nhịp."),
    "e04-vui-mung": dict(code="E04", name="Vui mừng", category="learn", timing=[110, 110, 100, 110, 130, 160], trigger="Bạn trả lời đúng hoặc hoàn thành bài học.", action="Nhún gối, bật lên nhẹ, vẫy đuôi rồi tiếp đất.", hop=True),
    "e05-co-len": dict(code="E05", name="Cố lên!", category="learn", timing=[160, 140, 140, 160, 170, 190], trigger="Bạn làm sai một câu hoặc muốn thử lại.", action="Giơ nắm tay động viên, gật đầu và mỉm cười khích lệ."),
    "e09-lang-nghe": dict(code="E09", name="Lắng nghe", category="learn", timing=[180, 160, 150, 160, 160, 190], trigger="Bạn bật micro để luyện nói hoặc luyện phát âm.", action="Đưa tai về phía âm thanh, cúi nghe và gật đầu."),
    "e10-doc-mau": dict(code="E10", name="Giảng bài", category="ai", timing=[100, 100, 90, 100, 100, 110], trigger="Trợ lý đang đọc mẫu hoặc giải thích đáp án.", action="Miệng đổi theo âm tiết, tay đưa ra giảng và gật đầu."),
    "e11-a-ha": dict(code="E11", name="À ha!", category="learn", timing=[150, 130, 130, 150, 150, 190], trigger="Hanni chỉ ra mẹo nhớ hoặc giải thích âm Hán Việt.", action="Chỉ tay lên, mắt sáng và gật đầu khi hiểu ra."),
    "e16-doc-sach": dict(code="E16", name="Đọc sách", category="learn", timing=[180, 160, 150, 160, 160, 190], trigger="Bạn xem bài đọc hoặc đọc một ví dụ tiếng Trung.", action="Mắt đọc theo dòng, gật hiểu và góc trang sách khẽ lật."),
    "e19-tim-kiem": dict(code="E19", name="Tìm kiếm", category="learn", timing=[170, 150, 150, 160, 160, 190], trigger="Đang tra từ hoặc chưa tìm thấy nội dung phù hợp.", action="Di chuyển kính lúp quanh cùng một mắt và nghiêng đầu tìm."),
    "e39-ghi-chu": dict(code="E39", name="Ghi chú", category="ai", timing=[170, 150, 150, 180, 150, 200], trigger="Trợ lý ghi lại quy tắc ngữ pháp hoặc nhận xét cuối buổi.", action="Một tay giữ sổ, một tay viết; đưa sổ ra rồi trở lại viết."),
    "e42-cham-chu": dict(code="E42", name="Chăm chú", category="ai", timing=[160, 150, 150, 160, 160, 180], trigger="Bạn đang gõ câu hỏi trong ô chat.", action="Cúi nhìn ô nhập, mắt theo chữ và gật đầu nhỏ."),
}
