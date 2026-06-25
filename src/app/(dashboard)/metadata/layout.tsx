import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function MetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "manager" && role !== "boss") {
    redirect("/dashboard"); // Unauthorized
  }

  return (
    <div className="flex h-full flex-col">
      {children}
    </div>
  );
}
