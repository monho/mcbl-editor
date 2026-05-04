import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-zinc-950 px-6 py-20 text-center">
      <div className="max-w-lg space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-500/90">
          mcbl-core
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          MCBL 웹 에디터
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          서버에서{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            /mcbl editor
          </code>
          를 실행하면 열리는 링크와 같은 호스트에서, 경로가 영숫자 10자인
          세션 페이지로 들어옵니다. LuckPerms 웹 에디터처럼 사이드바·본문
          구조로 확장할 수 있습니다.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/AbCdEfGh12"
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          예시 세션 열기
        </Link>
        <code className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 font-mono text-xs text-zinc-400">
          npm run dev → http://localhost:3000/&lt;세션&gt;
        </code>
      </div>
    </div>
  );
}
