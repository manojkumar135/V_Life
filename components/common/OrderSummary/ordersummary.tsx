"use client";

import React, { useState, useEffect } from "react";
import InputField from "@/components/InputFields/inputtype1";
import TextareaField from "@/components/InputFields/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import PaymentModal from "@/components/common/PaymentModal/paymentmodal";
import ShowToast from "@/components/common/Toast/toast";
import axios from "axios";
import { useVLife } from "@/store/context";
// import { hasAdvancePaid } from "@/utils/hasAdvancePaid";
import { useRouter } from "next/navigation";
import { IoRemove, IoAdd, IoTrashOutline } from "react-icons/io5";
import Loader from "@/components/common/loader";

// Define CartItem interface
interface CartItem {
  product_id: string | number;
  id?: string | number;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  gst: number;
  price: number;
  description?: string;
  image?: string;
  mrp?: number;
  dealer_price?: number;
  bv?: number;
  pv?: number;
}

export default function OrderFormCartSection({
  cart,
  updateQuantity,
  removeFromCart,
  getTotalPrice,
  getPriceWithoutGST,
  getTotalPV,
  handleSubmit,
  formData,
  setFormData,
  handleInputChange,
  isFirstOrder,
  createOrder,
  onPaymentSuccess,
}: any) {
  const { user } = useVLife();

  const [activeTab, setActiveTab] = useState<"cart" | "customer">("cart");
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "upi" | "card">(
    "qr"
  );
  const [hasPaidAdvance, setHasPaidAdvance] = useState(false);
  const [advanceDetails, setAdvanceDetails] = useState({
    amount: 0,
    remaining: 0,
  });

  const [useReward, setUseReward] = useState(false);
  const cashbackPoints = Number(user?.cashbackReward || 0);
  const fortnightPoints = Number(user?.fortnightReward || 0);

  const [useCashback, setUseCashback] = useState(false);
  const [useFortnight, setUseFortnight] = useState(false);

  const router = useRouter();
  const [address, setAddress] = useState("");
  const user_id = user?.user_id || "";
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  const totalAmount = getTotalPrice();
  const baseAmount = getPriceWithoutGST();

  // Cashback first (10% max)
  const pvBasedCashback = Math.floor(getTotalPV() * 10);

  // Cashback can NEVER exceed order value
  const maxCashbackUsable = Math.min(pvBasedCashback, totalAmount);

  const cashbackUsed = useCashback
    ? Math.min(cashbackPoints, maxCashbackUsable)
    : 0;

  const cashbackCap = Math.min(cashbackPoints, maxCashbackUsable);
  const remainingAfterCashback = totalAmount - cashbackUsed;

  // Fortnight (no cap)
  const fortnightUsed = useFortnight
    ? Math.min(fortnightPoints, remainingAfterCashback)
    : 0;

  /* ---------------- LEGACY MAPPING (IMPORTANT) ---------------- */

// backend still understands ONLY this
const rewardDeduction = cashbackUsed + fortnightUsed;

// total reward BEFORE usage (cashback + fortnight)
const rewardPoints = cashbackPoints + fortnightPoints;

// ✅ FIXED: total reward remaining AFTER usage
const rewardRemaining =
  rewardPoints - (cashbackUsed + fortnightUsed);

  const payableAmount = Math.max(0, totalAmount - rewardDeduction);

  // GST = dealer_price * gst%
  const calcUnitPriceWithGST = (item: CartItem) => {
    // console.log(item)
    const gstRate = Number(item.gst) || 0;
    const base = Number(item.unit_price) || 0;
    // console.log(base + (base * gstRate) / 100)
    return base + (base * gstRate) / 100;
  };

  // Total price per item = (price per unit incl GST) × quantity
  const calcItemTotal = (item: CartItem) => {
    // console.log(calcUnitPriceWithGST(item) * item.quantity)
    return calcUnitPriceWithGST(item) * item.quantity;
  };

  const handleGoToCustomerInfo = () => {
    if (cart.length === 0) {
      ShowToast.error("Your cart is empty");
      return;
    }
    setActiveTab("customer");
  };

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await axios.post("/api/address-operations", {
          user_id: user_id,
        });
        if (res.data.success) {
          setAddress(res.data.address);
        } else {
          setAddress("No address available");
        }
      } catch (err) {
        setAddress("Error fetching address");
      }
    };

    if (user_id) {
      fetchAddress();
    }
  }, [user_id, cart]);

  const handlePlaceOrder = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ validate customer info ONLY when on customer tab
      if (activeTab === "customer") {
        if (
          !formData.customerName ||
          !formData.customerEmail ||
          !formData.shippingAddress ||
          !formData.contact
        ) {
          ShowToast.warning("Please fill in all required customer information");
          return;
        }

        if (formData.shippingAddress.length < 20) {
          ShowToast.error("Shipping address must be Valid Address");
          return;
        }
      } else if (activeTab === "cart" && cart.length === 0) {
        ShowToast.error("Your cart is empty");
        return;
      }

      // 🟢 FINAL DECISION (TERNARY)
      payableAmount === 0
        ? await (async () => {
            try {
              await createOrder(
                0,
                rewardDeduction,
                rewardRemaining,
                {
                  razorpay_payment_id: `REWARD_ONLY_${user.user_id}_${Date.now()}`,
                  method: "reward",
                },
                {
                  cashbackPoints,
                  cashbackUsed,
                  fortnightPoints,
                  fortnightUsed,
                }
              );

              ShowToast.success("Order placed successfully using rewards");

              if (onPaymentSuccess) {
                await onPaymentSuccess();
              }
            } catch (err) {
              console.error("Zero payment order error:", err);
              ShowToast.error("Failed to place order");
            }
          })()
        : setShowPayment(true);
    } catch (error) {
      console.error("Error in handlePlaceOrder:", error);
      ShowToast.error("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const finalAmount = isFirstOrder ? advanceDetails.remaining : getTotalPrice();

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleIncreaseQuantity = (itemId: string | number | undefined) => {
    if (!itemId) return;

    if (isFirstOrder && user?.status === "inactive") {
      ShowToast.error("Quantity is limited to 1 for first order");
      return;
    }

    const item = cart.find(
      (item: CartItem) => String(item.product_id) === String(itemId)
    );
    if (item && item.quantity < 99) {
      updateQuantity(String(item.product_id), item.quantity + 1);
    }
  };

  const handleDecreaseQuantity = (itemId: string | number | undefined) => {
    if (!itemId) return;
    const item = cart.find(
      (item: CartItem) => String(item.product_id) === String(itemId)
    );
    if (item && item.quantity > 1) {
      updateQuantity(String(item.product_id), item.quantity - 1);
    }
  };

  const handleRemoveItem = (itemId: string | number | undefined) => {
    if (!itemId) return;
    removeFromCart(String(itemId));
  };

  const handleQuantityChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    itemId: string | number
  ) => {
    let value = e.target.value.replace(/\D/g, "");
    let num = Number(value);
    if (isNaN(num)) return;
    if (num < 1) num = 1;
    if (num > 99) num = 99;
    updateQuantity(String(itemId), num);
  };

  const isCustomerInfoMissing =
    !formData.customerName ||
    !formData.customerEmail ||
    !formData.shippingAddress ||
    !formData.contact;

  const isDisabled = cart.length === 0 || payableAmount < 0;

  return (
    <div className="relative">
      {loading && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div
        className={`rounded-xl p-4 max-lg:p-3 bg-white ${
          showPayment ? "opacity-30 pointer-events-none" : ""
        }`}
      >
        {/* Tabs */}
        <div className="flex border-b mb-3 w-full">
          <button
            className={`px-2 py-2 font-medium max-md:text-sm w-1/2 ${
              activeTab === "cart"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700 cursor-pointer"
            }`}
            onClick={() => setActiveTab("cart")}
          >
            Shopping Cart
          </button>
          <button
            className={`ml-6 px-4 py-2 font-medium max-md:text-sm w-1/2  ${
              activeTab === "customer"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700 cursor-pointer"
            }`}
            onClick={() => setActiveTab("customer")}
          >
            Customer Information
          </button>
        </div>

        {/* Shopping Cart */}
        {activeTab === "cart" && (
          <>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Your cart is empty
              </p>
            ) : (
              <>
                {/* Header Row */}
                <div className="grid grid-cols-12 font-semibold text-gray-700 text-sm border-b pb-2 mb-2 max-lg:hidden">
                  <div className="col-span-6 lg:ml-8">Product</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Price</div>
                </div>

                {/* Cart Items */}
                <div className="space-y-4 max-h-90 max-lg:max-h-95 max-lg:min-h-[600px] overflow-y-auto pr-2">
                  {cart.map((item: CartItem) => (
                    <div
                      key={String(item.product_id)}
                      className="bg-white w-full rounded-xl p-3 transition-shadow border-b max-lg:border-dashed xl:border-0 max-lg:shadow-lg"
                    >
                      {/* Desktop layout */}
                      <div className="hidden xl:flex items-center justify-between">
                        <div className="flex items-center w-1/2">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-18 h-18 object-cover rounded-lg  border-gray-600 border-[2px]"
                          />
                          <div className="flex-1 ml-4">
                            <p className="font-semibold text-black text-sm capitalize">
                              {item.name}
                            </p>
                            <p
                              className="text-gray-600 text-xs mt-1 truncate max-w-[190px]"
                              title={item.description}
                            >
                              {item.description}
                            </p>
                            <p className="text-gray-700 text-xs mt-1">
                              <span className="font-semibold">
                                ₹ {item.unit_price.toFixed(2)}
                              </span>{" "}
                              each + GST ({item.gst ?? 0}%)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between w-1/2 gap-2">
                          <div className="flex items-center rounded-full px-2 py-1 w-fit">
                            <button
                              type="button"
                              onClick={() =>
                                handleDecreaseQuantity(item.product_id)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 cursor-pointer"
                            >
                              <IoRemove size={16} />
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              min={1}
                              max={99}
                              onChange={(e) =>
                                handleQuantityChange(e, item.product_id)
                              }
                              className="mx-2 w-8 text-center font-semibold text-gray-800 border-2
                               border-gray-600 rounded no-spinner"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleIncreaseQuantity(item.product_id)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 cursor-pointer"
                            >
                              <IoAdd size={16} />
                            </button>
                          </div>

                          <div className="font-bold text-gray-800 text-right">
                            ₹ {calcItemTotal(item).toFixed(2)}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-full cursor-pointer"
                          >
                            <IoTrashOutline size={20} />
                          </button>
                        </div>
                      </div>

                      {/* Mobile layout */}
                      <div className="flex flex-col xl:hidden">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-16 h-18 object-cover rounded-lg border-[2px]"
                            />
                            <div className="ml-4">
                              <p className="font-semibold text-black text-sm capitalize">
                                {item.name}
                              </p>
                              <p
                                className="text-gray-600 text-xs mt-1 truncate max-w-[190px]"
                                title={item.description}
                              >
                                {item.description}
                              </p>
                              <p className="text-gray-700 text-xs mt-1">
                                <span className="font-semibold">
                                  ₹ {item.unit_price.toFixed(2)}
                                </span>{" "}
                                each + GST ({item.gst ?? 0}%)
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-full cursor-pointer"
                          >
                            <IoTrashOutline size={22} />
                          </button>
                        </div>

                        <div className="flex justify-between items-center mt-3 -mb-2">
                          {/* <p className="text-xs text-gray-800">
                            ₹ {item.unit_price.toFixed(2)} each
                          </p> */}

                          <div className="flex items-center rounded-full px-2 py-1 w-fit">
                            <button
                              type="button"
                              onClick={() =>
                                handleDecreaseQuantity(item.product_id)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 cursor-pointer"
                            >
                              <IoRemove size={18} />
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              min={1}
                              max={99}
                              onChange={(e) =>
                                handleQuantityChange(e, item.product_id)
                              }
                              className="mx-2 w-8 text-center text-[0.85rem] font-semibold text-gray-800 
                              border-2 border-gray-600 rounded no-spinner"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleIncreaseQuantity(item.product_id)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 cursor-pointer"
                            >
                              <IoAdd size={18} />
                            </button>
                          </div>

                          <div className="font-bold text-gray-800">
                            ₹ {calcItemTotal(item).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div
                  className="
  xl:pt-4 xl:border-t
  fixed bottom-0 left-0 right-0
  bg-white
  rounded-t-2xl
  max-md:shadow-[0_-6px_16px_rgba(0,0,0,0.4)]
"
                >
                  <div className="px-6 py-2 bg-white -mt-4">
                    {/* Subtotal + Reward section only if reward exists */}
                    {rewardPoints > 0 && (
                      <>
                        {/* Subtotal */}
                        <div className="flex justify-between items-center text-sm text-gray-700 font-medium">
                          <span className="font-semibold">Subtotal</span>
                          <span className="font-semibold">
                            ₹ {totalAmount.toFixed(2)}
                          </span>
                        </div>

                        {/* Cashback Reward */}
                        {cashbackPoints > 0 && (
                          <div className="flex justify-between items-start text-sm text-gray-700 py-1.5">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={useCashback}
                                onChange={() => setUseCashback((prev) => !prev)}
                                className="w-4 h-4 mt-1 accent-blue-600 cursor-pointer"
                              />
                              <div>
                                <span className="font-medium">
                                  Use Cashback Points
                                </span>
                                <div className="text-xs text-gray-500">
                                  {cashbackCap <= 0 ? (
                                    <>Cashback not applicable</>
                                  ) : cashbackPoints <= maxCashbackUsable ? (
                                    <>
                                      You can use full {cashbackPoints} points.
                                    </>
                                  ) : (
                                    <>
                                      You can use {maxCashbackUsable} out of{" "}
                                      {cashbackPoints} points.{" "}
                                    </>
                                  )}
                                  {/* <br /> */}
                                  {/* (Max 10% of order) */}
                                </div>
                              </div>
                            </label>

                            {useCashback && (
                              <span className="text-red-600 font-semibold text-right mt-3">
                                - ₹ {cashbackUsed.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Fortnight Reward */}
                        {fortnightPoints > 0 && (
                          <div className="flex justify-between items-start text-sm text-gray-700 py-1.5">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={useFortnight}
                                onChange={() =>
                                  setUseFortnight((prev) => !prev)
                                }
                                className="w-4 h-4 mt-1 accent-blue-600 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="text-[13px]">
                                  Use Fortnight Reward Points
                                </span>
                                <div className="text-[11px] text-gray-700">
                                  {fortnightPoints <= remainingAfterCashback ? (
                                    <>
                                      You can use full {fortnightPoints} points
                                    </>
                                  ) : (
                                    <>
                                      You can use {remainingAfterCashback} out
                                      of {fortnightPoints} points
                                    </>
                                  )}
                                </div>
                              </div>
                            </label>

                            {useFortnight && (
                              <span className="text-red-600 font-semibold text-right mt-3">
                                - ₹ {fortnightUsed.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Divider */}
                        {(cashbackPoints > 0 || fortnightPoints > 0) && (
                          <div className="border-t border-gray-300 my-1 mx-2"></div>
                        )}
                      </>
                    )}

                    {/* Final Total (always visible) */}
                    <div className="flex justify-between items-center text-md md:text-md font-bold text-gray-900">
                      <span>Total Amount</span>
                      <span className="text-green-600">
                        ₹ {payableAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end px-5 pb-3">
                    <button
                      type="button"
                      onClick={handleGoToCustomerInfo}
                      disabled={isDisabled}
                      className={`w-full lg:w-1/2 mt-1 py-2 px-4 rounded-md font-semibold
        ${
          isDisabled
            ? "bg-gray-400 text-white cursor-not-allowed"
            : "bg-[#106187] text-white cursor-pointer"
        }`}
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Customer Info */}
        {activeTab === "customer" && (
          <form className="space-y-4 max-lg:px-3">
            <InputField
              label="Customer Name"
              name="customerName"
              type="text"
              placeholder="Full Name"
              value={formData.customerName || user.user_name || ""}
              onChange={handleInputChange}
              required
            />
            <InputField
              label="Contact"
              name="customerContact"
              type="text"
              placeholder="1234567890"
              value={formData.customerContact || user.contact || ""}
              onChange={handleInputChange}
              required
            />
            <InputField
              label="Email"
              name="customerEmail"
              type="email"
              placeholder="email@example.com"
              value={formData.customerEmail || user.mail || ""}
              onChange={handleInputChange}
              required
            />
            <TextareaField
              label="Shipping Address"
              name="shippingAddress"
              placeholder="Full shipping address"
              value={formData.shippingAddress || ""}
              onChange={handleInputChange}
              className="w-full h-15 max-md:h-20"
              required
            />
            <TextareaField
              label="Notes"
              name="notes"
              placeholder="Additional notes"
              value={formData.notes || ""}
              onChange={handleInputChange}
              className="w-full h-15 max-md:h-20"
            />

            <button
              type="button"
              onClick={handlePlaceOrder}
              className={`w-full mt-2 py-3 px-4 rounded-md font-semibold
    ${
      isDisabled || isCustomerInfoMissing
        ? "bg-gray-400 text-white cursor-not-allowed"
        : "bg-[#106187] text-white cursor-pointer"
    }`}
            >
              Continue to Payment
            </button>
          </form>
        )}
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          amount={Number(payableAmount.toFixed(2))}
          user={{
            name: user?.user_name,
            email: user?.mail,
            contact: user?.contact,
          }}
          onSuccess={async (res) => {
            try {
              setLoading(true);

              await createOrder(
                payableAmount,
                rewardDeduction,
                rewardRemaining,
                res,
                {
                  cashbackPoints,
                  cashbackUsed,
                  fortnightPoints,
                  fortnightUsed,
                }
              );

              setShowPayment(false);

              if (onPaymentSuccess) {
                await onPaymentSuccess();
              }
            } catch (err) {
              console.error("Order error after payment:", err);
            } finally {
              setLoading(false);
            }
          }}
          onClose={() => {
            setShowPayment(false);
          }}
        />
      )}
    </div>
  );
}
