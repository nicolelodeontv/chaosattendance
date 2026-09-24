export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">CHAOS Attendance</p>
        <h1 className="mt-2 text-2xl font-semibold">We couldn’t sign you in</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Discord sign-in could not be completed. Please try again. If the problem
          continues, contact an officer for help.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to sign in
        </a>
      </div>
    </main>
  );
}
