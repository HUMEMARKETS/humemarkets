import { AppPage } from "@/components/AppPage";
import { PonsView } from "@/components/PonsView";

export default function Page() {
  return (
    <AppPage title="Pons" description="Buy and sell Pons tokens, the tokens launched on Pons, without leaving Hume. Each swap shows its price, its price impact and the least you will receive before you sign.">
      <PonsView />
    </AppPage>
  );
}
