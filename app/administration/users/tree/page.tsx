"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import BinaryTreeNode from "@/components/common/treenode";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import axios from "axios";
import { useVLife } from "@/store/context";
import { useSearch } from "@/hooks/useSearch";
import SubmitButton from "@/components/common/submitbutton";

// Node type
interface TreeNode {
  user_id: string;
  name: string;
  user_status: string;
  contact?: string;
  mail?: string;
  left?: TreeNode | null;
  right?: TreeNode | null;
}

export default function TreeView() {
  const { user } = useVLife();
  const { query } = useSearch();
  const router = useRouter();
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [search, setSearch] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const API_URL = "/api/tree-operations";

  // Map status → color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600";
      case "inactive":
        return "text-red-600";
      case "pending":
        return "text-yellow-500";
      default:
        return "text-gray-600";
    }
  };

  // Fetch full binary tree for root
  const fetchTree = useCallback(async () => {
    try {
      const { data } = await axios.get(API_URL, {
        params: {
          user_id: user.user_id,
          search: query,
        },
      });
      if (data?.data) {
        setTree(data.data);
      }
    } catch (error) {
      console.error("Error fetching tree:", error);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Handle search (highlight if found)
  const handleSearch = () => {
    if (!search || !tree) return;

    const searchLower = search.toLowerCase(); // ✅ now in scope

    const findNode = (node: any): any | null => {
      if (!node) return null;

      if (
        node.user_id.toLowerCase() === searchLower ||
        (node.name && node.name.toLowerCase().includes(searchLower))
      ) {
        return node;
      }

      const leftResult = findNode(node.left ?? null);
      if (leftResult) return leftResult;

      const rightResult = findNode(node.right ?? null);
      if (rightResult) return rightResult;

      return null;
    };

    const found = findNode(tree);
    setHighlightedId(found ? found.user_id : null);
  };

  return (
    <Layout>
      <div className="p-4 max-md:-mt-5  flex flex-col h-full">
        {/* Header + Search (fixed) */}
        <div className="flex flex-row items-center max-md:justify-between mb-1">
          <IoIosArrowBack
            size={28}
            color="black"
            className="ml-0 mr-3  max-sm:mr-1 cursor-pointer z-20 mb-3 max-md:mb-2 lg:-mt-5"
            onClick={() => router.push("/administration/users")}
          />

          {/* Search Bar */}
          <div className="flex justify-center items-center max-md:justify-end gap-2 mb-2 w-full lg:-ml-5 p-2 max-md:p-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or name..."
              className="border px-2 py-1 rounded-md w-64 max-md:w-52"
            />
            <SubmitButton
              type="button"
              onClick={handleSearch}
              className="text-black px-4 !py-1.5 max-lg:!py-1 rounded-md bg-yellow-400 font-semibold"
            >
              Search
            </SubmitButton>
          </div>
        </div>

        {/* Tree View (scrollable only) */}
        <div className="flex-1 max-md:flex overflow-x-auto ">
          <div className="flex justify-center ">
            {tree ? (
              <BinaryTreeNode
                node={tree}
                getColor={getStatusColor}
                highlightedId={highlightedId}
              />
            ) : (
              <p>Loading tree...</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
