import Link from "next/link";

export function InvalidSession({ session }: { session: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 bg-zinc-950 px-6 py-16 text-center">
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          유효하지 않은 세션
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Minecraft 서버에서{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            /mcbl editor
          </code>
          로 받은 링크의 경로(영숫자 10자)만 사용할 수 있습니다.
        </p>
        <p className="break-all font-mono text-xs text-zinc-500">
          입력: {session || "(비어 있음)"}
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
      >
        안내로 돌아가기
      </Link>
    </div>
  );
}
