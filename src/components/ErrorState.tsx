import type { ReactNode } from "react";

export default function ErrorState({
  title,
  error,
  debug,
}: {
  title: string;
  error?: unknown;
  debug?: ReactNode;
}) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-4 py-6">
      <div className="text-lg font-bold text-red-900">{title}</div>
      {message ? <div className="mt-2 text-sm text-red-900/80">{message}</div> : null}
      <div className="mt-4">{debug}</div>
      <div className="mt-4 text-xs text-zinc-600">
        Tip: first load can take a few seconds because it calls Polymarket public APIs (no auth).
      </div>
    </div>
  );
}

