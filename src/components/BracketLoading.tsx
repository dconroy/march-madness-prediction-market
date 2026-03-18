export default function BracketLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-8">
      <div className="h-12 w-full rounded-2xl bg-zinc-100 animate-pulse" />
      <div className="mt-4 h-20 w-full rounded-2xl bg-zinc-100 animate-pulse" />
      <div className="mt-4 h-[620px] w-full rounded-2xl bg-zinc-100 animate-pulse" />
      <div className="mt-3 text-xs text-zinc-500">Loading market probabilities...</div>
    </div>
  );
}

