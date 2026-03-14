"use client";

import { ChatInterface } from "@/components/chat/ChatInterface";

export default function DashboardPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h2 className="text-3xl font-bold">Legal Assistant</h2>
        <p className="text-muted-foreground">
          Ask questions about Pakistani law and get AI-powered answers
        </p>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border">
        <ChatInterface />
      </div>
    </div>
  );
}
