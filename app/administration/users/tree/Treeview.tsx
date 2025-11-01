"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import Layout from "@/layout/Layout";
import BinaryTreeNode from "@/components/common/treenode";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import axios from "axios";
import { useVLife } from "@/store/context";
import SubmitButton from "@/components/common/submitbutton";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { LuRefreshCw } from "react-icons/lu";

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

interface TreeViewProps {
  id?: string | null;
  newuser?: string | null;
}

export default function TreeView({ id, newuser }: TreeViewProps) {
  const { user } = useVLife();
  const router = useRouter();

  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentRoot, setCurrentRoot] = useState<TreeNode | null>(null);
  const [search, setSearch] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // fetch full tree for the logged in user
  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL, {
        params: { user_id: user.user_id },
      });
      if (data?.data) {
        setTree(data.data);
        setCurrentRoot(data.data);
        setHighlightedId(null);
      }
    } catch (error) {
      console.error("Error fetching tree:", error);
      ShowToast.error("Failed to load tree");
    } finally {
      setLoading(false);
    }
  }, [user.user_id]);

  // initial load: if there's no newuser prop, load normal tree.
  // if newuser exists we skip the default fetch here and let the newuser effect handle it
  useEffect(() => {
    if (!user?.user_id) return;
    if (!newuser) {
      fetchTree();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id, fetchTree, newuser]);

  // If URL has id, set input box but DO NOT auto search
  // useEffect(() => {
  //   if (id) setSearch(id);
  // }, [id]);

  // Manual search only when button clicked
  const handleSearch = async () => {
    if (!search.trim()) return;

    try {
      setLoading(true);
      const { data } = await axios.get(API_URL, {
        params: { user_id: search },
      });

      if (data?.data) {
        setCurrentRoot(data.data);
        setHighlightedId(search);
      } else {
        ShowToast.error("User not found!");
      }
    } catch (error) {
      ShowToast.error("User not found!");
    } finally {
      setLoading(false);
    }
  };

  // Reset tree when search cleared manually
  useEffect(() => {
    if (!search.trim() && tree) {
      setCurrentRoot(tree);
      setHighlightedId(null);
    }
  }, [search, tree]);

  // Manual refresh button: always refresh the normal tree (full root)
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchTree();
      setSearch("");
      setHighlightedId(null);
      ShowToast.success("Tree refreshed!");
    } catch (error) {
      ShowToast.error("Failed to refresh tree");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh parent tree ONLY ONCE after new registration (when newuser prop is provided)
  const newUserHandled = useRef(false);
  useEffect(() => {
    // if there's no newuser do nothing here
    if (!newuser) return;

    // if already handled the current newuser, skip
    if (newUserHandled.current) return;

    newUserHandled.current = true;
    // Call the parent-focused refresh flow
    handleRefreshFromParent(newuser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newuser]);

  const handleRefreshFromParent = async (userId?: string) => {
    try {
      setLoading(true);

      const startId = userId ?? currentRoot?.user_id ?? user.user_id;

      // Get parent
      const res1 = await axios.get(`/api/tree-operations?user_id=${startId}`);
      const parentId = res1?.data?.data?.parent;

      let targetId = "";

      if (!parentId) {
        targetId = user.user_id;
      } else {
        // Try grand parent
        const res2 = await axios.get(`/api/tree-operations?user_id=${parentId}`);
        const grandParentId = res2?.data?.data?.parent;
        targetId = grandParentId || parentId || user.user_id;
      }

      const res3 = await axios.get(API_URL, { params: { user_id: targetId } });

      if (res3?.data?.data) {
        setCurrentRoot(res3.data.data);
        setHighlightedId(startId);
        ShowToast.success("Tree updated!");
      } else {
        ShowToast.error("Failed to refresh tree");
      }
    } catch (err) {
      console.error("Error in handleRefreshFromParent:", err);
      ShowToast.error("Error loading tree");
    } finally {
      setLoading(false);
    }
  };

  // On node click, load subtree
  const handleUserClick = async (userId: string) => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL, { params: { user_id: userId } });
      if (data?.data) {
        setCurrentRoot(data.data);
        setHighlightedId(userId);
      }
    } catch (error) {
      ShowToast.error("Failed to load user tree");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="p-4 max-md:-mt-5 flex flex-col h-full max-lg:max-w-[720px]">
        <div className="flex flex-row items-center max-md:justify-between mb-1 ">
          <IoIosArrowBack
            size={28}
            color="black"
            className="ml-0 mr-3 max-sm:mr-1 cursor-pointer z-20 mb-3 max-md:mb-2 lg:-mt-5"
            onClick={() => router.push("/administration/users")}
          />

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

            <button
              onClick={handleRefresh}
              title="Refresh Tree"
              className="p-1 text-black rounded-md flex items-center justify-center transition-all duration-200"
            >
              <LuRefreshCw
                size={25}
                className={`cursor-pointer ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

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
                refreshTree={(userId?: string) => handleRefreshFromParent(userId)}
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