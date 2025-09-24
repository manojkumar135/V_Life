"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import Layout from "@/layout/Layout";
import InputField from "@/components/InputFields/inputtype1";
import FileInput from "@/components/InputFields/fileinput";
import TextareaField from "@/components/InputFields/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import Loader from "@/components/common/loader";
import ShowToast from "@/components/common/Toast/toast";
import StatusSelect from "@/components/InputFields/statusselect";

import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { useVLife } from "@/store/context";

interface ProductFormData {
  productid: string;
  name: string;
  description: string;
  mrp: number | "";
  dealerPrice: number | "";
  bv: number | "";
  category: string;
  status: string;
  image: File | string | null;
}

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
  status: Yup.string().required("* Status is required"),
  image: Yup.mixed<File | string>()
    .required("* Product image is required")
    .test(
      "fileType",
      "* Product image must be an image file",
      (value) =>
        !value ||
        typeof value === "string" ||
        (value instanceof File && value.type.startsWith("image/"))
    ),
});

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const { user } = useVLife();

  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<ProductFormData>({
    productid: "",
    name: "",
    description: "",
    mrp: "",
    dealerPrice: "",
    bv: "",
    category: "",
    status: "active",
    image: null,
  });

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  // Fetch product details
  useEffect(() => {
    if (!productId) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/product-operations?product_id=${productId}`
        );
        if (data?.data) {
          const product = data.data;
          setInitialValues({
            productid: product.product_id || "",
            name: product.name || "",
            description: product.description || "",
            mrp: product.mrp || "",
            dealerPrice: product.dealer_price || "",
            bv: product.bv || "",
            category: product.category || "",
            status: product.status || "active",
            image: product.image || null,
          });
        } else {
          ShowToast.error("Product not found");
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        ShowToast.error("Failed to fetch product details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

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
        typeof values.image === "string"
          ? values.image
          : values.image instanceof File
          ? await uploadFile(values.image)
          : null;

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
        status: values.status,
        last_modified_by: user.user_id,
      };

      const res = await axios.patch(
        `/api/product-operations?product_id=${productId}`,
        payload
      );

      if (res.data.success) {
        ShowToast.success("Product updated successfully!");
        router.push("/orders/addorder");
      } else {
        ShowToast.error(res.data.message || "Failed to update product");
      }
    } catch (error: any) {
      console.error("Update product error:", error);
      ShowToast.error(
        error.response?.data?.message ||
          "Something went wrong while updating product"
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
            Edit Product
          </p>
        </div>

        <div className="rounded-xl px-6 max-md:p-4 bg-white">
          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={ProductSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, errors, touched, handleBlur }) => (
              <Form className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InputField
                    label="Product ID"
                    name="productId"
                    value={values.productid}
                    disabled
                    required
                  />
                  <InputField
                    label="Product Name"
                    name="name"
                    placeholder="Enter Product Name"
                    value={values.name}
                    onChange={(e) => setFieldValue("name", e.target.value)}
                    onBlur={handleBlur}
                    required
                    error={touched.name ? errors.name : ""}
                  />
                  <InputField
                    label="MRP"
                    name="mrp"
                    placeholder="0"
                    value={values.mrp}
                    onChange={(e) => setFieldValue("mrp", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.mrp ? errors.mrp : ""}
                    required
                  />
                  <InputField
                    label="Dealer Price"
                    name="dealerPrice"
                    placeholder="0"
                    value={values.dealerPrice}
                    required
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

                  {/* React-Select for Status */}
                  <StatusSelect
                    label="Status"
                    value={values.status}
                    onChange={(val) => setFieldValue("status", val)}
                    // onBlur={() => setFieldTouched("status", true)}
                    error={errors.status}
                    touched={touched.status}
                    options={statusOptions}
                    required
                  />

                  <FileInput
                    label="Upload Image"
                    name="image"
                    value={values.image}
                    required
                    onChange={(e) =>
                      setFieldValue("image", e.currentTarget.files?.[0] || null)
                    }
                    onBlur={handleBlur}
                    error={touched.image ? errors.image : ""}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 -mt-5">
                  <TextareaField
                    label="Description"
                    name="description"
                    placeholder="Product Description"
                    value={values.description}
                    onChange={(e) =>
                      setFieldValue("description", e.target.value)
                    }
                    className="h-24 w-[66%] max-lg:w-full"
                  />
                </div>

                <div className="flex justify-end mt-0">
                  <SubmitButton type="submit">
                    {loading ? "Updating..." : "Update"}
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
