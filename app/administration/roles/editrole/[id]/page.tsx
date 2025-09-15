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
import { useFormik } from "formik";
import * as Yup from "yup";
import Loader from "@/components/common/loader";

// ✅ Validation Schema
const validationSchema = Yup.object({
  roleName: Yup.string().required("* Role Name is required"),
  components: Yup.array()
    .of(Yup.string())
    .min(1, "* At least one component must be selected"),
  description: Yup.string().optional(),
});

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = params?.id as string;

  const [loading, setLoading] = useState(false);

  const componentOptions = ["Administration", "Wallet", "Orders", "History"];

  const formik = useFormik({
    initialValues: {
      roleId: "",
      roleName: "",
      components: [] as string[],
      description: "",
    },
    validationSchema,
    enableReinitialize: true, // ✅ Important for async fetched data
    onSubmit: async (values) => {
      try {
        setLoading(true);

        const payload = {
          role_id: values.roleId,
          role_name: values.roleName,
          components: values.components,
          description: values.description,
          last_modified_by: "admin",
        };

        const res = await axios.patch(
          `/api/roles-operations?role_id=${roleId}`,
          payload
        );

        if (res.data.success) {
          ShowToast.success("Role updated successfully!");
          router.push("/administration/roles");
        }
      } catch (error: any) {
        console.error("Error updating role:", error);
        const errorMessage =
          error.response?.data?.message || "Failed to update role.";
        ShowToast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  // ✅ Fetch role details on mount
  useEffect(() => {
    if (!roleId) return;

    const fetchRole = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/roles-operations?role_id=${roleId}`
        );

        if (data?.data) {
          formik.setValues({
            roleId: data.data.role_id,
            roleName: data.data.role_name,
            components: data.data.components || [],
            description: data.data.description || "",
          });
        }
      } catch (error) {
        console.error("Error fetching role:", error);
        ShowToast.error("Failed to fetch role details.");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

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
            onClick={() => router.push("/administration/roles")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">Edit Role</h2>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-6 bg-white">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Role ID"
                name="roleId"
                type="text"
                value={formik.values.roleId}
                readOnly
                disabled
              />

              <InputField
                label="Role Name"
                name="roleName"
                type="text"
                placeholder="Role Name"
                value={formik.values.roleName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.roleName ? formik.errors.roleName : undefined
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
              <SubmitButton type="submit">UPDATE</SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
