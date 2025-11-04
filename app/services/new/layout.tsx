import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/user-helpers";

export default async function NewServiceRequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers();
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { user } = await getOrCreateUser(userId);

  if (!user) {
    redirect("/sign-in");
  }

  // Redirect to verification page if not verified
  if (!user.verified) {
    redirect("/dashboard/verify?redirect=/services/new");
  }

  return <>{children}</>;
}

