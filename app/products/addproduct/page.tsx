"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import Layout from "@/layout/Layout";
import InputField from "@/components/InputFields/inputtype1";
import FileInput from "@/components/InputFields/fileinput";
import TextareaField from "@/components/InputFields/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import { useVLife } from "@/store/context";

import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";

interface ProductFormData {
  name: string;
  description: string;
  mrp: number | "";
  dealerPrice: number | "";
  bv: number | "";
  category: string;
  image: File | null;
}

export default function AddProductPage() {
  const router = useRouter();
  const { user } = useVLife();
  const [loading, setLoading] = useState(false);

  const initialValues: ProductFormData = {
    name: "",
    description: "",
    mrp: "",
    dealerPrice: "",
    bv: "",
    category: "",
    image: null,
  };

  const ProductSchema = Yup.object().shape({
    name: Yup.string().required("* Product Name is required"),
    description: Yup.string(),
    mrp: Yup.number()
      .typeError("* MRP must be a number")
      .required("* MRP is required"),
    dealerPrice: Yup.number()
      .typeError("* Dealer Price must be a number")
      .required("* Dealer Price is required"),
    bv: Yup.number()
      .typeError("* BV must be a number")
      .required("* BV is required"),
    category: Yup.string().required("* Category is required"),

    image: Yup.mixed<File>()
      .required("* Product image is required")
      .test(
        "fileType",
        "* Product image must be an image file",
        (value) => !value || (value && value.type.startsWith("image/"))
      ),
  });

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("/api/getFileUrl", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) return res.data.fileUrl;
      ShowToast.error(res.data.message || "File upload failed");
      return null;
    } catch (error) {
      console.error("File upload error:", error);
      ShowToast.error("Failed to upload file");
      return null;
    }
  };

  const handleSubmit = async (
    values: ProductFormData,
    actions: FormikHelpers<ProductFormData>
  ) => {
    try {
      setLoading(true);

      const imageUrl =
        values.image instanceof File
          ? await uploadFile(values.image)
          : values.image;

      if (!imageUrl) return;

      const payload = {
        name: values.name,
        description: values.description,
        mrp: Number(values.mrp),
        dealer_price: Number(values.dealerPrice),
        bv: Number(values.bv),
        category: values.category
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        image: imageUrl,
        created_by: user.user_id,
        status: "active",
      };

      const res = await axios.post("/api/product-operations", payload);

      if (res.data.success) {
        ShowToast.success("Product added successfully!");
        router.push("/orders/addorder");
      } else {
        ShowToast.error(res.data.message || "Failed to add product");
      }
    } catch (error: any) {
      console.error("Add product error:", error);
      ShowToast.error(
        error.response?.data?.message ||
          "Something went wrong while adding product"
      );
    } finally {
      setLoading(false);
      actions.setSubmitting(false);
    }
  };

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}
      <div className="p-4 max-md:p-2">
        <div className="flex items-center mb-6 max-md:mb-2">
          <IoIosArrowBack
            size={25}
            color="black"
            className="mr-2 cursor-pointer"
            onClick={() => router.push("/orders/addorder")}
          />
          <p className="text-xl max-md:text-[1rem] font-semibold">
            Add New Product
          </p>
        </div>

        <div className="rounded-xl px-6 max-md:p-4 bg-white">
          <Formik
            initialValues={initialValues}
            validationSchema={ProductSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, errors, touched, handleBlur }) => (
              <Form className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InputField
                    label="Product Name"
                    name="name"
                    placeholder="Enter Product Name"
                    required
                    value={values.name}
                    onChange={(e) => setFieldValue("name", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.name ? errors.name : ""}
                  />
                  <InputField
                    label="Category"
                    name="category"
                    placeholder="Category"
                    value={values.category}
                    required
                    onChange={(e) => setFieldValue("category", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.category ? errors.category : ""}
                  />

                  <InputField
                    label="MRP (₹)"
                    name="mrp"
                    placeholder="0"
                    required
                    value={values.mrp}
                    onChange={(e) => setFieldValue("mrp", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.mrp ? errors.mrp : ""}
                  />
                  <InputField
                    label="Dealer Price (₹)"
                    name="dealerPrice"
                    placeholder="0"
                    required
                    value={values.dealerPrice}
                    onChange={(e) =>
                      setFieldValue("dealerPrice", e.target.value)
                    }
                    onBlur={handleBlur}
                    error={touched.dealerPrice ? errors.dealerPrice : ""}
                  />
                  <InputField
                    label="Business Volume (BV)"
                    name="bv"
                    placeholder="0"
                    required
                    value={values.bv}
                    onChange={(e) => setFieldValue("bv", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.bv ? errors.bv : ""}
                  />

                  <FileInput
                    label="Upload Image"
                    name="image"
                    required
                    //   className="w-[66%] max-lg:w-full"
                    value={values.image}
                    onChange={(e) =>
                      setFieldValue("image", e.currentTarget.files?.[0] || null)
                    }
                    onBlur={handleBlur}
                    error={touched.image ? errors.image : ""}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 -mt-2">
                  {/* Description */}
                  <TextareaField
                    label="Description"
                    name="description"
                    placeholder="Product Description"
                    value={values.description}
                    onChange={(e) =>
                      setFieldValue("description", e.target.value)
                    }
                    className="h-24 w-[66%] max-lg:w-full"
                    //   onBlur={handleBlur}
                    //   error={touched.description ? errors.description : ""}
                  />
                </div>

                <div className="flex justify-end mt-4">
                  <SubmitButton type="submit">
                    {loading ? "Submitting..." : "Submit"}
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
