"use client";

import React, { Suspense } from "react";
import TreeView from "@/app/administration/users/tree/Treeview";
import { useSearchParams } from "next/navigation"; // ✅ FIX

export default function Page() {
  return (
    <Suspense fallback={<p>Loading Tree...</p>}>
      <TreeViewWrapper />
    </Suspense>
  );
}

function TreeViewWrapper() {
  const searchParams = useSearchParams(); // ✅ now recognized
  const id = searchParams.get("id");
  const newuser = searchParams.get("newuser");

  return <TreeView id={id} newuser={newuser} />;
}
