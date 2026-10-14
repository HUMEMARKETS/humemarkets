import { Suspense } from "react";
import { AppPage } from "@/components/AppPage";
import { NewsView } from "@/components/NewsView";

export default function Page() {
  return (
    <AppPage title="News" description="Current headlines for US stocks, China, crypto, ETFs and commodities. Each one opens the publisher's own page.">
      <Suspense>
        <NewsView />
      </Suspense>
    </AppPage>
  );
}
