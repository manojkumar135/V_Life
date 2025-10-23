"use client";

import React, { useState, useEffect } from "react";
import InputField from "@/components/InputFields/inputtype1";
import TextareaField from "@/components/InputFields/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import PaymentModal from "@/components/common/PaymentModal/paymentmodal";
import ShowToast from "@/components/common/Toast/toast";
import axios from "axios";
import { useVLife } from "@/store/context";
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";
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
  price: number;
  description?: string;
  image?: string;
  mrp?: number;
  dealer_price?: number;
  bv?: number;
}

export default function OrderFormCartSection({
  cart,
  updateQuantity,
  removeFromCart,
  getTotalPrice,
  handleSubmit,
  formData,
  setFormData,
  handleInputChange,
  isFirstOrder,
  createOrder,
}: any) {
  const [activeTab, setActiveTab] = useState<"cart" | "customer">("cart");
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "upi" | "card">("qr");
  const [hasPaidAdvance, setHasPaidAdvance] = useState(false);
  const [advanceDetails, setAdvanceDetails] = useState({ amount: 0, remaining: 0 });

  const router = useRouter();
  const [address, setAddress] = useState("");
  const { user } = useVLife();
  const user_id = user?.user_id || "";
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  const handleGoToCustomerInfo = () => {
    if (cart.length === 0) {
      ShowToast.error("Your cart is empty");
      return;
    }
    setActiveTab("customer");
  };

  useEffect(() => {
    const checkAdvancePayment = async () => {
      try {
        const result = await hasAdvancePaid(user_id, 10000);
        setHasPaidAdvance(result.hasPermission);
        if (result.hasAdvance) {
          setAdvanceDetails({
            amount: 10000,
            remaining: Math.max(0, getTotalPrice() - 10000),
          });
        } else {
          setAdvanceDetails({ amount: 0, remaining: getTotalPrice() });
        }
      } catch (error) {
        console.error("Error checking advance payment:", error);
        setHasPaidAdvance(false);
        setAdvanceDetails({ amount: 0, remaining: getTotalPrice() });
      }
    };

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
      checkAdvancePayment();
      fetchAddress();
    }
  }, [user_id, cart]);

  const handlePlaceOrder = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        if (formData.shippingAddress.length < 15) {
          ShowToast.error("Shipping address must be Valid Address");
          return;
        }
      } else if (activeTab === "cart" && cart.length === 0) {
        ShowToast.error("Your cart is empty");
        return;
      }

      const totalAmount = getTotalPrice();

      if (isFirstOrder && totalAmount < 10000) {
        ShowToast.error("First order must be at least ₹10,000");
        return;
      }

      if (!hasPaidAdvance) {
        ShowToast.error(
          "You must pay an advance of ₹10,000 before placing an order"
        );
        return;
      }

      setShowPayment(true);
    } catch (error) {
      console.error("Error in handlePlaceOrder:", error);
      ShowToast.error("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const finalAmount = isFirstOrder
    ? advanceDetails.remaining
    : getTotalPrice();

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleIncreaseQuantity = (itemId: string | number | undefined) => {
    if (!itemId) return;
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

  const isDisabled =
    cart.length === 0 ||
    (isFirstOrder && getTotalPrice() < 10000) ||
    !hasPaidAdvance;

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
                  <div className="col-span-6">Product</div>
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
                            className="w-14 h-16 object-cover rounded-lg border-[2px]"
                          />
                          <div className="flex-1 ml-4">
                            <p className="font-semibold text-black text-sm">
                              {item.name}
                            </p>
                            <p
                              className="text-gray-600 text-xs mt-1 truncate max-w-[190px]"
                              title={item.description}
                            >
                              {item.description}
                            </p>
                            <p className="text-gray-700 text-xs mt-1">
                              ₹ {item.unit_price.toFixed(2)} each
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
                            ₹ {item.price.toFixed(2)}
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
                              className="w-14 h-16 object-cover rounded-lg border-[2px]"
                            />
                            <div className="ml-4">
                              <p className="font-semibold text-black text-sm">
                                {item.name}
                              </p>
                              <p
                                className="text-gray-600 text-xs mt-1 truncate max-w-[190px]"
                                title={item.description}
                              >
                                {item.description}
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
                          <p className="text-xs text-gray-800">
                            ₹ {item.unit_price.toFixed(2)} each
                          </p>

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
                            ₹ {item.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="xl:pt-4 xl:border-t fixed bottom-0 left-0 right-0 max-lg:bg-white max-lg:shadow-[0_-4px_6px_rgba(0,0,0,0.1)] max-lg:rounded-t-xl">
                  <div className="px-6 py-4 bg-white -mt-4">
                    {isFirstOrder && hasPaidAdvance && advanceDetails.amount > 0 && (
                      <>
                        <div className="flex justify-between items-center text-sm text-gray-700 font-medium">
                          <span>Subtotal</span>
                          <span className="font-semibold">
                            ₹ {getTotalPrice().toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-red-500 mt-1">
                          <span>Advance Paid</span>
                          <span>- ₹ {advanceDetails.amount.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 my-3"></div>
                      </>
                    )}

                    <div className="flex justify-between items-center text-lg md:text-xl font-bold text-gray-900">
                      <span>Total Amount</span>
                      {isFirstOrder ? (
                        getTotalPrice() < 10000 ? (
                          <span className="text-red-600 text-sm md:text-base font-semibold">
                            Must be ≥ ₹10,000
                          </span>
                        ) : (
                          <span className="text-green-600">
                            ₹ {finalAmount.toFixed(2)}
                          </span>
                        )
                      ) : (
                        <span className="text-green-600">
                          ₹ {finalAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end px-5 pb-3">
                    <button
                      type="button"
                      onClick={handleGoToCustomerInfo}
                      disabled={isDisabled}
                      className={`w-full lg:w-1/2 mt-2 py-3 px-4 rounded-md font-semibold
      ${
        isDisabled
          ? "bg-gray-400 text-white cursor-not-allowed"
          : "bg-[#FFD700] text-black hover:bg-yellow-400 cursor-pointer"
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
              className="w-full h-15 max-md:h-24"
              required
            />
            <TextareaField
              label="Notes"
              name="notes"
              placeholder="Additional notes"
              value={formData.notes || ""}
              onChange={handleInputChange}
              className="w-full h-15 max-md:h-24"
            />

            <button
              type="button"
              onClick={handlePlaceOrder}
              className={`w-full mt-2 py-3 px-4 rounded-md font-semibold
    ${
      isDisabled || isCustomerInfoMissing
        ? "bg-gray-400 text-white cursor-not-allowed"
        : "bg-[#FFD700] text-black hover:bg-yellow-400 cursor-pointer"
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
          amount={Number(finalAmount.toFixed(2))}
          user={{
            name: user?.user_name,
            email: user?.mail,
            contact: user?.contact,
          }}
          onSuccess={async (res) => {
            console.log("✅ Payment successful:", res);
            await createOrder(finalAmount, res);
            setShowPayment(false);
          }}
          onClose={() => {
            setShowPayment(false);
            router.push("/orders/addorder");
          }}
        />
      )}
    </div>
  );
}
