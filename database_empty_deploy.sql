
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

CREATE DATABASE IF NOT EXISTS `if0_41324441_cineshadow` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `if0_41324441_cineshadow`;

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `study_streaks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `study_date` date NOT NULL,
  `minutes_studied` int(11) DEFAULT 0,
  `videos_watched` int(11) DEFAULT 0,
  `words_learned` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subtitle_clicks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `video_id` int(11) NOT NULL,
  `clicked_text` varchar(50) NOT NULL,
  `timestamp_in_video` decimal(10,3) DEFAULT NULL,
  `clicked_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE `videos` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `title_cn` varchar(200) DEFAULT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `hsk_level` tinyint(4) NOT NULL DEFAULT 1,
  `language_track` enum('chinese','english') NOT NULL DEFAULT 'chinese',
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

ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

ALTER TABLE `study_streaks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_date` (`user_id`,`study_date`),
  ADD KEY `idx_user_date` (`user_id`,`study_date`);

ALTER TABLE `subtitle_clicks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_video` (`video_id`),
  ADD KEY `idx_text` (`clicked_text`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`);

ALTER TABLE `user_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_video` (`user_id`,`video_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_video` (`video_id`);

ALTER TABLE `user_saved_words`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vocabulary_id` (`vocabulary_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_review` (`next_review_at`);

ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_token` (`session_token`),
  ADD KEY `idx_token` (`session_token`),
  ADD KEY `idx_user` (`user_id`);

ALTER TABLE `videos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_hsk` (`hsk_level`),
  ADD KEY `idx_language_track` (`language_track`),
  ADD KEY `idx_category` (`category_id`),
  ADD KEY `idx_published` (`is_published`);

ALTER TABLE `video_slang`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_video_slang_video` (`video_id`),
  ADD KEY `idx_video_slang_sort` (`video_id`,`sort_order`);

ALTER TABLE `video_vocabulary`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_video` (`video_id`),
  ADD KEY `idx_word` (`word_cn`);

ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `study_streaks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `subtitle_clicks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `user_progress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `user_saved_words`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `videos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `video_slang`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `video_vocabulary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `study_streaks`
  ADD CONSTRAINT `study_streaks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `subtitle_clicks`
  ADD CONSTRAINT `subtitle_clicks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `subtitle_clicks_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE;

ALTER TABLE `user_progress`
  ADD CONSTRAINT `user_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_progress_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE;

ALTER TABLE `user_saved_words`
  ADD CONSTRAINT `user_saved_words_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_saved_words_ibfk_2` FOREIGN KEY (`vocabulary_id`) REFERENCES `video_vocabulary` (`id`) ON DELETE SET NULL;

ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `videos`
  ADD CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `videos_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `video_vocabulary`
  ADD CONSTRAINT `video_vocabulary_ibfk_1` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


