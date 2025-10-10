"use client";

import { useState } from "react";
import Image from "next/image";
import Layout from "@/layout/Layout";
import SubmitButton from "@/components/common/submitbutton";
import { useVLife } from "@/store/context";

// ---------------- Dummy Data ----------------
const initialRewards = [
  {
    id: 1,
    title: "Thailand Trip",
    description: "Enjoy a luxury trip to Thailand!",
    pointsRequired: 1000,
    image:
      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760075718/first-business-trip-tips-unsmushed_hgjsm6.jpg",
  },
  {
    id: 2,
    title: "EV Bike",
    description: "Eco-friendly EV Bike reward.",
    pointsRequired: 5000,
    image:
      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760075754/DAB-E-electric-bike-1-1_ikf7xa.jpg",
  },
  {
    id: 3,
    title: "Smartphone",
    description: "Latest model smartphone as reward.",
    pointsRequired: 8000,
    image:
      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760075763/S500926465_1_qzukvk.webp",
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
  const { user } = useVLife();
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
      <div className="p-3 px-6 space-y-2 min-h-screen ">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <p className="text-3xl font-bold text-black">🎁 Rewards</p>
            <p className="text-lg font-medium text-gray-700">
              Your Score:{" "}
              <span className="text-yellow-400 font-bold">
                {currentUser.score}
              </span>
            </p>
          </div>

          {/* Admin Add Reward Button */}
          {user.role === "admin" && (
            <SubmitButton
              onClick={handleAddReward}
              className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-md hover:bg-yellow-500 transition-all duration-200"
            >
              + Add Reward
            </SubmitButton>
          )}
        </div>

        {/* Rewards Grid */}
        <div className="flex flex-col w-full">
          {rewards.map((reward) => {
            const tickets = Math.floor(
              currentUser.score / reward.pointsRequired
            );
            return (
              <div
                key={reward.id}
                className="border border-gray-200 rounded-xl shadow-md bg-white hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col lg:flex-row w-full my-2 h-[145px] max-md:h-auto"
              >
                {/* Image Section */}
                <div className="relative w-full lg:w-[300px] h-[145px] max-md:h-[160px]">
                  <Image
                    src={reward.image}
                    alt={reward.title}
                    fill
                    className=" rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none shadow-xl p-1"
                  />
                </div>

                {/* Info Section */}
                <div className="px-4 py-2 flex flex-col flex-grow">
                  {/* Content */}
                  <div className="flex-1">
                    <p className="text-xl font-bold text-black">
                      {reward.title}
                    </p>
                    <p className="text-gray-600 mt-1 line-clamp-2">
                      {reward.description}
                    </p>
                    <p className="mt-2 font-semibold text-black">
                      Required:{" "}
                      <span className="text-yellow-400">
                        {reward.pointsRequired}
                      </span>{" "}
                      points
                    </p>
                    <p className="text-sm text-gray-500">
                      You can buy{" "}
                      <span className="text-yellow-400 font-semibold">
                        {tickets}
                      </span>{" "}
                      ticket(s)
                    </p>
                  </div>

                  {/* Button always bottom-aligned */}
                  <div className="flex justify-end items-end -mt-5">
                    <SubmitButton
                      onClick={() => handleRedeem(reward)}
                      className="px-5 py-2 transition-all duration-200"
                    >
                      Redeem
                    </SubmitButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Admin Bookings View */}
        {user.role === "admin" && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold text-black mb-4">Bookings</h2>
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <p className="text-gray-500">No bookings yet.</p>
              ) : (
                bookings.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded-md bg-gray-100 flex justify-between items-center text-gray-700"
                  >
                    <span>
                      <b className="text-black">{b.userId}</b> booked{" "}
                      <b className="text-yellow-500">{b.tickets}</b> ticket(s)
                      for <b className="text-black">{b.reward}</b>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
