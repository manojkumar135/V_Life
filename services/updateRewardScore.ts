import { Score } from "@/models/score";
import { User } from "@/models/user";

export type RewardType = "daily" | "fortnight" | "cashback" | "reward";

interface RewardScorePayload {
  user_id: string;
  points: number;
  source: string;
  reference_id: string;
  remarks?: string;
  type: RewardType;
}

export async function addRewardScore({
  user_id,
  points,
  source,
  reference_id,
  remarks,
  type,
}: RewardScorePayload) {
  if (!user_id || points <= 0) return;

  const now = new Date();
  const rewardKey = type;

  const affectsScore = rewardKey !== "cashback";
  const affectsUser = rewardKey === "daily" || rewardKey === "fortnight" || rewardKey === "reward";

  /* =====================================================
     1️⃣ UPDATE USER (NO FETCH)
  ===================================================== */
  if (affectsUser) {
    await User.findOneAndUpdate(
      { user_id },
      {
        $inc: {
          ...(affectsScore && { score: points }),
          reward: points,
        },
      }
    );
  }

  /* =====================================================
     2️⃣ UPDATE SCORE (ATOMIC IF EXISTS)
  ===================================================== */
  const updated = await Score.findOneAndUpdate(
    { user_id },
    {
      $inc: {
        ...(affectsScore && { score: points }),
        [`${rewardKey}.earned`]: points,
        [`${rewardKey}.balance`]: points,
      },
      $push: {
        [`${rewardKey}.history.in`]: {
          source,
          reference_id,
          points,
          balance_after: {
            $add: [`$${rewardKey}.balance`, points],
          },
          remarks,
          created_at: now,
        },
      },
      $set: { updated_at: now },
    },
    { new: true }
  );

  if (updated) return;

  /* =====================================================
     3️⃣ CREATE SCORE DOCUMENT
  ===================================================== */
  const emptyBlock = {
    earned: 0,
    used: 0,
    balance: 0,
    history: { in: [], out: [] },
  };

  const activeBlock = {
    earned: points,
    used: 0,
    balance: points,
    history: {
      in: [
        {
          source,
          reference_id,
          points,
          balance_after: points,
          remarks,
          created_at: now,
        },
      ],
      out: [],
    },
  };

  await Score.create({
    user_id,
    score: affectsScore ? points : 0,

    daily: rewardKey === "daily" ? activeBlock : emptyBlock,
    fortnight: rewardKey === "fortnight" ? activeBlock : emptyBlock,
    cashback: rewardKey === "cashback" ? activeBlock : emptyBlock,
    reward: rewardKey === "reward" ? activeBlock : emptyBlock,

    updated_at: now,
  });
}
