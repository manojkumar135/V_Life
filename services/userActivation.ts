// services/userActivation.ts

import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import { Wallet } from "@/models/wallet";
import { Alert } from "@/models/alert";

export async function activateUser(user: any) {
  const date = new Date();
  const formattedDate = date.toLocaleDateString("en-GB").split("/").join("-");

  const updateData = {
    user_status: "active",
    status: "active",
    status_notes: "Activated automatically after first order",
    activated_date: formattedDate,
    last_modified_at: new Date(),
  };

  await Promise.all([
    User.updateOne({ user_id: user.user_id }, { $set: updateData }),
    Login.updateMany({ user_id: user.user_id }, { $set: updateData }),
    TreeNode.updateOne({ user_id: user.user_id }, { $set: updateData }),
    Wallet.updateOne({ user_id: user.user_id }, { $set: updateData }),
  ]);

  await Alert.create({
    user_id: user.user_id,
    user_name: user.user_name,
    user_status: "active",
    role: "user",
    priority: "high",
    title: "🎉 Account Activated!",
    description: `Hi ${user.user_name}, your account is now active after your first order.`,
    type: "activation",
    link: "/orders",
    read: false,
    date: formattedDate,
  });
}
