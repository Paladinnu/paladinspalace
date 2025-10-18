export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {children}
    </div>
  );
}
