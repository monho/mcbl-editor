import type { Pool, RowDataPacket } from "mysql2/promise";
import mysql from "mysql2/promise";

/** 에디터 사이드바 메뉴 ↔ MySQL 테이블 */
export const MENU_TABLES = {
  pitches: "mcbl_editor_pitches",
  players: "mcbl_editor_players",
  clubs: "mcbl_editor_clubs",
  records: "mcbl_editor_records",
  misc: "mcbl_editor_misc",
} as const;

export type MenuKey = keyof typeof MENU_TABLES;

const globalForDb = globalThis as unknown as {
  mcblMysqlPool: Pool | undefined;
  mcblEditorSchemaReady: boolean | undefined;
};

const JSON_MENU_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS mcbl_editor_players (
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL COMMENT '선수관리 저장 JSON',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS mcbl_editor_records (
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL COMMENT '기록보기 저장 JSON',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS mcbl_editor_misc (
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL COMMENT '그 외 설정 저장 JSON',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const PITCHES_TABLE_SQL = `CREATE TABLE IF NOT EXISTS mcbl_editor_pitches (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const CLUBS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS mcbl_editor_clubs (
  idx INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '순번',
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '에디터 세션',
  club_name VARCHAR(128) NOT NULL COMMENT '구단명',
  color_code VARCHAR(32) NOT NULL DEFAULT '#FFFFFF' COMMENT '고유색코드',
  emblem_image_url VARCHAR(768) NOT NULL DEFAULT '' COMMENT '구단 마크 이미지 URL',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (idx),
  UNIQUE KEY uk_session_club (session_id, club_name),
  KEY idx_club_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

async function ensurePitchesTableStructure(pool: Pool): Promise<void> {
  const [cols] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mcbl_editor_pitches'`
  );
  const names = new Set(cols.map((r) => r.COLUMN_NAME as string));
  if (names.size === 0) {
    await pool.execute(PITCHES_TABLE_SQL);
    return;
  }
  if (names.has("payload") || !names.has("pitch_name")) {
    await pool.execute("DROP TABLE IF EXISTS mcbl_editor_pitches");
    await pool.execute(PITCHES_TABLE_SQL);
  }
}

async function ensureClubsTableStructure(pool: Pool): Promise<void> {
  const [cols] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mcbl_editor_clubs'`
  );
  const names = new Set(cols.map((r) => r.COLUMN_NAME as string));
  if (names.size === 0) {
    await pool.execute(CLUBS_TABLE_SQL);
    return;
  }
  if (names.has("payload") || !names.has("club_name")) {
    await pool.execute("DROP TABLE IF EXISTS mcbl_editor_clubs");
    await pool.execute(CLUBS_TABLE_SQL);
  }
}

export async function ensureEditorSchema(): Promise<void> {
  if (globalForDb.mcblEditorSchemaReady) return;
  const pool = getPool();
  for (const ddl of JSON_MENU_DDL) {
    await pool.execute(ddl);
  }
  await ensurePitchesTableStructure(pool);
  await ensureClubsTableStructure(pool);
  globalForDb.mcblEditorSchemaReady = true;
}

export function isDbConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_HOST?.trim() &&
      process.env.DATABASE_USER?.trim() &&
      process.env.DATABASE_PASSWORD !== undefined &&
      process.env.DATABASE_NAME?.trim()
  );
}

export function getPool(): Pool {
  if (!isDbConfigured()) {
    throw new Error("DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME 환경 변수가 필요합니다.");
  }
  if (!globalForDb.mcblMysqlPool) {
    globalForDb.mcblMysqlPool = mysql.createPool({
      host: process.env.DATABASE_HOST!.trim(),
      port: Number(process.env.DATABASE_PORT || "3306"),
      user: process.env.DATABASE_USER!.trim(),
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME!.trim(),
      waitForConnections: true,
      connectionLimit: Number(process.env.DATABASE_POOL || "5"),
      charset: "utf8mb4_unicode_ci",
      enableKeepAlive: true,
    });
  }
  return globalForDb.mcblMysqlPool;
}

function assertMenuKey(section: unknown): MenuKey {
  if (typeof section !== "string" || !(section in MENU_TABLES)) {
    throw new Error("selection.sectionId 가 유효한 메뉴가 아닙니다.");
  }
  return section as MenuKey;
}

export type PitchInput = {
  idx?: number | null;
  pitch_name: string;
  speed_value: number;
  movement_lr: number;
  drop_ud: number;
  enabled: boolean;
};

function parsePitchList(body: Record<string, unknown>): PitchInput[] {
  const raw = body.pitches;
  if (!Array.isArray(raw)) {
    throw new Error("구종 저장에는 pitches 배열이 필요합니다.");
  }
  const out: PitchInput[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.pitch_name === "string" ? o.pitch_name.trim() : "";
    if (!name || name.length > 64) {
      throw new Error("구종명(pitch_name)은 1~64자 문자열이어야 합니다.");
    }
    out.push({
      idx: typeof o.idx === "number" ? o.idx : null,
      pitch_name: name,
      speed_value: Number(o.speed_value ?? 0),
      movement_lr: Number(o.movement_lr ?? 0),
      drop_ud: Number(o.drop_ud ?? 0),
      enabled: Boolean(o.enabled),
    });
  }
  return out;
}

async function savePitchesForSession(sessionId: string, body: Record<string, unknown>): Promise<void> {
  const list = parsePitchList(body);
  const pool = getPool();
  await pool.execute("DELETE FROM mcbl_editor_pitches WHERE session_id = ?", [sessionId]);
  for (const p of list) {
    await pool.execute(
      `INSERT INTO mcbl_editor_pitches (session_id, pitch_name, speed_value, movement_lr, drop_ud, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, p.pitch_name, p.speed_value, p.movement_lr, p.drop_ud, p.enabled ? 1 : 0]
    );
  }
}

export type ClubInput = {
  idx?: number | null;
  club_name: string;
  color_code: string;
  emblem_image_url: string;
};

function parseClubList(body: Record<string, unknown>): ClubInput[] {
  const raw = body.clubs;
  if (!Array.isArray(raw)) {
    throw new Error("구단 저장에는 clubs 배열이 필요합니다.");
  }
  const out: ClubInput[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.club_name === "string" ? o.club_name.trim() : "";
    if (!name || name.length > 128) {
      throw new Error("구단명(club_name)은 1~128자 문자열이어야 합니다.");
    }
    const color =
      typeof o.color_code === "string" && o.color_code.trim().length > 0
        ? o.color_code.trim().slice(0, 32)
        : "#FFFFFF";
    const url =
      typeof o.emblem_image_url === "string" ? o.emblem_image_url.trim().slice(0, 768) : "";
    out.push({
      idx: typeof o.idx === "number" ? o.idx : null,
      club_name: name,
      color_code: color,
      emblem_image_url: url,
    });
  }
  return out;
}

async function saveClubsForSession(sessionId: string, body: Record<string, unknown>): Promise<void> {
  const list = parseClubList(body);
  const pool = getPool();
  await pool.execute("DELETE FROM mcbl_editor_clubs WHERE session_id = ?", [sessionId]);
  for (const c of list) {
    await pool.execute(
      `INSERT INTO mcbl_editor_clubs (session_id, club_name, color_code, emblem_image_url)
       VALUES (?, ?, ?, ?)`,
      [sessionId, c.club_name, c.color_code, c.emblem_image_url]
    );
  }
}

export async function upsertMenuPayload(sessionId: string, menu: MenuKey, slice: unknown): Promise<void> {
  if (menu === "pitches" || menu === "clubs") {
    throw new Error("구종·구단은 JSON 테이블이 아닙니다.");
  }
  await ensureEditorSchema();
  const table = MENU_TABLES[menu];
  const pool = getPool();
  const json = JSON.stringify(slice);
  await pool.execute(
    `INSERT INTO \`${table}\` (session_id, payload) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP(3)`,
    [sessionId, json]
  );
}

export async function saveEditorPost(sessionId: string, body: Record<string, unknown>): Promise<MenuKey> {
  await ensureEditorSchema();
  const selection = body.selection as Record<string, unknown> | undefined;
  const menu = assertMenuKey(selection?.sectionId);
  if (menu === "pitches") {
    await savePitchesForSession(sessionId, body);
    return menu;
  }
  if (menu === "clubs") {
    await saveClubsForSession(sessionId, body);
    return menu;
  }
  const slice = {
    version: body.version,
    savedAt: body.savedAt,
    session: body.session ?? sessionId,
    selection: body.selection,
    rows: body.rows,
  };
  await upsertMenuPayload(sessionId, menu, slice);
  return menu;
}

type MenuRow = RowDataPacket & { payload: unknown; updated_at: Date };

type PitchDbRow = RowDataPacket & {
  idx: number;
  pitch_name: string;
  speed_value: string | number;
  movement_lr: string | number;
  drop_ud: string | number;
  enabled: number | boolean;
  updated_at: Date;
};

type ClubDbRow = RowDataPacket & {
  idx: number;
  club_name: string;
  color_code: string;
  emblem_image_url: string;
  updated_at: Date;
};

function considerLatest(t: Date | string, latestMs: { v: number }, savedAtIso: { v: string }): void {
  const d = t instanceof Date ? t : new Date(t);
  const ms = d.getTime();
  if (ms >= latestMs.v) {
    latestMs.v = ms;
    savedAtIso.v = d.toISOString();
  }
}

export async function loadMergedSession(sessionId: string): Promise<{ body: string; savedAt: string } | null> {
  await ensureEditorSchema();
  const pool = getPool();
  const menus: Record<string, unknown> = {};
  const latestMs = { v: 0 };
  const savedAtIso = { v: new Date(0).toISOString() };

  const [pitchRows] = await pool.query<PitchDbRow[]>(
    `SELECT idx, pitch_name, speed_value, movement_lr, drop_ud, enabled, updated_at
     FROM mcbl_editor_pitches WHERE session_id = ? ORDER BY idx`,
    [sessionId]
  );
  if (pitchRows.length === 0) {
    menus.pitches = null;
  } else {
    menus.pitches = pitchRows.map((r) => ({
      idx: r.idx,
      pitch_name: r.pitch_name,
      speed_value: Number(r.speed_value),
      movement_lr: Number(r.movement_lr),
      drop_ud: Number(r.drop_ud),
      enabled: Boolean(r.enabled),
    }));
    for (const r of pitchRows) {
      considerLatest(r.updated_at, latestMs, savedAtIso);
    }
  }

  const [clubRows] = await pool.query<ClubDbRow[]>(
    `SELECT idx, club_name, color_code, emblem_image_url, updated_at
     FROM mcbl_editor_clubs WHERE session_id = ? ORDER BY idx`,
    [sessionId]
  );
  if (clubRows.length === 0) {
    menus.clubs = null;
  } else {
    menus.clubs = clubRows.map((r) => ({
      idx: r.idx,
      club_name: r.club_name,
      color_code: r.color_code,
      emblem_image_url: r.emblem_image_url,
    }));
    for (const r of clubRows) {
      considerLatest(r.updated_at, latestMs, savedAtIso);
    }
  }

  for (const key of Object.keys(MENU_TABLES) as MenuKey[]) {
    if (key === "pitches" || key === "clubs") continue;
    const table = MENU_TABLES[key];
    const [rows] = await pool.query<MenuRow[]>(
      `SELECT payload, updated_at FROM \`${table}\` WHERE session_id = ? LIMIT 1`,
      [sessionId]
    );
    if (rows.length === 0) {
      menus[key] = null;
      continue;
    }
    const row = rows[0];
    let payload: unknown = row.payload;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload) as unknown;
      } catch {
        payload = null;
      }
    }
    menus[key] = payload;
    considerLatest(row.updated_at, latestMs, savedAtIso);
  }

  if (Object.values(menus).every((v) => v == null)) {
    return null;
  }

  const merged = {
    version: 2,
    session: sessionId,
    savedAt: savedAtIso.v,
    menus,
  };
  return { body: JSON.stringify(merged), savedAt: savedAtIso.v };
}
