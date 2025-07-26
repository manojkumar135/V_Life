"use client";
import React, { useState } from "react";
import Layout from "@/layout/Layout";
import BinaryTreeNode from "@/components/treenode";
import { useRouter } from "next/navigation";
import { IoArrowBackOutline } from "react-icons/io5";

interface TreeNode {
  id: string;
  name: string;
  color?: string;
  left?: TreeNode;
  right?: TreeNode;
}

export default function TreeView() {
  const router = useRouter();

  const tree: TreeNode = {
    id: "1",
    name: "Admin",
    color: "text-yellow-500",
    left: {
      id: "2",
      name: "Left A",
      color: "text-gray-700",
      left: {
        id: "4",
        name: "Left A1",
        color: "text-black",
      },
      right: {
        id: "5",
        name: "Right A1",
        color: "text-black",
      },
    },
    right: {
      id: "3",
      name: "Right A",
      color: "text-gray-700",
      left: {
        id: "6",
        name: "Left B1",
        color: "text-black",
      },
      right: {
        id: "7",
        name: "Right B1",
        color: "text-black",
      },
    },
  };

  const handleAdd = (side: "left" | "right", parentId: string) => {
    const newNode: TreeNode = {
      id: Math.random().toString(36).substring(2, 9),
      name: `User`,
    };

    const updateTree = (node: TreeNode): TreeNode => {
      if (node.id === parentId) {
        return {
          ...node,
          [side]: newNode,
        };
      }

      return {
        ...node,
        left: node.left ? updateTree(node.left) : undefined,
        right: node.right ? updateTree(node.right) : undefined,
      };
    };
  };

  return (
    <Layout>
      <div className="overflow-auto p-6">
        <IoArrowBackOutline
          size={25}
          color="black"
          className="ml-0 mr-3 mt-1 max-sm:!mt-0 max-sm:mr-1 cursor-pointer z-20 mb-3"
          onClick={() => router.push("/administration/users")}
        />
        <div className="flex justify-center">
          <BinaryTreeNode node={tree} onAdd={handleAdd} />
        </div>
      </div>
    </Layout>
  );
}
