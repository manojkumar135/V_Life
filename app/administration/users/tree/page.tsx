"use client";

import React, { Suspense } from "react";
import TreeView from "@/app/administration/users/tree/Treeview";
import { useSearchParams } from "next/navigation";

export default function Page() {
  const searchParams = useSearchParams();

  const id = searchParams.get("id");        // parent id
  const newuser = searchParams.get("newuser"); // new user id

  // console.log("Page params:", id, newuser);

  return (
    <Suspense fallback={<p>Loading Tree...</p>}>
      <TreeView id={id} newuser={newuser} />
    </Suspense>
  );
}
