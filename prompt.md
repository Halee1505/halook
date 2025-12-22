Prompt 1: Audit toàn pipeline (tìm nguyên nhân mất chi tiết)

Bạn là senior graphics engineer. Hãy audit code React Native Skia editor sau để tìm nguyên nhân vì sao khi chỉnh adjustments thì chi tiết vùng tối/sáng bị mất và không thể khôi phục khi kéo về.
Tập trung kiểm tra:

Có clamp/saturate ở giữa pipeline không (clamp trước khi xong toàn bộ adjustments).

Các phép brightness/contrast/highlights/shadows đang làm trong sRGB (gamma) hay linear.

RuntimeEffect/SkSL có dùng half gây banding/precision loss không.

Có bước nào destructive (snapshot/export rồi dùng lại ảnh đã encode) không.

Đầu ra yêu cầu:

Danh sách “root causes” theo mức độ chắc chắn.

Vị trí file + đoạn code cụ thể.

Fix proposal dạng patch (diff) cho SkSL + TS (nếu cần).

Ghi rõ trade-off (performance vs quality).

## Prompt 2: Fix SkSL theo nguyên tắc “linear workflow + clamp cuối”

Hãy refactor SkSL runtime effect (presetRuntimeEffect) để:

- Convert input from sRGB -> linear trước khi apply exposure/contrast/highlights/shadows.
- Thực hiện adjustments trong linear space bằng float (không dùng half cho intermediate).
- Tuyệt đối không clamp ở giữa pipeline; chỉ clamp đúng 1 lần ở cuối trước khi return.
- Thêm highlight roll-off mềm (tone mapping đơn giản) để tránh cháy trắng.
- Giảm banding vùng tối (ưu tiên precision + optional dithering nhẹ nếu hợp lý).

Yêu cầu:

- Trả về toàn bộ SkSL source hoàn chỉnh, có comment ngắn cho từng block.
- Giữ nguyên interface uniforms hiện tại nếu có thể; nếu bắt buộc đổi, hãy cập nhật buildShaderUniforms() tương ứng.
- Đảm bảo chạy được trong @shopify/react-native-skia RuntimeEffect.

Prompt 3: “Non-destructive editing” end-to-end (đảm bảo kéo về 0 trả đúng ảnh gốc)

Hãy kiểm tra toàn bộ flow edit/export của project (React Native + Skia) để đảm bảo non-destructive:

UI preview có thể dùng ảnh resize, nhưng export phải render lại từ ảnh gốc.

Không bao giờ set imageUri sang ảnh đã export rồi tiếp tục edit (trừ khi user “commit”).

Khi tất cả adjustments = 0 thì output preview phải pixel-match ảnh gốc (trong sai số gamma nhỏ).

Hãy đề xuất kiến trúc:

Editor state model (transform + adjustments).

Preview pipeline vs Final export pipeline.

API/function signature cụ thể cho render/export.

Test plan để verify “restore highlights/shadows” (bao gồm test ảnh high dynamic range / ảnh có vùng tối sâu).

## Prompt 4: Patch nhanh “tìm clamp và bỏ clamp sớm”

Hãy search toàn repo cho các pattern sau trong shader/preset math và đề xuất patch:

- clamp(…, 0, 1) / saturate() / min(max()) / step/smoothstep ở giữa pipeline
- pow(color, 2.2) hoặc pow(color, 1/2.2) đặt sai chỗ
- dùng half/half3/half4 trong các phép toán adjustments

Yêu cầu:

- Liệt kê kết quả search (file + line + snippet).
- Với mỗi vị trí, giải thích vì sao gây mất highlight/shadow.
- Tạo patch diff tối thiểu để đưa clamp về cuối pipeline và chuyển sang float intermediate.

REPO:
“Không hỏi lại. Nếu thiếu context, đưa ra giả định hợp lý và ghi rõ giả định trong phần Notes.”
