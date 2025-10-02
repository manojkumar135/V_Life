"use client";

import React, { Suspense } from "react";
import TreeView from "@/app/administration/users/tree/Treeview";

export default function Page() {
  return (
    <Suspense fallback={<p>Loading Tree...</p>}>
      <TreeView />
    </Suspense>
  );
}
