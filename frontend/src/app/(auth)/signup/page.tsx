"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmailSignup } from "@/components/auth/EmailSignup";
import { PhoneSignup } from "@/components/auth/PhoneSignup";
import { GoogleOAuth } from "@/components/auth/GoogleOAuth";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "phone" | "google" | null>(null);
  const [signupData, setSignupData] = useState<any>(null);

  const handleSuccess = (data: any) => {
    setSignupData(data);
    router.push(`/verify?method=${data.method}&identifier=${data.email || data.phone}`);
  };

  if (!method) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Create Account</h1>
            <p className="mt-2 text-muted-foreground">Choose your signup method</p>
          </div>

          <div className="space-y-3">
            <Button variant="outline" onClick={() => setMethod("email")} className="w-full">
              Sign up with Email
            </Button>

            <Button variant="outline" onClick={() => setMethod("phone")} className="w-full">
              Sign up with Phone
            </Button>

            <Button variant="outline" onClick={() => setMethod("google")} className="w-full">
              Sign up with Google
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline">
              Log in
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="mt-2 text-muted-foreground">
            {method === "email" && "Sign up with email"}
            {method === "phone" && "Sign up with phone"}
            {method === "google" && "Sign up with Google"}
          </p>
        </div>

        {method === "email" && <EmailSignup onSuccess={handleSuccess} />}
        {method === "phone" && <PhoneSignup onSuccess={handleSuccess} />}
        {method === "google" && <GoogleOAuth onSuccess={handleSuccess} />}

        <Button variant="ghost" onClick={() => setMethod(null)} className="w-full">
          Back to options
        </Button>
      </div>
    </div>
  );
}
