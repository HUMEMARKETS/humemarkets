"use client";

import type { ReactNode } from "react";
import { SampleMark } from "./SampleMark";

/// The title of a page that is not a terminal: what this page is, and one line on what to do here. In
/// sample mode the title carries `SAMPLE DATA`, because every one of these pages shows either a balance
/// or a position or a ranking, and none of it may be taken for real.
export function PageHeader({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[2rem] font-bold leading-10 tracking-[-0.03em]">
          {title}
          <SampleMark />
        </h1>
        {children ? <p className="mt-1 max-w-prose text-muted">{children}</p> : null}
      </div>
      {actions}
    </div>
  );
}
