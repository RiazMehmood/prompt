"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PhoneSignupProps {
  onSuccess: (data: any) => void;
}

export function PhoneSignup({ onSuccess }: PhoneSignupProps) {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");

    // Format as +92-3XX-XXXXXXX
    if (digits.startsWith("92")) {
      const formatted = digits.slice(2);
      if (formatted.length <= 3) {
        return `+92-${formatted}`;
      } else if (formatted.length <= 10) {
        return `+92-${formatted.slice(0, 3)}-${formatted.slice(3)}`;
      }
      return `+92-${formatted.slice(0, 3)}-${formatted.slice(3, 10)}`;
    }

    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/signup/phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          full_name: fullName,
          role_id: "lawyer",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      onSuccess({ phone, method: "phone" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium mb-1">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Ahmed Khan"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1">
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          required
          className="w-full px-3 py-2 border rounded-md"
          placeholder="+92-3XX-XXXXXXX"
        />
        <p className="text-xs text-muted-foreground mt-1">Pakistani mobile number</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Sending OTP..." : "Sign Up with Phone"}
      </Button>
    </form>
  );
}
