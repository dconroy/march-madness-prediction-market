import { getBracketModel2026 } from "@/lib/polymarket";
import type { BracketModel } from "@/lib/types";
import ErrorState from "@/components/ErrorState";
import BracketClient from "@/app/BracketClient";

function DebugJson({ value }: { value: unknown }) {
  return (
    <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl bg-white/80 border border-red-100 px-3 py-2 text-[11px] text-red-900/90">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default async function BracketPage() {
  let model: BracketModel | undefined;
  let err: unknown | undefined;
  try {
    model = await getBracketModel2026();
  } catch (e) {
    err = e;
  }

  if (!model) {
    const debug = {
      message: err instanceof Error ? err.message : String(err),
      endpoints: {
        bracketPage: "https://polymarket.com/sports/cbb/bracket",
        gammaTitleEvent: "https://gamma-api.polymarket.com/events?slug=2026-ncaa-tournament-winner",
      },
    };
    return <ErrorState title="Failed to load bracket data" error={err} debug={<DebugJson value={debug} />} />;
  }

  return <BracketClient model={model} />;
}

