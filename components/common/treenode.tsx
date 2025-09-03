import React, { useState } from "react";
import { FaUserCircle } from "react-icons/fa";

export interface TreeNode {
  user_id: string;
  name: string;
  user_status: string;
  contact?: string;
  mail?: string;
  left?: TreeNode | null;
  right?: TreeNode | null;
}

interface Props {
  node: TreeNode;
  getColor: (status: string) => string;
  highlightedId?: string | null;
}

const BinaryTreeNode: React.FC<Props> = ({ node, getColor, highlightedId }) => {
  const [hovered, setHovered] = useState(false);
  const isHighlighted = highlightedId === node.user_id;

  return (
    <div className="flex flex-col items-center relative">
      {/* Node */}
      <div
        className="flex flex-col items-center relative cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <FaUserCircle
          className={`${getColor(node.user_status)} ${
            isHighlighted ? "ring-4 ring-blue-700 rounded-full" : ""
          }`}
          size={40}
        />
        <span className="text-xs text-center mt-1 capitalize">{node.name}</span>
        <span className="text-xs text-center mt-1 font-semibold">
          {node.user_id}
        </span>
      </div>

      {/* Connector lines */}
      {(node.left || node.right) && (
        <div className="relative w-full flex justify-center mt-2">
          {/* horizontal line */}
          <div className="absolute top-0 left-1/4 right-1/4 border-t border-gray-400" />
          {/* vertical lines */}
          <div className="absolute top-0 left-1/4 -translate-x-1/2 border-l border-gray-400 h-4" />
          <div className="absolute top-0 right-1/4 translate-x-1/2 border-l border-gray-400 h-4" />
        </div>
      )}

      {/* Children */}
      {(node.left || node.right) && (
        <div className="flex justify-between w-full mt-6 gap-4 overflow-x-auto px-2">
          {/* Left */}
          <div className="flex flex-col items-center min-w-[120px]">
            {node.left ? (
              <BinaryTreeNode
                node={node.left}
                getColor={getColor}
                highlightedId={highlightedId}
              />
            ) : (
              <div className="w-12 h-12 border border-dashed border-gray-400 rounded-full flex items-center justify-center text-xs text-gray-400">
                Empty
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex flex-col items-center min-w-[120px]">
            {node.right ? (
              <BinaryTreeNode
                node={node.right}
                getColor={getColor}
                highlightedId={highlightedId}
              />
            ) : (
              <div className="w-12 h-12 border border-dashed border-gray-400 rounded-full flex items-center justify-center text-xs text-gray-400">
                Empty
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BinaryTreeNode;
