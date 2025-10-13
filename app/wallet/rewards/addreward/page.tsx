"use client";
import React, { useState } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import TextareaField from "@/components/InputFields/textareainput";
import FileInput from "@/components/InputFields/fileinput";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import { useFormik } from "formik";
import * as Yup from "yup";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";

// ✅ Validation Schema
const validationSchema = Yup.object({
  title: Yup.string().required("* Title is required"),
  pointsRequired: Yup.number()
    .min(1, "* Points Required must be at least 1")
    .required("* Points Required is required"),
  description: Yup.string().optional(),
  image: Yup.mixed<File>()
    .required("* Reward image is required")
    .test(
      "fileType",
      "* Only image files are allowed",
      (value) =>
        !value || (value instanceof File && value.type.startsWith("image/"))
    ),
});

export default function AddRewardPage() {
  const router = useRouter();
  const { user } = useVLife();
  const [loading, setLoading] = useState(false);

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileForm = new FormData();
      fileForm.append("file", file);
      const res = await axios.post("/api/getFileUrl", fileForm, {
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

  const formik = useFormik({
    initialValues: {
      title: "",
      description: "",
      pointsRequired: 0,
      image: null as File | null,
      created_by: user?.user_id || "admin",
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        let imageUrl = null;
        if (values.image instanceof File) {
          imageUrl = await uploadFile(values.image);
          if (!imageUrl) {
            setLoading(false);
            return;
          }
        }

        const payload = {
          title: values.title,
          description: values.description,
          points_required: values.pointsRequired,
          image: imageUrl,
          status: "active",
          created_by: user?.user_id || "admin",
        };

        const res = await axios.post("/api/rewards-operations", payload);
        if (res.data.success) {
          ShowToast.success("Reward added successfully!");
          router.push("/wallet/rewards");
        } else {
          ShowToast.error(res.data.message || "Failed to add reward.");
        }
      } catch (error: any) {
        ShowToast.error(
          error.response?.data?.message || "Failed to add reward."
        );
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-4">
          <IoIosArrowBack
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/wallet/rewards")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">
            Add New Reward
          </h2>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-6 bg-white">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Title"
                name="title"
                type="text"
                placeholder="Title"
                value={formik.values.title}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                error={formik.touched.title ? formik.errors.title : undefined}
              />
              <InputField
                label="Points Required"
                name="pointsRequired"
                type="number"
                placeholder="Points Required"
                value={formik.values.pointsRequired}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                min={10}
                error={
                  formik.touched.pointsRequired
                    ? formik.errors.pointsRequired
                    : undefined
                }
              />
              {/* ✅ Replaced Image URL input with FileInput */}
              <FileInput
                label="Upload Reward Image"
                name="image"
                required
                value={formik.values.image}
                onChange={(e) =>
                  formik.setFieldValue(
                    "image",
                    e.currentTarget.files?.[0] || null
                  )
                }
                onBlur={formik.handleBlur}
                error={formik.touched.image ? formik.errors.image : ""}
              />
            </div>

            <TextareaField
              label="Description"
              name="description"
              placeholder="Description"
              value={formik.values.description}
              onChange={formik.handleChange}
              className="h-24"
              required
            />

            <div className="flex justify-end">
              <SubmitButton type="submit">
                {loading ? "Submitting..." : "Submit"}
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
