"use client";
import { useState, useRef, ReactNode } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Image from "next/image";
import { IoArrowBackOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import ShowToast from "@/components/common/Toast/toast";
import Images from "@/constant/Image";
import InputField from "@/components/common/inputtype1";
import axios from "axios";
import SubmitButton from "@/components/common/submitbutton";
import Loader from "@/components/common/loader";
import PasswordInput from "@/components/common/passwordinput";

// Define TypeScript interfaces
interface OTPInputProps {
  otp: string[];
  setOtp: (otp: string[]) => void;
  length?: number;
  onChangeOTP: (otp: string) => void;
}

interface ForgotPasswordFormValues {
  email: string;
}

interface NewPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

// OTP Input Component
const OTPInput: React.FC<OTPInputProps> = ({
  otp,
  setOtp,
  length = 6,
  onChangeOTP,
}) => {
  const inputRefs = useRef<HTMLInputElement[]>([]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;
    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    if (element.nextSibling && element.value) {
      const nextInput = element.nextSibling as HTMLInputElement;
      nextInput.focus();
    }
    onChangeOTP(newOtp.join(""));
  };

  const handleBackspace = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === "Backspace") {
      if (otp[index] === "") {
        if (index > 0 && inputRefs.current[index - 1]) {
          inputRefs.current[index - 1].focus();
        }
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
        onChangeOTP(newOtp.join(""));
      }
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  return (
    <div className="flex justify-center gap-3 my-6">
      {otp.map((value, index) => (
        <input
          key={index}
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(e.target as HTMLInputElement, index)}
          onKeyDown={(e) => {
            handleBackspace(e, index);
            handleKeyDown(e, index);
          }}
          ref={(el) => {
            if (el) inputRefs.current[index] = el;
          }}
          className="w-8 h-8 text-center text-lg font-medium border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
        />
      ))}
    </div>
  );
};

// Main Forgot Password Component
const ForgotPassword: React.FC = () => {
  const router = useRouter();

  const [step, setStep] = useState<number>(1);
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  const startCountdown = () => {
    setCountdown(120);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const emailValidation = Yup.object({
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required!"),
  });

  const passwordValidation = Yup.object({
    newPassword: Yup.string()
      .required("New password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("newPassword")], "Passwords must match")
      .required("Confirm new password is required"),
  });

  const emailFormik = useFormik({
    initialValues: { email: "" },
    validationSchema: emailValidation,
    onSubmit: async (values: ForgotPasswordFormValues, { setSubmitting }) => {
      setLoading(true);
      try {
        // API call to send OTP using Axios
        console.log(values.email, "getting mail");
        const response = await axios.post("/api/sendOTP", {
          email: values.email,
        });

        const data = response.data;
        // console.log(response);

        if (data.success) {
          setEmail(values.email);
          setStep(2);
          startCountdown();
          ShowToast.success("OTP sent successfully!");
        } else {
          // Show specific error message from backend
          ShowToast.error(data.message || "Failed to send OTP. Try again.");
        }
      } catch (error: any) {
        // Handle axios error
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          ShowToast.error(
            error.response.data.message || "Failed to send OTP. Try again."
          );
        } else if (error.request) {
          // The request was made but no response was received
          ShowToast.error("Network error. Please check your connection.");
        } else {
          // Something happened in setting up the request that triggered an Error
          ShowToast.error("Failed to send OTP. Try again.");
        }
      } finally {
        setLoading(false);
        setSubmitting(false);
      }
    },
  });

  // OTP verification handler with Axios
  const verifyOTP = async () => {
    setLoading(true);
    try {
      // API call to verify OTP using Axios
      const response = await axios.post("/api/verifyOTP", {
        email,
        otp: otp.join(""),
      });

      const data = response.data;

      if (data.success) {
        setStep(3);
        ShowToast.success("OTP verified successfully!");
      } else {
        ShowToast.error(data.message || "Invalid OTP. Please try again.");
      }
    } catch (error: any) {
      // Handle axios error
      if (error.response) {
        ShowToast.error(
          error.response.data.message || "Failed to verify OTP. Try again."
        );
      } else if (error.request) {
        ShowToast.error("Network error. Please check your connection.");
      } else {
        ShowToast.error("Failed to verify OTP. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler with Axios
  const resendOTP = async () => {
    setLoading(true);
    try {
      // API call to resend OTP using Axios
      const response = await axios.post("/api/sendOTP", {
        email,
      });

      const data = response.data;

      if (data.success) {
        setOtp(new Array(6).fill(""));
        startCountdown();
        ShowToast.success("OTP resent successfully!");
      } else {
        ShowToast.error(data.message || "Failed to resend OTP. Try again.");
      }
    } catch (error: any) {
      // Handle axios error
      if (error.response) {
        ShowToast.error(
          error.response.data.message || "Failed to resend OTP. Try again."
        );
      } else if (error.request) {
        ShowToast.error("Network error. Please check your connection.");
      } else {
        ShowToast.error("Failed to resend OTP. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordFormik = useFormik({
    initialValues: { newPassword: "", confirmPassword: "" },
    validationSchema: passwordValidation,
    onSubmit: async (values: NewPasswordFormValues, { setSubmitting }) => {
      setLoading(true);
      try {
        // API call to reset password using Axios
        const response = await axios.post("/api/resetpassword", {
          email,
          newPassword: values.newPassword,
        });

        const data = response.data;

        if (data.success) {
          ShowToast.success("Password reset successfully!");
          router.push("/auth/login");
        } else {
          ShowToast.error(
            data.message || "Failed to reset password. Try again."
          );
        }
      } catch (error: any) {
        // Handle axios error
        if (error.response) {
          ShowToast.error(
            error.response.data.message ||
              "Failed to reset password. Try again."
          );
        } else if (error.request) {
          ShowToast.error("Network error. Please check your connection.");
        } else {
          ShowToast.error("Failed to reset password. Try again.");
        }
      } finally {
        setLoading(false);
        setSubmitting(false);
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
      <div className="flex items-center mb-0 mt-5  ml-5 ">
        <IoArrowBackOutline
          title="Back To Login"
          size={35}
          className="mr-3 cursor-pointer top-0 "
          onClick={() => router.push("/auth/login")}
        />
      </div>
      <div className="min-h-[85dvh] flex flex-col xl:flex-row items-center justify-center bg-white p-4 md:p-6">
        {/* ✅ Image at top for mobile/tab, left for desktop */}

        {/* ✅ Form at bottom for mobile/tab, right for desktop */}
        <div className="w-full xl:w-3/5 flex flex-col items-center justify-center order-2 xl:order-1">
          <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-lg shadow-none xl:shadow-md max-lg:border-0 xl:border-1 border-gray-200">
            <p className="text-xl md:text-2xl font-bold mb-6 text-gray-800 text-center">
              {step === 1
                ? "Forgot Password"
                : step === 2
                ? "Verify OTP"
                : "Set New Password"}
            </p>

            {/* Step 1: Email */}
            {step === 1 && (
              <form onSubmit={emailFormik.handleSubmit}>
                <div className="mb-5">
                  <InputField
                    label="Email"
                    name="email"
                    type="email"
                    value={emailFormik.values.email}
                    onChange={emailFormik.handleChange}
                    onBlur={emailFormik.handleBlur}
                    placeholder="Enter your email"
                    error={
                      emailFormik.touched.email
                        ? emailFormik.errors.email
                        : undefined
                    }
                    required
                  />
                </div>

                <div className="flex justify-center">
                  <SubmitButton
                    type="submit"
                    disabled={emailFormik.isSubmitting || loading}
                    className="w-[95%]"
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </SubmitButton>
                </div>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 2 && (
              <div>
                <p className="text-center text-gray-700 mb-6">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-semibold">{email}</span>
                </p>
                <OTPInput
                  otp={otp}
                  setOtp={setOtp}
                  length={6}
                  onChangeOTP={() => {}}
                />
                <div className="flex flex-col gap-4">
                  <div className="flex justify-center">
                    <SubmitButton
                      onClick={verifyOTP}
                      disabled={loading || otp.join("").length !== 6}
                    >
                      {loading ? "Verifying..." : "Verify OTP"}
                    </SubmitButton>
                  </div>
                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-gray-600">
                        Resend OTP in{" "}
                        <span className="font-medium">
                          {formatTime(countdown)}
                        </span>{" "}
                        seconds
                      </p>
                    ) : (
                      <button
                        onClick={resendOTP}
                        disabled={loading}
                        className="text-yellow-600 hover:text-yellow-700 font-medium disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form onSubmit={passwordFormik.handleSubmit}>
                <PasswordInput
                  label="New Password"
                  name="newPassword"
                  value={passwordFormik.values.newPassword}
                  onChange={passwordFormik.handleChange}
                  onBlur={passwordFormik.handleBlur}
                  required
                  placeholder="Enter new password"
                  error={
                    passwordFormik.touched.newPassword
                      ? passwordFormik.errors.newPassword
                      : ""
                  }
                  className="focus:ring-2 focus:ring-blue-500"
                  labelClassName="text-gray-700 mb-2"
                  errorClassName="text-red-600 text-sm mt-2"
                  containerClassName="mb-4"
                />

                <PasswordInput
                  label="Confirm New Password"
                  name="confirmPassword"
                  value={passwordFormik.values.confirmPassword}
                  onChange={passwordFormik.handleChange}
                  onBlur={passwordFormik.handleBlur}
                  required
                  placeholder="Confirm new password"
                  error={
                    passwordFormik.touched.confirmPassword
                      ? passwordFormik.errors.confirmPassword
                      : ""
                  }
                  className="focus:ring-2 focus:ring-blue-500"
                  labelClassName="text-gray-700 mb-2"
                  errorClassName="text-red-600 text-sm mt-2"
                  containerClassName="mb-6"
                />

                <div className="flex justify-center">
                  <SubmitButton
                    type="submit"
                    disabled={passwordFormik.isSubmitting || loading}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </SubmitButton>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="w-full xl:w-2/5 flex justify-center items-center xl:justify-start order-1 xl:order-2 -mt-30 xl:mt-0">
          <div className="relative w-full max-w-md h-45 md:h-96  ml-0 xl:!-ml-10">
            <Image
              src={Images.ForgotPhoto}
              alt="Forgot Password Illustration"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
