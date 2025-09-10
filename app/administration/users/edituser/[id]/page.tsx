"use client";

import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import SelectField from "@/components/InputFields/selectinput";
import DateField from "@/components/InputFields/dateField";
import Button from "@/components/common/submitbutton";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";

interface UserData {
  user_id: string;
  user_name: string;
  dob: string;
  mail: string;
  contact: string;
  address: string;
  pincode: string;
  country: string;
  state: string;
  district: string;
  locality: string;
}

export default function AddEditUserForm() {
  const router = useRouter();
  const params = useParams();
  const id = (params as any)?.id as string | undefined;

  const [loading, setLoading] = useState<boolean>(true);
  const [postOfficeData, setPostOfficeData] = useState<any[]>([]);

  const initialValues: UserData = {
    user_id: "",
    user_name: "",
    mail: "",
    contact: "",
    dob: "",
    address: "",
    pincode: "",
    country: "",
    state: "",
    district: "",
    locality: "",
  };

  const validationSchema = Yup.object({
    user_id: Yup.string().required("User ID is required"),
    user_name: Yup.string()
      .required("Full Name is required")
      .min(3, "At least 3 chars"),
    mail: Yup.string().email("Invalid email").required("Email is required"),
    contact: Yup.string()
      .matches(/^[0-9]{10}$/, "Contact must be 10 digits")
      .required("Contact is required"),
    dob: Yup.date()
      .required("Date of Birth is required")
      .max(new Date(), "Date of Birth cannot be in the future")
      .test("age", "You must be at least 18 years old", function (value) {
        if (!value) return false;
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();

        if (
          age > 18 ||
          (age === 18 && (monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0)))
        ) {
          return true;
        }
        return false;
      }),
    address: Yup.string().required("Address is required"),
    pincode: Yup.string()
      .matches(/^[0-9]{6}$/, "Pincode must be 6 digits")
      .required("Pincode is required"),
    country: Yup.string().required("Country is required"),
    state: Yup.string().required("State is required"),
    district: Yup.string().required("District is required"),
    locality: Yup.string().required("Locality is required"),
  });

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const payload = {
          id,
          ...values,
          updated_by: "admin",
        };

        const res = await axios.put("/api/users-operations", payload);
        if (res?.data?.success) {
          ShowToast.success("User updated successfully!");
          router.push("/administration/users");
        } else {
          console.error("Save failed:", res?.data);
          ShowToast.error("Failed to save user.");
        }
      } catch (err: any) {
        console.error("Submission error:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to Update user.";
        ShowToast.error(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Fetch user for edit (if id present)
  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`/api/users-operations?id=${id}`);
        const user = res?.data?.data ?? res?.data;
        if (user && mounted) {
          formik.setValues({
            user_id: user.user_id ?? "",
            user_name: user.user_name ?? "",
            mail: user.mail ?? "",
            dob: user.dob ?? "",
            contact: user.contact ?? "",
            address: user.address ?? "",
            pincode: user.pincode ?? "",
            country: user.country ?? "",
            state: user.state ?? "",
            district: user.district ?? "",
            locality: user.locality ?? "",
          });
          // If pincode exists, fetch postOfficeData
          if (user.pincode) {
            try {
              const locRes = await axios.get(
                `/api/location-by-pincode?pincode=${user.pincode}`
              );
              if (locRes?.data?.success && locRes?.data?.data?.postOffices) {
                setPostOfficeData(locRes.data.data.postOffices);
              }
            } catch (e) {
              console.warn("Could not fetch postOffices on load", e);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch user", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUser();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Debounced pincode -> location lookup
  useEffect(() => {
    const pincode = formik.values.pincode;
    if (!/^\d{6}$/.test(pincode)) {
      setPostOfficeData([]);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `/api/location-by-pincode?pincode=${pincode}`
        );
        if (res?.data?.success) {
          const { city, state, country, postOffices } = res.data.data;
          formik.setFieldValue("district", city ?? formik.values.district);
          formik.setFieldValue("state", state ?? formik.values.state);
          formik.setFieldValue("country", country ?? formik.values.country);
          setPostOfficeData(postOffices ?? []);
          if (postOffices && postOffices.length > 0) {
            const localityNames = postOffices.map((p: any) => p.Name);
            if (
              !formik.values.locality ||
              !localityNames.includes(formik.values.locality)
            ) {
              formik.setFieldValue("locality", postOffices[0].Name);
            }
          }
        } else {
          setPostOfficeData([]);
        }
      } catch (err) {
        console.error("Pincode lookup failed:", err);
        setPostOfficeData([]);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.pincode]);

  const localityOptions = postOfficeData.map((p) => ({
    label: p.Name,
    value: p.Name,
  }));

  const mergedLocalityOptions =
    formik.values.locality &&
    !localityOptions.some((opt) => opt.value === formik.values.locality)
      ? [
          { label: formik.values.locality, value: formik.values.locality },
          ...localityOptions,
        ]
      : localityOptions;

  const formFields: Array<
    | {
        name: keyof UserData;
        label: string;
        kind: "input";
        inputType?: string;
        disabled?: boolean;
      }
    | {
        name: keyof UserData;
        label: string;
        kind: "select";
        options: { value: string; label: string }[];
        disabled?: boolean;
      }
  > = [
    {
      name: "user_id",
      label: "User ID",
      kind: "input",
      inputType: "text",
      disabled: Boolean(id),
    },
    { name: "user_name", label: "Full Name", kind: "input", inputType: "text" },
    { name: "mail", label: "Email", kind: "input", inputType: "email" },
    { name: "contact", label: "Contact", kind: "input", inputType: "text" },
    { name: "dob", label: "Date of Birth", kind: "input", inputType: "date" },
    { name: "address", label: "D.NO & Street", kind: "input", inputType: "text" },
    { name: "pincode", label: "Pincode", kind: "input", inputType: "text" },
    {
      name: "country",
      label: "Country",
      kind: "input",
      inputType: "text",
      disabled: loading,
    },
    {
      name: "state",
      label: "State",
      kind: "input",
      inputType: "text",
      disabled: loading,
    },
    {
      name: "district",
      label: "District",
      kind: "input",
      inputType: "text",
      disabled: loading,
    },
    {
      name: "locality",
      label: "Locality",
      kind: "select",
      options: mergedLocalityOptions.length
        ? mergedLocalityOptions
        : [
            {
              value: formik.values.locality || "",
              label: formik.values.locality || "—",
            },
          ],
      disabled: loading || mergedLocalityOptions.length === 0,
    },
  ];

  if (loading) {
    return (
      <Layout>
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <IoIosArrowBack
              className="cursor-pointer"
              size={20}
              onClick={() => router.push("/administration/users")}
            />
            <h2 className="text-lg font-semibold">Loading user...</h2>
          </div>
          <div className="h-40 flex items-center justify-center">
            Loading...
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center mb-4">
          <IoIosArrowBack
            className="cursor-pointer mr-3"
            size={20}
            onClick={() => router.push("/administration/users")}
          />
          <h2 className="text-xl font-semibold">
            {id ? "Edit User" : "Add User"}
          </h2>
        </div>

        <form
          onSubmit={formik.handleSubmit}
          className="rounded-xl p-5 bg-white space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {formFields.map((f) => {
              if (f.kind === "input") {
                if (f.inputType === "date") {
                  return (
                    <DateField
                      key={String(f.name)}
                      label={f.label}
                      name={String(f.name)}
                      value={formik.values[f.name]}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      min="1900-01-01"
                      max={new Date().toISOString().split("T")[0]} // ✅ no future dates
                      required
                      error={
                        formik.touched[f.name]
                          ? (formik.errors[f.name] as string | undefined)
                          : undefined
                      }
                    />
                  );
                }
                return (
                  <InputField
                    key={String(f.name)}
                    label={f.label}
                    name={String(f.name)}
                    type={f.inputType}
                    value={String(formik.values[f.name] ?? "")}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched[f.name]
                        ? (formik.errors[f.name] as string | undefined)
                        : undefined
                    }
                    required
                    disabled={!!f.disabled}
                  />
                );
              } else {
                return (
                  <SelectField
                    key={String(f.name)}
                    label={f.label}
                    name={String(f.name)}
                    value={formik.values[f.name] ?? ""}
                    onChange={(e: any) => {
                      if (e && typeof e === "object" && "target" in e) {
                        formik.handleChange(e);
                      } else {
                        formik.setFieldValue(String(f.name), e);
                      }
                    }}
                    onBlur={formik.handleBlur}
                    options={f.options}
                    error={
                      formik.touched[f.name]
                        ? (formik.errors[f.name] as string | undefined)
                        : undefined
                    }
                    required
                    disabled={!!f.disabled}
                  />
                );
              }
            })}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={formik.isSubmitting || loading}>
              {formik.isSubmitting ? "Saving..." : id ? "UPDATE" : "Add User"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
