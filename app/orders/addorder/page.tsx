"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import Layout from "@/layout/Layout";
import { IoArrowBackOutline, IoCartOutline, IoClose } from "react-icons/io5";
import { useRouter } from "next/navigation";
import ShowToast from "@/components/common/Toast/toast";
import ProductCard from "@/components/common/productcard";
import OrderSummary from "@/components/common/OrderSummary/ordersummary";

// Dummy product data
const dummyProducts = [
  {
    id: 1,
    name: "Wireless Headphones",
    price: 89.99,
    image:
      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
    description: "Premium noise-cancelling wireless headphones",
  },
  {
    id: 2,
    name: "Smart Watch",
    price: 199.99,
    image:
      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
    description: "Feature-rich smartwatch with health monitoring",
  },
  {
    id: 3,
    name: "Bluetooth Speaker",
    price: 59.99,
    image:
      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
    description: "Portable speaker with 12-hour battery life",
  },
];

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface OrderFormData {
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  notes: string;
}

export default function AddOrderPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: "",
    customerEmail: "",
    shippingAddress: "",
    notes: "",
  });
  const [showCart, setShowCart] = useState(false);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addToCart = (product: any) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.image,
            description: product.description || "",
            model: product.model || "",
          },
        ];
      }
    });

    ShowToast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    ShowToast.info("Item removed from cart");
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (cart.length === 0) {
      ShowToast.error("Please add at least one product to the order");
      return;
    }

    const payload = {
      customer_name: formData.customerName,
      customer_email: formData.customerEmail,
      shipping_address: formData.shippingAddress,
      notes: formData.notes,
      items: cart,
      total_amount: getTotalPrice(),
      status: "pending",
      order_date: new Date().toISOString(),
    };

    console.log("Order payload:", payload);
    ShowToast.success("Order created successfully!");
    router.push("/orders");
  };

  return (
    <Layout>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-4">
          <IoArrowBackOutline
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.back()}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">
            Create New Order
          </h2>
        </div>

        {/* Products Grid */}
        <div
          className={`rounded-xl p-6 bg-white mb-6 transition-all duration-300
            ${showCart ? "lg:pr-[470px]" : ""}`}
        >
          <h3 className="text-lg font-semibold mb-4">Products</h3>
          <div
            className={`grid gap-4 
              grid-cols-1 sm:grid-cols-2 
              ${
                showCart
                  ? "lg:grid-cols-2 xl:grid-cols-2"
                  : "lg:grid-cols-3 xl:grid-cols-3"
              }`}
          >
            {dummyProducts.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Cart Icon */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          className="relative w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg"
          onClick={() => setShowCart(true)}
        >
          <IoCartOutline size={28} />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Overlay */}
      {showCart && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-300"
          onClick={() => setShowCart(false)}
        />
      )}

      {/* Cart Drawer */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          className={`
            absolute bg-white shadow-2xl pointer-events-auto
            w-full h-[80%] rounded-t-2xl bottom-0 transform transition-transform duration-500 ease-out
            lg:w-[600px] lg:h-full lg:rounded-none lg:top-0 lg:right-0
            ${
              showCart
                ? "translate-y-0 lg:translate-x-0"
                : "translate-y-full lg:translate-x-full"
            }
          `}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">Your Cart</h3>
            <IoClose
              size={28}
              className="cursor-pointer"
              onClick={() => setShowCart(false)}
            />
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-[calc(100%-60px)] w-full ">
            <OrderSummary
              cart={cart}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              getTotalPrice={getTotalPrice}
              handleSubmit={handleSubmit}
              formData={formData}
              handleInputChange={handleInputChange}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
