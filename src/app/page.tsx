import { Suspense } from "react";
import BracketPage from "@/app/BracketPage";
import BracketLoading from "@/components/BracketLoading";

export default function Page() {
  return (
    <Suspense fallback={<BracketLoading />}>
      <BracketPage />
    </Suspense>
  );
}
