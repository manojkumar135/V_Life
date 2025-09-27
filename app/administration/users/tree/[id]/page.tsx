"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import BinaryTreeNode from "@/components/common/treenode";
import { useRouter, useParams } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import axios from "axios";
import { useVLife } from "@/store/context";
import SubmitButton from "@/components/common/submitbutton";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";

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
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const [currentRoot, setCurrentRoot] = useState<TreeNode | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState(""); // <-- local typing state
  const [searchQuery, setSearchQuery] = useState(""); // <-- only updates when "Search" is clicked

  const API_URL = "/api/tree-operations";

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

  const findNode = useCallback(
    (node: TreeNode | null, searchText: string): TreeNode | null => {
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
    },
    []
  );

  const fetchTree = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL, {
        params: { user_id: user.user_id },
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
  }, [user?.user_id]);

  const handleSearch = useCallback(
    (searchText: string) => {
      if (!tree || !user?.user_id) return;
      setLoading(true);

      // If empty → use logged-in user id
      const effectiveSearch = searchText.trim() ? searchText : user.user_id;

      const found = findNode(tree, effectiveSearch);
      if (found) {
        setCurrentRoot(found);
        setHighlightedId(found.user_id);
      } else {
        ShowToast.error("User not found!");
      }
      setLoading(false);
    },
    [tree, user?.user_id, findNode]
  );

  // Run search when `searchQuery` changes
  useEffect(() => {
    if (tree && searchQuery !== undefined) {
      handleSearch(searchQuery);
    }
  }, [tree, searchQuery, handleSearch]);

  // Auto-fill from URL param
  useEffect(() => {
    if (!id || autoFilled) return;
    let mounted = true;

    const fetchUserId = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/users-operations?id=${id}`);
        const userData = res?.data?.data ?? res?.data;
        if (userData && mounted) {
          const userId = userData.user_id ?? "";
          setInputValue(userId); // show in input
          setSearchQuery(userId); // trigger search after tree loads
          setAutoFilled(true);
        }
      } catch (e) {
        console.error("Failed to fetch user_id", e);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
    return () => {
      mounted = false;
    };
  }, [id, autoFilled]);

  // Run search when `searchQuery` changes
  useEffect(() => {
    if (tree && searchQuery) {
      handleSearch(searchQuery);
    } else if (tree && !searchQuery) {
      setCurrentRoot(tree);
      setHighlightedId(null);
    }
  }, [tree, searchQuery, handleSearch]);

  // Fetch tree once
  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
            onClick={() => router.back()}
          />

          <div className="flex justify-center items-center max-md:justify-end gap-2 mb-2 w-full lg:-ml-5 p-2 max-md:p-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search by  User ID..."
              className="border px-2 py-1 rounded-md w-64 max-md:w-58"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchQuery(inputValue);
                }
              }}
            />
            <SubmitButton
              type="button"
              onClick={() => setSearchQuery(inputValue)}
              className="text-black px-4 !py-1.5 max-lg:!py-1 rounded-md bg-yellow-400 font-semibold"
            >
              Search
            </SubmitButton>
          </div>
        </div>

        {/* Tree View */}
        <div className="flex-1 max-lg:flex overflow-x-auto pt-5">
          <div className="flex justify-center min-w-[950px] lg:min-w-[900px] xl:min-w-[1000px] max-md:ml-[5%] max-lg:ml-[10%]">
            {currentRoot ? (
              <BinaryTreeNode
                node={currentRoot}
                getColor={getStatusColor}
                highlightedId={highlightedId}
                level={1}
                maxLevel={4}
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
