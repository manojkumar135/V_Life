"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { IoIosArrowBack } from "react-icons/io";
import Loader from "@/components/common/loader";
import Layout from "@/layout/Layout";
import SubmitButton from "@/components/common/submitbutton";
import { useVLife } from "@/store/context";

// ─────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────

interface CartItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  description: string;
  bv?: number;
  pv?: number;
  gst?: number;
  whole_gst?: number;
  dealer_price?: number;
  unit_price?: number;
  price_with_gst?: number;
}

interface ShippingData {
  tracking_id?: string;
  courier_partner?: string;
  dispatch_date?: string;
  dispatch_time?: string;
  estimated_delivery?: string;
  delivered_date?: string;
  delivered_time?: string;
  return_reason?: string;
  remarks?: string;
  tracking_url?: string;
  updated_by?: string;
}

interface TrackForm {
  order_status: string;
  tracking_id: string;
  courier_partner: string;
  dispatch_date: string;
  dispatch_time: string;
  estimated_delivery: string;
  delivered_date: string;
  delivered_time: string;
  return_reason: string;
  remarks: string;
  tracking_url: string;
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
  totalAmount: number;
  subtotal: number;
  advanceDeducted?: number;
  isFirstOrder?: boolean;
  paymentDate?: string;
  paymentId?: string;
  payment?: string;
  shippingAddress?: string;
  payableAmount?: number;
  rewardUsed: number;
  placedBy?: {
    user_id: string;
    name?: string;
    contact?: string;
    mail?: string;
  };
  beneficiary?: {
    user_id: string;
    name?: string;
    contact?: string;
    mail?: string;
    address?: string;
  };
  rewardUsage: {
    cashback: { used: number; before: number; after: number };
    fortnight: { used: number; before: number; after: number };
    daily: { used: number; before: number; after: number };
  };
  shipping?: ShippingData;
}

// ─────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;

  const map: Record<string, { label: string; classes: string }> = {
    pending: { label: "Pending", classes: "bg-yellow-100 text-yellow-700" },
    packed: { label: "Packed", classes: "bg-blue-100 text-blue-700" },
    dispatched: {
      label: "Dispatched",
      classes: "bg-indigo-100 text-indigo-700",
    },
    out_for_delivery: {
      label: "Out for Delivery",
      classes: "bg-orange-100 text-orange-700",
    },
    delivered: { label: "Delivered", classes: "bg-green-100 text-green-700" },
    returned: { label: "Returned", classes: "bg-red-100 text-red-700" },
    cancelled: { label: "Cancelled", classes: "bg-gray-100 text-gray-500" },
  };

  const cfg = map[status] ?? {
    label: status,
    classes: "bg-gray-100 text-gray-500",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────
// Reusable form field components
// ─────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {children}
    </label>
  );
}

function TextInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full
                 focus:outline-none focus:ring-2 focus:ring-black"
    />
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const toInputVal = (v: string) => {
    if (!v) return "";
    const parts = v.split("-");
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return v;
  };

  const fromInputVal = (v: string) => {
    if (!v) return "";
    const [y, m, d] = v.split("-");
    return `${d}-${m}-${y}`;
  };

  return (
    <input
      type="date"
      value={toInputVal(value)}
      onChange={(e) => onChange(fromInputVal(e.target.value))}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full
                 focus:outline-none focus:ring-2 focus:ring-black"
    />
  );
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full
                 focus:outline-none focus:ring-2 focus:ring-black"
    />
  );
}

// ─────────────────────────────────────────
// Inline KV row used inside the modal
// ─────────────────────────────────────────

function KVRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className="font-bold text-black">{label}</span>
      <span className="font-bold text-black text-center">:</span>
      <span className="font-normal text-black">{children}</span>
    </>
  );
}

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────

const EMPTY_TRACK_FORM: TrackForm = {
  order_status: "",
  tracking_id: "",
  courier_partner: "",
  dispatch_date: "",
  dispatch_time: "",
  estimated_delivery: "",
  delivered_date: "",
  delivered_time: "",
  return_reason: "",
  remarks: "",
  tracking_url: "",
};

export default function OrderDetailView() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params as any)?.id as string;
  const { user } = useVLife();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // shipping details popup
  const [showAddress, setShowAddress] = useState<boolean>(false);

  // edit track popup
  const [showEditTrack, setShowEditTrack] = useState<boolean>(false);
  const [trackForm, setTrackForm] = useState<TrackForm>(EMPTY_TRACK_FORM);
  const [trackSaving, setTrackSaving] = useState<boolean>(false);
  const [trackError, setTrackError] = useState<string>("");

  // ── fetch order ──────────────────────────
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
              bv: item.bv,
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
            payableAmount: raw.payable_amount,
            rewardUsed: Number(raw.reward_used) || 0,
            rewardUsage: raw.reward_usage,
            placedBy: raw.placed_by,
            shipping: raw.shipping,
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

  // ── open edit track modal ─────────────────
  const openEditTrack = () => {
    if (!order) return;
    setTrackForm({
      order_status: order.orderStatus ?? "",
      tracking_id: order.shipping?.tracking_id ?? "",
      courier_partner: order.shipping?.courier_partner ?? "",
      dispatch_date: order.shipping?.dispatch_date ?? "",
      dispatch_time: order.shipping?.dispatch_time ?? "",
      estimated_delivery: order.shipping?.estimated_delivery ?? "",
      delivered_date: order.shipping?.delivered_date ?? "",
      delivered_time: order.shipping?.delivered_time ?? "",
      return_reason: order.shipping?.return_reason ?? "",
      remarks: order.shipping?.remarks ?? "",
      tracking_url: order.shipping?.tracking_url ?? "",
    });
    setTrackError("");
    setShowEditTrack(true);
  };

  // ── save track details ────────────────────
  const saveTrackDetails = async () => {
    try {
      setTrackSaving(true);
      setTrackError("");

      await axios.put("/api/order-operations", {
        order_id: order?.orderId,
        order_status: trackForm.order_status,
        shipping: {
          tracking_id: trackForm.tracking_id,
          courier_partner: trackForm.courier_partner,
          dispatch_date: trackForm.dispatch_date,
          dispatch_time: trackForm.dispatch_time,
          estimated_delivery: trackForm.estimated_delivery,
          delivered_date: trackForm.delivered_date,
          delivered_time: trackForm.delivered_time,
          return_reason: trackForm.return_reason,
          remarks: trackForm.remarks,
          tracking_url: trackForm.tracking_url,
          updated_at: new Date(),
        },
      });

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              orderStatus: trackForm.order_status,
              shipping: {
                tracking_id: trackForm.tracking_id,
                courier_partner: trackForm.courier_partner,
                dispatch_date: trackForm.dispatch_date,
                dispatch_time: trackForm.dispatch_time,
                estimated_delivery: trackForm.estimated_delivery,
                delivered_date: trackForm.delivered_date,
                delivered_time: trackForm.delivered_time,
                return_reason: trackForm.return_reason,
                remarks: trackForm.remarks,
                tracking_url: trackForm.tracking_url,
              },
            }
          : prev,
      );

      setShowEditTrack(false);
    } catch {
      setTrackError("Failed to save. Please try again.");
    } finally {
      setTrackSaving(false);
    }
  };

  // ── field updater helper ──────────────────
  const setField = <K extends keyof TrackForm>(key: K, value: TrackForm[K]) =>
    setTrackForm((prev) => ({ ...prev, [key]: value }));

  // ─────────────────────────────────────────
  // Guards
  // ─────────────────────────────────────────

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

  const hasAdvance =
    Boolean(order.isFirstOrder) && (order.advanceDeducted ?? 0) > 0;

  const hasTracking = Boolean(order.shipping?.tracking_id);

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <Layout>
      <div className="flex flex-col rounded-2xl p-4 max-lg:p-3 bg-white shadow-lg h-full">
        {/* ── Header ── */}
        <div className="flex-none border-b pb-1 max-lg:pb-3 mb-2 flex flex-col xl:flex-row gap-3 xl:items-center xl:pr-1">
          <button
            onClick={() => router.push("/orders")}
            className="flex items-center gap-2 text-black hover:text-black transition-colors cursor-pointer"
            aria-label="Go back to Orders"
          >
            <IoIosArrowBack size={25} />
          </button>

          <div className="flex flex-col xl:flex-row max-lg:items-start items-center max-lg:justify-start justify-between gap-4 w-full">
            {/* order meta */}
            <div
              className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center xl:justify-between
                            xl:w-[75%] gap-3 lg:gap-6 ml-0 max-lg:ml-5"
            >
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
              <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                Status: <StatusBadge status={order.orderStatus} />
              </span>
            </div>

            {/* action buttons */}
            <div className="flex items-center gap-2 max-lg:self-end">
              {user.role === "admin" && (
                <button
                  onClick={openEditTrack}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 bg-gray-600
                             text-white font-medium transition-colors
                             duration-200 cursor-pointer whitespace-nowrap"
                >
                  Edit Track
                </button>
              )}

              <SubmitButton
                onClick={() => setShowAddress(true)}
                className="text-sm transition-colors duration-200 max-lg:items-end max-lg:self-end"
              >
                Order Details
              </SubmitButton>
            </div>
          </div>
        </div>

        {/* ── Cart (scrollable) ── */}
        <div className="flex-1 overflow-y-auto pr-2">
          {order.cart.length === 0 ? (
            <p className="text-gray-500 text-center py-6">
              No items in this order
            </p>
          ) : (
            <>
              {/* desktop header row */}
              <div className="hidden lg:grid grid-cols-12 font-semibold text-gray-700 text-sm border-b pb-2 mb-2 xl:px-15">
                <div className="col-span-4">Product</div>
                <div className="col-span-1 text-center">Quantity</div>
                <div className="col-span-1 text-right">BV</div>
                <div className="col-span-1 text-right">PV</div>
                <div className="col-span-2 text-center">Unit Price(₹)</div>
                <div className="col-span-1 text-right">GST(₹)</div>
                <div className="col-span-2 text-right">Total(₹)</div>
              </div>

              <div className="space-y-4 lg:scrollbar-custom">
                {order.cart.map((item) => (
                  <div
                    key={item.id}
                    className="w-full rounded-xl p-4 transition-all shadow-sm hover:shadow-lg border border-gray-200"
                  >
                    {/* Desktop row */}
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
                          2,
                        )}
                      </div>
                    </div>

                    {/* Mobile row */}
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
                        <div className="text-right font-bold text-gray-700">
                          ₹{" "}
                          {((item.price_with_gst || 0) * item.quantity).toFixed(
                            2,
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-none border-t pt-4 lg:px-10 bg-white py-3 space-y-2">
          {/* first order + advance */}
          {hasAdvance && (
            <>
              <div className="flex justify-between items-center text-sm text-gray-700">
                <span>Subtotal</span>
                <span className="font-semibold">
                  ₹ {order.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-red-600">
                <span>Advance Paid</span>
                <span>- ₹ {order.advanceDeducted!.toFixed(2)}</span>
              </div>
              {order.rewardUsage?.cashback?.used > 0 && (
                <div className="flex justify-between items-center text-sm text-red-600 pl-2">
                  <span>Cashback</span>
                  <span>- ₹ {order.rewardUsage.cashback.used.toFixed(2)}</span>
                </div>
              )}
              {order.rewardUsage?.fortnight?.used > 0 && (
                <div className="flex justify-between items-center text-sm text-red-600 pl-2">
                  <span>Fortnight</span>
                  <span>- ₹ {order.rewardUsage.fortnight.used.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 my-2" />
              <div className="flex justify-between items-center sm:text-lg font-semibold">
                <span>Total Paid</span>
                <span className="text-green-600">
                  ₹ {(order.payableAmount ?? order.totalAmount).toFixed(2)}
                </span>
              </div>
            </>
          )}

          {/* normal order */}
          {!hasAdvance && (
            <>
              {order.rewardUsed > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm text-gray-700">
                    <span>Total Amount</span>
                    <span className="font-semibold">
                      ₹ {order.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {order.rewardUsage?.cashback?.used > 0 && (
                    <div className="flex justify-between items-center text-sm text-red-600 pl-2">
                      <span>Cashback</span>
                      <span>
                        - ₹ {order.rewardUsage.cashback.used.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {(order.rewardUsage?.fortnight?.used > 0 ||
                    order.rewardUsage?.daily?.used > 0) && (
                    <div className="flex justify-between items-center text-sm text-red-600 pl-2">
                      <span>Reward</span>
                      <span>
                        - ₹{" "}
                        {(
                          (order.rewardUsage?.fortnight?.used || 0) +
                          (order.rewardUsage?.daily?.used || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 my-2" />
                </>
              )}
              <div className="flex justify-between items-center sm:text-lg font-semibold">
                <span>Total Paid</span>
                <span className="text-green-600">
                  ₹ {(order.payableAmount ?? order.totalAmount).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Popup 1 — View Shipping Details
          Mobile  : single column (stacked)
          Desktop : two columns side-by-side
      ══════════════════════════════════════════ */}
      {showAddress && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => setShowAddress(false)}
        >
          <div
            className={`bg-white rounded-xl shadow-lg w-[95%] p-6 relative max-h-[90vh] overflow-y-auto
              ${hasTracking ? "max-w-3xl" : "max-w-md"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddress(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-lg font-bold"
              aria-label="Close"
            >
              ✕
            </button>

            <p className="text-lg font-semibold mb-4">Order Details</p>

            {/* ── Two-column on desktop when tracking exists, single otherwise ── */}
            <div
              className={`flex flex-col ${
                hasTracking ? "lg:flex-row lg:gap-6" : ""
              }`}
            >
              {/* ── Left / full: Shipping Details ── */}
              <div className={hasTracking ? "lg:flex-1" : "w-full"}>
                <p className="text-sm font-bold text-gray-700 mb-3 pb-1 border-b border-gray-200">
                  📦 Shipping Details
                </p>
                <div className="grid grid-cols-[max-content_1ch_1fr] gap-y-2 gap-x-2 text-gray-700 text-sm">
                  <KVRow label="Order ID">{order.orderId}</KVRow>
                  <KVRow label="User ID">{order.userId}</KVRow>
                  <KVRow label="User Name">{order.userName}</KVRow>
                  <KVRow label="Email">
                    <span className="whitespace-pre-line">{order.mail}</span>
                  </KVRow>
                  <KVRow label="Contact">{order.contact}</KVRow>
                  <KVRow label="Payment">{order.payment}</KVRow>

                  {order.placedBy?.user_id && (
                    <KVRow label="Placed by">
                      {order.placedBy.user_id}
                      {order.placedBy.name ? ` (${order.placedBy.name})` : ""}
                    </KVRow>
                  )}

                  <KVRow label="Address">
                    <span className="whitespace-pre-line">
                      {order.address || "No address available"}
                    </span>
                  </KVRow>
                  <KVRow label="Description">
                    <span className="whitespace-pre-line">
                      {order.description || "N/A"}
                    </span>
                  </KVRow>
                  <KVRow label="Order Status">
                    <StatusBadge status={order.orderStatus} />
                  </KVRow>
                </div>
              </div>

              {/* ── Divider ── */}
              {hasTracking && (
                <>
                  {/* horizontal on mobile */}
                  <div className="lg:hidden border-t border-dashed border-gray-300 my-4" />
                  {/* vertical on desktop */}
                  <div className="hidden lg:block w-px bg-gray-200 self-stretch mx-1" />
                </>
              )}

              {/* ── Right: Tracking Info (only when tracking_id exists) ── */}
              {hasTracking && (
                <div className="lg:flex-1">
                  <p className="text-sm font-bold text-gray-700 mb-3 pb-1 border-b border-gray-200">
                    🚚 Tracking Info
                  </p>
                  <div className="grid grid-cols-[max-content_1ch_1fr] gap-y-2 gap-x-2 text-gray-700 text-sm">
                    <KVRow label="Courier">
                      {order.shipping!.courier_partner || "—"}
                    </KVRow>

                    <KVRow label="Tracking ID">
                      {order.shipping!.tracking_url ? (
                        <a
                          href={order.shipping!.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline break-all"
                        >
                          {order.shipping!.tracking_id}
                        </a>
                      ) : (
                        order.shipping!.tracking_id
                      )}
                    </KVRow>

                    <KVRow label="Dispatched">
                      {order.shipping!.dispatch_date || "—"}
                      {order.shipping!.dispatch_time
                        ? ` at ${order.shipping!.dispatch_time}`
                        : ""}
                    </KVRow>

                    <KVRow label="Est. Delivery">
                      {order.shipping!.estimated_delivery || "—"}
                    </KVRow>

                    {order.shipping!.delivered_date && (
                      <>
                        <span className="font-bold text-black">
                          Delivered On
                        </span>
                        <span className="font-bold text-black text-center">
                          :
                        </span>
                        <span className="font-semibold text-green-600">
                          {order.shipping!.delivered_date}
                          {order.shipping!.delivered_time
                            ? ` at ${order.shipping!.delivered_time}`
                            : ""}
                        </span>
                      </>
                    )}

                    {order.shipping!.return_reason && (
                      <>
                        <span className="font-bold text-black">
                          Return Reason
                        </span>
                        <span className="font-bold text-black text-center">
                          :
                        </span>
                        <span className="font-normal text-red-600">
                          {order.shipping!.return_reason}
                        </span>
                      </>
                    )}

                    {order.shipping!.remarks && (
                      <KVRow label="Remarks">
                        {order.shipping!.remarks}
                      </KVRow>
                    )}
                  </div>
                </div>
              )}

              {/* not yet dispatched notice */}
              {!hasTracking &&
                order.orderStatus !== "pending" &&
                order.orderStatus !== "cancelled" && (
                  <p className="mt-4 text-xs text-gray-400 italic">
                    Tracking details will appear once the order is dispatched.
                  </p>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Popup 2 — Edit Track (admin)
      ══════════════════════════════════════════ */}
      {showEditTrack && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
          onClick={() => setShowEditTrack(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg w-[90%] max-w-xl p-6 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowEditTrack(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-lg font-bold"
              aria-label="Close"
            >
              ✕
            </button>

            <p className="text-lg font-semibold mb-5">Edit Tracking Details</p>

            <div className="flex flex-col gap-4">
              {/* Order Status */}
              <div className="flex flex-col gap-1">
                <FieldLabel>Order Status</FieldLabel>
                <select
                  value={trackForm.order_status}
                  onChange={(e) => setField("order_status", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full
                             focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">— Select Status —</option>
                  <option value="pending">Pending</option>
                  <option value="packed">Packed</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="returned">Returned</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Courier + Tracking ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <FieldLabel>Courier Partner</FieldLabel>
                  <TextInput
                    placeholder="e.g. Delhivery"
                    value={trackForm.courier_partner}
                    onChange={(v) => setField("courier_partner", v)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel>Tracking ID / AWB</FieldLabel>
                  <TextInput
                    placeholder="e.g. DL4829301023"
                    value={trackForm.tracking_id}
                    onChange={(v) => setField("tracking_id", v)}
                  />
                </div>
              </div>

              {/* Dispatch Date + Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <FieldLabel>Dispatch Date</FieldLabel>
                  <DateInput
                    value={trackForm.dispatch_date}
                    onChange={(v) => setField("dispatch_date", v)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel>Dispatch Time</FieldLabel>
                  <TimeInput
                    value={trackForm.dispatch_time}
                    onChange={(v) => setField("dispatch_time", v)}
                  />
                </div>
              </div>

              {/* Estimated Delivery */}
              <div className="flex flex-col gap-1">
                <FieldLabel>Estimated Delivery Date</FieldLabel>
                <DateInput
                  value={trackForm.estimated_delivery}
                  onChange={(v) => setField("estimated_delivery", v)}
                />
              </div>

              {/* Delivered Date + Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <FieldLabel>Delivered Date</FieldLabel>
                  <DateInput
                    value={trackForm.delivered_date}
                    onChange={(v) => setField("delivered_date", v)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel>Delivered Time</FieldLabel>
                  <TimeInput
                    value={trackForm.delivered_time}
                    onChange={(v) => setField("delivered_time", v)}
                  />
                </div>
              </div>

              {/* Tracking URL */}
              <div className="flex flex-col gap-1">
                <FieldLabel>Tracking URL (optional)</FieldLabel>
                <input
                  type="url"
                  placeholder="https://courier.com/track/..."
                  value={trackForm.tracking_url}
                  onChange={(e) => setField("tracking_url", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full
                             focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Return Reason */}
              <div className="flex flex-col gap-1">
                <FieldLabel>Return Reason (if applicable)</FieldLabel>
                <TextInput
                  placeholder="e.g. Customer not available"
                  value={trackForm.return_reason}
                  onChange={(v) => setField("return_reason", v)}
                />
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1">
                <FieldLabel>Remarks</FieldLabel>
                <textarea
                  rows={2}
                  placeholder="Any additional notes..."
                  value={trackForm.remarks}
                  onChange={(e) => setField("remarks", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full
                             focus:outline-none focus:ring-2 focus:ring-black resize-none"
                />
              </div>

              {/* error */}
              {trackError && (
                <p className="text-red-500 text-xs">{trackError}</p>
              )}

              {/* actions */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={() => setShowEditTrack(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm
                             text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <SubmitButton
                  onClick={saveTrackDetails}
                  disabled={trackSaving}
                  className="text-sm px-6"
                >
                  {trackSaving ? "Saving..." : "Save"}
                </SubmitButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}