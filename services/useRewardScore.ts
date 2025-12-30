import { Score } from "@/models/score";
import { User } from "@/models/user";

export type RewardType = "daily" | "fortnight" | "cashback" | "reward";


interface RewardBlock {
  earned: number;
  used: number;
  balance: number;
}

interface ScoreDoc {
  daily: RewardBlock;
  fortnight: RewardBlock;
  cashback: RewardBlock;
  reward: RewardBlock;
}

interface UseRewardPayload {
  user_id: string;
  points: number;
  module: string;
  reference_id: string;
  remarks?: string;
  type: RewardType;
}

export async function useRewardScore({
  user_id,
  points,
  module,
  reference_id,
  remarks,
  type,
}: UseRewardPayload) {
  if (!user_id || points <= 0) return;

  const now = new Date();
  const rewardKey = type;

  const affectsScore = rewardKey !== "cashback";
  const affectsUser =
    rewardKey === "daily" ||
    rewardKey === "fortnight" ||
    rewardKey === "reward";

  /* =====================================================
     1️⃣ ATOMIC BALANCE CHECK + DEDUCTION
     👉 NO RACE CONDITION
  ===================================================== */
  const updated = await Score.findOneAndUpdate(
    {
      user_id,
      [`${rewardKey}.balance`]: { $gte: points },
    },
    {
      $inc: {
        [`${rewardKey}.used`]: points,
        [`${rewardKey}.balance`]: -points,
        ...(affectsScore && { score: -points }),
      },
      $push: {
        [`${rewardKey}.history.out`]: {
          module,
          reference_id,
          points,
          remarks,
          balance_after: {
            $subtract: [`$${rewardKey}.balance`, points],
          },
          created_at: now,
        },
      },
      $set: { updated_at: now },
    },
    { new: true }
  );

  if (!updated) {
    throw new Error("Insufficient reward balance");
  }

  /* =====================================================
     2️⃣ MIRROR USER (DAILY / FORTNIGHT / REWARD)
  ===================================================== */
  if (affectsUser) {
    await User.findOneAndUpdate(
      { user_id },
      {
        $inc: {
          reward: -points,
          ...(affectsScore && { score: -points }),
        },
      }
    );
  }
}
