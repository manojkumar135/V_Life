"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import Layout from "@/layout/Layout";
import { IoArrowBackOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import InputField from "@/components/common/inputtype1";
import CheckboxField from "@/components/common/checkboxinput";
import TextareaField from "@/components/common/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface RoleFormData {
  roleId: string;
  roleName: string;
  components: string[];
  description: string;
}

export default function AddRoleForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<RoleFormData>({
    roleId: "",
    roleName: "",
    components: [],
    description: "",
  });

  const componentOptions = ["Administration", "Wallet", "Orders", "History"];

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const payload = {
        // role_id: formData.roleId,
        role_name: formData.roleName,
        components: formData.components,
        description: formData.description,
        created_by: "admin",
        last_modified_by: "admin",
        role_status: "active",
      };

      const res = await axios.post("/api/roles-operations", payload);

      if (res.data.success) {
        ShowToast.success("Role created successfully!");
        router.push("/administration/roles");
      }
    } catch (error) {
      console.error(error);
      ShowToast.error("Failed to create role.");
    }
  };

  return (
    <Layout>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-4">
          <IoArrowBackOutline
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/administration/roles")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">
            Add New Role
          </h2>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-6 bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* <InputField
                label="Role ID"
                name="roleId"
                type="text"
                value={formData.roleId}
                onChange={handleInputChange}
              /> */}
              <InputField
                label="Role Name"
                name="roleName"
                type="text"
                placeholder="Role Name"
                value={formData.roleName}
                onChange={handleInputChange}
              />
            </div>

            {/* Components */}
            <CheckboxField
              label="Components"
              options={componentOptions}
              selected={formData.components}
              onChange={handleCheckboxChange}
            />

            {/* Description */}
            <TextareaField
              label="Description"
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleInputChange}
            />

            {/* Submit Button */}
            <div className="flex justify-end">
              <SubmitButton type="submit">Submit</SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
