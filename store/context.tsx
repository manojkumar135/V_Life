"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import axios from "axios";

export interface CartItem {
  id: number | string; // frontend line item id
  product_id: string; // backend product id (PRxxxx)
  name: string;
  category: string;
  description?: string;
  image?: string;

  quantity: number;
  mrp: number;
  dealer_price: number;
  unit_price: number;
  price: number;
  bv: number;
  pv?: number;
  gst?: number;
  gst_amount?: number;
  whole_gst?: number;
  price_with_gst?: number;
  cgst?: number;
  sgst?: number;

  igst?: number;

  product_code?: string;
  hsn_code?: string;
}

export type ThemeType = "light" | "dark" | "system";

export interface UserType {
  login_id: string;
  user_id: string;
  user_name: string;
  dob: string;
  gender?: string;
  blood?: string;
  rank: string;
  role: string;
  mail: string;
  contact: string;
  status: string;
  token?: string;
  items?: CartItem[];
  wallet_id?: string;
  theme?: ThemeType;
  category?: string;
  score?: number;
  reward?: number;
  referBy?: string;
  infinity?: string;
  gst?: string;
  country?: string;
  state?: string;
  district?: string;
  nominee_name?: string;
  nominee_contact?: string;
  nominee_relation?: string;
  alternate_contact?: string;

  address?: string;
  landmark?: string;
  pincode?: string;
  aadhar?: string;
  pan?: string;
  intro?: boolean;
  isDeleted?: boolean;
  login_time?: string;
  created_at?: string;
  activated_date?: string;
  locality?: string;
  profile?: string;
  _id?: string;
  __v?: number;
}

export interface VLifeContextType {
  user: UserType;
  setUser: (user: Partial<UserType>) => void;
  clearUser: () => void;
  updateUserCart: (cartItems: CartItem[], category?: string) => Promise<void>;
}

const defaultUser: UserType = {
  login_id: "",
  user_id: "",
  user_name: "",
  gender: "",
  blood: "",
  gst: "",
  dob: "",
  rank: "",
  role: "",
  mail: "",
  contact: "",
  status: "",
  token: "",
  items: [],
  wallet_id: "",
  theme: "light",
  category: "",
  referBy: "",
  infinity: "",
  score: 0,
  reward: 0,

  address: "",
  pincode: "",
  aadhar: "",
  pan: "",
  intro: false,
  isDeleted: false,
  login_time: "",
  created_at: "",
  activated_date: "",
  locality: "",
  profile: "",
  _id: "",
  __v: 0,
};

const VLifeContext = createContext<VLifeContextType | undefined>(undefined);

export const VLifeContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<UserType>(defaultUser);

  // console.log("User in context:", user);

  // ✅ Load theme from localStorage or user
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeType | null;
    if (savedTheme) {
      setUserState((prev) => ({ ...prev, theme: savedTheme }));
      applyTheme(savedTheme);
    } else {
      applyTheme(user.theme || "light");
    }
  }, []);

  // ✅ Apply theme globally
  const applyTheme = (theme: ThemeType) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(theme);
    }
  };

  // ✅ Update theme and persist
  const setUser = (u: Partial<UserType>) => {
    if (u.theme) {
      localStorage.setItem("theme", u.theme);
      applyTheme(u.theme);
    }
    setUserState((prev) => ({ ...prev, ...u }));
  };

  const clearUser = () => {
    setUserState(defaultUser);
    applyTheme(defaultUser.theme || "light");
  };

  const updateUserCart = async (cartItems: CartItem[], category?: string) => {
    try {
      const transformedCartItems = cartItems.map((item) => ({
        id: String(item.id),
        product_id: item.product_id,
        name: item.name,
        category: item.category,
        description: item.description || "",
        image: item.image,

        quantity: item.quantity,
        mrp: item.mrp,
        dealer_price: item.dealer_price,
        unit_price: item.unit_price,
        price: item.unit_price * item.quantity,
        bv: item.bv,
        pv: item.pv ?? 0,
        gst: item.gst ?? 0,
        gst_amount: item.gst_amount ?? 0,
        whole_gst: item.whole_gst ?? 0,
        price_with_gst: item.price_with_gst ?? 0,

        cgst: item.cgst ?? 0,
        sgst: item.sgst ?? 0,
        igst: item.igst ?? 0,
        product_code: item.product_code ?? "",
        hsn_code: item.hsn_code ?? "",

        created_at: new Date().toISOString(),
      }));

      const updatePayload: any = {
        items: transformedCartItems,
        category: category || user.category, // ✅ prefer passed category
      };

      if (user._id) updatePayload._id = user._id;
      else if (user.user_id) updatePayload.user_id = user.user_id;
      else if (user.login_id) updatePayload.login_id = user.login_id;
      else throw new Error("No user identifier available to update cart");

      console.log(updatePayload);

      const response = await axios.patch(
        "/api/login-operations",
        updatePayload
      );

      if (response.data.success) {
        const normalized = cartItems.map((i) => ({
          ...i,
          id: String(i.id),
          price: i.unit_price * i.quantity,
        }));
        // console.log(normalized, "context");

        setUserState((prev) => ({
          ...prev,
          items: normalized,
          category: category || prev.category, // ✅ keep state in sync
        }));
      } else {
        throw new Error(response.data.message || "Failed to update cart");
      }
    } catch (error) {
      console.error("Error updating cart:", error);
      throw error;
    }
  };

  return (
    <VLifeContext.Provider value={{ user, setUser, clearUser, updateUserCart }}>
      {children}
    </VLifeContext.Provider>
  );
};

export const useVLife = () => {
  const ctx = useContext(VLifeContext);
  if (!ctx)
    throw new Error("useVLife must be used inside VLifeContextProvider");
  return ctx;
};
