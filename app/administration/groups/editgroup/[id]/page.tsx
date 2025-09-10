"use client";

import React, { useState, ChangeEvent, useEffect } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import CheckboxField from "@/components/InputFields/checkboxinput";
import TextareaField from "@/components/InputFields/textareainput";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface GroupFormData {
  groupId: string;
  groupName: string;
  components: string[];
  description: string;
}

export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  const [formData, setFormData] = useState<GroupFormData>({
    groupId: "",
    groupName: "",
    components: [],
    description: "",
  });

  const [loading, setLoading] = useState(false);

  const componentOptions = [
    "Manager",
    "Right",
    "Left",
    "Direct Partners",
    "None",
  ];

  // Fetch group data on mount
  useEffect(() => {
    if (!groupId) return;
    const fetchGroup = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/groups-operations?group_id=${groupId}`
        );
        if (data?.data) {
          setFormData({
            groupId: data.data.group_id,
            groupName: data.data.group_name,
            components: data.data.roles || [],
            description: data.data.description || "",
          });
        }
      } catch (error) {
        console.error("Error fetching group:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // console.log(groupId)
      const payload = {
        // group_id: formData.groupId,
        group_name: formData.groupName,
        roles: formData.components,
        description: formData.description,
        last_modified_by: "admin", // you can set dynamically
      };

      await axios.patch(`/api/groups-operations?group_id=${groupId}`, payload);
      ShowToast.success("Group updated successfully!");

      router.push("/administration/groups");
    } catch (error) {
      console.error("Error updating group:", error);
      ShowToast.error("Failed to update Group.");
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
            onClick={() => router.push("/administration/groups")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">
            Edit Group
          </h2>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-6 bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Group ID"
                name="groupId"
                type="text"
                value={formData.groupId}
                // onChange={handleInputChange}
                readOnly
                disabled
              />
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
