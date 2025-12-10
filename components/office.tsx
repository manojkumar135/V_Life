"use client";

import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import InputField from "@/components/InputFields/inputtype1";
import SelectField from "@/components/InputFields/selectinput";
import SubmitButton from "@/components/common/submitbutton";
import Loader from "@/components/common/loader";
import ShowToast from "@/components/common/Toast/toast";
import { useVLife } from "@/store/context";
import { useRouter } from "next/navigation";
import { toTitleCase } from "@/utils/convertString";

const validationSchema = Yup.object({
  officeName: Yup.string().required("Required"),
  officeStreet: Yup.string().required("Required"),
  officeLandmark: Yup.string().optional(),
  officePincode: Yup.string()
    .matches(/^[0-9]{6}$/, "Enter valid 6 digit pincode")
    .required("Required"),
  officeEmail: Yup.string().email("Invalid email").optional(),
  officeContact: Yup.string()
    .matches(/^[0-9]{10}$/, "Contact must be 10 digits")
    .optional(),
  officeGstNumber: Yup.string().optional(),
  officeTimings: Yup.string().optional(),
});

export default function OfficeAddress() {
  const { user } = useVLife();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [postOfficeData, setPostOfficeData] = useState<any[]>([]);

  // 🔐 Only Admin can see this
  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") {
      router.push("/settings");
    }
  }, [user, router]);

  const formik = useFormik({
    initialValues: {
      officeName: "",
      officeStreet: "",
      officeLandmark: "",
      officePincode: "",
      officeCountry: "",
      officeState: "",
      officeCity: "",
      officeLocality: "",
      officeGstNumber: "",
      officeEmail: "",
      officeContact: "",
      officeTimings: "",
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: () => {},
  });

  // 🔄 Load existing office data on mount
  useEffect(() => {
    const fetchOffice = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/office-operations");
        if (res.data.success && res.data.data) {
          const o = res.data.data;

          formik.setValues({
            officeName: o.office_name || "",
            officeStreet: o.office_street || "",
            officeLandmark: o.office_landmark || "",
            officePincode: o.office_pincode || "",
            officeCountry: o.office_country || "",
            officeState: o.office_state || "",
            officeCity: o.office_city || "",
            officeLocality: o.office_locality || "",
            officeGstNumber: o.office_gst_number || "",
            officeEmail: o.office_email || "",
            officeContact: o.office_contact || "",
            officeTimings: o.office_timings || "",
          });

          if (o.office_pincode) {
            setPostOfficeData(
              o.office_locality ? [{ Name: o.office_locality }] : []
            );
          }
        }
      } catch (err) {
        console.error("Error fetching office:", err);
        ShowToast.error("Failed to load office address");
      } finally {
        setLoading(false);
      }
    };

    fetchOffice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 📍 Auto fill address from pincode
  useEffect(() => {
    const pincode = formik.values.officePincode;

    if (!/^\d{6}$/.test(pincode)) {
      resetLocation();
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `/api/location-by-pincode?pincode=${pincode}`
        );
        if (res.data.success) {
          const { city, state, country, postOffices } = res.data.data;
          formik.setFieldValue("officeCity", city);
          formik.setFieldValue("officeState", state);
          formik.setFieldValue("officeCountry", country);
          setPostOfficeData(postOffices);
          formik.setFieldValue(
            "officeLocality",
            postOffices.length ? postOffices[0].Name : ""
          );
        } else {
          resetLocation();
        }
      } catch (err) {
        console.error("Error fetching location:", err);
        resetLocation();
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.officePincode]);

  const resetLocation = () => {
    setPostOfficeData([]);
    formik.setFieldValue("officeCity", "");
    formik.setFieldValue("officeState", "");
    formik.setFieldValue("officeCountry", "");
    formik.setFieldValue("officeLocality", "");
  };

  const localityOptions = postOfficeData.map((p) => ({
    label: p.Name,
    value: p.Name,
  }));

  const handleSaveOffice = async () => {
    const isValid = await formik.validateForm();
    if (Object.keys(isValid).length > 0) {
      formik.setTouched(
        Object.keys(formik.values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        )
      );
      ShowToast.error("Please fix validation errors");
      return;
    }

    try {
      setLoading(true);

      const v = formik.values;

      const payload = {
        office_name: toTitleCase(v.officeName),
        office_street: toTitleCase(v.officeStreet),
        office_landmark: toTitleCase(v.officeLandmark),
        office_pincode: v.officePincode,
        office_country: v.officeCountry,
        office_state: v.officeState,
        office_city: v.officeCity,
        office_locality: v.officeLocality,
        office_gst_number: v.officeGstNumber,
        office_email: v.officeEmail,
        office_contact: v.officeContact,
        office_timings: v.officeTimings,
      };

      const res = await axios.patch("/api/office-operations", payload);

      if (res.data.success) {
        ShowToast.success("Office address saved");
      } else {
        ShowToast.error(res.data.message || "Failed to save office address");
      }
    } catch (err) {
      console.error("Error saving office:", err);
      ShowToast.error("Failed to save office address");
    } finally {
      setLoading(false);
    }
  };

  // If not admin, don't render anything (redirect runs in useEffect)
  if (!user || user.role !== "admin") return null;

  return (
    <div className="space-y-10">
      {loading && (
        <div className="h-full w-full fixed inset-0 z-50 bg-black/40 flex items-center justify-center backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="px-3 max-md:px-0">
        <p className="text-lg font-semibold mb-3">OFFICE ADDRESS</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-md:gap-4">
          {/* Basic Office Info */}
          <InputField
            label="Office Name"
            {...formik.getFieldProps("officeName")}
            error={formik.touched.officeName ? formik.errors.officeName : ""}
          />

          <InputField
            label="Office Email"
            {...formik.getFieldProps("officeEmail")}
            type="email"
            error={formik.touched.officeEmail ? formik.errors.officeEmail : ""}
          />

          <InputField
            label="Office Contact"
            {...formik.getFieldProps("officeContact")}
            maxLength={10}
            error={
              formik.touched.officeContact ? formik.errors.officeContact : ""
            }
          />

          <InputField
            label="GST Number"
            {...formik.getFieldProps("officeGstNumber")}
            error={
              formik.touched.officeGstNumber
                ? formik.errors.officeGstNumber
                : ""
            }
          />

          {/* Address */}
          <InputField
            label="D.No & Street"
            {...formik.getFieldProps("officeStreet")}
            error={
              formik.touched.officeStreet ? formik.errors.officeStreet : ""
            }
          />

          <InputField
            label="Landmark"
            {...formik.getFieldProps("officeLandmark")}
            error={
              formik.touched.officeLandmark ? formik.errors.officeLandmark : ""
            }
          />

          <InputField
            label="Pincode"
            {...formik.getFieldProps("officePincode")}
            error={
              formik.touched.officePincode ? formik.errors.officePincode : ""
            }
          />

          <InputField
            label="Country"
            disabled
            value={formik.values.officeCountry}
          />

          <InputField
            label="State"
            disabled
            value={formik.values.officeState}
          />

          <InputField
            label="District"
            disabled
            value={formik.values.officeCity}
          />

          <SelectField
            label="Locality"
            options={localityOptions}
            value={formik.values.officeLocality}
            disabled={!postOfficeData.length}
            onChange={(e: any) =>
              formik.setFieldValue(
                "officeLocality",
                e.target?.value || e.value
              )
            }
          />

          <InputField
            label="Office Timings"
            placeholder="e.g. 10:00 AM - 7:00 PM"
            {...formik.getFieldProps("officeTimings")}
            error={
              formik.touched.officeTimings ? formik.errors.officeTimings : ""
            }
          />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton type="button" onClick={handleSaveOffice} disabled={loading}>
          Update Address
        </SubmitButton>
      </div>
    </div>
  );
}
