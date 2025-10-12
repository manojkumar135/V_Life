"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    axios.get("/api/bookings-operations").then((res) => {
      setBookings(res.data.data);
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bookings</h1>
      <div className="space-y-3">
        {bookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet.</p>
        ) : (
          bookings.map((b: any, idx) => (
            <div key={idx} className="p-3 border rounded-md bg-gray-100 flex justify-between items-center text-gray-700">
              <span>
                <b className="text-black">{b.user_name}</b> booked{" "}
                <b className="text-yellow-500">{b.tickets}</b> ticket(s)
                for <b className="text-black">{b.reward_title}</b>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}