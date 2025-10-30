"use client";

import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import BinaryTreeNode from "@/components/common/treenode";
import { useRouter, useSearchParams } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import axios from "axios";
import { useVLife } from "@/store/context";
import { useSearch } from "@/hooks/useSearch";
import SubmitButton from "@/components/common/submitbutton";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { LuRefreshCw } from "react-icons/lu";
import { FaLongArrowAltUp } from "react-icons/fa";

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
  const { query, debouncedQuery } = useSearch();
  const router = useRouter();

  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentRoot, setCurrentRoot] = useState<TreeNode | null>(null);
  const [search, setSearch] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);

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

  // Fetch full binary tree
  const fetchTree = useCallback(
    async (search: string) => {
      try {
        setLoading(true);

        const { data } = await axios.get(API_URL, {
          params: {
            user_id: user.user_id,
            search: query,
          },
        });
        if (data?.data) {
          setTree(data.data);
          setCurrentRoot(data.data);
        }
      } catch (error) {
        console.error("Error fetching tree:", error);
      } finally {
        setLoading(false);
      }
    },
    [user.user_id, query]
  );

  // Fetch user by ?id
  useEffect(() => {
    let mounted = true;

    const fetchUserId = async () => {
      if (!id) return;

      try {
        const res = await axios.get(`/api/users-operations?id=${id}`);
        const user = res?.data?.data ?? res?.data;

        if (user && mounted) {
          const userId = user.user_id ?? "";
          setSearch(userId);
        }
      } catch (e) {
        console.error("Failed to fetch user_id", e);
      }
    };

    fetchUserId();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!user?.user_id) return;
    // Fetch tree only the first time or when user types a search
    if (!initialized || debouncedQuery.trim()) {
      fetchTree(debouncedQuery);
      setInitialized(true);
    }
  }, [debouncedQuery, user?.user_id, fetchTree, initialized]);

  // Recursive search
  const findNode = (
    node: TreeNode | null,
    searchText: string
  ): TreeNode | null => {
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

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setLoading(true);
      await fetchTree(""); // re-fetch entire tree
      setSearch("");
      setHighlightedId(null);
      ShowToast.success("Tree refreshed!");
    } catch (error) {
      console.error("Error refreshing tree:", error);
      ShowToast.error("Failed to refresh tree");
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  // inside TreeView component

  const handleUserClick = async (userId: string) => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL, {
        params: { user_id: userId },
      });
      if (data?.data) {
        setCurrentRoot(data.data);
        setHighlightedId(userId);
      }
    } catch (error) {
      console.error("Error fetching subtree:", error);
      ShowToast.error("Failed to load user tree");
    } finally {
      setLoading(false);
    }
  };

  const handleGoUp = async () => {
    try {
      if (!currentRoot?.parent) {
        ShowToast.info("No parent found — this is the top user.");
        return;
      }

      setLoading(true);
      const { data } = await axios.get(API_URL, {
        params: { user_id: currentRoot.parent },
      });

      if (data?.data) {
        setCurrentRoot(data.data);
        setHighlightedId(currentRoot.parent);
      } else {
        ShowToast.error("Failed to load parent user");
      }
    } catch (error) {
      console.error("Error fetching parent user:", error);
      ShowToast.error("Failed to fetch parent user");
    } finally {
      setLoading(false);
    }
  };

  // Auto-reset tree when search is cleared
  useEffect(() => {
    if (!search.trim() && tree) {
      // console.log("Resetting tree view", tree);
      setCurrentRoot(tree);
      setHighlightedId(null);
    }
  }, [search, tree]);

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

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
              placeholder="Search by User ID ..."
              className="border px-2 py-1 rounded-md w-64 max-md:w-58"
            />
            <SubmitButton
              type="button"
              onClick={handleSearch}
              className="text-black px-4 !py-1.5 max-lg:!py-1 rounded-md bg-yellow-400 font-semibold"
            >
              Search
            </SubmitButton>
            {/* <button
              onClick={handleRefresh}
              title="Refresh Tree"
              className="p-1 text-black rounded-md flex items-center justify-center transition-all duration-200"
            >
              <LuRefreshCw
                size={25}
                className={`cursor-pointer ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button> */}
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
                maxLevel={4}
                onUserClick={handleUserClick}
                refreshTree={() => fetchTree("")}
              />
            ) : (
              <p>Loading tree...</p>
            )}
          </div>
        </div>

        {/* {currentRoot?.user_id !== user?.user_id && (
          <button
            onClick={handleGoUp}
            title="Go to parent user"
            className="fixed bottom-6 left-6 md:left-20 xl:left-25  bg-yellow-400 text-black p-3 rounded-full shadow-md hover:bg-yellow-300 transition-all duration-200 z-50"
          >
            <FaLongArrowAltUp size={22} />
          </button>
        )} */}
      </div>
    </Layout>
  );
}
