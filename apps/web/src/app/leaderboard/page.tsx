import type { Metadata } from "next";
import { LeaderboardView } from "@/components/LeaderboardView";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Leaderboard · Hume" };

export default function LeaderboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-10">
      <PageHeader title="Leaderboard">Traders ranked by PNL, ROI or volume. Rank is earned on the same rules for everyone.</PageHeader>
      <LeaderboardView />
    </div>
  );
}
