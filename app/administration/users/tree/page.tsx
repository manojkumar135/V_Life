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
import ShowToast from "@/components/common/Toast/toast";

// Node type
interface TreeNode {
  user_id: string;
  name: string;
  user_status: string;
  contact?: string;
  mail?: string;
  referBy?: string;
  parent?: string;
  left?: TreeNode | null;
  right?: TreeNode | null;
}

export default function TreeView() {
  const { user } = useVLife();
  const { query, setQuery, debouncedQuery } = useSearch();
  const router = useRouter();

  const [tree, setTree] = useState<TreeNode | null>(null);
  const [currentRoot, setCurrentRoot] = useState<TreeNode | null>(null); // dynamic root
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

  // Fetch full binary tree for root user
  const fetchTree = useCallback(async (search: string) => {
    try {
      const { data } = await axios.get(API_URL, {
        params: {
          user_id: user.user_id,
          search: query,
        },
      });
      if (data?.data) {
        setTree(data.data);
        setCurrentRoot(data.data); // default full tree
      }
    } catch (error) {
      console.error("Error fetching tree:", error);
    }
  }, [user.user_id, query]);

  useEffect(() => {
      if (!user?.user_id) return;
      fetchTree(debouncedQuery);
    }, [debouncedQuery, user?.user_id]);

  // Recursive search
  const findNode = (node: TreeNode | null, searchText: string): TreeNode | null => {
    if (!node) return null;

    const lower = searchText.toLowerCase();
    if (
      node.user_id.toLowerCase() === lower ||
      (node.name && node.name.toLowerCase().includes(lower))
    ) {
      return node;
    }

    return (
      findNode(node.left ?? null, searchText) ||
      findNode(node.right ?? null, searchText)
    );
  };

  // Handle search
  const handleSearch = () => {
    if (!tree) return;

    const found = findNode(tree, search);
    if (found) {
      setCurrentRoot(found);
      setHighlightedId(found.user_id);
    } else {
      ShowToast.error("User not found!");
    }
  };

  // 🔹 Auto-reset tree when search is cleared
  useEffect(() => {
    if (!search.trim() && tree) {
      setCurrentRoot(tree);
      setHighlightedId(null);
    }
  }, [search, tree]);


  return (
    <Layout>
      <div className="p-4 max-md:-mt-5 flex flex-col h-full max-lg:max-w-[720px]">
        {/* Header + Search */}
        <div className="flex flex-row items-center max-md:justify-between mb-1 ">
          <IoIosArrowBack
            size={28}
            color="black"
            className="ml-0 mr-3 max-sm:mr-1 cursor-pointer z-20 mb-3 max-md:mb-2 lg:-mt-5"
            onClick={() => router.push("/administration/users")}
          />

          {/* Search Bar */}
          <div className="flex justify-center items-center max-md:justify-end gap-2 mb-2 w-full lg:-ml-5 p-2 max-md:p-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or name..."
              className="border px-2 py-1 rounded-md w-64 max-md:w-58"
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

        {/* Tree View */}
        <div className="flex-1 max-lg:flex overflow-x-auto pt-5">
          <div className="flex justify-center min-w-[950px] lg:min-w-[900px] xl:min-w-[1000px]  max-md:ml-[5%] max-lg:ml-[10%]">
            {currentRoot ? (
              <BinaryTreeNode
                node={currentRoot}
                getColor={getStatusColor}
                highlightedId={highlightedId}
                level={1}
                maxLevel={4} // show only 4 levels
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
