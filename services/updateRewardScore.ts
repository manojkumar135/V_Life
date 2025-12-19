import { Score } from "@/models/score";
import { User } from "@/models/user";

export type RewardType = "daily" | "fortnight" | "cashback";

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
  const rewardKey: RewardType = type;

  /* =====================================================
     1️⃣ UPDATE USER (ONLY DAILY / FORTNIGHT)
     👉 NO USER FETCH
  ===================================================== */
  if (rewardKey === "daily" || rewardKey === "fortnight") {
    await User.findOneAndUpdate(
      { user_id },
      {
        $inc: {
          score: points,
          reward: points,
        },
      }
    );
  }

  /* =====================================================
     2️⃣ UPDATE SCORE IF EXISTS
  ===================================================== */
  const updated = await Score.findOneAndUpdate(
    { user_id },
    {
      $inc: {
        ...(rewardKey !== "cashback" && { score: points }),
        [`${rewardKey}.earned`]: points,
        [`${rewardKey}.balance`]: points,
      },
      $push: {
        [`${rewardKey}.history.in`]: {
          source,
          reference_id,
          points,
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
     3️⃣ CREATE SCORE IF NOT EXISTS
  ===================================================== */
  await Score.create({
    user_id,
    score: rewardKey === "cashback" ? 0 : points,

    daily:
      rewardKey === "daily"
        ? {
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
          }
        : { earned: 0, used: 0, balance: 0, history: { in: [], out: [] } },

    fortnight:
      rewardKey === "fortnight"
        ? {
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
          }
        : { earned: 0, used: 0, balance: 0, history: { in: [], out: [] } },

    cashback:
      rewardKey === "cashback"
        ? {
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
          }
        : { earned: 0, used: 0, balance: 0, history: { in: [], out: [] } },

    updated_at: now,
  });
}
