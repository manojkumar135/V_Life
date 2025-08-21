"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface UserType {
  login_id: string;
  user_id: string;
  user_name: string;
  role: string;
  mail: string;
  contact: string;
  status: string;
  token?: string;   // store access token

  // 👇 Add missing fields from your API
  address?: string;
  pincode?: string;
  intro?: boolean;
  isDeleted?: boolean;
  login_time?: string;
  created_at?: string;
  locality?: string; // added for locality
  _id?: string;
  __v?: number;
}

export interface VLifeContextType {
  user: UserType;
  setUser: (user: Partial<UserType>) => void;
  clearUser: () => void;
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

  // initialize optional ones as needed
  address: "",
  pincode: "",
  intro: false,
  isDeleted: false,
  login_time: "",
  created_at: "",
  locality: "", // added for locality
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

  return (
    <VLifeContext.Provider value={{ user, setUser, clearUser }}>
      {children}
    </VLifeContext.Provider>
  );
};

export const useVLife = () => {
  const ctx = useContext(VLifeContext);
  if (!ctx) throw new Error("useVLife must be used inside VLifeContextProvider");
  return ctx;
};
