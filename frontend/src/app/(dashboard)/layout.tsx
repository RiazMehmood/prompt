"use client";

import { useAuthStore } from "shared/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50 p-4">
        <div className="mb-8">
          <h2 className="text-xl font-bold">Domain-Adaptive</h2>
          <p className="text-sm text-muted-foreground">Lawyer Portal</p>
        </div>

        <nav className="space-y-2">
          <a
            href="/dashboard"
            className="block rounded-md px-3 py-2 hover:bg-gray-100"
          >
            Home
          </a>
          <a
            href="/dashboard/chat"
            className="block rounded-md px-3 py-2 hover:bg-gray-100"
          >
            Chat
          </a>
          <a
            href="/dashboard/documents"
            className="block rounded-md px-3 py-2 hover:bg-gray-100"
          >
            Documents
          </a>
        </nav>

        <div className="mt-8 rounded-md bg-blue-50 p-3">
          <p className="text-sm font-medium">Trial Account</p>
          <p className="text-xs text-muted-foreground">14 days remaining</p>
          <p className="text-xs text-muted-foreground">10 documents left</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {/* Header */}
        <header className="border-b bg-white p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm">{user?.full_name}</span>
              <button className="text-sm text-muted-foreground hover:text-foreground">
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
