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
import SubmitButton from "@/components/common/submitbutton";
import { IoMdAdd } from "react-icons/io";
import Loader from "@/components/common/loader";
import { formatDate } from "@/components/common/formatDate";
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";


interface CartItem {
  product_id: string;
  id: number | string;
  category: string;
  name: string;
  quantity: number;
  unit_price: number;
  price: number;
  description?: string;
  image?: string;
  mrp: number;
  dealer_price: number;
  bv: number;
  created_at?: Date;
  created_by?: string;
  last_modified_by?: string;
  last_modified_at?: Date;
}

interface OrderFormData {
  customerName: string;
  customerEmail: string;
  contact: string;
  shippingAddress: string;
  notes: string;
}

interface Product {
  _id: string;
  product_id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  dealer_price: number;
  mrp: number;
  bv: number;
  image?: string;
  stock: number;
}

interface Category {
  name: string;
  products: Product[];
}

export default function AddOrderPage() {
  const { user, setUser, updateUserCart } = useVLife();
  const router = useRouter();

  // console.log(user.category);

  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [advancePaid, setAdvancePaid] = useState(false);
const [advanceDetails, setAdvanceDetails] = useState({
    amount: 0,
    remaining: 0,
  });


  const [formData, setFormData] = useState<OrderFormData>({
    customerName: user.user_name || "",
    customerEmail: user.mail || "",
    contact: user.contact || "",
    shippingAddress: address || "",
    notes: "",
  });

  // Normalize cart from user items
  const normalizeCart = (items: any[]): CartItem[] =>
    (items || []).map((i: any) => {
      const quantity = Number(i.quantity) || 1;
      const unit_price = Number(i.unit_price) || 0;
      return {
        ...i,
        id: i.id || i.product_id,
        unit_price,
        quantity,
        price: unit_price * quantity,
      };
    });

  // Fetch products and create categories dynamically
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/product-operations");
        if (res.data.success && Array.isArray(res.data.data)) {
          const products: Product[] = res.data.data;

          // Create category map
          const categoryMap: Record<string, Product[]> = {};
          products.forEach((prod) => {
            const cat = prod.category || "Uncategorized";
            if (!categoryMap[cat]) categoryMap[cat] = [];
            categoryMap[cat].push(prod);
          });

          // Convert to array of categories
          const categoriesArray: Category[] = Object.entries(categoryMap).map(
            ([name, products]) => ({ name, products })
          );

          setCategories(categoriesArray);

          // Determine active category
          let initialCategory = categoriesArray[0]?.name || "";
          if (user.category) {
            const found = categoriesArray.find(
              (cat) => cat.name === user.category
            );
            if (found) initialCategory = found.name;
          }

          setActiveCategory(initialCategory);

          // Update context with initial active category if different
          if (user.category !== initialCategory) {
            setUser({ category: initialCategory });
          }
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
        ShowToast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [user]);

  // Sync formData with user
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        customerName: user.user_name || "",
        customerEmail: user.mail || "",
        contact: user.contact || "",
        shippingAddress: address || "",
      }));
    }
  }, [user, address]);

  // Check if first order
  useEffect(() => {
    const checkFirstOrder = async () => {
      try {
        const res = await axios.get(
          `/api/order-operations?role=${user.role}&user_id=${user.user_id}`
        );
        setIsFirstOrder(!res.data?.data || res.data.data.length === 0);
      } catch (error) {
        console.error("Failed to check first order:", error);
      }
    };
    if (user?.user_id) checkFirstOrder();
  }, [user?.user_id]);

  // Check advance payment
  useEffect(() => {
    const checkAdvancePayment = async () => {
      try {
        const result = await hasAdvancePaid(user.user_id, 10000);
        setAdvancePaid(result.hasAdvance);
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
        setAdvancePaid(false);
        setAdvanceDetails({ amount: 0, remaining: getTotalPrice() });
      }
    };

    if (user.user_id) checkAdvancePayment();
  }, [user.user_id, cart]);




  // Update cart from context
  useEffect(() => {
    setCart(normalizeCart(user.items ?? []));
  }, [user.items]);

  // Fetch address
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await axios.post("/api/address-operations", {
          user_id: user.user_id,
        });
        setAddress(
          res.data.success ? res.data.address : "No address available"
        );
      } catch {
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

  const addToCart = async (product: Product) => {
    const updatedCart = [...cart];
    const productId = product.product_id;

    const existingItem = updatedCart.find(
      (item) => item.product_id === productId
    );

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.price = existingItem.unit_price * existingItem.quantity;
    } else {
      updatedCart.push({
        product_id: productId,
        id: productId,
        name: product.name,
        category: product.category,
        quantity: 1,
        unit_price: product.dealer_price,
        price: product.mrp,
        mrp: product.mrp,
        dealer_price: product.dealer_price,
        bv: product.bv,
        image: product.image,
        description: product.description,
      });
    }

    setCart(updatedCart);
    try {
      await updateUserCart(updatedCart);
    } catch {
      ShowToast.error("Failed to update cart");
    }
  };

  const updateQuantity = async (id: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return;
    }

    const updatedCart = cart.map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: newQuantity,
            price: item.unit_price * newQuantity,
          }
        : item
    );

    setCart(updatedCart);
    try {
      await updateUserCart(updatedCart);
    } catch {
      ShowToast.error("Failed to update cart");
    }
  };

  const removeFromCart = async (id: number) => {
    const updatedCart = cart.filter((item) => item.id !== id);
    setCart(updatedCart);
    try {
      await updateUserCart(updatedCart);
    } catch {
      ShowToast.error("Failed to update cart");
    }
  };

  const getTotalPrice = () =>
    cart.reduce((total, item) => total + item.price, 0);

  const createOrder = async (finalAmount: number, razorpayResponse: any) => {
    try {
      console.log(cart)
      const orderItems = cart.map((item) => ({
        product_id: String(item.id),
        product: String(item.id),
        category: item.category,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        price: item.price,
        mrp: item.mrp,
        dealer_price: item.dealer_price,
        bv: item.bv,
        description: item.description,
        image: item.image,
      }));

      const payload = {
        user_id: user.user_id,
        user_name: formData.customerName || user.user_name,
        contact: formData.contact || user.contact,
        mail: formData.customerEmail || user.mail,
        address: formData.shippingAddress || address,
        description: formData.notes,
        payment: "completed",
        payment_date: formatDate(new Date()),
        payment_time: new Date().toLocaleTimeString(),
        payment_id: razorpayResponse.razorpay_payment_id,
        payment_order_id: razorpayResponse.razorpay_order_id,
        payment_signature: razorpayResponse.razorpay_signature,
        payment_type: razorpayResponse.method || "razorpay",
        items: orderItems,
        order_status: "pending",
        amount: getTotalPrice(),
        total_amount: getTotalPrice(),
        final_amount: finalAmount,
        advance_deducted: isFirstOrder && advancePaid ? 10000 : 0,
        is_first_order: isFirstOrder,
      };

      const response = await axios.post("/api/order-operations", payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data.success) {
        // ✅ Clear cart
        setCart([]);
        await updateUserCart([]);

        ShowToast.success("Order created successfully!");
        router.push("/orders");
      } else {
        ShowToast.error(response.data.message || "Failed to create order");
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      ShowToast.error("Failed to create order: " + error.message);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cart.length === 0) {
      ShowToast.error("Please add at least one product to the order");
      return;
    }
    const totalAmount = getTotalPrice();
    let finalAmount = totalAmount;

    if (isFirstOrder) {
      if (totalAmount < 10000) {
        ShowToast.error("First order must be at least ₹10,000");
        return;
      }
      finalAmount = totalAmount - 10000;
    }

    // Call your createOrder API here
    // await createOrder(finalAmount);
  };

  const activeCategoryProducts =
    categories.find((cat) => cat.name === activeCategory)?.products || [];

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="px-4 py-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 ">
          <div className="flex items-center">
            <IoIosArrowBack
              size={25}
              className="mr-3 cursor-pointer"
              onClick={() => router.push("/orders")}
            />
            <h2 className="text-xl max-sm:text-[1rem] font-semibold">
              Products
            </h2>
          </div>

          {/* Add Product Button */}
          {user?.role === "superadmin" && (
            <SubmitButton
              onClick={() => router.push("/products/addproduct")}
              className="self-start bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-1.5 px-2 
             max-lg:px-1 max-md:h-full max-md:text-[0.85rem] max-lg:text-[0.9rem] rounded-md"
            >
              <span className="hidden max-md:inline">
                <IoMdAdd size={18} className="font-bold scale-125" />
              </span>
              <span className="max-md:hidden flex items-center">
                <IoMdAdd size={18} className="mr-2" /> Add Product
              </span>
            </SubmitButton>
          )}
        </div>

        {/* Category Tabs */}
        <div className="rounded-xl px-6 max-lg:px-3 py-1 bg-white mb-2 xl:mt-2">
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide border-b">
            {categories.map((category) => (
              <button
                key={category.name}
                className={`px-4 py-2 font-medium whitespace-nowrap text-md max-lg:text-sm ${
                  activeCategory === category.name
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "cursor-pointer"
                }`}
                onClick={async () => {
                  setActiveCategory(category.name);
                  setUser({ category: category.name }); // ✅ correct usage

                  try {
                    await updateUserCart(user.items ?? [], category.name); // ✅ pass category
                  } catch {
                    ShowToast.error("Failed to update category");
                  }
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div
          className={`rounded-xl px-6 max-lg:px-3 py-3 bg-white mb-5 transition-all duration-300 ${
            showCart ? "lg:pr-[470px]" : ""
          }`}
        >
          <div
            className={`grid gap-4 max-lg:gap-3 grid-cols-1 sm:grid-cols-2 ${
              showCart
                ? "lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3"
                : "lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"
            }`}
          >
            {activeCategoryProducts.map((product) => (
              <ProductCard
                key={product.product_id}
                {...product}
                onAddToCart={addToCart}
                isInCart={
                  !!cart.find((item) => item.product_id === product.product_id)
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Cart Icon */}
      <div className="fixed bottom-6 right-6 z-10">
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
              createOrder={createOrder}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
