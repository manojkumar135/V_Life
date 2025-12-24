"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import Layout from "@/layout/Layout";
import InputField from "@/components/InputFields/inputtype1";
import SubmitButton from "@/components/common/submitbutton";
import Loader from "@/components/common/loader";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { useVLife } from "@/store/context";
import CryptoJS from "crypto-js";

interface ActivationFormValues {
  user_id: string;
  user_name: string;
}

export default function ActivationForm() {
  const router = useRouter();
  const { user } = useVLife();
  const [loading, setLoading] = useState(false);
  const [validUser, setValidUser] = useState(false);

  const initialValues: ActivationFormValues = {
    user_id: "",
    user_name: "",
  };

  const ActivationSchema = Yup.object().shape({
    user_id: Yup.string()
      .length(10, "* User ID must be 10 characters")
      .required("* User ID is required"),
    user_name: Yup.string().required("* User Name is required"),
  });

  const fetchUser = async (
    userId: string,
    setFieldValue: any,
    setFieldError: any
  ) => {
    try {
      setLoading(true);
      setValidUser(false);
      setFieldValue("user_name", "");
      setFieldError("user_id", "");

      const res = await axios.get(`/api/users-operations?user_id=${userId}`);

      if (!res.data.success || !res.data.data) {
        setFieldError("user_id", "* User not found");
        return;
      }

      const userData = res.data.data;

      if (userData.user_status === "active") {
        setValidUser(false);
        setFieldError("user_id", "* User Already Active");
        return;
      }

      if (userData.has_first_order) {
        setValidUser(false);
        setFieldError("user_id", "* User already placed first order");
        return;
      }

      setFieldValue("user_name", userData.user_name);
      setValidUser(true);
    } catch (error) {
      console.error(error);
      setValidUser(false);
      setFieldError("user_id", "* Failed to fetch user");
    } finally {
      setLoading(false);
    }
  };

  /* 🔐 ENCRYPT + REDIRECT (OTHER USER) */
  const handleOrderRedirect = (pv: 50 | 100, beneficiaryId: string) => {
    if (!user?.user_id) return;

    const payload = {
      order_mode: "OTHER",
      pv,
      beneficiary_id: beneficiaryId,
      placed_by: user.user_id,
      source: "activation_form",
      timestamp: Date.now(),
    };

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      process.env.NEXT_PUBLIC_REF_KEY!
    ).toString();

    router.push(`/orders/addorder?data=${encodeURIComponent(encrypted)}`);
  };

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="p-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center w-full max-md:mb-2">
          <div className="flex items-center gap-2">
            <IoIosArrowBack
              size={25}
              className="cursor-pointer"
              onClick={() => router.push("/wallet")}
            />
            <p className="text-xl max-sm:text-lg font-bold text-black">
              Activation Form
            </p>
          </div>

          <div className="flex w-full sm:w-auto justify-end">
            <Link href="/activation/myactivation">
              <SubmitButton className="px-4 !py-1 bg-blue-500">
                {user?.role === "admin" ? "Activations" : "My Activations"}
              </SubmitButton>
            </Link>
          </div>
        </div>

        {/* FORM */}
        <div className="bg-white rounded-xl p-3 max-sm:p-2 lg:px-6">
          <Formik
            initialValues={initialValues}
            validationSchema={ActivationSchema}
            validateOnChange={false}
            validateOnBlur={false}
            onSubmit={() => {}}
          >
            {({ values, setFieldValue, setFieldError, errors }) => (
              <Form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InputField
                  label="User ID"
                  name="user_id"
                  placeholder="Enter User ID"
                  required
                  value={values.user_id}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setFieldValue("user_id", value);

                    if (value.length === 10) {
                      await fetchUser(value, setFieldValue, setFieldError);
                    } else {
                      setFieldValue("user_name", "");
                      setFieldError("user_id", "");
                      setValidUser(false);
                    }
                  }}
                  error={errors.user_id}
                />

                <InputField
                  label="User Name"
                  name="user_name"
                  value={values.user_name}
                  readOnly
                  required
                />

                <div className="lg:col-span-3">
                  <div className="border-t border-gray-300 my-2" />
                </div>

                <div className="lg:col-span-3 flex justify-center lg:justify-end gap-4">
                  <SubmitButton
                    type="button"
                    disabled={!validUser}
                    className="px-6 py-2 bg-orange-500 disabled:opacity-50"
                    onClick={() => handleOrderRedirect(50, values.user_id)}
                  >
                    ORDER 50 PV
                  </SubmitButton>

                  <SubmitButton
                    type="button"
                    disabled={!validUser}
                    className="px-6 py-2 bg-green-600 disabled:opacity-50"
                    onClick={() => handleOrderRedirect(100, values.user_id)}
                  >
                    ORDER 100 PV
                  </SubmitButton>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </Layout>
  );
}
