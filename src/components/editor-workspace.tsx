"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

/** LP 웹 에디터와 유사한 다크 팔레트 */
const C = {
  bg: "#1b1b24",
  sidebar: "#111119",
  row: "#2d2d38",
  rowHover: "#35354a",
  accent: "#7ed321",
  muted: "#8b8b9a",
  border: "#2a2a36",
} as const;

type SectionId = "pitches" | "players" | "clubs" | "records" | "misc";

type NavItem = { id: string; label: string };

const SECTIONS: { id: SectionId; title: string; items: NavItem[] }[] = [
  {
    id: "pitches",
    title: "구종설정",
    items: [
      { id: "pitch-default", label: "기본 구종 묶음" },
      { id: "pitch-custom", label: "커스텀 패턴" },
    ],
  },
  {
    id: "players",
    title: "선수관리",
    items: [{ id: "player-list", label: "등록 선수 목록" }],
  },
  {
    id: "clubs",
    title: "구단관리",
    items: [{ id: "club-list", label: "구단 목록" }],
  },
  {
    id: "records",
    title: "기록보기",
    items: [{ id: "records-game", label: "경기 기록" }],
  },
  {
    id: "misc",
    title: "그 외 설정",
    items: [
      { id: "misc-general", label: "일반" },
      { id: "misc-advanced", label: "고급" },
    ],
  },
];

type Selection = { sectionId: SectionId; itemId: string };

type TableRow = { key: string; value: string; expiry: string; context: string };

function rowsForSelection(sel: Selection | null): TableRow[] {
  if (!sel) {
    return [
      {
        key: "mcbl.session",
        value: "true",
        expiry: "never",
        context: "none",
      },
    ];
  }
  switch (sel.sectionId) {
    case "pitches":
      return [
        { key: "pitch.fastball.enabled", value: "true", expiry: "never", context: "none" },
        { key: "pitch.curve.spin", value: "1.0", expiry: "never", context: "none" },
        { key: "pitch.changeup.label", value: "체인지업", expiry: "never", context: "none" },
      ];
    case "players":
      return [
        { key: "player.register.auto", value: "false", expiry: "never", context: "none" },
        { key: "player.uuid.lookup", value: "true", expiry: "never", context: "none" },
      ];
    case "clubs":
      return [];
    case "records":
      return [
        { key: "records.view.last", value: "true", expiry: "never", context: "none" },
      ];
    case "misc":
      if (sel.itemId === "misc-advanced") {
        return [
          { key: "sync.websocket.reconnect", value: "true", expiry: "never", context: "none" },
          { key: "api.timeout_ms", value: "30000", expiry: "never", context: "none" },
        ];
      }
      return [
        { key: "editor.locale", value: "ko_KR", expiry: "never", context: "none" },
        { key: "sync.debug", value: "false", expiry: "never", context: "none" },
        { key: "notifications.enabled", value: "true", expiry: "never", context: "none" },
      ];
    default:
      return [];
  }
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.muted}
      strokeWidth="2"
      className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EditorWorkspace({
  sessionId,
  children,
}: {
  sessionId: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    pitches: true,
    players: true,
    clubs: true,
    records: true,
    misc: true,
  });
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection | null>({
    sectionId: "pitches",
    itemId: "pitch-default",
  });

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => it.label.toLowerCase().includes(q)),
    })).filter((sec) => sec.items.length > 0);
  }, [search]);

  const selectedItemLabel = useMemo(() => {
    if (!selection) return null;
    const sec = SECTIONS.find((s) => s.id === selection.sectionId);
    const item = sec?.items.find((i) => i.id === selection.itemId);
    if (!sec || !item) return null;
    return { sectionTitle: sec.title, itemLabel: item.label };
  }, [selection]);

  const tableRows = useMemo(() => rowsForSelection(selection), [selection]);

  const toggleSection = (id: SectionId) => {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  };

  return (
    <div
      className="mcbl-editor-root flex h-screen min-h-0 flex-col font-sans text-[15px] leading-normal text-zinc-200"
      style={{ backgroundColor: C.bg }}
    >
      <header
        className="flex h-11 shrink-0 items-center justify-between border-b px-4"
        style={{ borderColor: C.border, backgroundColor: C.sidebar }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-sm font-semibold tracking-tight" style={{ color: C.accent }}>
            MCBL Editor
          </span>
          <span className="hidden h-4 w-px sm:block" style={{ backgroundColor: C.border }} />
          <code
            className="hidden max-w-[10rem] truncate font-mono text-xs sm:inline"
            style={{ color: C.muted }}
          >
            {sessionId}
          </code>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: `${C.accent}22`, color: C.accent }}
        >
          연동 예정
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="flex w-[272px] shrink-0 flex-col border-r"
          style={{ borderColor: C.border, backgroundColor: C.sidebar }}
        >
          <div className="shrink-0 p-2">
            <input
              type="search"
              placeholder="검색…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border px-2.5 py-2 text-sm outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
              style={{
                borderColor: C.border,
                backgroundColor: C.bg,
                color: "#e4e4eb",
              }}
            />
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-1 pb-3">
            {filteredSections.map((sec) => {
              const isOpen = open[sec.id];
              const count = sec.items.length;
              return (
                <div key={sec.id} className="mb-1">
                  <div className="flex items-center gap-1 px-1">
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-2 text-left text-xs font-bold tracking-wide text-zinc-400 hover:text-zinc-300"
                    >
                      <Chevron open={isOpen} />
                      <span className="truncate">{sec.title}</span>
                      <span className="ml-auto shrink-0 font-normal text-zinc-500">({count})</span>
                    </button>
                    <button
                      type="button"
                      title="추가 (준비 중)"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-lg leading-none transition hover:opacity-90"
                      style={{
                        borderColor: C.border,
                        color: C.accent,
                        backgroundColor: "transparent",
                      }}
                    >
                      +
                    </button>
                  </div>
                  {isOpen && (
                    <ul className="mt-0.5 space-y-0.5 pl-1">
                      {sec.items.map((item) => {
                        const sel =
                          selection?.sectionId === sec.id && selection.itemId === item.id;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => setSelection({ sectionId: sec.id, itemId: item.id })}
                              className={`flex w-full items-center rounded-md py-1.5 pl-2 pr-2 text-left text-sm transition hover:bg-[#35354a] ${
                                sel ? "border-l-2" : "border-l-2 border-transparent"
                              }`}
                              style={{
                                backgroundColor: sel ? C.row : "transparent",
                                color: sel ? "#fff" : "#c8c8d4",
                                borderLeftColor: sel ? C.accent : "transparent",
                              }}
                            >
                              <span className="min-w-0 truncate">{item.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
            {filteredSections.length === 0 && (
              <p className="px-3 py-4 text-center text-xs" style={{ color: C.muted }}>
                검색 결과가 없습니다.
              </p>
            )}
          </nav>
        </aside>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6" style={{ backgroundColor: C.bg }}>
          {children ?? (
            <div className="mx-auto max-w-4xl space-y-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white">MCBL 웹 에디터</h1>
                <p className="mt-1 text-sm" style={{ color: C.muted }}>
                  세션 <code className="font-mono text-zinc-300">{sessionId}</code>
                </p>
              </div>

              <div
                className="rounded-lg border p-4"
                style={{ borderColor: C.border, backgroundColor: C.row }}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div
                    className="h-14 w-14 shrink-0 rounded border-2 border-dashed"
                    style={{ borderColor: C.border, backgroundColor: C.sidebar }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: C.muted }}>
                      현재 선택
                    </p>
                    <p className="mt-1 text-lg font-medium text-white">
                      {selectedItemLabel
                        ? `${selectedItemLabel.sectionTitle} · ${selectedItemLabel.itemLabel}`
                        : "항목을 선택하세요"}
                    </p>
                    <div className="mt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                        연결 태그
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-xs"
                          style={{ borderColor: C.border, backgroundColor: C.sidebar }}
                        >
                          session
                          <button type="button" className="text-zinc-500 hover:text-white" aria-label="제거">
                            ×
                          </button>
                        </span>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none"
                          style={{ backgroundColor: `${C.accent}33`, color: C.accent }}
                          title="태그 추가 (준비 중)"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <section>
                <h2 className="mb-3 text-base font-semibold text-white">
                  편집 항목 ({tableRows.length})
                </h2>
                {tableRows.length === 0 ? (
                  <p
                    className="rounded-lg border px-4 py-8 text-center text-sm"
                    style={{ borderColor: C.border, color: C.muted }}
                  >
                    표시할 행이 없습니다. 다른 항목을 선택하거나 서버 연동 후 데이터가 표시됩니다.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border" style={{ borderColor: C.border }}>
                    <div
                      className="grid grid-cols-[1fr_88px_100px_88px] gap-2 border-b px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500"
                      style={{ borderColor: C.border, backgroundColor: C.sidebar }}
                    >
                      <span>항목</span>
                      <span>값</span>
                      <span>만료</span>
                      <span>컨텍스트</span>
                    </div>
                    <ul>
                      {tableRows.map((row) => (
                        <li
                          key={row.key}
                          className="grid grid-cols-[1fr_88px_100px_88px] gap-2 border-b px-3 py-2.5 text-sm last:border-b-0"
                          style={{ borderColor: C.border, backgroundColor: C.row }}
                        >
                          <code className="truncate font-mono text-[13px] text-zinc-200">{row.key}</code>
                          <span
                            className="font-medium"
                            style={{ color: row.value === "true" ? C.accent : "#e4e4eb" }}
                          >
                            {row.value}
                          </span>
                          <span style={{ color: C.muted }}>{row.expiry}</span>
                          <span style={{ color: C.muted }}>{row.context}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
