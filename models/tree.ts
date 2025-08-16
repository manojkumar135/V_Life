import mongoose, { Schema, models, model } from "mongoose";

export interface ITreeNode {
  _id: mongoose.Types.ObjectId;
  user_id: string; // unique business/user ID
  name: string;
  parent?: mongoose.Types.ObjectId | null;
  left?: mongoose.Types.ObjectId | null;
  right?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const TreeNodeSchema = new Schema<ITreeNode>(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    parent: { type: Schema.Types.ObjectId, ref: "TreeNode", default: null },
    left: { type: Schema.Types.ObjectId, ref: "TreeNode", default: null },
    right: { type: Schema.Types.ObjectId, ref: "TreeNode", default: null },
  },
  { timestamps: true }
);

export default models.TreeNode || model<ITreeNode>("TreeNode", TreeNodeSchema);
