// src/app/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AppClient } from "@/components/AppClient"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
  <AppClient 
    user={{ 
      id: session.user.id || "", 
      name: session.user.name || "Пользователь", 
      email: session.user.email || "" 
    }} 
  />
)
}
