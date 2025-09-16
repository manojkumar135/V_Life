"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import Layout from "@/layout/Layout";
import { IoCartOutline, IoClose } from "react-icons/io5";
import { IoIosArrowBack } from "react-icons/io";

import { useRouter } from "next/navigation";
import ShowToast from "@/components/common/Toast/toast";
import ProductCard from "@/components/common/productcard";
import OrderSummary from "@/components/common/OrderSummary/ordersummary";
import axios from "axios";
import { useVLife } from "@/store/context";
import { formatDate } from "@/components/common/formatDate";

// Categories with their products
const categories = [
  {
    id: 1,
    name: "Electronics",
    products: [
      {
        id: 101,
        name: "Wireless Headphones",
        price: 89.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "Premium noise-cancelling wireless headphones",
        category: "Electronics",
      },
      {
        id: 102,
        name: "Smart Watch",
        price: 199.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "Feature-rich smartwatch with health monitoring",
        category: "Electronics",
      },
      {
        id: 103,
        name: "Bluetooth Speaker",
        price: 59.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "Portable speaker with 12-hour battery life",
        category: "Electronics",
      },
    ],
  },
  {
    id: 2,
    name: "Clothing",
    products: [
      {
        id: 201,
        name: "Cotton T-Shirt",
        price: 24.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "100% cotton comfortable t-shirt",
        category: "Clothing",
      },
      {
        id: 202,
        name: "Denim Jeans",
        price: 59.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "Classic denim jeans for everyday wear",
        category: "Clothing",
      },
    ],
  },
  {
    id: 3,
    name: "Kitchen",
    products: [
      {
        id: 301,
        name: "Coffee Maker",
        price: 79.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "Programmable coffee maker with timer",
        category: "Kitchen",
      },
      {
        id: 302,
        name: "Non-Stick Cookware Set",
        price: 129.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "10-piece non-stick cookware set",
        category: "Kitchen",
      },
    ],
  },
  {
    id: 4,
    name: "Beauty",
    products: [
      {
        id: 401,
        name: "Moisturizing Cream",
        price: 29.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "Hydrating facial moisturizer for all skin types",
        category: "Beauty",
      },
      {
        id: 402,
        name: "Electric Toothbrush",
        price: 49.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "Rechargeable electric toothbrush with multiple modes",
        category: "Beauty",
      },
    ],
  },
  {
    id: 5,
    name: "Sports",
    products: [
      {
        id: 501,
        name: "Yoga Mat",
        price: 39.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "Non-slip yoga mat for exercise and meditation",
        category: "Sports",
      },
      {
        id: 502,
        name: "Water Bottle",
        price: 19.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description:
          "Insulated water bottle that keeps drinks cold for 24 hours",
        category: "Sports",
      },
    ],
  },
  {
    id: 6,
    name: "Books",
    products: [
      {
        id: 601,
        name: "Notebook Set",
        price: 24.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "Set of 3 premium quality notebooks",
        category: "Books",
      },
      {
        id: 602,
        name: "Ballpoint Pen Set",
        price: 14.99,
        image:
          "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
        description: "Smooth-writing ballpoint pens in assorted colors",
        category: "Books",
      },
    ],
  },
];

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  description: string;
  category: string;
}

interface OrderFormData {
  customerName: string;
  customerEmail: string;
  contact: string;
  shippingAddress: string;
  notes: string;
}

export default function AddOrderPage() {
  const { user, updateUserCart } = useVLife();
  const router = useRouter();

  // Initialize cart
  const [cart, setCart] = useState<CartItem[]>(user.items || []);
  const [address, setAddress] = useState("");

  const [formData, setFormData] = useState<OrderFormData>({
    customerName: user.user_name || "",
    customerEmail: user.mail || "",
    contact: user.contact || "",
    shippingAddress: address || "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        customerName: user.user_name || "",
        customerEmail: user.mail || "",
        contact: user.contact || "",
        shippingAddress: address || "",
        notes: "",
      }));
    }
  }, [user]);

  const [showCart, setShowCart] = useState(false);

  const [activeCategory, setActiveCategory] = useState(categories[0].name);
  const [isFirstOrder, setIsFirstOrder] = useState(false);

  console.log(formData, "add order");

  // ✅ Check if this is user's first order
  useEffect(() => {
    const checkFirstOrder = async () => {
      try {
        const res = await axios.get(
          `/api/order-operations?user_id=${user.user_id}`
        );
        setIsFirstOrder(!res.data?.data || res.data.data.length === 0);
      } catch (error) {
        console.error("Failed to check first order:", error);
      }
    };
    checkFirstOrder();
  }, [user.user_id]);

  useEffect(() => {
    if (user.items) {
      // Normalize ids to numbers
      setCart(user.items.map((i: any) => ({ ...i, id: Number(i.id) })));
    }
  }, [user.items]);

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await axios.post("/api/address-operations", {
          user_id: user.user_id,
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

    if (user.user_id) fetchAddress();
  }, [user.user_id]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "customerEmail" ? value.toLowerCase() : value,
    }));
  };

  // In your AddOrderPage component, update the addToCart function:
  const addToCart = async (product: any) => {
    const updatedCart = [...cart];
    const productId = Number(product.id);

    const existingItem = updatedCart.find((item) => item.id === productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      updatedCart.push({
        id: productId,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
        description: product.description || "",
        category: product.category,
      });
    }

    setCart(updatedCart);
    try {
      await updateUserCart(updatedCart);
    } catch (error) {
      ShowToast.error("Failed to update cart");
    }
  };

  const updateQuantity = async (id: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return;
    }

    const updatedCart = cart.map((item) =>
      Number(item.id) === Number(id) ? { ...item, quantity: newQuantity } : item
    );

    setCart(updatedCart);

    try {
      await updateUserCart(updatedCart);
    } catch (error) {
      ShowToast.error("Failed to update cart");
    }
  };

  const removeFromCart = async (id: number) => {
    const updatedCart = cart.filter((item) => Number(item.id) !== Number(id));
    setCart(updatedCart);

    try {
      await updateUserCart(updatedCart);
    } catch (error) {
      ShowToast.error("Failed to update cart");
    }
  };

  // console.log(cart)
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (cart.length === 0) {
      ShowToast.error("Please add at least one product to the order");
      return;
    }

    const totalAmount = getTotalPrice();
    let finalAmount = totalAmount;

    // ✅ Enforce first order rule
    if (isFirstOrder) {
      if (totalAmount < 10000) {
        ShowToast.error("First order must be at least ₹10,000");
        return;
      }
      finalAmount = totalAmount - 10000; // deduct advance
    }

    try {
      const orderItems = cart.map((item) => ({
        product_id: String(item.id), // ✅ convert only here
        product: String(item.id),
        category: item.category,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        price: item.price * item.quantity,
        description: item.description,
        image: item.image,
      }));

      const payload = {
        user_id: user.user_id,
        user_name: formData.customerName || user.user_name,
        contact: formData.contact || user.contact,
        mail: formData.customerEmail || user.mail,
        address: formData.shippingAddress || user.address,
        description: formData.notes,
        payment_date: formatDate(new Date()),
        payment_id: "payment-id-" + Date.now(),
        payment_type: "cash",
        items: orderItems,
        order_status: "pending",
        amount: totalAmount,
        total_amount: totalAmount,
        final_amount: finalAmount,
        advance_deducted: isFirstOrder ? 10000 : 0,
        is_first_order: isFirstOrder,
      };

      const response = await axios.post("/api/order-operations", payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data.success) {
        const emptyCart: CartItem[] = [];
        setCart(emptyCart);

        try {
          await updateUserCart(emptyCart);
        } catch (error) {
          console.error("Failed to clear cart:", error);
        }

        ShowToast.success("Order created successfully!");
        router.push("/orders");
      } else {
        ShowToast.error(response.data.message || "Failed to create order");
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      if (error.response) {
        ShowToast.error(
          error.response.data.message || "Failed to create order"
        );
      } else if (error.request) {
        ShowToast.error("No response from server. Please try again.");
      } else {
        ShowToast.error("Failed to create order: " + error.message);
      }
    }
  };

  const activeCategoryProducts =
    categories.find((category) => category.name === activeCategory)?.products ||
    [];

  return (
    <Layout>
      <div className="px-4 py-2">
        {/* Header */}
        <div className="flex items-center mb-2">
          <IoIosArrowBack
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/orders")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">Products</h2>
        </div>

        {/* Category Tabs */}
        <div className="rounded-xl px-6 max-lg:px-3 py-1 bg-white mb-2">
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide border-b">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`px-4 py-2 font-medium whitespace-nowrap ${
                  activeCategory === category.name
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div
          className={`rounded-xl px-6 max-lg:px-3 py-3 bg-white mb-5 transition-all duration-300  
            ${showCart ? "lg:pr-[470px]" : ""}`}
        >
          <div
            className={`grid gap-4 max-lg:gap-3 
              grid-cols-1 sm:grid-cols-2 
              ${
                showCart
                  ? "lg:grid-cols-2 xl:grid-cols-2"
                  : "lg:grid-cols-3 xl:grid-cols-3"
              }`}
          >
            {activeCategoryProducts.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                onAddToCart={addToCart}
                isInCart={!!cart.find((item) => item.id === Number(product.id))}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Cart Icon */}
      <div className="fixed bottom-8 right-8 z-10">
        <button
          className="
            relative w-14 h-14 rounded-full 
            bg-black text-yellow-300 flex items-center justify-center 
            shadow-[0_4px_6px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)]
            border border-yellow-400
            hover:shadow-[0_6px_10px_rgba(0,0,0,0.35),0_10px_25px_rgba(0,0,0,0.3)]
            active:translate-y-[2px] active:shadow-[0_2px_4px_rgba(0,0,0,0.3)]
            transition-all duration-200 cursor-pointer
          "
          onClick={() => setShowCart(true)}
        >
          <IoCartOutline size={28} />

          {cart.length > 0 && (
            <span
              className="
                absolute -top-1 -right-1 
                bg-red-600 text-white text-xs font-bold 
                rounded-full w-6 h-6 flex items-center justify-center
                shadow-[0_2px_6px_rgba(0,0,0,0.4)]
              "
            >
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
            w-full h-[90%] rounded-t-2xl bottom-0 transform transition-transform duration-500 ease-out
            lg:w-[600px] lg:h-full lg:rounded-none lg:top-0 lg:right-0
            ${
              showCart
                ? "translate-y-0 lg:translate-x-0"
                : "translate-y-full lg:translate-x-full"
            }
          `}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-2 border-b">
            <h3 className="text-lg font-semibold">My cart</h3>
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
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              isFirstOrder={isFirstOrder}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
