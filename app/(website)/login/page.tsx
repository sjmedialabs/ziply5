import { Suspense } from "react";
import AuthLoginCard from "@/components/AuthLoginCard";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthLoginCard title="LOGIN" portal="website" />
    </Suspense>
  );
}
