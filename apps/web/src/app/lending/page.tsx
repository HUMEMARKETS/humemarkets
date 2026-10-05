import type { Metadata } from "next";
import { LendingView } from "@/components/LendingView";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Lending · Hume" };

export default function LendingPage() {
  return (
    <div className="mx-auto w-full max-w-[1000px] p-6 lg:p-10">
      <PageHeader title="Lending">Lock a stock token as collateral and borrow USDG against it. Your health factor says how safe the loan is.</PageHeader>
      <LendingView />
    </div>
  );
}
