import { NextRequest, NextResponse } from "next/server";

import { isValidMcblSessionId } from "@/lib/mcbl-session";

/** 서버리스에서는 인스턴스 간 공유되지 않음. 로컬 `next start` 단일 프로세스·또는 이후 Redis 등으로 교체 권장. */
const syncStore = new Map<string, string>();

type Ctx = { params: Promise<{ session: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const { session: raw } = await context.params;
  const session = decodeURIComponent(raw);
  if (!isValidMcblSessionId(session)) {
    return NextResponse.json({ error: "invalid session" }, { status: 400 });
  }
  const text = await request.text();
  if (!text || text.length > 2_000_000) {
    return NextResponse.json({ error: "body too large or empty" }, { status: 400 });
  }
  syncStore.set(session, text);
  return NextResponse.json({ ok: true });
}

export async function GET(_request: NextRequest, context: Ctx) {
  const { session: raw } = await context.params;
  const session = decodeURIComponent(raw);
  if (!isValidMcblSessionId(session)) {
    return NextResponse.json({ error: "invalid session" }, { status: 400 });
  }
  const body = syncStore.get(session);
  if (body == null) {
    return NextResponse.json({ error: "no pending save" }, { status: 404 });
  }
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
