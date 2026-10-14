import { Suspense } from "react";
import { AlertsView } from "@/components/AlertsView";
import { AppPage } from "@/components/AppPage";

export default function Page() {
  return (
    <AppPage title="Price alerts" description="Pick a market and a price. HUME tells you once when it gets there, in the app and in your browser, even when HUME is closed.">
      <Suspense>
        <AlertsView />
      </Suspense>
    </AppPage>
  );
}
