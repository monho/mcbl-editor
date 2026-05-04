import type { Pool, RowDataPacket } from "mysql2/promise";
import mysql from "mysql2/promise";

/** 에디터 사이드바 메뉴 ↔ MySQL 테이블 (각 메뉴별 1행/세션) */
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

/** scripts/init-editor-mysql.sql 과 동일. MySQL 사용자에게 CREATE 권한이 있어야 자동 생성됩니다. */
const EDITOR_TABLE_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS mcbl_editor_pitches (
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '에디터 세션',
  payload JSON NOT NULL COMMENT '구종설정 저장 JSON',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS mcbl_editor_players (
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL COMMENT '선수관리 저장 JSON',
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS mcbl_editor_clubs (
  session_id CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL COMMENT '구단관리 저장 JSON',
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

export async function ensureEditorSchema(): Promise<void> {
  if (globalForDb.mcblEditorSchemaReady) return;
  const pool = getPool();
  for (const ddl of EDITOR_TABLE_DDL) {
    await pool.execute(ddl);
  }
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

export async function upsertMenuPayload(sessionId: string, menu: MenuKey, slice: unknown): Promise<void> {
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
  const selection = body.selection as Record<string, unknown> | undefined;
  const menu = assertMenuKey(selection?.sectionId);
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

export async function loadMergedSession(sessionId: string): Promise<{ body: string; savedAt: string } | null> {
  await ensureEditorSchema();
  const pool = getPool();
  const menus: Record<string, unknown> = {};
  let latestMs = 0;
  let savedAtIso = new Date(0).toISOString();

  for (const key of Object.keys(MENU_TABLES) as MenuKey[]) {
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
    const t = row.updated_at instanceof Date ? row.updated_at.getTime() : new Date(row.updated_at).getTime();
    if (t >= latestMs) {
      latestMs = t;
      savedAtIso = (row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at)).toISOString();
    }
  }

  if (Object.values(menus).every((v) => v == null)) {
    return null;
  }

  const merged = {
    version: 2,
    session: sessionId,
    savedAt: savedAtIso,
    menus,
  };
  return { body: JSON.stringify(merged), savedAt: savedAtIso };
}
