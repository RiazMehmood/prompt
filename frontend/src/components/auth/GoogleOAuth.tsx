"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface GoogleOAuthProps {
  onSuccess: (data: any) => void;
}

export function GoogleOAuth({ onSuccess }: GoogleOAuthProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      // TODO: Integrate with Google OAuth SDK
      // For now, this is a placeholder
      setError("Google OAuth integration pending");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full"
      >
        {loading ? "Signing in..." : "Continue with Google"}
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
