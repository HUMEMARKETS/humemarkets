"use client";

import type { ReactNode } from "react";
import { SampleBanner } from "./SampleBanner";

/// The title of a page that is not a terminal: what this page is, and one line on what to do here. In
/// sample mode the page opens with the `SAMPLE DATA` banner, because every one of these pages shows either
/// a balance or a position or a ranking, and none of it may be taken for real.
export function PageHeader({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5">
      <SampleBanner className="mb-4" />
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="font-display text-[2rem] font-bold leading-10 tracking-[-0.03em]">{title}</h1>
          {children ? <p className="mt-1 max-w-prose text-muted">{children}</p> : null}
        </div>
        {actions}
      </div>
    </div>
  );
}
