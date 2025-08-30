"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import axios from "axios";

export interface CartItem {
  id: number;
  // product_id:number;
  name: string;
  price: number;
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
  token?: string; // store access token
  items?: CartItem[]; // cart items

  // 👇 Add missing fields from your API
  address?: string;
  pincode?: string;
  intro?: boolean;
  isDeleted?: boolean;
  login_time?: string;
  created_at?: string;
  locality?: string; // added for locality
  profile?: string;
  _id?: string;
  __v?: number;
}

export interface VLifeContextType {
  user: UserType;
  setUser: (user: Partial<UserType>) => void;
  clearUser: () => void;
  updateUserCart: (cartItems: CartItem[]) => Promise<void>;
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

  // initialize optional ones as needed
  address: "",
  pincode: "",
  intro: false,
  isDeleted: false,
  login_time: "",
  created_at: "",
  locality: "", // added for locality
  profile: "",
  _id: "",
  __v: 0,
};

const VLifeContext = createContext<VLifeContextType | undefined>(undefined);

export const VLifeContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<UserType>(defaultUser);

  const setUser = (u: Partial<UserType>) => {
    setUserState((prev) => ({ ...prev, ...u }));
  };

  const clearUser = () => {
    setUserState(defaultUser);
  };

   const updateUserCart = async (cartItems: CartItem[]) => {
  try {
    // Always send strings to backend
    const transformedCartItems = cartItems.map((item) => ({
      id: String(item.id),
      product: String(item.id),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
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
      // Ensure IDs are numbers in local state
      const normalized = cartItems.map((i) => ({
        ...i,
        id: Number(i.id),
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
