"use client";

import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import BinaryTreeNode from "@/components/common/treenode";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import { LuRefreshCw } from "react-icons/lu";
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
  const searchParams = useSearchParams();
  const id = params.id;
  const newuser = searchParams.get("newuser") || "";

  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [currentRoot, setCurrentRoot] = useState<TreeNode | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  // ✅ Refresh from parent of parent (for activation/deactivation/registration)
  const handleRefreshFromParent = async (userId?: string) => {
    try {
      setLoading(true);
      let startId = userId ?? currentRoot?.user_id ?? user.user_id;
      let targetId = "";

      const res1 = await axios.get(`/api/tree-operations?user_id=${startId}`);
      const parentId = res1?.data?.data?.parent;

      if (!parentId) {
        targetId = user.user_id;
      } else {
        // const res2 = await axios.get(
        //   `/api/tree-operations?user_id=${parentId}`
        // );
        // const grandParentId = res2?.data?.data?.parent;
        // targetId = grandParentId || parentId || user.user_id
        targetId = parentId || user.user_id;
      }

      const res3 = await axios.get(API_URL, { params: { user_id: targetId } });
      if (res3?.data?.data) {
        setCurrentRoot(res3.data.data);
        setHighlightedId(startId);
        ShowToast.success("Tree refreshed!");
      } else {
        ShowToast.error("Failed to refresh tree");
      }
    } catch (err) {
      console.error("Error refreshing tree from parent:", err);
      ShowToast.error("Error loading tree");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Full tree refresh button
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchTree();
      setSearchQuery("");
      setInputValue("");
      setHighlightedId(null);
      ShowToast.success("Tree refreshed!");
    } catch (error) {
      ShowToast.error("Failed to refresh tree");
    } finally {
      setIsRefreshing(false);
    }
  };

  //   const handleRefresh = async () => {
  //   try {
  //     setIsRefreshing(true);
  //     let targetUserId = user?.user_id;

  //     // If /tree/[id] param exists, use it instead of logged-in user
  //     if (id) {
  //       try {
  //         const res = await axios.get(`/api/users-operations?id=${id}`);
  //         targetUserId = res?.data?.data?.user_id || targetUserId;
  //       } catch (e) {
  //         console.warn("Failed to get user_id from id param:", e);
  //       }
  //     }

  //     if (targetUserId) {
  //       const { data } = await axios.get(API_URL, {
  //         params: { user_id: targetUserId },
  //       });
  //       if (data?.data) {
  //         setTree(data.data);
  //         setCurrentRoot(data.data);
  //         setHighlightedId(null);
  //         setSearchQuery("");
  //         setInputValue("");
  //         ShowToast.success("Tree refreshed!");
  //       } else {
  //         ShowToast.error("Failed to refresh tree");
  //       }
  //     }
  //   } catch (error) {
  //     ShowToast.error("Failed to refresh tree");
  //   } finally {
  //     setIsRefreshing(false);
  //   }
  // };

  // ✅ Auto-fill from /tree/[id]
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
          setInputValue(userId);
          setSearchQuery(userId);
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

  // ✅ Auto-refresh tree if new user just registered
  useEffect(() => {
    if (newuser) {
      setTimeout(() => {
        handleRefreshFromParent(newuser);
        ShowToast.success("New user added — tree updated!");
        router.replace(`/tree/${id}`); // remove ?newuser param
      }, 1000);
    }
  }, [newuser]);

  // ✅ Fetch tree on mount
  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // ✅ Re-run search when tree is fetched
  useEffect(() => {
    if (tree && searchQuery) handleSearch(searchQuery);
    else if (tree && !searchQuery) {
      setCurrentRoot(tree);
      setHighlightedId(null);
    }
  }, [tree, searchQuery, handleSearch]);

  const handleUserClick = async (userId: string) => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL, {
        params: { user_id: userId },
      });
      if (data?.data) {
        setCurrentRoot(data.data);
        setHighlightedId(userId);
        ShowToast.success(`Showing tree from ${userId}`);
      } else {
        ShowToast.error("User not found in tree!");
      }
    } catch (err) {
      console.error("Error loading subtree:", err);
      ShowToast.error("Failed to load subtree");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="p-4 max-md:-mt-5 flex flex-col h-full max-lg:max-w-[720px]">
        {/* Header + Search */}
        <div className="flex flex-row items-center max-md:justify-between mb-1">
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
              placeholder="Search by User ID..."
              className="border px-2 py-1 rounded-md w-64 max-md:w-58"
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearchQuery(inputValue);
              }}
            />
            <SubmitButton
              type="button"
              onClick={() => setSearchQuery(inputValue)}
              className="text-black px-4 !py-1.5 max-lg:!py-1 rounded-md bg-yellow-400 font-semibold"
            >
              Search
            </SubmitButton>
            <button
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
            </button>
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
                onUserClick={handleUserClick}
                refreshTree={(userId?: string) =>
                  handleRefreshFromParent(userId)
                }
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
