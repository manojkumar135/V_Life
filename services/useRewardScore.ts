import { Score } from "@/models/score";
import { User } from "@/models/user";

export type RewardType = "daily" | "fortnight" | "cashback";

interface RewardBlock {
  earned: number;
  used: number;
  balance: number;
}

interface ScoreDoc {
  daily: RewardBlock;
  fortnight: RewardBlock;
  cashback: RewardBlock;
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
  const rewardKey: RewardType = type;

  /* =====================================================
     1️⃣ FETCH SCORE BALANCE
  ===================================================== */
  const scoreDoc = await Score.findOne({ user_id })
    .select(`${rewardKey}.balance`)
    .lean<ScoreDoc>();

  if (!scoreDoc) throw new Error("Score record not found");

  const currentBalance = scoreDoc[rewardKey].balance;
  if (currentBalance < points) {
    throw new Error("Insufficient reward balance");
  }

  const newBalance = currentBalance - points;

  /* =====================================================
     2️⃣ UPDATE SCORE
  ===================================================== */
  await Score.findOneAndUpdate(
    { user_id },
    {
      $inc: {
        [`${rewardKey}.used`]: points,
        [`${rewardKey}.balance`]: -points,
        ...(rewardKey !== "cashback" && { score: -points }),
      },
      $push: {
        [`${rewardKey}.history.out`]: {
          module,
          reference_id,
          points,
          balance_after: newBalance,
          remarks,
          created_at: now,
        },
      },
      $set: { updated_at: now },
    }
  );

  /* =====================================================
     3️⃣ UPDATE USER (ONLY DAILY / FORTNIGHT)
  ===================================================== */
  if (rewardKey === "daily" || rewardKey === "fortnight") {
    await User.findOneAndUpdate(
      { user_id },
      {
        $inc: {
          reward: -points,
          score: -points,
        },
      }
    );
  }
}
