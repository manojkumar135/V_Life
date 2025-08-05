"use client";

import React, { useState, ChangeEvent } from "react";
import Layout from "@/layout/Layout";
import { IoArrowBackOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import InputField from "@/components/common/inputtype1";
import Button from "@/components/common/submitbutton";

export default function AddNewUserForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    userId: "US000003",
    fullName: "User Name",
    email: "123@gmail.com",
    contact: "1234567890",
    address: "India",
    city: "none",
    state: "AN",
    country: "India",
    pincode: "123456",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    console.log("Submitted Form Data:", formData);
    // Add API call or logic here
  };

  return (
    <Layout>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-0">
          <IoArrowBackOutline
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/administration/users")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">Add New User</h2>
        </div>

        {/* Form */}
        <div className="rounded-xl p-6 max-sm:p-3 bg-white space-y-4">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <InputField
              label="User ID"
              name="userId"
              value={formData.userId}
              onChange={handleChange}
            />
            <InputField
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
            <InputField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
            <InputField
              label="Contact"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
            />
            <InputField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
            <InputField
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
            />
            <InputField
              label="State"
              name="state"
              value={formData.state}
              onChange={handleChange}
            />
            <InputField
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleChange}
            />
            <InputField
              label="Pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <Button type="button" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
