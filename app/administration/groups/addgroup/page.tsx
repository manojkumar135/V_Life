"use client";

import React, { useState } from "react";
import Layout from "@/layout/Layout";
import { IoArrowBackOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import InputField from "@/components/common/inputtype1";
import CheckboxField from "@/components/common/checkboxinput";
import TextareaField from "@/components/common/textareainput";
import SubmitButton from "@/components/common/submitbutton";

export default function AddGroupForm() {
  const router = useRouter();

  interface GroupFormData {
    groupId: string;
    groupName: string;
    components: string[];
    description: string;
  }

  const [formData, setFormData] = useState<GroupFormData>({
    groupId: "GP000003",
    groupName: "",
    components: [],
    description: "",
  });

  const componentOptions = [
    "Manager",
    "Right",
    "Left",
    "Direct Partners",
    "None",
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitted:", formData);
  };

  return (
    <Layout>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-4">
          <IoArrowBackOutline
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Group ID */}
              <InputField
                label="Group ID"
                name="groupId"
                type="text"
                value={formData.groupId}
                onChange={handleInputChange}
              />

              {/* Group Name */}
              <InputField
                label="Group Name"
                name="groupName"
                type="text"
                placeholder="Group Name"
                value={formData.groupName}
                onChange={handleInputChange}
              />
            </div>

            {/* Components (Full Width) */}
            <CheckboxField
              label="Components"
              options={componentOptions}
              selected={formData.components}
              onChange={handleCheckboxChange}
            />

            {/* Description (Full Width) */}
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
