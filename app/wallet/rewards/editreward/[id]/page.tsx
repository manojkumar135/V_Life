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

// ✅ Validation Schema
const validationSchema = Yup.object({
  title: Yup.string().required("* Title is required"),
  pointsRequired: Yup.number()
    .min(1, "* Points Required must be at least 1")
    .required("* Points Required is required"),
  description: Yup.string().optional(),
  image: Yup.mixed<File | string>()
    .required("* Reward image is required")
    .test(
      "fileType",
      "* Only image files are allowed",
      (value) =>
        typeof value === "string" ||
        !value ||
        (value instanceof File && value.type.startsWith("image/"))
    ),
  status: Yup.string()
    .oneOf(["active", "inactive"])
    .required("* Status is required"),
});

// ✅ Status Options
const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export default function EditRewardPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
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
      reward_id: "",
      title: "",
      description: "",
      pointsRequired: 0,
      image: null as File | string | null,
      status: "active",
      updated_by: user?.user_id || "admin",
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        let imageUrl: string | null = null;

        // ✅ Handle file upload if new image chosen
        if (values.image instanceof File) {
          imageUrl = await uploadFile(values.image);
          if (!imageUrl) {
            setLoading(false);
            return;
          }
        } else {
          imageUrl = values.image as string;
        }

        const payload = {
          reward_id: values.reward_id,
          title: values.title,
          description: values.description,
          points_required: values.pointsRequired,
          image: imageUrl,
          status: values.status,

          updated_by: user?.user_id || "admin",
        };

        const res = await axios.put("/api/rewards-operations", payload);
        if (res.data.success) {
          ShowToast.success("Reward updated successfully!");
          router.push("/wallet/rewards");
        } else {
          ShowToast.error(res.data.message || "Failed to update reward.");
        }
      } catch (error: any) {
        ShowToast.error(
          error.response?.data?.message || "Failed to update reward."
        );
      } finally {
        setLoading(false);
      }
    },
    enableReinitialize: true,
  });

  // ✅ Fetch existing reward details
  useEffect(() => {
    const reward_id = params?.id ?? "";
    if (!reward_id) return;

    setLoading(true);
    axios
      .get(`/api/rewards-operations?reward_id=${reward_id}`)
      .then((res) => {
        if (res.data.success && res.data.data) {
          const reward = res.data.data;
          formik.setValues({
            reward_id: reward.reward_id,
            title: reward.title || "",
            description: reward.description || "",
            pointsRequired: reward.points_required || 0,
            image: reward.image || "",
            status: reward.status || "active",
            updated_by: user?.user_id || "admin",
          });
        } else {
          ShowToast.error(res.data.message || "Reward not found.");
        }
      })
      .catch(() => {
        ShowToast.error("Failed to fetch reward details.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

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
            Edit Reward
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
                min={10}
                required
                error={
                  formik.touched.pointsRequired
                    ? formik.errors.pointsRequired
                    : undefined
                }
              />

              {/* ✅ File Input for Image */}
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

              <div className="-mt-3">
                {/* ✅ Status Field */}
                <SelectField
                  label="Status"
                  name="status"
                  value={formik.values.status}
                  onChange={(e: any) =>
                    formik.setFieldValue(
                      "status",
                      e.target?.value || e?.value || ""
                    )
                  }
                  onBlur={formik.handleBlur}
                  options={statusOptions}
                  error={
                    formik.touched.status ? formik.errors.status : undefined
                  }
                  controlPaddingLeft="0px"
                  className=""
                />
              </div>

              {/* ✅ Show Preview if existing or newly selected */}
              {/* {formik.values.image && (
                <div className="col-span-full mt-2">
                  <img
                    src={
                      formik.values.image instanceof File
                        ? URL.createObjectURL(formik.values.image)
                        : (formik.values.image as string)
                    }
                    alt="Reward Preview"
                    className="w-32 h-32 rounded-lg border object-cover"
                  />
                </div>
              )} */}
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
