"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import axios from "axios";

export interface CartItem {
  id: number;
  name: string;
  price: number; // total price for that line (unit_price * quantity)
  unit_price: number; // price per single unit
  quantity: number;
  image: string;
  description: string;
  category: string;
}

export interface UserType {
  login_id: string;
  user_id: string;
  user_name: string;
  role: string;
  mail: string;
  contact: string;
  status: string;
  token?: string;
  items?: CartItem[];

  address?: string;
  pincode?: string;
  intro?: boolean;
  isDeleted?: boolean;
  login_time?: string;
  created_at?: string;
  locality?: string;
  profile?: string;
  _id?: string;
  __v?: number;
}

export type ThemeType = "light" | "dark" | "system";

export interface VLifeContextType {
  user: UserType;
  setUser: (user: Partial<UserType>) => void;
  clearUser: () => void;
  updateUserCart: (cartItems: CartItem[]) => Promise<void>;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const defaultUser: UserType = {
  login_id: "",
  user_id: "",
  user_name: "",
  role: "",
  mail: "",
  contact: "",
  status: "",
  token: "",
  items: [],
  address: "",
  pincode: "",
  intro: false,
  isDeleted: false,
  login_time: "",
  created_at: "",
  locality: "",
  profile: "",
  _id: "",
  __v: 0,
};

const VLifeContext = createContext<VLifeContextType | undefined>(undefined);

export const VLifeContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<UserType>(defaultUser);
  const [theme, setThemeState] = useState<ThemeType>("light");

  // ✅ Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeType | null;
    if (savedTheme) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("light");
    }
  }, []);

  // ✅ Apply theme globally (to <html> class)
  const applyTheme = (theme: ThemeType) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(theme);
    }
  };

  // ✅ Update theme & persist
  const setTheme = (t: ThemeType) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  };

  const setUser = (u: Partial<UserType>) => {
    setUserState((prev) => ({ ...prev, ...u }));
  };

  const clearUser = () => {
    setUserState(defaultUser);
  };

const updateUserCart = async (cartItems: CartItem[]) => {
  console.log(cartItems,"context")
  try {
    const transformedCartItems = cartItems.map((item) => ({
      id: String(item.id),
      product: String(item.id),
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,   // ✅ per item price
      price: item.unit_price * item.quantity, // ✅ line total
      image: item.image,
      description: item.description || "",
      category: item.category,
      created_at: new Date().toISOString(),
    }));

    const updatePayload: any = { items: transformedCartItems };

    if (user._id) updatePayload._id = user._id;
    else if (user.user_id) updatePayload.user_id = user.user_id;
    else if (user.login_id) updatePayload.login_id = user.login_id;
    else throw new Error("No user identifier available to update cart");

    const response = await axios.patch("/api/login-operations", updatePayload);

    if (response.data.success) {
      // Normalize back to numbers
      const normalized = cartItems.map((i) => ({
        ...i,
        id: Number(i.id),
        unit_price: Number(i.unit_price),
        price: Number(i.unit_price) * Number(i.quantity),
      }));
      setUserState((prev) => ({ ...prev, items: normalized }));
    } else {
      throw new Error(response.data.message || "Failed to update cart");
    }
  } catch (error) {
    console.error("Error updating cart:", error);
    throw error;
  }
};



  return (
    <VLifeContext.Provider
      value={{ user, setUser, clearUser, updateUserCart, theme, setTheme }}
    >
      {children}
    </VLifeContext.Provider>
  );
};

export const useVLife = () => {
  const ctx = useContext(VLifeContext);
  if (!ctx) throw new Error("useVLife must be used inside VLifeContextProvider");
  return ctx;
};
