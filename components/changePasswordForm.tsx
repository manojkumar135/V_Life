"use client";
import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import SubmitButton from "@/components/common/submitbutton";
import PasswordInput from "@/components/common/passwordinput";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";

const validationSchema = Yup.object({
  oldPassword: Yup.string().required("Old password is required"),
  newPassword: Yup.string()
    .required("New password is required")
    .min(6, "Password must be at least 6 characters"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords must match")
    .required("Confirm new password is required"),
});

interface ChangePasswordFormProps {
  onSuccess?: () => void; // ✅ callback to close accordion
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      setLoading(true);
      try {
        const res = await axios.post(
          "/api/changepassword",
          {
            oldPassword: values.oldPassword,
            newPassword: values.newPassword,
          },
          { withCredentials: true }
        );

        if (res.data.success) {
          ShowToast.success("Password changed successfully!");
          resetForm();
          if (onSuccess) onSuccess(); // ✅ close accordion
        } else {
          ShowToast.error(res.data.message || "Something went wrong.");
        }
      } catch (err: any) {
        console.error(err);

        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to change password.";

        ShowToast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <form
        onSubmit={formik.handleSubmit}
        className="max-w-md mx-auto space-y-6 bg-white p-4 rounded-lg shadow-none -mt-5"
      >
        {/* Old Password */}
        <PasswordInput
          label="Old Password"
          name="oldPassword"
          value={formik.values.oldPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          required
          error={formik.touched.oldPassword ? formik.errors.oldPassword : ""}
          className="focus:ring-2 focus:ring-blue-500"
          labelClassName="text-blue-700"
          errorClassName="text-xs font-medium"
          containerClassName="mb-4"
        />

        {/* New Password */}
        <PasswordInput
          label="New Password"
          name="newPassword"
          value={formik.values.newPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          required
          error={formik.touched.newPassword ? formik.errors.newPassword : ""}
          className="focus:ring-2 focus:ring-blue-500"
          labelClassName="text-blue-700"
          errorClassName="text-xs font-medium"
          containerClassName="mb-4"
        />

        {/* Confirm Password */}
        <PasswordInput
          label="Confirm New Password"
          name="confirmPassword"
          value={formik.values.confirmPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          required
          error={
            formik.touched.confirmPassword ? formik.errors.confirmPassword : ""
          }
          className="focus:ring-2 focus:ring-blue-500"
          labelClassName="text-blue-700"
          errorClassName="text-xs font-medium"
          containerClassName="mb-4"
        />

        {/* Button */}
        <div className="flex justify-center mt-8">
          <SubmitButton type="submit" disabled={formik.isSubmitting || loading}>
            {formik.isSubmitting || loading ? "Changing..." : "Change Password"}
          </SubmitButton>
        </div>
      </form>
    </>
  );
};

export default ChangePasswordForm;
