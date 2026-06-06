## Jumpuk Chat - Kế hoạch xây dựng

App nhắn tin realtime hoàn chỉnh, không có bot/bạn ảo, mọi tương tác đều giữa user thật qua Lovable Cloud.

### Phase 1: Nền tảng & Design System
- Bật **Lovable Cloud** (auth + database + storage + realtime)
- Design system màu **hồng candy** (chủ đạo `oklch` pink + cream + dark accent), font Quicksand/Nunito (bo tròn, dễ thương)
- Logo **heo** vẽ tay bằng SVG (component `PigLogo`)
- Tất cả icon (gửi, voice, gọi, camera, tim, bom, like, dislike, settings) vẽ SVG inline - không dùng lucide
- Phong cách: messenger (chat bubbles 2 chiều) × snapchat (màu vibrant, full-screen camera-like) × lotus chat (sticker-heavy, soft UI)

### Phase 2: Auth & User ID
- Đăng ký/đăng nhập email + password (auto-confirm để test nhanh)
- Mỗi user nhận **ID 7 số ngẫu nhiên** duy nhất, hiển thị to trên profile, nút copy ID
- Avatar upload (storage bucket `avatars` public)
- Trang Profile: đổi tên, avatar, xem ID

### Phase 3: Kết bạn qua ID
- Tab "Bạn bè": nhập ID 7 số → gửi lời mời
- Danh sách lời mời đến/đi, chấp nhận/từ chối
- Danh sách bạn bè + trạng thái online (Realtime Presence)

### Phase 4: Chat 1-1 Realtime
- Bảng `conversations`, `messages` với RLS chặt (chỉ thành viên đọc/ghi)
- Realtime subscription cho tin nhắn mới
- Gửi: text, ảnh, video, voice (record MediaRecorder), upload lên bucket `chat-media`
- Bubble UI bo tròn lớn, ảnh/video preview inline, voice có waveform giả + nút play
- **Đổi nền chat**: chọn từ 6 background preset (gradient hồng/tím/xanh/đêm) hoặc upload ảnh riêng, lưu vào conversation settings

### Phase 5: Gọi điện Online (Audio only, không cam)
- WebRTC peer-to-peer, signaling qua Supabase Realtime broadcast channel
- Chỉ **audio** (getUserMedia audio:true) - không bật video
- Màn hình gọi full-screen: avatar to + tên + thời gian
- **Nút thả icon nhỏ**: 4 reaction floating (❤️ tim, 💣 bom, 👍 like, 👎 dislike) - khi nhấn sẽ bay lên màn hình đối phương realtime
- Nút mute, loa, kết thúc

### Phase 6: Polish
- Trang chính: list conversation + nav bottom (Chat / Bạn bè / Profile)
- Animation framer-motion (bubble pop, reaction float)
- Responsive mobile-first (target 390x844)

### Kỹ thuật
- **Bảng DB**: `profiles` (user_id, friend_id 7 số, display_name, avatar_url), `friendships` (user_a, user_b, status), `conversations` (id, chat_bg), `conversation_members`, `messages` (conv_id, sender, type, content, media_url), `call_reactions` (transient qua realtime)
- **Storage**: `avatars` (public), `chat-media` (public read, auth write)
- **RLS**: tất cả bảng, dùng `has_role`-style helpers nếu cần
- **WebRTC**: signaling channel `call:{conversationId}`, ICE servers dùng Google STUN free
- Tránh: bot, fake friends, mock data

Đây là dự án lớn, tôi sẽ build phase 1-3 trong lượt đầu để có nền vững, sau đó bạn duyệt rồi đi tiếp phase 4-6.
