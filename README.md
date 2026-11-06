# Irodori Study

Ứng dụng học tiếng Nhật cá nhân bằng tiếng Việt, chạy tĩnh trên GitHub Pages.

- Kana, nhận diện, typing, SRS và lịch học tuần.
- Luyện viết Hiragana: hướng dẫn theo từng nét, hai ô tô theo mẫu và hai ô tự viết.
- Audio 46 chữ, có bản nghe viết với khoảng nghỉ 10 giây; PDF ôn tập tự biên soạn.
- Dark mode và giao diện điện thoại; hỗ trợ thêm vào màn hình chính.
- Tiến độ và bài viết đã lưu nằm trong IndexedDB của từng trình duyệt. Không có máy chủ lưu tiến độ, đăng nhập hoặc tự đồng bộ thiết bị. Xuất/nhập JSON trong Góc cá nhân để chuyển máy và sao lưu mỗi 3–7 ngày. Xóa dữ liệu trang web có thể mất dữ liệu.
- Phần nền tảng có thể dùng sau khi mở online lần đầu; audio/hướng dẫn đã tải được cache khi trình duyệt cho phép. Không đảm bảo toàn bộ audio có sẵn offline. Giọng TTS tùy thiết bị.
- Hermes chưa kết nối tự động trong bản Pages này. Không cần AI hoặc API trả phí để học cơ bản.

## Nguồn và giấy phép

Ứng dụng độc lập, không phải sản phẩm chính thức của The Japan Foundation.

Audio Hiragana: The Japan Foundation, *Irodori: Japanese for Life in Japan*, Starter 01-30. Các đoạn audio được cắt theo chữ; bản nghe viết thêm khoảng nghỉ. Đây là tài liệu giảng dạy miễn phí liên quan đến Irodori, ghi nguồn theo [điều khoản sử dụng](https://www.irodori.jpf.go.jp/en/privacy.html). [Nguồn bài và audio](https://www.irodori.jpf.go.jp/en/starter/audio/lesson01.html).

Hình hướng dẫn nét `media/guide-*.svg` được chuyển thể từ [KanjiVG](https://kanjivg.tagaini.net/), Copyright © Ulrich Apel và các tác giả KanjiVG; [nguồn SVG](https://github.com/KanjiVG/kanjivg). Những hình chuyển thể này được phân phối theo [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Thay đổi: chia thành từng bước, tô nét mới màu đỏ, thêm số bước. Giấy phép này áp dụng cho hình hướng dẫn, không chuyển quyền sở hữu audio của Japan Foundation.

Các thẻ câu và PDF ôn tập được ứng dụng tự biên soạn; không phải bản sao nguyên bộ giáo trình. Không đăng PDF khóa học riêng, danh sách học viên, database hoặc khóa API trong repository này.

## Chạy và triển khai

Không cần build hoặc cài dependency. Dùng static server bất kỳ để thử, hoặc GitHub Pages từ nhánh `main`, thư mục gốc `/`. Toàn bộ đường dẫn nội bộ tương đối, hỗ trợ Pages project subpath.

Rollback giao diện bằng revert commit rồi push `main`. Việc cập nhật file web không xóa IndexedDB. Không xóa/chuyển đổi database trình duyệt khi chưa sao lưu.
