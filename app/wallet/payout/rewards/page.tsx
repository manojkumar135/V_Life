"use client";

import { useState } from "react";
import Layout from "@/layout/Layout";

// ---------------- Dummy Data ----------------
const initialRewards = [
  {
    id: 1,
    title: "Thailand Trip",
    description: "Enjoy a luxury trip to Thailand!",
    pointsRequired: 1000,
    image: "https://via.placeholder.com/400x200?text=Thailand+Trip",
  },
  {
    id: 2,
    title: "EV Bike",
    description: "Eco-friendly EV Bike reward.",
    pointsRequired: 5000,
    image: "https://via.placeholder.com/400x200?text=EV+Bike",
  },
  {
    id: 3,
    title: "Smartphone",
    description: "Latest model smartphone as reward.",
    pointsRequired: 8000,
    image: "https://via.placeholder.com/400x200?text=Smartphone",
  },
];

// Dummy user (toggle role: "user" or "admin")
const currentUser = {
  id: "US123",
  name: "John Doe",
  score: 10000, // Saved reward points
  role: "user", // change to "admin" to test admin features
};

export default function RewardsPage() {
  const [rewards, setRewards] = useState(initialRewards);
  const [bookings, setBookings] = useState<any[]>([]);

  // Redeem reward
  const handleRedeem = (reward: any) => {
    const tickets = Math.floor(currentUser.score / reward.pointsRequired);
    if (tickets > 0) {
      setBookings((prev) => [
        ...prev,
        { userId: currentUser.id, reward: reward.title, tickets },
      ]);
      alert(
        `You booked ${tickets} ticket(s) for ${reward.title} using ${
          tickets * reward.pointsRequired
        } points!`
      );
    } else {
      alert("Not enough points to redeem this reward.");
    }
  };

  // Admin add reward
  const handleAddReward = () => {
    const newReward = {
      id: rewards.length + 1,
      title: "New Reward",
      description: "Admin added reward.",
      pointsRequired: 2000,
      image: "https://via.placeholder.com/400x200?text=New+Reward",
    };
    setRewards((prev) => [...prev, newReward]);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold text-black">Rewards</h1>

        {/* User Score */}
        <div className="text-lg font-semibold text-black">
          Your Score:{" "}
          <span className="text-yellow-400">{currentUser.score}</span>
        </div>

        {/* Admin Add Reward */}
        {currentUser.role === "admin" && (
          <button
            onClick={handleAddReward}
            className="px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-500"
          >
            + Add Reward
          </button>
        )}

        {/* Rewards Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {rewards.map((reward) => {
            const tickets = Math.floor(
              currentUser.score / reward.pointsRequired
            );
            return (
              <div
                key={reward.id}
                className="border border-gray-300 rounded-lg shadow bg-white p-4 flex flex-col"
              >
                <img
                  src={reward.image}
                  alt={reward.title}
                  className="rounded-md mb-3"
                />
                <h2 className="text-xl font-bold text-black">{reward.title}</h2>
                <p className="text-gray-500 mt-1">{reward.description}</p>
                <p className="mt-2 font-semibold text-black">
                  Required:{" "}
                  <span className="text-yellow-400">
                    {reward.pointsRequired}
                  </span>{" "}
                  points
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  You can buy{" "}
                  <span className="text-yellow-400 font-semibold">
                    {tickets}
                  </span>{" "}
                  ticket(s)
                </p>

                {currentUser.role === "user" && (
                  <button
                    onClick={() => handleRedeem(reward)}
                    className="mt-auto px-4 py-2 bg-black text-yellow-400 rounded hover:bg-gray-800"
                  >
                    Redeem
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Admin Bookings View */}
        {currentUser.role === "admin" && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold text-black">Bookings</h2>
            <ul className="mt-4 space-y-2">
              {bookings.map((b, idx) => (
                <li
                  key={idx}
                  className="p-3 border rounded bg-gray-50 flex justify-between text-gray-700"
                >
                  <span>
                    User: <b className="text-black">{b.userId}</b> booked{" "}
                    <b className="text-yellow-400">{b.tickets}</b> for{" "}
                    <b className="text-black">{b.reward}</b>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}
