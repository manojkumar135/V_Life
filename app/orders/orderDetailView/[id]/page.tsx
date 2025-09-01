"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { IoIosArrowBack } from "react-icons/io";
import Loader from "@/components/common/loader";
import Layout from "@/layout/Layout";

interface CartItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  description: string;
}

interface OrderData {
  orderId: string | number;
  cart: CartItem[];
  totalAmount: number;
  paymentDate?: string;
  paymentId?: string;
}

export default function OrderDetailView() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params as any)?.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/order-operations?id=${orderId}`);
        console.log("API Response:", res.data);

        if (res?.data?.success) {
          const raw = res.data.data;

          // ✅ Map backend response to frontend-friendly structure
          const mappedOrder: OrderData = {
            orderId: raw.order_id,
            cart: raw.items.map((item: any) => ({
              id: item.product_id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
              description: item.description,
            })),
            totalAmount: raw.amount,
            paymentDate: raw.payment_date,
            paymentId: raw.payment_id,
          };

          setOrder(mappedOrder);
        } else {
          setOrder(null);
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
        <Loader />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.push("/orders")}
          className="flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <IoIosArrowBack size={20} />
        </button>
        <p className="mt-6 text-center text-gray-500">Order not found</p>
      </div>
    );
  }

  return (
    <Layout>
      <div className="rounded-2xl p-4 max-lg:p-3 bg-white shadow-lg h-full">
        {/* Back + Order Info */}
        <div className="border-b pb-1 max-lg:pb-3 mb-2 flex flex-col xl:flex-row justify-between gap-2 xl:items-center xl:pr-15">
          <button
            onClick={() => router.push("/orders")}
            className="flex max-lg:flex-col flex-row max-lg:items-start items-center gap-2 text-black hover:text-black transition-colors cursor-pointer"
          >
            <IoIosArrowBack size={25} />
            <span className="text-sm font-medium text-gray-600">
              Order ID:{" "}
              <span className="text-black font-semibold">{order.orderId}</span>
            </span>
          </button>
          
          <span className="text-sm font-medium text-gray-600">
               Payment Date:{" "}
              <span className="text-black font-semibold"> {order.paymentDate}</span>
            </span>

              <span className="text-sm font-medium text-gray-600">
                Payment ID:{" "}
              <span className="text-black font-semibold"> {order.paymentId}</span>
            </span>
          
        </div>

        {/* Cart */}
        {order.cart.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            No items in this order
          </p>
        ) : (
          <>
            {/* Header Row (Desktop) */}
            <div className="hidden lg:grid grid-cols-12 font-semibold text-gray-700 text-sm border-b pb-2 mb-2 xl:px-15">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Items */}
            <div className="space-y-4 max-h-96 max-md:max-h-110 max-lg:max-h-250 overflow-y-auto pr-2 lg:scrollbar-custom">
              {order.cart.map((item) => (
                <div
                  key={item.id}
                  className=" w-full rounded-xl p-4 transition-all shadow-sm hover:shadow-lg border border-gray-200"
                >
                  {/* Desktop */}
                  <div className="hidden lg:grid grid-cols-12 items-center xl:px-5">
                    <div className="col-span-6 flex items-center gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">
                          {item.name}
                        </p>
                        <p className="text-gray-600 text-xs mt-1 line-clamp-1">
                          {item.description}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          ₹ {item.price.toFixed(2)} each
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center font-medium">
                      {item.quantity}
                    </div>
                    <div className="col-span-2 text-right text-gray-700">
                      ₹ {item.price.toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right font-bold text-gray-900">
                      ₹ {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="lg:hidden flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {item.name}
                        </p>
                        <p className="text-gray-600 text-xs mt-1 line-clamp-1">
                          {item.description}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          ₹ {item.price.toFixed(2)} each
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm pl-4">
                      <p className="text-gray-700">
                        Qty:{" "}
                        <span className="font-medium">{item.quantity}</span>
                      </p>
                      <p className="font-bold text-gray-900">
                        ₹ {(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t mt-4 pt-4 flex justify-between items-center text-base sm:text-lg font-semibold sticky bottom-0 bg-white py-3">
              <span>Total Paid:</span>
              <span className="text-black">
                ₹ {order.totalAmount.toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
