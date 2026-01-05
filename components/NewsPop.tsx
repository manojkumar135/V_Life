"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useFormik } from "formik";
import * as Yup from "yup";
import ShowToast from "@/components/common/Toast/toast";
import SubmitButton from "@/components/common/submitbutton";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";

const schema = Yup.object({
  news_text: Yup.string().required("News text is required"),
  popup_image: Yup.string().url("Invalid image URL"),
  popup_enabled: Yup.boolean(),
});

export default function NewsPopupSettings() {
  const { user } = useVLife();
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      news_text: "",
      popup_image: "",
      popup_enabled: true,
    },
    validationSchema: schema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await axios.put("/api/newpop-operations", {
          ...values,
          updated_by: user?.user_id,
        });
        ShowToast.success("Settings saved");
      } catch {
        ShowToast.error("Save failed");
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/newpop-operations");
        if (res.data?.data) {
          formik.setValues({
            news_text: res.data.data.news_text || "",
            popup_image: res.data.data.popup_image || "",
            popup_enabled: res.data.data.popup_enabled ?? true,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (!user || user.role !== "admin") return null;

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4 max-w-full -mt-3">
   {loading && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
             <Loader />
           </div>
         )}

      {/* News text */}
      <textarea
        rows={5}
        className="w-full border rounded p-2"
        placeholder="Enter news (each line will be a ticker item)"
        {...formik.getFieldProps("news_text")}
      />
      {formik.touched.news_text && formik.errors.news_text && (
        <p className="text-sm text-red-500">{formik.errors.news_text}</p>
      )}

      {/* Popup image */}
      <input
        type="text"
        className="w-full border rounded p-2"
        placeholder="Popup image URL"
        {...formik.getFieldProps("popup_image")}
      />
      {formik.touched.popup_image && formik.errors.popup_image && (
        <p className="text-sm text-red-500">{formik.errors.popup_image}</p>
      )}

      {/* Toggle */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={formik.values.popup_enabled}
          onChange={(e) =>
            formik.setFieldValue("popup_enabled", e.target.checked)
          }
        />
        Enable login popup
      </label>

      {/* Submit */}
      <div className="flex justify-end">
        <SubmitButton type="submit" disabled={loading}>
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
