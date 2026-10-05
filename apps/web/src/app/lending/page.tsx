import type { Metadata } from "next";
import { AppPage } from "@/components/AppPage";
import { LendingView } from "@/components/LendingView";
export const metadata: Metadata = { title: "Lending · Hume" };

export default function Page() {
  return (
    <AppPage title="Lending" description="Lock a stock token as collateral and borrow USDG against it. Your health factor says how safe the loan is.">
      <LendingView />
    </AppPage>
  );
}
