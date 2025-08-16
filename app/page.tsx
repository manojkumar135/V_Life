"use client";

import { useEffect, useMemo, useState } from "react";

type NestedNode = {
  _id: string;
  user_id: string;
  name: string;
  left: NestedNode | null;
  right: NestedNode | null;
};

export default function Home() {
  // create/load
  const [rootUserId, setRootUserId] = useState("");
  const [rootName, setRootName] = useState("");
  const [loadedUserId, setLoadedUserId] = useState("");
  const [currentTree, setCurrentTree] = useState<NestedNode | null>(null);

  // add child
  const [parentUserId, setParentUserId] = useState("");
  const [childUserId, setChildUserId] = useState("");
  const [childName, setChildName] = useState("");
  const [side, setSide] = useState<"left" | "right">("left");

  // view
  const [viewUserId, setViewUserId] = useState("");
  const [viewSide, setViewSide] = useState<"" | "left" | "right">("");
  const [depth, setDepth] = useState(3);

  async function createRoot() {
    if (!rootUserId || !rootName) return alert("Enter user_id and name");
    const res = await fetch("/api/tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: rootUserId, name: rootName }),
    });
    const out = await res.json();
    if (!out.success) return alert(out.message || "Failed");
    alert("Root created");
    setLoadedUserId(rootUserId);
    await loadTree(rootUserId, "", depth);
  }

  async function loadTree(user_id: string, sideArg: "" | "left" | "right", d = depth) {
    const params = new URLSearchParams({ user_id, depth: String(d) });
    if (sideArg) params.set("side", sideArg);
    const res = await fetch(`/api/tree?${params.toString()}`);
    const out = await res.json();
    if (!out.success) {
      setCurrentTree(null);
      alert(out.message || "Load failed");
      return;
    }
    setCurrentTree(out.tree || null);
  }

  async function addChild() {
    if (!parentUserId || !childUserId || !childName) {
      return alert("Enter parent_user_id, child user_id and name");
    }
    const res = await fetch("/api/tree", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parent_user_id: parentUserId,
        side,
        user_id: childUserId,
        name: childName,
      }),
    });
    const out = await res.json();
    if (!out.success) return alert(out.message || "Failed");

    // Reload the parent's tree context if it's currently displayed
    if (loadedUserId) {
      await loadTree(loadedUserId, viewSide, depth);
    }
    setChildUserId("");
    setChildName("");
    alert("Child added");
  }

  // Render a nested node
  function Node({ node, level = 0 }: { node: NestedNode; level?: number }) {
    return (
      <div className="border rounded-xl p-3 bg-white shadow-sm">
        <div className="font-semibold">
          {node.name} <span className="text-gray-500">({node.user_id})</span>
        </div>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase text-gray-500 mb-1">Left</div>
            {node.left ? (
              <Node node={node.left} level={level + 1} />
            ) : (
              <div className="text-sm text-gray-400 italic">null</div>
            )}
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500 mb-1">Right</div>
            {node.right ? (
              <Node node={node.right} level={level + 1} />
            ) : (
              <div className="text-sm text-gray-400 italic">null</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Controls bar
  const ControlCard = useMemo(
    () => (
      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Root */}
        <div className="bg-white rounded-2xl p-5 shadow">
          <div className="font-semibold mb-3">Create Root</div>
          <div className="space-y-2">
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="root user_id (unique)"
              value={rootUserId}
              onChange={(e) => setRootUserId(e.target.value)}
            />
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="root name"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
            />
            <button
              onClick={createRoot}
              className="w-full rounded-lg px-3 py-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </div>

        {/* Add Child */}
        <div className="bg-white rounded-2xl p-5 shadow">
          <div className="font-semibold mb-3">Add Child</div>
          <div className="space-y-2">
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="parent user_id"
              value={parentUserId}
              onChange={(e) => setParentUserId(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="border rounded-lg px-3 py-2"
                value={side}
                onChange={(e) => setSide(e.target.value as "left" | "right")}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
              <input
                className="flex-1 border rounded-lg px-3 py-2"
                placeholder="child user_id (unique)"
                value={childUserId}
                onChange={(e) => setChildUserId(e.target.value)}
              />
            </div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="child name"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
            />
            <button
              onClick={addChild}
              className="w-full rounded-lg px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Load / View */}
        <div className="bg-white rounded-2xl p-5 shadow">
          <div className="font-semibold mb-3">Load / View</div>
          <div className="space-y-2">
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="user_id to view"
              value={viewUserId}
              onChange={(e) => setViewUserId(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              <select
                className="border rounded-lg px-3 py-2"
                value={viewSide}
                onChange={(e) =>
                  setViewSide(e.target.value as "" | "left" | "right")
                }
              >
                <option value="">Full (both)</option>
                <option value="left">Left branch</option>
                <option value="right">Right branch</option>
              </select>
              <input
                type="number"
                min={0}
                max={100}
                className="w-24 border rounded-lg px-3 py-2"
                value={depth}
                onChange={(e) =>
                  setDepth(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                }
              />
              <span className="text-sm text-gray-500">Depth</span>
            </div>
            <button
              onClick={() => {
                if (!viewUserId) return alert("Enter user_id to view");
                setLoadedUserId(viewUserId);
                loadTree(viewUserId, viewSide, depth);
              }}
              className="w-full rounded-lg px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Load
            </button>
          </div>
        </div>
      </div>
    ),
    [rootUserId, rootName, parentUserId, childUserId, childName, side, viewUserId, viewSide, depth]
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-2xl md:text-3xl font-bold">Binary Referral Tree</h1>

        {ControlCard}

        <div className="bg-white rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Tree</div>
            <div className="text-sm text-gray-500">
              Showing: {loadedUserId || "-"} {viewSide ? `(${viewSide} branch)` : "(full)"} • depth {depth}
            </div>
          </div>
          <div className="mt-4">
            {currentTree ? (
              <Node node={currentTree} />
            ) : (
              <div className="text-gray-400 italic">No tree loaded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
