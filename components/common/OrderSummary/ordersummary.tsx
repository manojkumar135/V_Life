"use client";

import React, { useState } from "react";
import InputField from "@/components/common/inputtype1";
import TextareaField from "@/components/common/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import PaymentModal from "@/components/common/PaymentModal/paymentmodal";
import {
  IoRemove,
  IoAdd,
  IoTrashOutline,
  IoClose,
  IoQrCodeOutline,
  IoWalletOutline,
  IoCardOutline,
} from "react-icons/io5";

// Define CartItem interface
interface CartItem {
  id: number;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  description: string;
  category: string;
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
}: any) {
  const [activeTab, setActiveTab] = useState<"cart" | "customer">("cart");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "upi" | "card">(
    "qr"
  );
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  const handlePlaceOrder = (e: React.MouseEvent) => {
    e.preventDefault();

    // Validate customer info if on that tab
    if (activeTab === "customer") {
      if (
        !formData.customerName ||
        !formData.customerEmail ||
        !formData.shippingAddress
      ) {
        alert("Please fill in all required customer information");
        return;
      }
    } else if (activeTab === "cart" && cart.length === 0) {
      alert("Your cart is empty");
      return;
    }

    setShowPayment(true);
  };

  const handlePaymentSubmit = () => {
    handleSubmit();

    // Validate payment details based on method
    if (paymentMethod === "upi" && !paymentDetails.upiId) {
      alert("Please enter your UPI ID");
      return;
    }

    if (
      paymentMethod === "card" &&
      (!paymentDetails.cardNumber ||
        !paymentDetails.expiryDate ||
        !paymentDetails.cvv)
    ) {
      alert("Please fill in all card details");
      return;
    }

    // Process payment logic here
    console.log("Processing payment with method:", paymentMethod);
    console.log("Payment details:", paymentDetails);
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Fix: Create proper handler functions to ensure correct item identification
  const handleIncreaseQuantity = (itemId: number) => {
    const item = cart.find(
      (item: CartItem) => Number(item.id) === Number(itemId)
    );
    if (item) updateQuantity(Number(itemId), item.quantity + 1);
  };

  const handleDecreaseQuantity = (itemId: number) => {
    const item = cart.find(
      (item: CartItem) => Number(item.id) === Number(itemId)
    );
    if (item) updateQuantity(Number(itemId), item.quantity - 1);
  };

  const handleRemoveItem = (itemId: number) => {
    removeFromCart(Number(itemId));
  };

  return (
    <div className="relative">
      <div
        className={`rounded-xl p-4 max-lg:p-3 bg-white ${
          showPayment ? "opacity-30 pointer-events-none" : ""
        }`}
      >
        {/* Tabs */}
        <div className="flex border-b mb-3 w-full">
          <button
            className={`px-2 py-2 font-medium w-1/2 ${
              activeTab === "cart"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("cart")}
          >
            Shopping Cart
          </button>
          <button
            className={`ml-6 px-4 py-2 font-medium w-1/2 ${
              activeTab === "customer"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
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
                {/* Header Row (hidden on small screens) */}
                <div className="grid grid-cols-12 font-semibold text-gray-700 text-sm border-b pb-2 mb-2 max-lg:hidden">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Price</div>
                </div>

                {/* Cart Items */}
                <div className="space-y-4 max-h-80 max-lg:max-h-95 max-lg:min-h-[600px] overflow-y-auto pr-2">
                  {cart.map((item: CartItem) => (
                    <div
                      key={item.id || item.product_id}
                      className="bg-white w-full rounded-xl p-3 transition-shadow border-b max-lg:border-dashed xl:border-0 max-lg:shadow-lg"
                    >
                      {/* Desktop / XL layout */}
                      <div className="hidden xl:flex items-center justify-between">
                        {/* Product Section */}
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
                              className="text-gray-600 text-xs mt-1 truncate max-w-[190px] cursor-pointer"
                              title={item.description}
                            >
                              {item.description}
                            </p>
                            <p className="text-gray-700 text-xs mt-1">
                              ₹ {item.price.toFixed(2)} each
                            </p>
                          </div>
                        </div>

                        {/* Controls + Price + Delete */}
                        <div className="flex items-center justify-between w-1/2 gap-2">
                          {/* Quantity */}
                          <div className="flex items-center rounded-full px-2 py-1 w-fit">
                            <button
                              type="button"
                              onClick={() => handleDecreaseQuantity(item.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200"
                            >
                              <IoRemove size={16} />
                            </button>
                            <span className="mx-2 w-6 h-6 text-center font-semibold text-gray-800 border-2 border-gray-600 rounded">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIncreaseQuantity(item.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200"
                            >
                              <IoAdd size={16} />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="font-bold text-gray-800 text-right">
                            ₹ {(item.price * item.quantity).toFixed(2)}
                          </div>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-full transition 
            flex justify-center items-center"
                          >
                            <IoTrashOutline size={20} />
                          </button>
                        </div>
                      </div>

                      {/* Mobile / Tablet layout (max-lg) */}
                      <div className="flex flex-col xl:hidden">
                        {/* Row 1: Product + Delete */}
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
                                className="text-gray-600 text-xs mt-1 truncate max-w-[190px] cursor-pointer"
                                title={item.description}
                              >
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-full 
            transition flex justify-center items-center"
                          >
                            <IoTrashOutline size={22} />
                          </button>
                        </div>

                        {/* Row 2: Unit Price + Quantity + Total */}
                        <div className="flex justify-between items-center mt-3 -mb-2">
                          <p className="text-xs text-gray-800">
                            ₹ {item.price.toFixed(2)} each
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center rounded-full px-2 py-1 w-fit">
                            <button
                              type="button"
                              onClick={() => handleDecreaseQuantity(item.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200"
                            >
                              <IoRemove size={18} />
                            </button>
                            <span className="mx-2 w-6 h-6 text-center text-[0.85rem] font-semibold text-gray-800 border-2 border-gray-600 rounded">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIncreaseQuantity(item.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200"
                            >
                              <IoAdd size={18} />
                            </button>
                          </div>

                          {/* Total */}
                          <div className="font-bold text-gray-800">
                            ₹ {(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Section */}
                <div className="xl:pt-4 xl:border-t self-end fixed bottom-0 left-0 right-0 max-lg:bg-white max-lg:shadow-[0_-4px_6px_rgba(0,0,0,0.1)] max-lg:z-50 max-lg:rounded-t-xl">
                  <div className="flex justify-between items-center text-lg font-semibold px-5 mt-3">
                    <span>Total:</span>
                    <span>₹ {getTotalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end px-5 pb-3">
                    <SubmitButton
                      type="button"
                      onClick={handlePlaceOrder}
                      className="w-full lg:w-1/2 mt-4 text-black py-3 px-4 rounded-md"
                    >
                      Place Order
                    </SubmitButton>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Customer Information */}
        {activeTab === "customer" && (
          <form className="space-y-4">
            <InputField
              label="Customer Name"
              name="customerName"
              type="text"
              placeholder="Full Name"
              value={formData.customerName}
              onChange={handleInputChange}
              required
            />

            <InputField
              label="Email Address"
              name="customerEmail"
              type="email"
              placeholder="email@example.com"
              value={formData.customerEmail}
              onChange={handleInputChange}
              required
            />

            <TextareaField
              label="Shipping Address"
              name="shippingAddress"
              placeholder="Full shipping address"
              value={formData.shippingAddress}
              onChange={handleInputChange}
              className="w-full"
            />

            <TextareaField
              label="Notes"
              name="notes"
              placeholder="Additional notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full"
            />

            <SubmitButton
              type="button"
              onClick={handlePlaceOrder}
              className="w-full mt-4 text-black py-3 px-4 rounded-md"
            >
              Continue to Payment
            </SubmitButton>
          </form>
        )}
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          getTotalPrice={getTotalPrice}
          handleSubmit={handleSubmit}
          setShowPayment={setShowPayment}
        />
      )}
    </div>
  );
}
