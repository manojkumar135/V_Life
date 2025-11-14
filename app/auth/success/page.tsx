import { Suspense } from "react";
import RegistrationSuccess from "@/app/auth/register/RegistrationSuccess";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegistrationSuccess />
    </Suspense>
  );
}
