"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

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

type EditorPitchRow = {
  rowType: "pitch";
  idx: number | null;
  pitch_name: string;
  speed_value: number;
  movement_lr: number;
  drop_ud: number;
  enabled: boolean;
};

type EditorClubRow = {
  rowType: "club";
  idx: number | null;
  club_name: string;
  color_code: string;
  emblem_image_url: string;
};

type EditorKvRow = {
  rowType: "kv";
  key: string;
  value: string;
  expiry: string;
  context: string;
};

type EditorTableRow = EditorPitchRow | EditorClubRow | EditorKvRow;

type PitchFormState = {
  pitch_name: string;
  speed_value: number;
  movement_lr: number;
  drop_ud: number;
  enabled: boolean;
};

function emptyPitchForm(): PitchFormState {
  return {
    pitch_name: "",
    speed_value: 0,
    movement_lr: 0,
    drop_ud: 0,
    enabled: true,
  };
}

function rowsForSelection(sel: Selection | null): EditorTableRow[] {
  if (!sel) {
    return [
      {
        rowType: "kv",
        key: "mcbl.session",
        value: "true",
        expiry: "never",
        context: "none",
      },
    ];
  }
  switch (sel.sectionId) {
    case "pitches":
      return [];
    case "players":
      return [
        {
          rowType: "kv",
          key: "player.register.auto",
          value: "false",
          expiry: "never",
          context: "none",
        },
        {
          rowType: "kv",
          key: "player.uuid.lookup",
          value: "true",
          expiry: "never",
          context: "none",
        },
      ];
    case "clubs":
      return [
        {
          rowType: "club",
          idx: null,
          club_name: "MCBL 베어스",
          color_code: "#1e3a5f",
          emblem_image_url: "https://example.com/emblems/bears.png",
        },
        {
          rowType: "club",
          idx: null,
          club_name: "한강 돌핀스",
          color_code: "#0d9488",
          emblem_image_url: "",
        },
      ];
    case "records":
      return [
        {
          rowType: "kv",
          key: "records.view.last",
          value: "true",
          expiry: "never",
          context: "none",
        },
      ];
    case "misc":
      if (sel.itemId === "misc-advanced") {
        return [
          {
            rowType: "kv",
            key: "sync.websocket.reconnect",
            value: "true",
            expiry: "never",
            context: "none",
          },
          {
            rowType: "kv",
            key: "api.timeout_ms",
            value: "30000",
            expiry: "never",
            context: "none",
          },
        ];
      }
      return [
        {
          rowType: "kv",
          key: "editor.locale",
          value: "ko_KR",
          expiry: "never",
          context: "none",
        },
        {
          rowType: "kv",
          key: "sync.debug",
          value: "false",
          expiry: "never",
          context: "none",
        },
        {
          rowType: "kv",
          key: "notifications.enabled",
          value: "true",
          expiry: "never",
          context: "none",
        },
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

  const [pitchList, setPitchList] = useState<EditorPitchRow[]>([]);
  const [addPitchOpen, setAddPitchOpen] = useState(false);
  const [pitchForm, setPitchForm] = useState<PitchFormState>(emptyPitchForm);
  const [pitchFormError, setPitchFormError] = useState<string | null>(null);

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

  const tableRows = useMemo(() => {
    if (selection?.sectionId === "pitches") return pitchList;
    return rowsForSelection(selection);
  }, [selection, pitchList]);

  const toggleSection = (id: SectionId) => {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  };

  const [saveOpen, setSaveOpen] = useState(false);
  const [savePosting, setSavePosting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const saveCommand = `/mcbl save ${sessionId}`;

  const openSaveModal = useCallback(async () => {
    setSaveError(null);
    setCopyDone(false);
    setSaveOpen(true);
    setSavePosting(true);
    const payload: Record<string, unknown> = {
      version: 1,
      savedAt: new Date().toISOString(),
      session: sessionId,
      selection,
    };
    if (selection?.sectionId === "pitches") {
      payload.pitches = (tableRows as EditorTableRow[])
        .filter((r): r is EditorPitchRow => r.rowType === "pitch")
        .map(({ pitch_name, speed_value, movement_lr, drop_ud, enabled, idx }) => ({
          ...(idx != null ? { idx } : {}),
          pitch_name,
          speed_value,
          movement_lr,
          drop_ud,
          enabled,
        }));
    } else if (selection?.sectionId === "clubs") {
      payload.clubs = (tableRows as EditorTableRow[])
        .filter((r): r is EditorClubRow => r.rowType === "club")
        .map(({ club_name, color_code, emblem_image_url, idx }) => ({
          ...(idx != null ? { idx } : {}),
          club_name,
          color_code,
          emblem_image_url,
        }));
    } else {
      payload.rows = (tableRows as EditorTableRow[])
        .filter((r): r is EditorKvRow => r.rowType === "kv")
        .map(({ key, value, expiry, context }) => ({ key, value, expiry, context }));
    }
    try {
      const res = await fetch(`/api/sync/${encodeURIComponent(sessionId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        setSaveError(t || `HTTP ${res.status}`);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavePosting(false);
    }
  }, [sessionId, selection, tableRows]);

  const openAddPitchModal = useCallback(() => {
    setPitchForm(emptyPitchForm());
    setPitchFormError(null);
    setAddPitchOpen(true);
  }, []);

  const submitAddPitch = useCallback(() => {
    const name = pitchForm.pitch_name.trim();
    if (!name) {
      setPitchFormError("이름을 입력해 주세요.");
      return;
    }
    if (name.length > 64) {
      setPitchFormError("이름은 64자 이하여야 합니다.");
      return;
    }
    const row: EditorPitchRow = {
      rowType: "pitch",
      idx: null,
      pitch_name: name,
      speed_value: Number.isFinite(pitchForm.speed_value) ? pitchForm.speed_value : 0,
      movement_lr: Number.isFinite(pitchForm.movement_lr) ? pitchForm.movement_lr : 0,
      drop_ud: Number.isFinite(pitchForm.drop_ud) ? pitchForm.drop_ud : 0,
      enabled: pitchForm.enabled,
    };
    setPitchList((prev) => [...prev, row]);
    setAddPitchOpen(false);
    setPitchForm(emptyPitchForm());
    setPitchFormError(null);
  }, [pitchForm]);

  const copySaveCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(saveCommand);
      setCopyDone(true);
    } catch {
      setCopyDone(false);
    }
  }, [saveCommand]);

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
        <button
          type="button"
          onClick={openSaveModal}
          className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
          style={{ backgroundColor: C.accent, color: "#111119" }}
        >
          저장
        </button>
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
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-white">
                    편집 항목 ({tableRows.length})
                  </h2>
                  {selection?.sectionId === "pitches" && (
                    <button
                      type="button"
                      onClick={openAddPitchModal}
                      className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                      style={{ backgroundColor: `${C.accent}22`, color: C.accent, border: `1px solid ${C.accent}55` }}
                    >
                      구종 추가
                    </button>
                  )}
                </div>
                {tableRows.length === 0 ? (
                  <p
                    className="rounded-lg border px-4 py-8 text-center text-sm"
                    style={{ borderColor: C.border, color: C.muted }}
                  >
                    표시할 행이 없습니다. 다른 항목을 선택하거나 서버 연동 후 데이터가 표시됩니다.
                  </p>
                ) : selection?.sectionId === "pitches" ? (
                  <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.border }}>
                    <div
                      className="grid min-w-[640px] grid-cols-[52px_minmax(8rem,1.2fr)_88px_88px_88px_72px] gap-2 border-b px-3 py-2 text-[11px] font-bold tracking-wide text-zinc-500"
                      style={{ borderColor: C.border, backgroundColor: C.sidebar }}
                    >
                      <span>idx</span>
                      <span>구종명</span>
                      <span>구속값</span>
                      <span>좌우</span>
                      <span>낙차</span>
                      <span>사용</span>
                    </div>
                    <ul className="min-w-[640px]">
                      {(tableRows as EditorPitchRow[])
                        .filter((r) => r.rowType === "pitch")
                        .map((row) => (
                          <li
                            key={`${row.pitch_name}-${row.idx ?? "new"}`}
                            className="grid grid-cols-[52px_minmax(8rem,1.2fr)_88px_88px_88px_72px] gap-2 border-b px-3 py-2.5 text-sm last:border-b-0"
                            style={{ borderColor: C.border, backgroundColor: C.row }}
                          >
                            <span className="font-mono text-zinc-400">{row.idx ?? "—"}</span>
                            <span className="truncate font-medium text-white">{row.pitch_name}</span>
                            <span className="text-zinc-200">{row.speed_value}</span>
                            <span className="text-zinc-300">{row.movement_lr}</span>
                            <span className="text-zinc-300">{row.drop_ud}</span>
                            <span style={{ color: row.enabled ? C.accent : C.muted }}>
                              {row.enabled ? "사용" : "미사용"}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : selection?.sectionId === "clubs" ? (
                  <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.border }}>
                    <div
                      className="grid min-w-[720px] grid-cols-[52px_minmax(8rem,1fr)_100px_minmax(10rem,1.5fr)] gap-2 border-b px-3 py-2 text-[11px] font-bold tracking-wide text-zinc-500"
                      style={{ borderColor: C.border, backgroundColor: C.sidebar }}
                    >
                      <span>idx</span>
                      <span>구단명</span>
                      <span>색상코드</span>
                      <span>마크 URL</span>
                    </div>
                    <ul className="min-w-[720px]">
                      {(tableRows as EditorClubRow[])
                        .filter((r) => r.rowType === "club")
                        .map((row) => (
                          <li
                            key={`${row.club_name}-${row.idx ?? "new"}`}
                            className="grid grid-cols-[52px_minmax(8rem,1fr)_100px_minmax(10rem,1.5fr)] gap-2 border-b px-3 py-2.5 text-sm last:border-b-0"
                            style={{ borderColor: C.border, backgroundColor: C.row }}
                          >
                            <span className="font-mono text-zinc-400">{row.idx ?? "—"}</span>
                            <span className="truncate font-medium text-white">{row.club_name}</span>
                            <span className="flex items-center gap-2 font-mono text-xs text-zinc-200">
                              <span
                                className="h-4 w-4 shrink-0 rounded border border-zinc-600"
                                style={{ backgroundColor: row.color_code }}
                                title={row.color_code}
                              />
                              {row.color_code}
                            </span>
                            <span className="min-w-0 truncate text-zinc-400" title={row.emblem_image_url}>
                              {row.emblem_image_url || "—"}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
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
                      {(tableRows as EditorKvRow[])
                        .filter((r) => r.rowType === "kv")
                        .map((row) => (
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

      {addPitchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-pitch-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setAddPitchOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border p-5 shadow-xl"
            style={{ borderColor: C.border, backgroundColor: C.sidebar }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-pitch-title" className="text-lg font-semibold text-white">
              구종 추가
            </h2>
            <p className="mt-1 text-xs" style={{ color: C.muted }}>
              테이블 컬럼과 동일하게 입력합니다. 사용 여부 기본값은「사용」입니다.
            </p>
            {pitchFormError && (
              <p className="mt-3 rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                {pitchFormError}
              </p>
            )}
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400" htmlFor="pf-name">
                  이름
                </label>
                <input
                  id="pf-name"
                  type="text"
                  maxLength={64}
                  value={pitchForm.pitch_name}
                  onChange={(e) => setPitchForm((f) => ({ ...f, pitch_name: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  style={{ borderColor: C.border, backgroundColor: C.bg, color: "#e4e4eb" }}
                  placeholder="예: 커브"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400" htmlFor="pf-speed">
                  구속
                </label>
                <input
                  id="pf-speed"
                  type="number"
                  step="0.01"
                  value={pitchForm.speed_value}
                  onChange={(e) =>
                    setPitchForm((f) => ({ ...f, speed_value: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  style={{ borderColor: C.border, backgroundColor: C.bg, color: "#e4e4eb" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400" htmlFor="pf-lr">
                  좌우 무브먼트값
                </label>
                <input
                  id="pf-lr"
                  type="number"
                  step="0.0001"
                  value={pitchForm.movement_lr}
                  onChange={(e) =>
                    setPitchForm((f) => ({ ...f, movement_lr: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  style={{ borderColor: C.border, backgroundColor: C.bg, color: "#e4e4eb" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400" htmlFor="pf-ud">
                  상하 무브먼트값
                </label>
                <input
                  id="pf-ud"
                  type="number"
                  step="0.0001"
                  value={pitchForm.drop_ud}
                  onChange={(e) =>
                    setPitchForm((f) => ({ ...f, drop_ud: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  style={{ borderColor: C.border, backgroundColor: C.bg, color: "#e4e4eb" }}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={pitchForm.enabled}
                  onChange={(e) => setPitchForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-600"
                />
                사용여부 (체크 시 사용)
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddPitchOpen(false);
                  setPitchFormError(null);
                }}
                className="rounded-md border px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
                style={{ borderColor: C.border }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitAddPitch}
                className="rounded-md px-4 py-2 text-sm font-semibold text-[#111119] transition hover:opacity-90"
                style={{ backgroundColor: C.accent }}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {saveOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-modal-title"
        >
          <div
            className="w-full max-w-md rounded-xl border p-5 shadow-xl"
            style={{ borderColor: C.border, backgroundColor: C.sidebar }}
          >
            <h2 id="save-modal-title" className="text-lg font-semibold text-white">
              서버에 반영
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: C.muted }}>
              웹에 저장한 뒤, Minecraft 서버 채팅에서 아래 명령을 실행하면 서버가 데이터를
              가져와 <code className="text-zinc-300">plugins/mcbl-core/editor-saves/</code> 에
              저장합니다.
            </p>
            {savePosting && (
              <p className="mt-3 text-sm" style={{ color: C.accent }}>
                웹에 올리는 중…
              </p>
            )}
            {saveError && (
              <p className="mt-3 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {saveError}
              </p>
            )}
            {!savePosting && !saveError && (
              <p className="mt-3 text-sm text-emerald-400/90">웹 저장이 완료되었습니다.</p>
            )}
            <div className="mt-4 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                실행할 명령
              </label>
              <div
                className="flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm"
                style={{ borderColor: C.border, backgroundColor: C.bg, color: "#e4e4eb" }}
              >
                <span className="min-w-0 flex-1 break-all">{saveCommand}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={copySaveCommand}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[#111119] transition hover:opacity-90"
                  style={{ backgroundColor: C.accent }}
                >
                  {copyDone ? "복사됨" : "명령 복사"}
                </button>
                <button
                  type="button"
                  onClick={() => setSaveOpen(false)}
                  className="rounded-md border px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
                  style={{ borderColor: C.border }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
