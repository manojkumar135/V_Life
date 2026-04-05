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
import { hasAdvancePaid } from "@/services/hasAdvancePaid";
import { hasFirstOrder } from "@/services/hasFirstOrder";
import CryptoJS from "crypto-js";
import { useSearchParams } from "next/navigation";

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
  pv?: number;
  gst?: number;
  gst_amount?: number;
  whole_gst?: number;
  price_with_gst?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  tax?: number;
  discount?: number;

  product_code: string;
  hsn_code: string;
  created_at?: Date;
  created_by?: string;
  last_modified_by?: string;
  last_modified_at?: Date;
}

interface OrderFormData {
  customerName: string;
  customerEmail: string;
  customerContact: string;
  door_no: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
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
  pv?: number;
  gst?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  tax?: number;
  discount?: number;

  product_code?: string;
  hsn_code?: string;
  image?: string;
  stock: number;
}

interface Category {
  name: string;
  products: Product[];
}

interface OrderContext {
  order_mode: "SELF" | "OTHER";
  pv?: number;
  beneficiary_id?: string;
  placed_by?: string;
  source?: string;
}

export default function AddOrderPage() {
  const { user, setUser, updateUserCart } = useVLife();
  const router = useRouter();

  const [isFirstOrderUser, setIsFirstOrderUser] = useState(false);
  const [isAdminActivated, setIsAdminActivated] = useState(false);
  const [isAdvancePaidUser, setIsAdvancePaidUser] = useState(false);

  const [advanceUsed, setAdvanceUsed] = useState(false);

  // console.log(isFirstOrderUser, "isFirstOrderUser");
  // console.log(isAdvancePaidUser, "isAdvancePaidUser");
  // console.log(isAdminActivated, "isAdminActivated");

  const searchParams = useSearchParams();

  const flow = searchParams.get("flow");
  const isUseAdvanceFlow = flow === "USE_ADVANCE";

  const [decodedAmount, setDecodedAmount] = useState<number | null>(null);
  const [orderContext, setOrderContext] = useState<OrderContext | null>(null);
  const isOtherOrder = orderContext?.order_mode === "OTHER";

  // console.log(orderContext);

  useEffect(() => {
    if (!user?.user_id) return;

    let mounted = true;

    (async () => {
      try {
        const firstOrderRes = await hasFirstOrder(user.user_id);
        const advanceRes = await hasAdvancePaid(user.user_id, 15000);

        if (!mounted) return;

        setIsFirstOrderUser(!firstOrderRes.hasFirstOrder);
        setIsAdminActivated(firstOrderRes.activatedByAdmin);
        setIsAdvancePaidUser(advanceRes.hasAdvance);
        setAdvanceUsed(advanceRes.advanceUsed);
      } catch (err) {
        console.error("Advance / first order check failed", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.user_id]);

  const shouldShowAdvanceChoice = isAdvancePaidUser && !advanceUsed;

  useEffect(() => {
    const encryptedData = searchParams.get("data");

    // ✅ NORMAL ENTRY (Add Order button)
    if (!encryptedData) {
      setOrderContext({
        order_mode: "SELF",
        pv: undefined, // 👈 NO PV LOCK
        source: "normal_add",
      });
      return;
    }

    // 🔐 ACTIVATION / BUTTON FLOW
    try {
      const secretKey = process.env.NEXT_PUBLIC_REF_KEY;
      if (!secretKey) return;

      const bytes = CryptoJS.AES.decrypt(
        decodeURIComponent(encryptedData),
        secretKey,
      );

      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedString) return;

      const payload = JSON.parse(decryptedString);

      setOrderContext({
        order_mode: payload.order_mode ?? "SELF",
        pv: payload.pv,
        beneficiary_id: payload.beneficiary_id,
        placed_by: payload.placed_by,
        source: payload.source,
      });
    } catch (err) {
      console.error("Payload decryption failed", err);
    }
  }, [searchParams]);

  // console.log("Decoded Amount:", decodedAmount);

  const handlePaymentSuccess = async () => {
    setShowCart(false);
    setLoading(true);

    try {
      if (isOtherOrder) {
        router.replace("/activation/myactivation");
      } else {
        router.replace("/orders");
      }
    } finally {
      setLoading(false);
    }
  };

  // console.log(user);

  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [beneficiaryUser, setBeneficiaryUser] = useState<any>(null);

  // const [advancePaid, setAdvancePaid] = useState(false);
  // const [advanceDetails, setAdvanceDetails] = useState({
  //   amount: 0,
  //   remaining: 0,
  // });

  // console.log(isFirstOrder,"isFirstOrder")

  const isRestrictedFirstOrder = isFirstOrder && user?.status === "inactive";

  const [formData, setFormData] = useState<OrderFormData>({
    customerName: user.user_name || "",
    customerEmail: user.mail || "",
    customerContact: user.contact || "",
    door_no: "",
    street: "",
    landmark: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    notes: "",
  });

  const calcGSTAmount = (unit: number, gst: number) => (unit * gst) / 100;

  const calcWholeGST = (unit: number, gst: number, qty: number) =>
    calcGSTAmount(unit, gst) * qty;

  const calcPriceWithGST = (unit: number, gst: number) =>
    unit + calcGSTAmount(unit, gst);

  const calcTotalGST = (cart: CartItem[]) =>
    cart.reduce(
      (sum, item) =>
        sum + calcWholeGST(item.unit_price, item.gst ?? 0, item.quantity),
      0,
    );

  // Normalize cart from user items
  const normalizeCart = (items: any[]): CartItem[] =>
    (items || []).map((i: any) => {
      // console.log(i);
      const quantity = Number(i.quantity) || 1;
      const unit_price = Number(i.unit_price) || 0;
      const gst = Number(i.gst) || 0;

      return {
        ...i,
        id: i.id || i.product_id,
        unit_price,
        quantity,
        price: unit_price * quantity,
        gst_amount: calcGSTAmount(unit_price, gst),
        whole_gst: calcWholeGST(unit_price, gst, quantity),
        price_with_gst: calcPriceWithGST(unit_price, gst),
      };
    });

  const targetUserId = orderContext?.beneficiary_id || user?.user_id;

  useEffect(() => {
  // ✅ ONLY fetch beneficiary for OTHER order
  if (!isOtherOrder) return;

  const beneficiaryId = orderContext?.beneficiary_id;

  if (!beneficiaryId) return;

  fetchBeneficiary(beneficiaryId);
}, [isOtherOrder, orderContext?.beneficiary_id]);

  const fetchBeneficiary = async (userId: string) => {
    try {
      const res = await axios.get(`/api/users-operations?user_id=${userId}`);

      if (res.data.success) {
        const data = res.data.data;
        // console.log(data);
        setBeneficiaryUser(data);

        // 🔥 populate formData once
        setFormData((prev) => ({
          ...prev,
          customerName: data.user_name || "",
          customerContact: data.contact || "",
          customerEmail: data.mail || "",
          // shippingAddress: data.address || "",
          door_no: data.address || "",
          landmark: data.landmark || "",
          city: data.locality || "",
          state: data.state || "",
          country: data.country || "India",
          pincode: data.pincode || "",
        }));
      }
    } catch (err) {
      console.error("Failed to fetch beneficiary", err);
    }
  };

  // Fetch products and create categories dynamically

  // Sync formData with user
  useEffect(() => {
    // 🔒 DO NOT override beneficiary details
    if (isOtherOrder) return;

    if (user) {
      setFormData((prev) => ({
        ...prev,
        customerName: user.user_name || "",
        customerEmail: user.mail || "",
        customerContact: user.contact || "",
        shippingAddress: address || "",
      }));
    }
  }, [user, address, isOtherOrder]);

useEffect(() => {
    // ✅ Wait until orderContext is fully resolved before checking
    if (orderContext === null) return;

    const checkFirstOrder = async () => {
      try {
        const targetUserId =
          isOtherOrder && orderContext?.beneficiary_id
            ? orderContext.beneficiary_id
            : user?.user_id;

        if (!targetUserId) return;

        const result = await hasFirstOrder(targetUserId);
        setIsFirstOrder(!result.hasFirstOrder);
      } catch (error) {
        console.error("Failed to check first order:", error);
        setIsFirstOrder(false);
      }
    };

    checkFirstOrder();
  }, [orderContext, isOtherOrder, user?.user_id]); // 👈 changed orderContext?.beneficiary_id → orderContext

  useEffect(() => {
    // OTHER ORDER → always fresh
    if (isOtherOrder) {
      setCart([]);
      return;
    }

    // 🔥 USE ADVANCE FLOW → start with empty cart
    if (isUseAdvanceFlow) {
      setCart([]);
      return;
    }

    // NORMAL SELF ORDER → load saved cart
    setCart(normalizeCart(user.items ?? []));
  }, [isOtherOrder, isUseAdvanceFlow]);

  // Fetch address
  useEffect(() => {
    const fetchAddress = async (userId: string) => {
      try {
        const res = await axios.post("/api/address-operations", {
          user_id: userId,
        });

        const addr = res.data.success
          ? res.data.address
          : "No address available";

        setAddress(addr);

        // 🔥 keep formData in sync
        setFormData((prev) => ({
          ...prev,
          shippingAddress: addr || "",
        }));
      } catch {
        setAddress("Error fetching address");
      }
    };

    // 🔑 DECISION
    if (isOtherOrder && orderContext?.beneficiary_id) {
      fetchAddress(orderContext.beneficiary_id);
    } else if (user?.user_id) {
      fetchAddress(user.user_id);
    }
  }, [isOtherOrder, orderContext?.beneficiary_id, user?.user_id]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "customerEmail" ? value.toLowerCase() : value,
    }));
  };

  const handleBack = () => {
    if (isOtherOrder) {
      router.push("/activation/activationform");
    } else {
      router.push("/orders");
    }
  };

  // const isAdvancePaidFirstOrder =
  //   isFirstOrderUser && isAdvancePaidUser && !isAdminActivated;

  // console.log(isAdvancePaidFirstOrder, "isAdvancePaidFirstOrder");

  const isProductFetchReady =
    !!user?.user_id &&
    orderContext !== null &&
    typeof isFirstOrder === "boolean" &&
    typeof isAdvancePaidUser === "boolean";

  useEffect(() => {
    if (!isProductFetchReady) return;

    const fetchProducts = async () => {
      try {
        setLoading(true);

        const res = await axios.get("/api/product-operations", {
          params: {
            order_mode: orderContext!.order_mode,
            pv: isUseAdvanceFlow ? 100 : (orderContext!.pv ?? null),
            is_first_order: isFirstOrder,
            is_advance_paid: isAdvancePaidUser,
            is_use_advance: isUseAdvanceFlow, // ✅ NEW
            user_status: user!.status,
          },
        });

        if (res.data.success && Array.isArray(res.data.data)) {
          const products = res.data.data;

          const categoryMap: Record<string, Product[]> = {};

          products.forEach((prod: any) => {
            const cat = prod.category || "Uncategorized";
            if (!categoryMap[cat]) categoryMap[cat] = [];
            categoryMap[cat].push(prod);
          });

          const categoriesArray: Category[] = Object.entries(categoryMap).map(
            ([name, products]) => ({
              name,
              products,
            }),
          );

          setCategories(categoriesArray);

          const initialCategory =
            categoriesArray.find((c) => c.name === user?.category)?.name ||
            categoriesArray[0]?.name ||
            "";

          setActiveCategory(initialCategory);

          if (user?.category !== initialCategory) {
            setUser({ category: initialCategory });
          }
        }
      } catch (err) {
        console.error("Failed to fetch products", err);
        ShowToast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [
    isProductFetchReady,
    orderContext?.order_mode,
    orderContext?.pv,
    isFirstOrder,
    // isAdvancePaidFirstOrder,
    isUseAdvanceFlow,
    user?.status,
  ]);

  // const isProductAllowed = (product: any) => {
  //   if (!orderContext) return false;

  //   const productPV = Number(product.pv);
  //   const lockedPV = Number(orderContext.pv);
  //   const dealerPrice = Number(product.dealer_price);

  //   // 🔒 1️⃣ PV explicitly passed
  //   if (lockedPV && lockedPV > 0) {
  //     return productPV === lockedPV;
  //   }

  //   // 🆕 2️⃣ ADVANCE PAID + FIRST ORDER
  //   if (isAdvancePaidFirstOrder) {
  //     return productPV >= 100 && dealerPrice >= 15000;
  //   }

  //   // 🔓 3️⃣ SELF + FIRST ORDER + INACTIVE
  //   if (
  //     orderContext.order_mode === "SELF" &&
  //     isFirstOrder &&
  //     user?.status === "inactive"
  //   ) {
  //     return productPV === 50 || productPV === 100;
  //   }

  //   // 🔓 4️⃣ Normal flow
  //   return true;
  // };

  const addToCart = async (product: Product) => {
    if (isRestrictedFirstOrder) {
      if (cart.length >= 1) {
        ShowToast.error("You can select only one product for your first order");
        return;
      }
    }

    // console.log(product);
    const updatedCart = [...cart];
    const productId = product.product_id;

    const existingItem = updatedCart.find(
      (item) => item.product_id === productId,
    );

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.price = existingItem.unit_price * existingItem.quantity;
      existingItem.whole_gst = calcWholeGST(
        existingItem.unit_price,
        existingItem.gst ?? 0,
        existingItem.quantity,
      );
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
        pv: product.pv ?? 0,
        gst: product.gst ?? 0,
        gst_amount: calcGSTAmount(product.dealer_price, product.gst ?? 0),
        whole_gst: calcWholeGST(product.dealer_price, product.gst ?? 0, 1),
        price_with_gst: calcPriceWithGST(
          product.dealer_price,
          product.gst ?? 0,
        ),

        cgst: product.cgst ?? 0,
        sgst: product.sgst ?? 0,
        igst: product.igst ?? 0,

        image: product.image,
        description: product.description,
        product_code: product.product_code || "",
        hsn_code: product.hsn_code || "",
      });
    }

    setCart(updatedCart);
    // 🔒 Only persist cart for SELF orders
    if (!isOtherOrder) {
      try {
        await updateUserCart(updatedCart);
      } catch {
        ShowToast.error("Failed to update cart");
      }
    }
  };

  // console.log(cart);
  const updateQuantity = async (id: number, newQuantity: number) => {
    if (isRestrictedFirstOrder && newQuantity > 1) {
      ShowToast.error("Quantity cannot exceed 1 for first order");
      return;
    }

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

            whole_gst: calcWholeGST(
              item.dealer_price,
              item.gst ?? 0,
              newQuantity,
            ),
            price_with_gst: calcPriceWithGST(item.dealer_price, item.gst ?? 0),
            gst_amount: calcGSTAmount(item.dealer_price, item.gst ?? 0),
          }
        : item,
    );

    setCart(updatedCart);
    // 🔒 Only persist cart for SELF orders
    if (!isOtherOrder) {
      try {
        await updateUserCart(updatedCart);
      } catch {
        ShowToast.error("Failed to update cart");
      }
    }
  };

  const removeFromCart = async (id: number) => {
    const updatedCart = cart.filter((item) => item.id !== id);
    setCart(updatedCart);
    // 🔒 Only persist cart for SELF orders
    if (!isOtherOrder) {
      try {
        await updateUserCart(updatedCart);
      } catch {
        ShowToast.error("Failed to update cart");
      }
    }
  };

  const getTotalPrice = () =>
    cart.reduce((total, item) => {
      const base = Number(item.unit_price) || 0;
      const gst = Number(item.gst) || 0;

      const unitWithGst = base + (base * gst) / 100;
      return total + unitWithGst * item.quantity;
    }, 0);

  const getPriceWithoutGST = () =>
    cart.reduce((total, item) => {
      const base = Number(item.unit_price) || 0;
      // const gst = Number(item.gst) || 0;

      // const unitWithGst = base + (base * gst) / 100;
      return total + base * item.quantity;
    }, 0);

  const getTotalBV = () =>
    cart.reduce((total, item) => total + item.bv * item.quantity, 0);

  const getTotalPV = () =>
    cart.reduce((total, item) => total + (item.pv ?? 0) * item.quantity, 0);

  const referBySource = isOtherOrder ? beneficiaryUser?.referBy : user.referBy;

  const infinitySource = isOtherOrder
    ? beneficiaryUser?.infinity
    : user.infinity;

  const fullAddress =
    [
      formData.door_no,
      formData.street,
      formData.landmark,
      formData.city,
      formData.state,
      formData.country,
    ]
      .filter(Boolean)
      .join(", ") + (formData.pincode ? ` - ${formData.pincode}` : "");

  const createOrder = async (
    payableAmount: number,
    rewardUsed: number,
    rewardRemaining: number,
    razorpayResponse: any,
    rewardMeta: {
      cashbackPoints: number;
      cashbackUsed: number;
      fortnightPoints: number;
      fortnightUsed: number;
      dailyPoints: number;
      dailyUsed: number;
    },
  ) => {
    try {
      // console.log(cart);
      setLoading(true);

      // 🔥 Safe GST State Check (Exact match only)
      const normalize = (str: string) => str?.toLowerCase().trim();

      // Company registered state variations
      const COMPANY_STATES = ["andhra pradesh", "andhra"];

      const isIntraState = COMPANY_STATES.includes(normalize(formData.state));

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
        bv: isFirstOrder ? 0 : item.bv,
        pv: isUseAdvanceFlow ? 0 : (item.pv ?? 0),
        gst: item.gst ?? 0,
        gst_amount: item.gst_amount ?? 0,
        whole_gst: item.whole_gst ?? 0,
        price_with_gst: item.price_with_gst ?? 0,
        cgst: isIntraState ? (item.cgst ?? 0) : 0,
        sgst: isIntraState ? (item.sgst ?? 0) : 0,
        igst: isIntraState ? 0 : (item.igst ?? 0),

        hsn_code: item.hsn_code ?? "",
        product_code: item.product_code ?? "",

        description: item.description,
        image: item.image,
      }));

      const payload = {
        user_id: user.user_id,
        rank: user.rank || "none",
        referBy: referBySource,
        infinity: infinitySource,
        user_name: formData.customerName || user.user_name,
        user_status: user.status,
        contact: formData.customerContact || user.contact,
        mail: formData.customerEmail || user.mail,
        door_no: formData.door_no,
        street: formData.street,
        landmark: formData.landmark,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pincode: formData.pincode,

        address: fullAddress,
        description: formData.notes,
        payment: "completed",
        payment_date: formatDate(new Date()),
        payment_time: new Date().toLocaleTimeString(),
        payment_id: razorpayResponse.razorpay_payment_id,
        payment_order_id: razorpayResponse.razorpay_order_id,
        payment_signature: razorpayResponse.razorpay_signature,
        payment_type: razorpayResponse.method || "razorpay",
        items: orderItems,
        order_bv: isFirstOrder ? 0 : getTotalBV(),
        order_pv: isUseAdvanceFlow ? 0 : getTotalPV(),
        total_gst: calcTotalGST(cart),
        order_mode: orderContext?.order_mode ?? "SELF",

        order_status: "pending",
        amount: getPriceWithoutGST(),
        reward_used: rewardUsed,
        reward_remaining: rewardRemaining,
        total_amount: getTotalPrice(),
        final_amount: payableAmount,
        payable_amount: payableAmount,
        advance_deducted: isUseAdvanceFlow
          ? Math.min(15000, getTotalPrice())
          : 0,

        advance_used: isUseAdvanceFlow,

        is_first_order: isFirstOrder,
        bonus_checked: false,
        direct_bonus_checked: false,
        matching_bonus_checked: false,

        /* ---------------- NEW FIELDS (ADDED) ---------------- */

        placed_by: {
          user_id: user.user_id, // who placed the order
          name: user.user_name,
          contact: user.contact,
          mail: user.mail,
        },

        /* ---------------- BENEFICIARY ---------------- */
        beneficiary: {
          user_id: isOtherOrder ? orderContext?.beneficiary_id : user.user_id,
          name: formData.customerName,
          contact: formData.customerContact,
          mail: formData.customerEmail,
          address: fullAddress,
        },

        /* ---------------- REWARD USAGE ---------------- */
       reward_usage: {
  cashback: isOtherOrder
    ? { before: 0, used: 0, after: 0 }
    : {
        before: Number(rewardMeta.cashbackPoints || 0),
        used: Number(rewardMeta.cashbackUsed || 0),
        after:
          Number(rewardMeta.cashbackPoints || 0) -
          Number(rewardMeta.cashbackUsed || 0),
      },

  fortnight: {
    before: Number(rewardMeta.fortnightPoints || 0),
    used: Number(rewardMeta.fortnightUsed || 0),
    after:
      Number(rewardMeta.fortnightPoints || 0) -
      Number(rewardMeta.fortnightUsed || 0),
  },

  daily: {
    before: Number(rewardMeta.dailyPoints || 0),
    used: Number(rewardMeta.dailyUsed || 0),
    after:
      Number(rewardMeta.dailyPoints || 0) -
      Number(rewardMeta.dailyUsed || 0),
  },
},

      };

      if (referBySource && referBySource.trim() !== "") {
        payload.referBy = referBySource;
      }

      if (infinitySource && infinitySource.trim() !== "") {
        payload.infinity = infinitySource;
      }

      const response = await axios.post("/api/order-operations", payload, {
        headers: { "Content-Type": "application/json" },
      });
      // console.log(response.data.success);
      // console.log(response.data);
      // console.log(response)

      if (response.data.success) {
        // ✅ Clear cart
        setCart([]);
        if (!isOtherOrder) {
          await updateUserCart([]);
        }

        ShowToast.success("Order created successfully!");
        if (isOtherOrder) {
          router.push("/activation/myactivation");
        } else {
          router.push("/orders");
        }
      } else {
        ShowToast.error(response.data.message || "Failed to create order");
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      ShowToast.error("Failed to create order: " + error.message);
    } finally {
      setLoading(false); // 🔥 STOP LOADER
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

    // Call your createOrder API here
    // await createOrder(finalAmount);
  };

  // console.log(cart,"addorder")

  const visibleCategories = categories
    .map((cat) => ({
      ...cat,
      products: cat.products,
    }))
    .filter((cat) => cat.products.length > 0);

  const activeCategoryProducts =
    visibleCategories.find((cat) => cat.name === activeCategory)?.products ||
    [];

  useEffect(() => {
    if (!visibleCategories.length) return;

    const exists = visibleCategories.some((cat) => cat.name === activeCategory);

    if (!exists) {
      setActiveCategory(visibleCategories[0].name);
    }
  }, [visibleCategories, activeCategory]);

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
              onClick={handleBack}
            />
            <h2 className="text-xl max-sm:text-[1rem] font-semibold">
              Products
            </h2>
          </div>

          {/* Add Product Button */}
          {user?.role === "admin" && (
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
        <div className="rounded-xl px-3 max-lg:px-1 py-1 bg-white mb-2 xl:mt-1">
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide border-b">
            {visibleCategories.map((category) => (
              <button
                key={category.name}
                className={`px-4 py-2 font-medium whitespace-nowrap text-sm max-lg:text-sm ${
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
                disabled={
                  (isOtherOrder && cart.length >= 1) ||
                  (isRestrictedFirstOrder && cart.length >= 1)
                }
                isInCart={
                  !!cart.find((item) => item.product_id === product.product_id)
                }
                hideBV={isFirstOrder}
                hidePV={isUseAdvanceFlow}
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
            bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white flex items-center justify-center 
            shadow-[0_4px_6px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)]
            border border-gray-400
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
          className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
          onClick={() => setShowCart(false)}
        />
      )}

      {/* Cart Drawer */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          className={`
            absolute bg-white shadow-2xl pointer-events-auto
            w-full h-[93%] rounded-t-2xl bottom-0 transform transition-transform duration-500 ease-out
            lg:w-[650px] lg:h-full lg:rounded-none lg:top-0 lg:right-0
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
              isOtherOrder={isOtherOrder}
              getTotalPrice={getTotalPrice}
              getPriceWithoutGST={getPriceWithoutGST}
              getTotalPV={getTotalPV}
              handleSubmit={handleSubmit}
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              isFirstOrder={isFirstOrder}
              isUseAdvanceFlow={isUseAdvanceFlow}
              createOrder={createOrder}
              onPaymentSuccess={handlePaymentSuccess}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

// const gstRate = item.gst ?? 0;
// const halfGst = gstRate / 2;

// cgst: isIntraState ? halfGst : 0,
// sgst: isIntraState ? halfGst : 0,
// igst: isIntraState ? 0 : gstRate,
