"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import CheckboxField from "@/components/InputFields/checkboxinput";
import TextareaField from "@/components/InputFields/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useFormik } from "formik";
import * as Yup from "yup";

// ✅ Validation Schema
const validationSchema = Yup.object({
  groupName: Yup.string().required("* Group Name is required"),
  components: Yup.array()
    .of(Yup.string())
    .min(1, "* At least one component must be selected"),
  description: Yup.string().optional(),
});

export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  const [loading, setLoading] = useState(false);

  const componentOptions = [
    "Manager",
    "Right",
    "Left",
    "Direct Partners",
    "None",
  ];

  // ✅ Initialize Formik
  const formik = useFormik({
    initialValues: {
      groupId: "",
      groupName: "",
      components: [] as string[],
      description: "",
    },
    validationSchema,
    enableReinitialize: true, // important to allow async data load
    onSubmit: async (values) => {
      try {
        setLoading(true);
        const payload = {
          group_name: values.groupName,
          roles: values.components,
          description: values.description,
          last_modified_by: "admin", // dynamic if needed
        };

        const res = await axios.patch(
          `/api/groups-operations?group_id=${groupId}`,
          payload
        );

        if (res.data.success) {
          ShowToast.success("Group updated successfully!");
          router.push("/administration/groups");
        }
      } catch (error: any) {
        console.error("Error updating group:", error);
        const errorMessage =
          error.response?.data?.message || "Failed to update group.";
        ShowToast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  // ✅ Fetch existing group details
  useEffect(() => {
    if (!groupId) return;
    const fetchGroup = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/groups-operations?group_id=${groupId}`
        );
        if (data?.data) {
          formik.setValues({
            groupId: data.data.group_id,
            groupName: data.data.group_name,
            components: data.data.roles || [],
            description: data.data.description || "",
          });
        }
      } catch (error: any) {
        console.error("Error fetching group:", error);
        const errorMessage =
          error.response?.data?.message || "Failed to fetch group.";
        ShowToast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);

  return (
    <Layout>
      {/* Loader Overlay */}
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
            Edit Group
          </h2>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-6 bg-white">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Group ID"
                name="groupId"
                type="text"
                value={formik.values.groupId}
                readOnly
                disabled
              />
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

            <div className="flex justify-end">
              <SubmitButton type="submit">
                {loading ? "Updating..." : "UPDATE"}
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
