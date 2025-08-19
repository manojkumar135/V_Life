import React, { createContext, useContext, useState, ReactNode } from "react";

export interface UserContextType {
  login_id: string;
  user_id: string;
  user_name: string;
  role: string;
  mail: string;
  contact: string;
  status: string;
  setUser: (user: Partial<UserContextType>) => void;
  clearUser: () => void;
}

const defaultUser: UserContextType = {
  login_id: "",
  user_id: "",
  user_name: "",
  role: "",
  mail: "",
  contact: "",
  status: "",
  setUser: () => {},
  clearUser: () => {},
};

const UserContext = createContext<UserContextType>(defaultUser);

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<
    Omit<UserContextType, "setUser" | "clearUser">
  >({
    login_id: "",
    user_id: "",
    user_name: "",
    role: "",
    mail: "",
    contact: "",
    status: "",
  });

  const setUser = (newUser: Partial<UserContextType>) => {
    setUserState((prev) => ({ ...prev, ...newUser }));
  };

  const clearUser = () => {
    setUserState({
      login_id: "",
      user_id: "",
      user_name: "",
      role: "",
      mail: "",
      contact: "",
      status: "",
    });
  };

  return (
    <UserContext.Provider value={{ ...user, setUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};
