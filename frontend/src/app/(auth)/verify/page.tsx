"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "shared/stores/authStore";
import { authHelper } from "shared/lib/auth";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const method = searchParams.get("method");
  const identifier = searchParams.get("identifier");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint =
        method === "email"
          ? "/api/v1/auth/verify/email"
          : "/api/v1/auth/verify/phone";

      const body =
        method === "email"
          ? { email: identifier, code }
          : { phone: identifier, otp: code };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      // Store auth data
      await authHelper.setToken(data.access_token);
      await authHelper.setUser(data.user);
      setAuth(data.user, data.access_token);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendCooldown(60);
    // TODO: Implement resend logic
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Verify Your Account</h1>
          <p className="mt-2 text-muted-foreground">
            Enter the {method === "email" ? "6-digit code" : "OTP"} sent to
          </p>
          <p className="font-medium">{identifier}</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-1">
              {method === "email" ? "Verification Code" : "OTP"}
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              maxLength={6}
              className="w-full px-3 py-2 border rounded-md text-center text-2xl tracking-widest"
              placeholder="000000"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
            {loading ? "Verifying..." : "Verify"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="w-full"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
          </Button>
        </form>
      </div>
    </div>
  );
}
