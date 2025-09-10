"use client";

import React, { useState, ChangeEvent, useEffect, FormEvent } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import CheckboxField from "@/components/InputFields/checkboxinput";
import TextareaField from "@/components/InputFields/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface RoleFormData {
  roleId: string;
  roleName: string;
  components: string[];
  description: string;
}

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = params?.id as string;

  const [formData, setFormData] = useState<RoleFormData>({
    roleId: "",
    roleName: "",
    components: [],
    description: "",
  });

  const [loading, setLoading] = useState(false);

  const componentOptions = ["Administration", "Wallet", "Orders", "History"];

  // Fetch role data on mount
  useEffect(() => {
    if (!roleId) return;
    const fetchRole = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/roles-operations?role_id=${roleId}`);
        if (data?.data) {
          setFormData({
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
  }, [roleId]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (value: string) => {
    setFormData((prev) => {
      const exists = prev.components.includes(value);
      return {
        ...prev,
        components: exists
          ? prev.components.filter((c) => c !== value)
          : [...prev.components, value],
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        role_id: formData.roleId,
        role_name: formData.roleName,
        components: formData.components,
        description: formData.description,
        last_modified_by: "admin",
      };

      const res = await axios.patch(`/api/roles-operations?role_id=${roleId}`, payload);

      if (res.data.success) {
        ShowToast.success("Role updated successfully!");
        router.push("/administration/roles");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      ShowToast.error("Failed to update Role.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-4">
          <IoIosArrowBack
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/administration/roles")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">
            Edit Role
          </h2>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-6 bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Role ID"
                name="roleId"
                type="text"
                value={formData.roleId}
                // onChange={handleInputChange}
                readOnly
                disabled
              />
              <InputField
                label="Role Name"
                name="roleName"
                type="text"
                placeholder="Role Name"
                value={formData.roleName}
                onChange={handleInputChange}
              />
            </div>

            <CheckboxField
              label="Components"
              options={componentOptions}
              selected={formData.components}
              onChange={handleCheckboxChange}
            />

            <TextareaField
              label="Description"
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleInputChange}
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
