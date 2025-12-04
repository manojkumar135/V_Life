"use client";
import React, { useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
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
import SelectField from "@/components/InputFields/selectinput";

// 👉 Status Select Options
const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

// 👉 Reward Type Options
const typeOptions = [
  { value: "score", label: "Score Based" },
  { value: "matching", label: "Matching Based (60-Day Cycle)" },
];

// 👉 Validation Schema
const validationSchema = Yup.object({
  title: Yup.string().required("* Title is required"),
  type: Yup.string()
    .oneOf(["score", "matching"])
    .required("* Type is required"),
  pointsRequired: Yup.number().when("type", {
    is: "score",
    then: (schema) =>
      schema.min(1, "* Minimum 1 point required").required("Required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  matchesRequired: Yup.number().when("type", {
    is: "matching",
    then: (schema) =>
      schema.min(1, "* Minimum 1 match required").required("Required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  image: Yup.mixed<File | string>()
    .required("* Reward image is required")
    .test(
      "fileType",
      "* Only image files allowed",
      (value) =>
        typeof value === "string" ||
        !value ||
        (value instanceof File && value.type.startsWith("image/"))
    ),
  status: Yup.string().oneOf(["active", "inactive"]).required("Required"),
});

export default function EditRewardPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const { user } = useVLife();
  const [loading, setLoading] = useState(false);

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await axios.post("/api/getFileUrl", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) return res.data.fileUrl;
      ShowToast.error("File upload failed");
      return null;
    } catch {
      ShowToast.error("Failed to upload file");
      return null;
    }
  };

  const formik = useFormik({
    initialValues: {
      reward_id: "",
      title: "",
      description: "",
      type: "score",
      pointsRequired: 0,
      matchesRequired: 0,
      image: null as File | string | null,
      status: "active",
      updated_by: user?.user_id || "admin",
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        let imageUrl = values.image as string;
        if (values.image instanceof File) {
          imageUrl = (await uploadFile(values.image)) as string;
          if (!imageUrl) return setLoading(false);
        }

        const payload: any = {
          reward_id: values.reward_id,
          title: values.title,
          description: values.description,
          type: values.type,
          image: imageUrl,
          status: values.status,
          updated_by: user?.user_id || "admin",
        };

        if (values.type === "score") {
          payload.points_required = values.pointsRequired;
        } else {
          payload.matches_required = values.matchesRequired;
        }

        const res = await axios.put("/api/rewards-operations", payload);
        if (res.data.success) {
          ShowToast.success("Reward Updated Successfully!");
          router.push("/wallet/rewards");
        } else {
          ShowToast.error(res.data.message);
        }
      } catch (err: any) {
        ShowToast.error(err.response?.data?.message || "Update failed");
      } finally {
        setLoading(false);
      }
    },
    enableReinitialize: true,
  });

  // 👉 Fetch Reward
  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    setLoading(true);

    axios
      .get(`/api/rewards-operations?reward_id=${id}`)
      .then((res) => {
        if (!res.data.success) {
          ShowToast.error("Reward not found");
          return;
        }
        const rw = res.data.data;
        formik.setValues({
          reward_id: rw.reward_id,
          title: rw.title || "",
          description: rw.description || "",
          type: rw.type || "score",
          pointsRequired: rw.points_required || 0,
          matchesRequired: rw.matches_required || 0,
          image: rw.image || "",
          status: rw.status || "active",
          updated_by: user?.user_id || "admin",
        });
      })
      .catch(() => ShowToast.error("Failed to load reward details"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <Loader />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-4">
          <IoIosArrowBack
            size={25}
            onClick={() => router.push("/wallet/rewards")}
            className="mr-3 cursor-pointer"
          />
          <h2 className="text-xl font-semibold">Edit Reward</h2>
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
                error={formik.touched.title ? formik.errors.title : ""}
              />

              {/* Reward Type */}
              <SelectField
                label="Reward Type"
                name="type"
                required
                value={formik.values.type}
                options={typeOptions}
                onChange={(opt) => {
                  formik.setFieldValue("type", opt?.value);
                  if (opt?.value === "score") {
                    formik.setFieldValue("matchesRequired", 0);
                  } else {
                    formik.setFieldValue("pointsRequired", 0);
                  }
                }}
                controlPaddingLeft="0px"
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
                  value={formik.values.pointsRequired}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  min={1}
                  required
                  error={
                    formik.touched.pointsRequired
                      ? formik.errors.pointsRequired
                      : ""
                  }
                />
              )}

              {/* Matches Required */}
              {formik.values.type === "matching" && (
                <InputField
                  label="Matches Required (per ticket)"
                  name="matchesRequired"
                  type="number"
                  value={formik.values.matchesRequired}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  min={1}
                  required
                  error={
                    formik.touched.matchesRequired
                      ? (formik.errors.matchesRequired as string)
                      : ""
                  }
                />
              )}

              {/* File Input */}
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

              {/* Status */}
              <SelectField
                label="Status"
                name="status"
                required
                value={formik.values.status}
                options={statusOptions}
                controlPaddingLeft="0px"
                onChange={(opt) =>
                  formik.setFieldValue("status", opt?.value || "")
                }
                onBlur={formik.handleBlur}
                error={
                  formik.touched.status ? (formik.errors.status as string) : ""
                }
              />
            </div>

            {/* Description */}
            <TextareaField
              label="Description"
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange}
              className="h-24"
            />

            {/* Image Preview */}
            {formik.values.image && (
              <div className="mt-1">
                <img
                  src={
                    formik.values.image instanceof File
                      ? URL.createObjectURL(formik.values.image)
                      : (formik.values.image as string)
                  }
                  alt="Preview"
                  className="w-28 h-28 rounded-lg border object-cover"
                />
              </div>
            )}

            <div className="flex justify-end">
              <SubmitButton type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
