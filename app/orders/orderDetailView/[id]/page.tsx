"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { IoIosArrowBack } from "react-icons/io";
import Loader from "@/components/common/loader";
import Layout from "@/layout/Layout";
import SubmitButton from "@/components/common/submitbutton";

interface CartItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  description: string;
  bv?: number; // ✅ added bv
  pv?: number;
  gst?: number;
  whole_gst?: number;
  dealer_price?: number;
  unit_price?: number;
  price_with_gst?: number;
}

interface OrderData {
  orderId: string | number;
  userId?: string;
  userName?: string;
  mail?: string;
  contact?: string;
  address?: string;
  description?: string;
  orderStatus?: string;
  cart: CartItem[];
  totalAmount: number; // final amount after advance deduction
  subtotal?: number; // full order value before advance
  advanceDeducted?: number; // advance amount deducted
  isFirstOrder?: boolean;
  paymentDate?: string;
  paymentId?: string;
  payment?: string;
  shippingAddress?: string; // ✅ new field
}

export default function OrderDetailView() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params as any)?.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddress, setShowAddress] = useState<boolean>(false); // ✅ popup state

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/order-operations?id=${orderId}`);

        if (res?.data?.success) {
          const raw = res.data.data[0];
          const mappedOrder: OrderData = {
            orderId: raw.order_id,
            userId: raw.user_id,
            userName: raw.user_name,
            mail: raw.mail,
            contact: raw.contact,
            address: raw.address,
            description: raw.description,
            orderStatus: raw.order_status,
            cart: raw.items.map((item: any) => ({
              id: item.product_id,
              name: item.name,
              price: item.unit_price,
              quantity: item.quantity,
              image: item.image,
              description: item.description,
              bv: item.bv, // ✅ map bv
              pv: item.pv,
              whole_gst: item.whole_gst,
              gst: item.gst,
              price_with_gst: item.price_with_gst,
            })),
            subtotal: raw.total_amount,
            totalAmount: raw.final_amount ?? raw.amount,
            advanceDeducted: raw.advance_deducted,
            isFirstOrder: raw.is_first_order,
            paymentDate: raw.payment_date,
            paymentId: raw.payment_id,
            payment: raw.payment || "completed",
            shippingAddress: raw.shipping_address,
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

  console.log(order);
  return (
    <Layout>
      <div className="flex flex-col rounded-2xl p-4 max-lg:p-3 bg-white shadow-lg h-[100%]">
        {/* Header - Order Info */}
        <div className="flex-none border-b pb-1 max-lg:pb-3 mb-2 flex flex-col xl:flex-row gap-3 xl:items-center xl:pr-1">
          <button
            onClick={() => router.push("/orders")}
            className="flex items-center gap-2 text-black hover:text-black transition-colors cursor-pointer"
            aria-label="Go back to Orders"
          >
            <IoIosArrowBack size={25} />
          </button>

          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center xl:justify-between xl:w-[80%] gap-1 sm:gap-6 ">
              <span className="text-sm font-medium text-gray-600">
                Order ID:{" "}
                <span className="text-black font-semibold">
                  {order.orderId}
                </span>
              </span>
              <span className="text-sm font-medium text-gray-600">
                Payment Date:{" "}
                <span className="text-black font-semibold">
                  {order.paymentDate}
                </span>
              </span>
              <span className="text-sm font-medium text-gray-600">
                Payment ID:{" "}
                <span className="text-black font-semibold">
                  {order.paymentId}
                </span>
              </span>
            </div>

            <SubmitButton
              onClick={() => setShowAddress(true)}
              className=" text-sm transition-colors duration-200"
            >
              View Shipping Details
            </SubmitButton>
          </div>
        </div>

        {/* Cart - ONLY THIS SCROLLS */}
        <div className="flex-1 overflow-y-auto pr-2">
          {order.cart.length === 0 ? (
            <p className="text-gray-500 text-center py-6">
              No items in this order
            </p>
          ) : (
            <>
              {/* Header Row (Desktop) */}
              <div className="hidden lg:grid grid-cols-12 font-semibold text-gray-700 text-sm border-b pb-2 mb-2 xl:px-15">
                <div className="col-span-4">Product</div>
                <div className="col-span-1 text-center">Quantity</div>
                <div className="col-span-1 text-right">BV</div>
                <div className="col-span-1 text-right">PV</div>
                <div className="col-span-2 text-center">Unit Price</div>
                <div className="col-span-1 text-right">GST</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <div className="space-y-4 lg:scrollbar-custom">
                {order.cart.map((item) => (
                  <div
                    key={item.id}
                    className="w-full rounded-xl p-4 transition-all shadow-sm hover:shadow-lg border border-gray-200"
                  >
                    {/* Desktop */}
                    <div className="hidden lg:grid grid-cols-12 items-center xl:px-5">
                      <div className="col-span-4 flex items-center gap-4">
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
                          <p className="text-gray-700 text-xs mt-1">
                            <span className="font-semibold">
                              ₹ {(item.price || 0).toFixed(2)}
                            </span>{" "}
                            each + GST ({item.gst ?? 0}%)
                          </p>
                        </div>
                      </div>
                      <div className="col-span-1 text-center font-medium">
                        {item.quantity}
                      </div>
                      <div className="col-span-1 text-right font-medium">
                        {item.bv || 0}
                      </div>
                      <div className="col-span-1 text-right font-medium">
                        {item.pv || 0}
                      </div>
                      <div className="col-span-2 text-center text-gray-700">
                        ₹ {item.price.toFixed(2)}
                      </div>
                      <div className="col-span-1 text-right text-gray-700">
                        ₹ {(item.whole_gst || 0).toFixed(2)}
                      </div>
                      <div className="col-span-2 text-right font-bold text-gray-900">
                        ₹{" "}
                        {((item.price_with_gst || 0) * item.quantity).toFixed(
                          2
                        )}
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
                          <p className="text-gray-700 text-xs mt-1">
                            <span className="font-semibold">
                              ₹ {(item.price || 0).toFixed(2)}
                            </span>{" "}
                            each + GST ({item.gst ?? 0}%)
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm pl-1 pt-2">
                        <p className="text-gray-700">
                          Qty:{" "}
                          <span className="font-medium">{item.quantity}</span>
                        </p>
                        {item.bv && (
                          <p className="text-gray-700">
                            BV: <span className="font-medium">{item.bv}</span>
                          </p>
                        )}
                        {item.pv && (
                          <p className="text-gray-700">
                            PV: <span className="font-medium">{item.pv}</span>
                          </p>
                        )}

                        <div className=" text-right font-bold text-gray-700">
                          ₹{" "}
                          {((item.price_with_gst || 0) * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none border-t pt-4 lg:px-10 bg-white py-3">
          {order.isFirstOrder && order.advanceDeducted ? (
            <>
              <div className="flex justify-between items-center text-sm text-gray-700 font-medium">
                <span>Subtotal</span>
                <span className="font-semibold">
                  ₹ {order.subtotal?.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm text-red-500 mt-1">
                <span>Advance Paid</span>
                <span>- ₹ {order.advanceDeducted.toFixed(2)}</span>
              </div>

              <div className="border-t border-gray-200 my-3"></div>

              <div className="flex justify-between items-center text-base sm:text-lg font-semibold">
                <span>Total Paid:</span>
                <span className="text-black">
                  ₹ {order.totalAmount.toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center text-base sm:text-lg font-semibold">
              <span>Total Paid:</span>
              <span className="text-black">
                ₹ {order.totalAmount.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Shipping Address Popup */}
      {showAddress && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => setShowAddress(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg w-[90%] max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddress(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-lg font-bold"
              aria-label="Close"
            >
              ✕
            </button>

            <p className="text-lg font-semibold mb-4">Shipping Details</p>

            <div className="grid grid-cols-[max-content_1ch_1fr] gap-y-2 gap-x-2 text-gray-700 text-sm">
              <span className="font-bold text-black">Order ID</span>
              <span className="font-bold text-black text-center">:</span>
              <span className="font-normal text-black">{order.orderId}</span>

              <span className="font-bold text-black ">User ID</span>
              <span className="font-bold text-black text-center">:</span>
              <span className="font-normal text-black">{order.userId}</span>

              <span className="font-bold text-black ">User Name</span>
              <span className="font-bold text-black text-center">:</span>
              <span className="font-normal text-black">{order.userName}</span>

              <span className="font-bold text-black ">Email</span>
              <span className="font-bold text-black text-center">:</span>
              <span className="font-normal text-black  whitespace-pre-line">
                {order.mail}
              </span>

              <span className="font-bold text-black ">Contact</span>
              <span className="font-bold text-black text-center">:</span>
              <span className="font-normal text-black">{order.contact}</span>

              <span className="font-bold text-black ">Payment</span>
              <span className="font-bold text-black text-center">:</span>
              <span className="font-normal text-black">{order.payment}</span>

              <span className="font-bold text-black ">Address</span>
              <span className="font-bold text-black text-center">:</span>
              <span className="font-normal text-black whitespace-pre-line">
                {order.address || "No address available"}
              </span>

              <span className="font-bold text-black ">Description</span>
              <span className="font-bold text-black text-center">:</span>
              <span className="font-normal text-black whitespace-pre-line">
                {order.description || "N/A"}
              </span>

              <span className="font-bold text-black ">Order Status</span>
              <span className="font-bold text-black text-center">:</span>
              <span className="font-normal text-black">
                {order.orderStatus}
              </span>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
