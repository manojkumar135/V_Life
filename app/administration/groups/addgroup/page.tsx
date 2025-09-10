"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import CheckboxField from "@/components/InputFields/checkboxinput";
import TextareaField from "@/components/InputFields/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface GroupFormData {
  // groupId: string;
  groupName: string;
  components: string[];
  description: string;
}

export default function AddGroupForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<GroupFormData>({
    // groupId: "",
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
        // group_id: formData.groupId,
        group_name: formData.groupName,
        roles: formData.components,
        created_by: "admin",
        last_modified_by: "admin",
        description: "none",
        group_status: "active",
      };

      const res = await axios.post("/api/groups-operations", payload);

      if (res.data.success) {
        // alert("Group created successfully!");
              ShowToast.success("Group created successfully!");

        router.push("/administration/groups");
      }
    } catch (error) {
      console.error(error);
      // alert("Failed to create group.");
      ShowToast.error("Failed to create group.");
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
              {/* <InputField
                label="Group ID"
                name="groupId"
                type="text"
                value={formData.groupId}
                onChange={handleInputChange}
              /> */}
              <InputField
                label="Group Name"
                name="groupName"
                type="text"
                placeholder="Group Name"
                value={formData.groupName}
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
              <SubmitButton type="submit">Submit</SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
