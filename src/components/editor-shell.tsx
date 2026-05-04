import type { ReactNode } from "react";

const NAV: { id: string; label: string; disabled?: boolean }[] = [
  { id: "overview", label: "개요" },
  { id: "settings", label: "설정", disabled: true },
];

export function EditorShell({
  sessionId,
  children,
}: {
  sessionId: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
            MCBL Editor
          </span>
          <span className="hidden h-4 w-px bg-zinc-300 sm:block dark:bg-zinc-700" />
          <code className="hidden max-w-[12rem] truncate rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700 sm:inline dark:bg-zinc-800 dark:text-zinc-300">
            {sessionId}
          </code>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
            연동 예정
          </span>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-zinc-200 bg-zinc-900 text-zinc-300 sm:flex dark:border-zinc-800">
          <nav className="flex flex-col gap-0.5 p-2">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                className="rounded-md px-3 py-2 text-left text-sm transition enabled:hover:bg-zinc-800 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <p className="mt-auto p-3 text-xs leading-relaxed text-zinc-500">
            서버 플러그인과 API·WebSocket 연결 후 이 영역에 트리·폼 편집기를
            붙이면 LuckPerms 웹 에디터와 비슷한 흐름이 됩니다.
          </p>
        </aside>
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
          {children ?? (
            <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">세션 준비됨</h2>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                이 URL은 <code className="font-mono text-zinc-800 dark:text-zinc-200">{sessionId}</code>{" "}
                세션으로 열렸습니다. 다음 단계로 Paper 플러그인에서 이 세션과
                동기화하는 HTTP 또는 WebSocket 엔드포인트를 두고, 이 페이지에서
                데이터를 불러오면 됩니다.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
