-- phpMyAdmin SQL Dump
-- version 4.9.0.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: sql104.infinityfree.com
-- Thời gian đã tạo: Th4 03, 2026 lúc 10:18 AM
-- Phiên bản máy phục vụ: 11.4.10-MariaDB
-- Phiên bản PHP: 7.2.22

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `if0_41324441_cineshadow`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `icon`, `sort_order`, `created_at`) VALUES
(1, 'Phim Truyen Hinh', 'phim-truyen-hinh', 'Cac doan trich tu phim truyen hinh Trung Quoc', 'movie', 1, '2026-03-06 19:49:25'),
(2, 'Phim Dien Anh', 'phim-dien-anh', 'Doan hoi thoai tu phim chieu rap', 'theaters', 2, '2026-03-06 19:49:25'),
(3, 'Vlog', 'vlog', 'Video blog tu YouTuber/Douyin', 'videocam', 3, '2026-03-06 19:49:25'),
(4, 'Tin Tuc', 'tin-tuc', 'Ban tin thoi su tieng Trung', 'newspaper', 4, '2026-03-06 19:49:25'),
(5, 'Hoat Hinh', 'hoat-hinh', 'Phim hoat hinh cho nguoi moi hoc', 'animation', 5, '2026-03-06 19:49:25'),
(6, 'Hoi Thoai Thuc Te', 'hoi-thoai-thuc-te', 'Hoi thoai doi thuong', 'record_voice_over', 6, '2026-03-06 19:49:25');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `study_streaks`
--

CREATE TABLE `study_streaks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `study_date` date NOT NULL,
  `minutes_studied` int(11) DEFAULT 0,
  `videos_watched` int(11) DEFAULT 0,
  `words_learned` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `subtitle_clicks`
--

CREATE TABLE `subtitle_clicks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `video_id` int(11) NOT NULL,
  `clicked_text` varchar(50) NOT NULL,
  `timestamp_in_video` decimal(10,3) DEFAULT NULL,
  `clicked_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `hsk_level` tinyint(4) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `email_verified` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `avatar_url`, `role`, `hsk_level`, `created_at`, `updated_at`, `last_login`, `is_active`, `email_verified`) VALUES
(1, 'admin', 'admin@cineshadow.com', '$2y$10$vXmYxYohDUV2pERKimi/tuKvjErX96.g6wJTb0Cvc6sn/IxlJuH8i', 'Administrator', NULL, 'admin', 1, '2026-03-06 19:49:56', '2026-03-06 19:49:56', NULL, 1, 1),
(2, 'vu33402', 'vu33402@gmail.com', '$2y$10$4Ug3v/6WVu0uful4glOz/OMu78IamGGwwkCQxLreDURannh6P9OBG', 'quoc vu', NULL, 'user', 1, '2026-03-07 03:15:21', '2026-03-07 03:15:21', NULL, 1, 0),
(3, '23a7201d0266', '23a7201d0266@students.hou.edu.vn', '$2y$10$bZCwoOUREjaJVdK2HODCW.2j7K4yhZfU6R4tO8AkaEp/VmiDGD2lS', 'Vũ Thu ', NULL, 'user', 3, '2026-03-07 04:14:17', '2026-04-03 09:45:33', NULL, 0, 0),
(4, 'ngothihoaithuong21', 'ngothihoaithuong21@gmail.com', '$2y$10$NEVDCmMgU6oroZKgU.osaeZqydls5FpwAk2qwyt537xVeTIJ2ddgG', 'Ngô Thị Hoài Thương', NULL, 'user', 1, '2026-04-03 08:02:31', '2026-04-03 08:02:31', NULL, 1, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user_progress`
--

CREATE TABLE `user_progress` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `video_id` int(11) NOT NULL,
  `watched_seconds` int(11) DEFAULT 0,
  `last_position` decimal(10,3) DEFAULT 0.000,
  `watch_percentage` decimal(5,2) DEFAULT 0.00,
  `is_completed` tinyint(1) DEFAULT 0,
  `completed_at` timestamp NULL DEFAULT NULL,
  `shadowing_count` int(11) DEFAULT 0,
  `loop_count` int(11) DEFAULT 0,
  `first_watched_at` timestamp NULL DEFAULT current_timestamp(),
  `last_watched_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `user_progress`
--

INSERT INTO `user_progress` (`id`, `user_id`, `video_id`, `watched_seconds`, `last_position`, `watch_percentage`, `is_completed`, `completed_at`, `shadowing_count`, `loop_count`, `first_watched_at`, `last_watched_at`) VALUES
(162, 1, 6, 58, '58.345', '67.44', 0, NULL, 0, 0, '2026-03-27 10:34:34', '2026-03-27 10:45:05'),
(163, 2, 7, 237, '237.935', '100.00', 1, '2026-03-28 17:46:25', 0, 0, '2026-03-28 03:41:53', '2026-03-28 03:46:25'),
(165, 4, 9, 69, '69.649', '35.20', 0, NULL, 0, 0, '2026-04-03 08:05:16', '2026-04-03 08:06:20'),
(166, 4, 8, 14, '14.828', '11.76', 0, NULL, 0, 0, '2026-04-03 08:06:37', '2026-04-03 08:06:50'),
(167, 4, 7, 16, '16.196', '6.75', 0, NULL, 0, 0, '2026-04-03 08:07:06', '2026-04-03 08:07:07'),
(168, 4, 6, 17, '17.952', '19.77', 0, NULL, 0, 0, '2026-04-03 08:07:23', '2026-04-03 08:07:26');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user_saved_words`
--

CREATE TABLE `user_saved_words` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `vocabulary_id` int(11) DEFAULT NULL,
  `custom_word_cn` varchar(50) DEFAULT NULL,
  `custom_pinyin` varchar(100) DEFAULT NULL,
  `custom_meaning` varchar(200) DEFAULT NULL,
  `mastery_level` tinyint(4) DEFAULT 0,
  `review_count` int(11) DEFAULT 0,
  `last_reviewed_at` timestamp NULL DEFAULT NULL,
  `next_review_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL,
  `is_valid` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `videos`
--

CREATE TABLE `videos` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `title_cn` varchar(200) DEFAULT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `hsk_level` tinyint(4) NOT NULL DEFAULT 1,
  `video_url` varchar(500) NOT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `subtitle_cn_url` varchar(500) DEFAULT NULL,
  `subtitle_vi_url` varchar(500) DEFAULT NULL,
  `subtitle_pinyin_url` varchar(500) DEFAULT NULL,
  `duration` int(11) DEFAULT 0,
  `difficulty_score` decimal(3,2) DEFAULT 1.00,
  `view_count` int(11) DEFAULT 0,
  `like_count` int(11) DEFAULT 0,
  `is_published` tinyint(1) DEFAULT 0,
  `is_free` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `published_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `videos`
--

INSERT INTO `videos` (`id`, `title`, `title_cn`, `description`, `category_id`, `hsk_level`, `video_url`, `thumbnail_url`, `subtitle_cn_url`, `subtitle_vi_url`, `subtitle_pinyin_url`, `duration`, `difficulty_score`, `view_count`, `like_count`, `is_published`, `is_free`, `created_at`, `updated_at`, `published_at`, `created_by`) VALUES
(6, '30 chưa phải là hết', '三十而已', '', 1, 3, 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/videos/1774607648_c4118e7b95ea67be.mp4', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/thumbnails/1774607653_3cbb5ed7441bd847.png', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1774607653_cf21d094d8021411.vtt', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1774607654_ab10235add331a1a.vtt', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1774607655_2da27201464f4508.vtt', 86, '1.00', 42, 0, 1, 1, '2026-03-27 10:34:15', '2026-04-03 09:30:46', NULL, NULL),
(7, 'Vụng trộm không thể giấu', '偷偷藏不住', '', 1, 4, 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/videos/1774668915_74d68e6043e05296.mp4', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/thumbnails/1775210652_d18b7dfac1dd078b.jpg', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1774669085_725c586ae7429e56.vtt', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1774669086_dd70e8949eadf71c.vtt', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1774669087_90ebbc222c59015f.vtt', 238, '1.00', 37, 0, 1, 1, '2026-03-28 03:38:07', '2026-04-03 10:04:14', NULL, NULL),
(8, 'Khi anh chạy về phía em', '当你飞奔向你', '', 1, 4, 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/videos/1775183689_be2225adb144df2b.mp4', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/thumbnails/1775183807_638be8a8d6cbf31e.png', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1775183807_562ad9fcae761bf1.vtt', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1775183808_fde209693921eaa8.vtt', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1775183809_986d68b0cabf3ef5.vtt', 120, '1.00', 5, 0, 1, 1, '2026-04-03 02:36:50', '2026-04-03 08:06:50', NULL, NULL),
(9, 'Đi về nơi có gió', '去有风的地方', '', 1, 4, 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/videos/1775184967_9ed80a10344ff2e0.mp4', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/thumbnails/1775210910_3654cd985830c18b.jpg', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1775185041_7e0de32af1169d62.vtt', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1775185041_52cff3f54f55deb8.vtt', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1775185042_beda5908ae604eda.vtt', 196, '1.00', 11, 0, 1, 1, '2026-04-03 02:57:23', '2026-04-03 10:08:31', NULL, NULL),
(10, 'Khi anh chạy về phía em', '当你飞奔向你', '', 1, 3, 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/videos/1775209241_0537ad247150bef4.mp4', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/thumbnails/1775210584_7b07b1b211fd6448.png', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1775209249_1164659f786a1395.vtt', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1775209250_2864448b127ef038.vtt', 'https://pub-bd802955a94e4671a94d812f42c4435d.r2.dev/subtitles/1775209250_1e8de94271190703.vtt', 86, '1.00', 1, 0, 1, 1, '2026-04-03 09:40:51', '2026-04-03 10:03:05', NULL, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `video_slang`
--

CREATE TABLE `video_slang` (
  `id` int(11) NOT NULL,
  `video_id` int(11) NOT NULL,
  `word_cn` varchar(120) NOT NULL,
  `pinyin` varchar(120) DEFAULT NULL,
  `meaning_vi` text DEFAULT NULL,
  `tone_note` text DEFAULT NULL,
  `usage_note` text DEFAULT NULL,
  `example_cn_1` text DEFAULT NULL,
  `example_pinyin_1` text DEFAULT NULL,
  `example_vi_1` text DEFAULT NULL,
  `example_cn_2` text DEFAULT NULL,
  `example_pinyin_2` text DEFAULT NULL,
  `example_vi_2` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `video_slang`
--

INSERT INTO `video_slang` (`id`, `video_id`, `word_cn`, `pinyin`, `meaning_vi`, `tone_note`, `usage_note`, `example_cn_1`, `example_pinyin_1`, `example_vi_1`, `example_cn_2`, `example_pinyin_2`, `example_vi_2`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 6, '吃软饭', 'chī ruǎn fàn', 'đàn ông sống dựa vào tiền phụ nữ, ăn bám', 'mỉa mai, không dùng trong tình huống trang trọng.', NULL, '他不上班，天天吃软饭。', 'Tā bù shàngbān, tiāntiān chī ruǎn fàn.', 'Anh ta không đi làm, suốt ngày ăn bám.', '有人说他结婚就是为了吃软饭。', 'Yǒurén shuō tā jiéhūn jiù shì wèile chī ruǎn fàn.', 'Có người nói anh ta cưới vợ chỉ để ăn bám.', 1, '2026-03-27 10:34:15', '2026-03-27 10:34:15'),
(2, 7, '很二', 'hěn èr', 'ngốc nghếch, khờ khạo, làm việc thiếu suy nghĩ.', 'trêu đùa, dùng trong quan hệ thân mật.', 'nói khi ai đó làm chuyện “không dùng não”.', '他今天真的很二。', 'Tā jīntiān zhēn de hěn èr.', 'Hôm nay cậu ấy ngốc thật.', NULL, NULL, NULL, 1, '2026-03-28 03:38:07', '2026-03-28 03:38:07'),
(3, 8, '小哭包', 'xiǎo kū bāo', 'người hay khóc, dễ xúc động.', 'đáng yêu, cưng chiều.', 'gọi người yêu, bạn thân hoặc trẻ con.', '你怎么又哭了，小哭包。', 'Nǐ zěnme yòu kū le, xiǎo kū bāo.', 'Sao lại khóc nữa rồi, đồ mít ướt.', '这个小哭包一受委屈就哭。', 'Zhège xiǎo kū bāo yí shòu wěiqu jiù kū.', 'Bé mít ướt này hễ bị tủi thân là khóc.', 1, '2026-04-03 02:36:50', '2026-04-03 02:36:50'),
(4, 9, '鸽子 / 放鸽子', 'gēzi / fàng gēzi', 'cho leo cây, huỷ kèo phút chót.', 'khẩu ngữ, trách nhẹ hoặc nói đùa.', 'dùng khi ai đó thất hẹn.', '别放我鸽子啊。', 'Bié fàng wǒ gēzi a.', 'Đừng cho tôi leo cây nhé.', '他昨天又鸽子我们了。', 'Tā zuótiān yòu gēzi wǒmen le.', 'Hôm qua nó lại cho bọn tôi leo cây.', 1, '2026-04-03 02:57:23', '2026-04-03 02:57:23'),
(5, 10, '吃醋', 'chī cù', 'ghen trong tình cảm.', 'trung tính, thường dùng trong hội thoại.', 'nói về cảm giác ghen.', '你是不是吃醋了？', 'Nǐ shì bú shì chī cù le?', 'Bạn đang ghen đúng không?', '她看到我和别人聊天就吃醋。', 'Tā kàndào wǒ hé biérén liáotiān jiù chī cù.', 'Cô ấy thấy tôi nói chuyện với người khác là ghen.', 1, '2026-04-03 09:40:51', '2026-04-03 09:40:51');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `video_vocabulary`
--

CREATE TABLE `video_vocabulary` (
  `id` int(11) NOT NULL,
  `video_id` int(11) NOT NULL,
  `word_cn` varchar(50) NOT NULL,
  `pinyin` varchar(100) DEFAULT NULL,
  `meaning_vi` varchar(200) DEFAULT NULL,
  `word_type` enum('noun','verb','adj','adv','phrase','other') DEFAULT 'other',
  `hsk_level` tinyint(4) DEFAULT NULL,
  `example_sentence` varchar(500) DEFAULT NULL,
  `timestamp_start` decimal(10,3) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `video_vocabulary`
--

INSERT INTO `video_vocabulary` (`id`, `video_id`, `word_cn`, `pinyin`, `meaning_vi`, `word_type`, `hsk_level`, `example_sentence`, `timestamp_start`, `sort_order`) VALUES
(302, 7, '一', 'yī', 'Số 1', '', 1, '人家在店里等了你一下午', '173.760', 1),
(303, 7, '上', 'shàng', 'Trên, lên', 'noun', 1, '你上次跟我说小段得了阑尾炎', '125.580', 2),
(304, 7, '下', 'xià', 'Dưới, xuống', 'noun', 1, '下学期不要再给了，我的呢', '45.940', 3),
(305, 7, '下午', 'xiàwǔ', 'Buổi chiều', 'noun', 1, '人家在店里等了你一下午', '173.760', 4),
(306, 7, '不', 'bù', 'Không', 'adv', 1, '这样冬天手就不会裂了', '32.619', 5),
(307, 7, '个', 'gè', 'Cái, con (lượng từ)', '', 1, '是这个吗', '16.960', 6),
(308, 7, '买', 'mǎi', 'Mua', 'verb', 1, '给妈妈买的', '11.460', 7),
(309, 7, '二', 'èr', 'Số 2', '', 1, NULL, '64.570', 8),
(310, 7, '人', 'rén', 'Người', 'noun', 1, '你看看人家', '167.940', 9),
(311, 7, '什么', 'shénme', 'Cái gì', 'adj', 1, '什么玩意儿', '59.100', 10),
(312, 7, '他', 'tā', 'Anh ấy', '', 1, '他过去日子过得太苦了', '139.600', 11),
(313, 7, '会', 'huì', 'Biết (kỹ năng)', 'verb', 1, '这样冬天手就不会裂了', '32.619', 12),
(314, 7, '你', 'nǐ', 'Bạn', '', 1, '你喜欢的', '12.780', 13),
(315, 7, '医生', 'yīshēng', 'Bác sĩ', 'noun', 1, '恢复得蛮好的，医生说是', '130.760', 14),
(316, 7, '吃', 'chī', 'Ăn', 'verb', 1, '你给我好好吃', '103.960', 15),
(317, 7, '同学', 'tóngxué', 'Bạn học', 'noun', 1, '还蛮好的，我身边好的同学', '148.360', 16),
(318, 7, '吗', 'ma', 'Không (câu hỏi)', '', 1, '是这个吗', '16.960', 17),
(319, 7, '听', 'tīng', 'Nghe', 'verb', 1, '你听见没', '136.770', 18),
(320, 7, '呢', 'ne', 'Nhỉ, thế (trợ từ)', '', 1, '两个呢', '20.560', 19),
(321, 7, '哪', 'nǎ', 'Nào, đâu', 'adj', 1, '哪里丑了', '63.120', 20),
(322, 7, '喝', 'hē', 'Uống', 'verb', 1, '去喝个下午茶总有时间吧', '208.060', 21),
(323, 7, '在', 'zài', 'Ở, tại', '', 1, '很成熟现在', '39.610', 22),
(324, 7, '大', 'dà', 'Lớn, to', 'adj', 1, '我已经长大了', '38.030', 23),
(325, 7, '太', 'tài', 'Quá, lắm', 'adv', 1, '他过去日子过得太苦了', '139.600', 24),
(326, 7, '女儿', 'nǚ\'ér', 'Con gái', 'noun', 1, '还是女儿贴心', '36.660', 25),
(327, 7, '好', 'hǎo', 'Tốt, hay', 'adj', 1, '好喜欢家里这么热闹的感觉', '52.390', 26),
(328, 7, '妈妈', 'māma', 'Mẹ', 'noun', 1, '给妈妈买的', '8.280', 27),
(329, 7, '小', 'xiǎo', 'Nhỏ, bé', 'adj', 1, '来，小心烫', '14.810', 28),
(330, 7, '工作', 'gōngzuò', 'Công việc, làm việc', 'noun', 1, '那他现在工作怎么样', '144.880', 29),
(331, 7, '年', 'nián', 'Năm', 'noun', 1, '新年礼物', '9.850', 30),
(332, 7, '开', 'kāi', 'Mở, lái (xe)', 'verb', 1, '你打开看看', '13.640', 31),
(333, 7, '很', 'hěn', 'Rất', 'adv', 1, '存了很久的钱', '21.550', 32),
(334, 7, '怎么', 'zěnme', 'Thế nào, làm sao', 'adv', 1, '怎么了', '58.640', 33),
(335, 7, '想', 'xiǎng', 'Muốn, nghĩ', 'verb', 1, '我想你整天游手好闲', '206.280', 34),
(336, 7, '我们', 'wǒmen', 'Chúng tôi, chúng ta', '', 1, '干死我们', '201.510', 35),
(337, 7, '时候', 'shíhou', 'Lúc, khi', 'noun', 1, '估计是那时候留下了病根', '143.240', 36),
(338, 7, '是', 'shì', 'Là', 'verb', 1, '是这个吗', '16.960', 37),
(339, 7, '有', 'yǒu', 'Có', 'verb', 1, '哦，是是是，还有这个', '18.270', 38),
(340, 7, '来', 'lái', 'Đến', 'verb', 1, '来，小心烫', '14.810', 39),
(341, 7, '没', 'méi', 'Không có', 'adv', 1, '就是没有好好吃', '135.260', 40),
(342, 7, '点', 'diǎn', 'Giờ, chút ít', 'noun', 1, '像一点模样都没有', '225.080', 41),
(343, 7, '热', 'rè', 'Nóng', 'adj', 1, '好喜欢家里这么热闹的感觉', '89.290', 42),
(344, 7, '爸爸', 'bàba', 'Bố, ba', 'noun', 1, NULL, '24.500', 43),
(345, 7, '的', 'de', 'Của (trợ từ)', '', 1, '给妈妈买的', '11.460', 44),
(346, 7, '看', 'kàn', 'Xem, nhìn', 'verb', 1, '你打开看看', '13.640', 45),
(347, 7, '茶', 'chá', 'Trà', 'noun', 1, '去喝个下午茶总有时间吧', '208.060', 46),
(348, 7, '要', 'yào', 'Muốn, cần', 'verb', 1, '下学期不要再给了，我的呢', '45.940', 47),
(349, 7, '认识', 'rènshi', 'Quen biết', 'verb', 1, '去认识一下，爸妈你们看看我', '185.100', 48),
(350, 7, '说', 'shuō', 'Nói', 'verb', 1, '说喜欢', '82.310', 49),
(351, 7, '谢谢', 'xièxiè', 'Cảm ơn', 'verb', 1, '嗯，谢谢', '22.980', 50),
(352, 7, '这', 'zhè', 'Đây, này', 'adj', 1, '是这个吗', '16.960', 51),
(353, 7, '那', 'nà', 'Đó, kia', 'adj', 1, '那个恢复怎么样了', '128.640', 52),
(354, 7, '都', 'dōu', 'Đều', 'adv', 1, '都知道他设计的游戏很火', '151.220', 53),
(355, 7, '里', 'lǐ', 'Trong, bên trong', 'noun', 1, '哪里丑了', '63.120', 54),
(356, 7, '钱', 'qián', 'Tiền', 'noun', 1, '存了很久的钱', '21.550', 55),
(357, 7, '两', 'liǎng', 'Hai (số lượng)', '', 2, '两个呢', '20.560', 56),
(358, 7, '也', 'yě', 'Cũng', 'adv', 2, '你也得好好吃饭', '137.980', 57),
(359, 7, '可以', 'kěyǐ', 'Có thể, được', 'verb', 2, '是个护手霜，你去工地可以用', '29.170', 58),
(360, 7, '吧', 'ba', 'Nhé, đi, thôi', '', 2, '去喝个下午茶总有时间吧', '208.060', 59),
(361, 7, '哥哥', 'gēge', 'Anh trai', 'noun', 2, '谢谢哥哥', '106.340', 60),
(362, 7, '女', 'nǚ', 'Nữ, phụ nữ', 'adj', 2, '还是女儿贴心', '36.660', 61),
(363, 7, '对', 'duì', 'Đúng, đối với', 'adj', 2, '这种不对称的，不喜欢啊', '75.600', 62),
(364, 7, '小时', 'xiǎoshí', 'Giờ, tiếng đồng hồ', 'noun', 2, '这个是我为你排半个小时的队的', '99.800', 63),
(365, 7, '就', 'jiù', 'Thì, liền, ngay', 'adv', 2, '这样冬天手就不会裂了', '32.619', 64),
(366, 7, '已经', 'yǐjīng', 'Đã, rồi', 'adv', 2, '我已经长大了', '38.030', 65),
(367, 7, '快', 'kuài', 'Nhanh', 'adj', 2, '来，快', '92.900', 66),
(368, 7, '您', 'nín', 'Ngài, ông/bà (kính trọng)', '', 2, '还不是您花钱给多了', '43.280', 67),
(369, 7, '新', 'xīn', 'Mới', 'adj', 2, '新年礼物', '9.850', 68),
(370, 7, '次', 'cì', 'Lần', '', 2, '你上次跟我说小段得了阑尾炎', '125.580', 69),
(371, 7, '玩', 'wán', 'Chơi', 'verb', 2, '什么玩意儿', '59.100', 70),
(372, 7, '白', 'bái', 'Màu trắng', 'adj', 2, '不要白不要', '109.260', 71),
(373, 7, '知道', 'zhīdào', 'Biết', 'verb', 2, '知道你有眼光，今年就流行', '71.995', 72),
(374, 7, '给', 'gěi', 'Cho', 'verb', 2, '给妈妈买的', '11.460', 73),
(375, 7, '贵', 'guì', 'Đắt', 'adj', 2, '谁知道你是个贵人', '212.140', 74),
(376, 7, '还', 'hái', 'Còn, vẫn', 'adv', 2, '哦，是是是，还有这个', '18.270', 75),
(377, 7, '需要', 'xūyào', 'Cần', 'verb', 2, '需要吗', '190.120', 76),
(378, 7, '冬', 'dōng', 'Mùa đông', 'noun', 3, '这样冬天手就不会裂了', '32.619', 77),
(379, 7, '半', 'bàn', 'Một nửa', '', 3, '这个是我为你排半个小时的队的', '99.800', 78),
(380, 7, '啊', 'a', 'A, á (trợ từ)', '', 3, '谢谢啊', '41.554', 79),
(381, 7, '地', 'de', 'Trợ từ (trạng ngữ)', '', 3, '是个护手霜，你去工地可以用', '29.170', 80),
(382, 7, '差', 'chà', 'Kém, tồi', 'adj', 3, '这还差不多', '51.260', 81),
(383, 7, '放', 'fàng', 'Đặt, để', 'verb', 3, NULL, '42.560', 82),
(384, 7, '放心', 'fàngxīn', 'Yên tâm', 'verb', 3, NULL, '42.560', 83),
(385, 7, '段', 'duàn', 'Đoạn, khúc', '', 3, '你上次跟我说小段得了阑尾炎', '125.580', 84),
(386, 7, '而且', 'érqiě', 'Mà còn', '', 3, NULL, '105.020', 85),
(387, 7, '花', 'huā', 'Hoa, tiêu (tiền)', 'noun', 3, '还不是您花钱给多了', '43.280', 86),
(388, 7, '草', 'cǎo', 'Cỏ', 'noun', 3, '别浪费草莓了', '224.020', 87),
(389, 7, '跟', 'gēn', 'Cùng với, đi theo', '', 3, '小鬼，我跟你说啊', '97.300', 88),
(390, 7, '过去', 'guòqù', 'Quá khứ, đi qua', 'noun', 3, '他过去日子过得太苦了', '139.600', 89),
(391, 7, '还是', 'háishì', 'Hay là, vẫn', 'adv', 3, '还是女儿贴心', '36.660', 90),
(392, 7, '长', 'cháng', 'Dài', 'adj', 3, '我已经长大了', '38.030', 91),
(393, 7, '阿姨', 'āyí', 'Dì, cô', 'noun', 3, '我给你约了隔壁张阿姨的女儿', '171.320', 92),
(394, 7, '存', 'cún', 'Gửi, lưu trữ', 'verb', 4, '存了很久的钱', '21.550', 93),
(395, 7, '差不多', 'chàbuduō', 'Gần như, xấp xỉ', 'adv', 4, '这还差不多', '51.260', 94),
(396, 7, '得', 'děi', 'Phải, cần phải', 'verb', 4, '你上次跟我说小段得了阑尾炎', '125.580', 95),
(397, 7, '等', 'děng', 'Đợi, chờ / Vân vân', 'verb', 4, '人家在店里等了你一下午', '173.760', 96),
(398, 7, '超级', 'chāojí', 'Siêu cấp', 'adj', 5, '超级酷', '54.600', 97),
(399, 7, '哎呀', 'āiyā', 'Ái chà (ngạc nhiên)', '', 6, '哎呀，我说你啊，臧岩', '165.360', 98),
(400, 9, '一', 'yī', 'Số 1', '', 1, '那人家比我小六岁，我怕真在一块儿了，', '35.740', 1),
(401, 9, '三', 'sān', 'Số 3', '', 1, '鱼尾纹，熬夜三件套', '12.900', 2),
(402, 9, '上', 'shàng', 'Trên, lên', 'noun', 1, '一个住燕郊，一个住东四环，一周都见不上一面才分手的吗', '68.840', 3),
(403, 9, '下', 'xià', 'Dưới, xuống', 'noun', 1, '一点实际行动都没有，那不得考虑一下现实的年纪问题嘛', '48.440', 4),
(404, 9, '不', 'bù', 'Không', 'adv', 1, '你不是说最近新来的那个同事挺是你的菜了吗', '24.540', 5),
(405, 9, '个', 'gè', 'Cái, con (lượng từ)', '', 1, '哎呦，你看我这个大眼袋子吧', '5.000', 6),
(406, 9, '买', 'mǎi', 'Mua', 'verb', 1, '买房买车找男朋友啊', '122.460', 7),
(407, 9, '人', 'rén', 'Người', 'noun', 1, '那人家比我小六岁，我怕真在一块儿了，', '35.740', 8),
(408, 9, '什么', 'shénme', 'Cái gì', 'adj', 1, '他条件挺好，然后长得帅，叫什么来着', '27.320', 9),
(409, 9, '他', 'tā', 'Anh ấy', '', 1, '他条件挺好，然后长得帅，叫什么来着', '27.320', 10),
(410, 9, '你', 'nǐ', 'Bạn', '', 1, '哎呦，你看我这个大眼袋子吧', '5.000', 11),
(411, 9, '六', 'liù', 'Số 6', '', 1, '那人家比我小六岁，我怕真在一块儿了，', '35.740', 12),
(412, 9, '叫', 'jiào', 'Gọi, tên là', 'verb', 1, '他条件挺好，然后长得帅，叫什么来着', '27.320', 13),
(413, 9, '吗', 'ma', 'Không (câu hỏi)', '', 1, '你不是说最近新来的那个同事挺是你的菜了吗', '24.540', 14),
(414, 9, '呢', 'ne', 'Nhỉ, thế (trợ từ)', '', 1, '哎，你呢', '54.800', 15),
(415, 9, '哪', 'nǎ', 'Nào, đâu', 'adj', 1, '你说我哪有那时间耽误啊', '39.540', 16),
(416, 9, '哪儿', 'nǎr', 'Ở đâu', '', 1, '哪儿迷茫了呀', '119.080', 17),
(417, 9, '四', 'sì', 'Số 4', '', 1, '一个住燕郊，一个住东四环，一周都见不上一面才分手的吗', '68.840', 18),
(418, 9, '在', 'zài', 'Ở, tại', '', 1, '那人家比我小六岁，我怕真在一块儿了，', '35.740', 19),
(419, 9, '大', 'dà', 'Lớn, to', 'adj', 1, '哎呦，你看我这个大眼袋子吧', '5.000', 20),
(420, 9, '太', 'tài', 'Quá, lắm', 'adv', 1, '不太行', '61.960', 21),
(421, 9, '好', 'hǎo', 'Tốt, hay', 'adj', 1, '他条件挺好，然后长得帅，叫什么来着', '27.320', 22),
(422, 9, '小', 'xiǎo', 'Nhỏ, bé', 'adj', 1, '那人家比我小六岁，我怕真在一块儿了，', '35.740', 23),
(423, 9, '岁', 'suì', 'Tuổi', '', 1, '那人家比我小六岁，我怕真在一块儿了，', '35.740', 24),
(424, 9, '年', 'nián', 'Năm', 'noun', 1, '一点实际行动都没有，那不得考虑一下现实的年纪问题嘛', '48.440', 25),
(425, 9, '很', 'hěn', 'Rất', 'adv', 1, '目标很明确呀', '119.080', 26),
(426, 9, '怎么', 'zěnme', 'Thế nào, làm sao', 'adv', 1, '哎，同事怎么不行啦', '62.750', 27),
(427, 9, '想', 'xiǎng', 'Muốn, nghĩ', 'verb', 1, '哎呀做人可太难了，好想退休啊', '105.990', 28),
(428, 9, '时候', 'shíhou', 'Lúc, khi', 'noun', 1, '我突然特别怕自己变老，觉得啊，是时候该找个男朋友了', '17.680', 29),
(429, 9, '是', 'shì', 'Là', 'verb', 1, '我突然特别怕自己变老，觉得啊，是时候该找个男朋友了', '17.680', 30),
(430, 9, '有', 'yǒu', 'Có', 'verb', 1, '我早就有了，还有黑眼圈', '9.920', 31),
(431, 9, '朋友', 'péngyou', 'Bạn bè', 'noun', 1, '我突然特别怕自己变老，觉得啊，是时候该找个男朋友了', '17.680', 32),
(432, 9, '来', 'lái', 'Đến', 'verb', 1, '你不是说最近新来的那个同事挺是你的菜了吗', '24.540', 33),
(433, 9, '没', 'méi', 'Không có', 'adv', 1, '一点实际行动都没有，那不得考虑一下现实的年纪问题嘛', '48.440', 34),
(434, 9, '点', 'diǎn', 'Giờ, chút ít', 'noun', 1, '一点实际行动都没有，那不得考虑一下现实的年纪问题嘛', '48.440', 35),
(435, 9, '的', 'de', 'Của (trợ từ)', '', 1, '你不是说最近新来的那个同事挺是你的菜了吗', '24.540', 36),
(436, 9, '看', 'kàn', 'Xem, nhìn', 'verb', 1, '哎呦，你看我这个大眼袋子吧', '5.000', 37),
(437, 9, '能', 'néng', 'Có thể', 'verb', 1, '真能幸福了', '129.350', 38),
(438, 9, '菜', 'cài', 'Món ăn, rau', 'noun', 1, '你不是说最近新来的那个同事挺是你的菜了吗', '24.540', 39),
(439, 9, '要', 'yào', 'Muốn, cần', 'verb', 1, '今年可能不太行，马上要升职，要忙一阵', '145.250', 40),
(440, 9, '说', 'shuō', 'Nói', 'verb', 1, '你不是说最近新来的那个同事挺是你的菜了吗', '24.540', 41),
(441, 9, '这', 'zhè', 'Đây, này', 'adj', 1, '哎呦，你看我这个大眼袋子吧', '5.000', 42),
(442, 9, '那', 'nà', 'Đó, kia', 'adj', 1, '那你找呀', '23.200', 43),
(443, 9, '都', 'dōu', 'Đều', 'adv', 1, '一点实际行动都没有，那不得考虑一下现实的年纪问题嘛', '48.440', 44),
(444, 9, '也', 'yě', 'Cũng', 'adv', 2, '那也是兔子那尾巴，长不了', '39.540', 45),
(445, 9, '件', 'jiàn', 'Chiếc, cái (áo, việc)', '', 2, '鱼尾纹，熬夜三件套', '12.900', 46),
(446, 9, '可能', 'kěnéng', 'Có thể, có lẽ', 'adv', 2, '今年可能不太行，马上要升职，要忙一阵', '145.250', 47),
(447, 9, '吧', 'ba', 'Nhé, đi, thôi', '', 2, '哎呦，你看我这个大眼袋子吧', '5.000', 48),
(448, 9, '块', 'kuài', 'Đồng (tiền)', 'noun', 2, '那人家比我小六岁，我怕真在一块儿了，', '35.740', 49),
(449, 9, '女', 'nǚ', 'Nữ, phụ nữ', 'adj', 2, '我说你这个女人烦不烦啊', '153.040', 50),
(450, 9, '对', 'duì', 'Đúng, đối với', 'adj', 2, '所以嘛，你就是喊口号，对不对', '44.360', 51),
(451, 9, '就', 'jiù', 'Thì, liền, ngay', 'adv', 2, '我早就有了，还有黑眼圈', '9.920', 52),
(452, 9, '忙', 'máng', 'Bận rộn', 'adj', 2, '今年可能不太行，马上要升职，要忙一阵', '145.250', 53),
(453, 9, '意思', 'yìsi', 'Ý nghĩa', 'noun', 2, '不好意思嘛', '159.530', 54),
(454, 9, '找', 'zhǎo', 'Tìm, trả lại tiền', 'verb', 2, '我突然特别怕自己变老，觉得啊，是时候该找个男朋友了', '17.680', 55),
(455, 9, '新', 'xīn', 'Mới', 'adj', 2, '你不是说最近新来的那个同事挺是你的菜了吗', '24.540', 56),
(456, 9, '比', 'bǐ', 'So với', '', 2, '那人家比我小六岁，我怕真在一块儿了，', '35.740', 57),
(457, 9, '生日', 'shēngrì', 'Sinh nhật', 'noun', 2, '哎，你今年过生日', '166.400', 58),
(458, 9, '男', 'nán', 'Nam, đàn ông', 'adj', 2, '我突然特别怕自己变老，觉得啊，是时候该找个男朋友了', '17.680', 59),
(459, 9, '给', 'gěi', 'Cho', 'verb', 2, '我给你买个礼物啊', '170.100', 60),
(460, 9, '让', 'ràng', 'Nhường, để cho', 'verb', 2, '那当时让我去的也是你', '155.500', 61),
(461, 9, '近', 'jìn', 'Gần', 'adj', 2, '你不是说最近新来的那个同事挺是你的菜了吗', '24.540', 62),
(462, 9, '还', 'hái', 'Còn, vẫn', 'adv', 2, '我早就有了，还有黑眼圈', '9.920', 63),
(463, 9, '问', 'wèn', 'Hỏi', 'verb', 2, '一点实际行动都没有，那不得考虑一下现实的年纪问题嘛', '48.440', 64),
(464, 9, '问题', 'wèntí', 'Vấn đề, câu hỏi', 'noun', 2, '一点实际行动都没有，那不得考虑一下现实的年纪问题嘛', '48.440', 65),
(465, 9, '题', 'tí', 'Đề bài, câu hỏi', 'noun', 2, '一点实际行动都没有，那不得考虑一下现实的年纪问题嘛', '48.440', 66),
(466, 9, '黑', 'hēi', 'Màu đen', 'adj', 2, '我早就有了，还有黑眼圈', '9.920', 67),
(467, 9, '东', 'dōng', 'Phía Đông', 'noun', 3, '一个住燕郊，一个住东四环，一周都见不上一面才分手的吗', '68.840', 68),
(468, 9, '关', 'guān', 'Đóng, tắt', 'verb', 3, '关灯了', '181.140', 69),
(469, 9, '包', 'bāo', 'Túi, bao', 'noun', 3, '我要包', '176.660', 70),
(470, 9, '啊', 'a', 'A, á (trợ từ)', '', 3, '我突然特别怕自己变老，觉得啊，是时候该找个男朋友了', '17.680', 71),
(471, 9, '坏', 'huài', 'Hỏng, xấu', 'adj', 3, '好无心的坏女人', '163.380', 72),
(472, 9, '把', 'bǎ', 'Đem, lấy (giới từ)', '', 3, '我说咱俩啊，今年先把年假休了', '140.720', 73),
(473, 9, '放', 'fàng', 'Đặt, để', 'verb', 3, '放我鸽子放三年了', '158.140', 74),
(474, 9, '灯', 'dēng', 'Đèn', 'noun', 3, '关灯了', '181.140', 75),
(475, 9, '特别', 'tèbié', 'Đặc biệt', 'adv', 3, '我突然特别怕自己变老，觉得啊，是时候该找个男朋友了', '17.680', 76),
(476, 9, '还是', 'háishì', 'Hay là, vẫn', 'adv', 3, '现在没时间的还是你', '156.870', 77),
(477, 9, '长', 'cháng', 'Dài', 'adj', 3, '他条件挺好，然后长得帅，叫什么来着', '27.320', 78),
(478, 9, '当', 'dāng', 'Làm (nghề nghiệp)', 'verb', 4, '那当时让我去的也是你', '155.500', 79),
(479, 9, '当时', 'dāngshí', 'Lúc đó', 'noun', 4, '那当时让我去的也是你', '155.500', 80),
(480, 9, '得', 'děi', 'Phải, cần phải', 'verb', 4, '我突然特别怕自己变老，觉得啊，是时候该找个男朋友了', '17.680', 81),
(481, 9, '哎呀', 'āiyā', 'Ái chà (ngạc nhiên)', '', 6, '哎呀做人可太难了，好想退休啊', '105.990', 82),
(482, 9, '熬', 'áo', 'Chịu đựng, thức khuya', 'verb', 6, '鱼尾纹，熬夜三件套', '12.900', 83);

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Chỉ mục cho bảng `study_streaks`
--
ALTER TABLE `study_streaks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_date` (`user_id`,`study_date`),
  ADD KEY `idx_user_date` (`user_id`,`study_date`);

--
-- Chỉ mục cho bảng `subtitle_clicks`
--
ALTER TABLE `subtitle_clicks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_video` (`video_id`),
  ADD KEY `idx_text` (`clicked_text`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`);

--
-- Chỉ mục cho bảng `user_progress`
--
ALTER TABLE `user_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_video` (`user_id`,`video_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_video` (`video_id`);

--
-- Chỉ mục cho bảng `user_saved_words`
--
ALTER TABLE `user_saved_words`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vocabulary_id` (`vocabulary_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_review` (`next_review_at`);

--
-- Chỉ mục cho bảng `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_token` (`session_token`),
  ADD KEY `idx_token` (`session_token`),
  ADD KEY `idx_user` (`user_id`);

--
-- Chỉ mục cho bảng `videos`
--
ALTER TABLE `videos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_hsk` (`hsk_level`),
  ADD KEY `idx_category` (`category_id`),
  ADD KEY `idx_published` (`is_published`);

--
-- Chỉ mục cho bảng `video_slang`
--
ALTER TABLE `video_slang`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_video_slang_video` (`video_id`),
  ADD KEY `idx_video_slang_sort` (`video_id`,`sort_order`);

--
-- Chỉ mục cho bảng `video_vocabulary`
--
ALTER TABLE `video_vocabulary`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_video` (`video_id`),
  ADD KEY `idx_word` (`word_cn`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `study_streaks`
--
ALTER TABLE `study_streaks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `subtitle_clicks`
--
ALTER TABLE `subtitle_clicks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `user_progress`
--
ALTER TABLE `user_progress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=169;

--
-- AUTO_INCREMENT cho bảng `user_saved_words`
--
ALTER TABLE `user_saved_words`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `videos`
--
ALTER TABLE `videos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT cho bảng `video_slang`
--
ALTER TABLE `video_slang`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `video_vocabulary`
--
ALTER TABLE `video_vocabulary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=483;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `study_streaks`
--
ALTER TABLE `study_streaks`
  ADD CONSTRAINT `study_streaks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `subtitle_clicks`
--
ALTER TABLE `subtitle_clicks`
  ADD CONSTRAINT `subtitle_clicks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `subtitle_clicks_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `user_progress`
--
ALTER TABLE `user_progress`
  ADD CONSTRAINT `user_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_progress_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `user_saved_words`
--
ALTER TABLE `user_saved_words`
  ADD CONSTRAINT `user_saved_words_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_saved_words_ibfk_2` FOREIGN KEY (`vocabulary_id`) REFERENCES `video_vocabulary` (`id`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `videos`
--
ALTER TABLE `videos`
  ADD CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `videos_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `video_vocabulary`
--
ALTER TABLE `video_vocabulary`
  ADD CONSTRAINT `video_vocabulary_ibfk_1` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
