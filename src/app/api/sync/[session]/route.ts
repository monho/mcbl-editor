import { NextRequest, NextResponse } from "next/server";

import { isDbConfigured, loadMergedSession, saveEditorPost } from "@/lib/editor-db";
import { isValidMcblSessionId } from "@/lib/mcbl-session";

type Ctx = { params: Promise<{ session: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "MySQL 환경 변수(DATABASE_*)가 설정되지 않았습니다." },
      { status: 503 }
    );
  }
  const { session: raw } = await context.params;
  const session = decodeURIComponent(raw);
  if (!isValidMcblSessionId(session)) {
    return NextResponse.json({ error: "invalid session" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  try {
    const menu = await saveEditorPost(session, body);
    return NextResponse.json({ ok: true, menu });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("selection.sectionId") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(_request: NextRequest, context: Ctx) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "MySQL 환경 변수(DATABASE_*)가 설정되지 않았습니다." },
      { status: 503 }
    );
  }
  const { session: raw } = await context.params;
  const session = decodeURIComponent(raw);
  if (!isValidMcblSessionId(session)) {
    return NextResponse.json({ error: "invalid session" }, { status: 400 });
  }
  try {
    const merged = await loadMergedSession(session);
    if (merged == null) {
      return NextResponse.json({ error: "no pending save" }, { status: 404 });
    }
    return new NextResponse(merged.body, {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
