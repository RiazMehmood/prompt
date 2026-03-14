export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Welcome to Your Dashboard</h2>
        <p className="text-muted-foreground">
          Start by asking a legal question or generating a document
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Chat with AI</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask legal questions and get AI-powered answers with citations
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Generate Documents</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create bail applications and other legal documents
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Document Library</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your generated documents and legal resources
          </p>
        </div>
      </div>
    </div>
  );
}
