"use client";
import React, { useState } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import SelectField from "@/components/InputFields/selectinput";
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
  type: Yup.string()
    .oneOf(["score", "matching"])
    .required("* Reward type is required"),

  pointsRequired: Yup.number().when("type", {
    is: "score",
    then: (schema) =>
      schema
        .min(1, "* Points Required must be at least 1")
        .required("* Points Required is required"),
    otherwise: (schema) => schema.notRequired(),
  }),

  matchesRequired: Yup.number().when("type", {
    is: "matching",
    then: (schema) =>
      schema
        .min(1, "* Matches Required must be at least 1")
        .required("* Matches Required is required"),
    otherwise: (schema) => schema.notRequired(),
  }),

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
      ShowToast.error("Failed to upload file");
      return null;
    }
  };

  const formik = useFormik({
    initialValues: {
      title: "",
      description: "",
      type: "score" as "score" | "matching",
      pointsRequired: 0,
      matchesRequired: 0,
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

        const payload: any = {
          title: values.title,
          description: values.description,
          type: values.type,
          image: imageUrl,
          status: "active",
          created_by: user?.user_id || "admin",
        };

        if (values.type === "score") {
          payload.points_required = values.pointsRequired;
        } else {
          payload.matches_required = values.matchesRequired;
        }

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

        {/* Form */}
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

              {/* Reward Type */}
              <SelectField
                label="Reward Type"
                name="type"
                required
                options={[
                  { value: "score", label: "Score Based" },
                  { value: "matching", label: "Matching Based (60-Day Cycle)" },
                ]}
                value={formik.values.type}
                 controlPaddingLeft="0px"
                onChange={(opt) => formik.setFieldValue("type", opt?.value)}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.type ? (formik.errors.type as string) : ""
                }
              />

              {/* Points Required */}
              {formik.values.type === "score" && (
                <InputField
                  label="Points Required"
                  name="pointsRequired"
                  type="number"
                  placeholder="Points Required"
                  value={formik.values.pointsRequired}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  min={1}
                  error={
                    formik.touched.pointsRequired
                      ? formik.errors.pointsRequired
                      : undefined
                  }
                />
              )}

              {/* Matches Required */}
              {formik.values.type === "matching" && (
                <InputField
                  label="Matches Required (per ticket)"
                  name="matchesRequired"
                  type="number"
                  placeholder="e.g. Goa: 30, Dubai: 60"
                  value={formik.values.matchesRequired}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  min={1}
                  error={
                    formik.touched.matchesRequired
                      ? (formik.errors.matchesRequired as any)
                      : undefined
                  }
                />
              )}

              {/* Image Upload */}
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
