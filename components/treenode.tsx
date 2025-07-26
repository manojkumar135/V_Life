import React from "react";
import { FaUserCircle, FaPlusCircle } from "react-icons/fa";

export interface TreeNode {
  id: string;
  name: string;
    color?: string;
  left?: TreeNode;
  right?: TreeNode;
}


interface Props {
  node: TreeNode;
  onAdd: (side: "left" | "right", parentId: string) => void;
}

const BinaryTreeNode: React.FC<Props> = ({ node, onAdd }) => {
  return (
    <div className="flex flex-col items-center relative">
      {/* User Icon */}
      <div className="flex flex-col items-center">
        <FaUserCircle className="text-blue-500" size={40} />
        <span className="text-xs text-center mt-1">{node.name}</span>
      </div>

      {/* Children Lines */}
      {(node.left || node.right) && (
        <div className="flex justify-between w-full mt-2">
          <div className="w-1/2 border-t border-gray-400 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 border-l border-gray-400 h-4" />
          </div>
          <div className="w-1/2 border-t border-gray-400 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 border-l border-gray-400 h-4" />
          </div>
        </div>
      )}

      {/* Left and Right Nodes */}
      <div className="flex justify-between w-full mt-4 gap-4 px-2">
        {/* Left */}
        <div className="flex-1 flex justify-center">
          {node.left ? (
            <BinaryTreeNode node={node.left} onAdd={onAdd} />
          ) : (
            <button onClick={() => onAdd("left", node.id)}>
              <FaPlusCircle className="text-green-500" size={32} />
            </button>
          )}
        </div>

        {/* Right */}
        <div className="flex-1 flex justify-center">
          {node.right ? (
            <BinaryTreeNode node={node.right} onAdd={onAdd} />
          ) : (
            <button onClick={() => onAdd("right", node.id)}>
              <FaPlusCircle className="text-green-500" size={32} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BinaryTreeNode;
