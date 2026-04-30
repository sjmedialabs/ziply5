import { Suspense } from "react";
import AuthLoginCard from "@/components/AuthLoginCard";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthLoginCard title="ADMIN LOGIN" portal="admin" backLinkHref="/" />
    </Suspense>
  );
}
