-- =============================================================================
-- mcbl-editor 테이블을 최신 스키마로 강제 갱신합니다.
-- 실행 전: mysqldump 등으로 백업하세요. 이 스크립트는 해당 테이블의 데이터를 삭제합니다.
-- 사용법: mysql -h HOST -u USER -p DATABASE < scripts/migrate-editor-to-latest.sql
-- =============================================================================

SET NAMES utf8mb4;

DROP TABLE IF EXISTS mcbl_editor_pitches;
DROP TABLE IF EXISTS mcbl_editor_players;
DROP TABLE IF EXISTS mcbl_editor_clubs;
DROP TABLE IF EXISTS mcbl_editor_records;
DROP TABLE IF EXISTS mcbl_editor_misc;

-- 구종: 행 단위 (세션별 여러 구종)
CREATE TABLE mcbl_editor_pitches (
  idx INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '순번',
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '에디터 세션',
  pitch_name VARCHAR(64) NOT NULL COMMENT '구종명',
  speed_value DECIMAL(8,2) NOT NULL DEFAULT 0.00 COMMENT '구속값',
  movement_lr DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT '좌우 무브먼트 값',
  drop_ud DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT '상하 낙차 값',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '사용여부 1=사용',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (idx),
  UNIQUE KEY uk_session_pitch (session_id, pitch_name),
  KEY idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mcbl_editor_players (
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL COMMENT '선수관리 저장 JSON',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 구단: 행 단위 (세션별 여러 구단)
CREATE TABLE mcbl_editor_clubs (
  idx INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '순번',
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '에디터 세션',
  club_name VARCHAR(128) NOT NULL COMMENT '구단명',
  color_code VARCHAR(32) NOT NULL DEFAULT '#FFFFFF' COMMENT '고유색코드',
  emblem_image_url VARCHAR(768) NOT NULL DEFAULT '' COMMENT '구단 마크 이미지 URL',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (idx),
  UNIQUE KEY uk_session_club (session_id, club_name),
  KEY idx_club_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mcbl_editor_records (
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL COMMENT '기록보기 저장 JSON',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mcbl_editor_misc (
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL COMMENT '그 외 설정 저장 JSON',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
