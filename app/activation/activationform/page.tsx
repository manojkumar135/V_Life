"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import Layout from "@/layout/Layout";
import SubmitButton from "@/components/common/submitbutton";
import { useVLife } from "@/store/context";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter } from "next/navigation";


export default function ActivationForm() {
  const { user, setUser } = useVLife();
  const [loading, setLoading] = useState(true);



  // console.log(user.dailyReward)
  const router = useRouter();

  

  return (
    <Layout>
      <div className="p-2 px-6 space-y-1 flex flex-col h-[calc(100vh-4rem)]">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between md:items-center gap-1 w-full max-md:mb-2">
          <div className="flex flex-wrap items-center w-full gap-2">
            <IoIosArrowBack
              size={25}
              color="black"
              className="cursor-pointer z-20"
              onClick={() => router.push("/wallet")}
            />
            <p className="text-2xl max-md:text-xl font-bold text-black">
              Activation Form
            </p>
           
          </div>

          <div className="flex flex-row gap-3 w-full sm:w-auto">
            
            <Link href="/activation/myactivation" className="w-full sm:w-39">
              <SubmitButton className="w-full px-4 py-2 font-semibold rounded-md bg-blue-500">
                {user?.role === "admin" ? "Activations" : "My Activations"}
              </SubmitButton>
            </Link>
          </div>
        </div>

      
      </div>

      
    </Layout>
  );
}
