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

        {/* Tooltip */}
        {hovered && (
          <div className="absolute top-14 z-10 bg-white border shadow-md rounded-md p-2 text-xs w-56">
            <p>
              <strong>ID:</strong> {node.user_id}
            </p>
            <p>
              <strong>Name:</strong> {node.name}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span className={getColor(node.user_status)}>
                {node.user_status}
              </span>
            </p>
            {node.contact && (
              <p>
                <strong>Contact:</strong> {node.contact}
              </p>
            )}
            {node.mail && (
              <p>
                <strong>Email:</strong> {node.mail}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Connector lines */}
      <div className="relative flex justify-center mt-2 w-full">
        {/* horizontal line connecting children */}
        <div className="absolute top-0 left-1/4 right-1/4 border-t border-gray-400" />
        {/* vertical lines */}
        <div className="absolute top-0 left-1/4 border-l border-gray-400 h-2" />
        <div className="absolute top-0 right-1/4 border-l border-gray-400 h-2" />
      </div>

      {/* Children */}
      <div className="flex justify-between mt-2 w-auto xl:w-full min-w-[300px] lg:min-w-[260px] px-4">
        {/* Left */}
        <div className="flex flex-col items-center flex-1">
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
        <div className="flex flex-col items-center flex-1">
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
    </div>
  );
};

export default BinaryTreeNode;
