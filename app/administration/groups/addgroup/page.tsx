"use client";

import React, { useState } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import CheckboxField from "@/components/InputFields/checkboxinput";
import TextareaField from "@/components/InputFields/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import { useFormik } from "formik";
import * as Yup from "yup";
import Loader from "@/components/common/loader";

// ✅ Validation Schema
const validationSchema = Yup.object({
  groupName: Yup.string().required("* Group Name is required"),
  components: Yup.array()
    .of(Yup.string())
    .min(1, "* At least one component must be selected"),
  description: Yup.string().optional(),
});

export default function AddGroupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const componentOptions = [
    "Manager",
    "Right",
    "Left",
    "Direct Partners",
    "None",
  ];

  const formik = useFormik({
    initialValues: {
      groupName: "",
      components: [] as string[],
      description: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const payload = {
          group_name: values.groupName,
          roles: values.components,
          created_by: "admin",
          last_modified_by: "admin",
          description: values.description || "none",
          group_status: "active",
        };

        const res = await axios.post("/api/groups-operations", payload);

        if (res.data.success) {
          ShowToast.success("Group created successfully!");
          router.push("/administration/groups");
        }
      } catch (error: any) {
        console.error(error);

        // ✅ Handle backend error messages
        const errorMessage =
          error.response?.data?.message || "Failed to create group.";

        ShowToast.error(errorMessage);
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
            onClick={() => router.push("/administration/groups")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">
            Add New Group
          </h2>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-6 bg-white">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            {/* Group Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Group Name"
                name="groupName"
                type="text"
                placeholder="Group Name"
                value={formik.values.groupName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.groupName ? formik.errors.groupName : undefined
                }
              />
            </div>

            {/* Components */}
            <CheckboxField
              label="Components"
              options={componentOptions}
              selected={formik.values.components}
              onChange={(value) => {
                const exists = formik.values.components.includes(value);
                const newComponents = exists
                  ? formik.values.components.filter((c) => c !== value)
                  : [...formik.values.components, value];
                formik.setFieldValue("components", newComponents);
              }}
              error={
                formik.touched.components ? formik.errors.components : undefined
              }
            />

            {/* Description */}
            <TextareaField
              label="Description"
              name="description"
              placeholder="Description"
              value={formik.values.description}
              onChange={formik.handleChange}
              // onBlur={formik.handleBlur}
              // error={
              //   formik.touched.description
              //     ? formik.errors.description
              //     : undefined
              // }
            />

            {/* Submit */}
            <div className="flex justify-end">
              <SubmitButton type="submit">Submit</SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
