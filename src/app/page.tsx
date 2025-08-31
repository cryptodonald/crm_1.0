import { redirect } from "next/navigation"

export default function HomePage() {
  // Redirect root URL to dashboard
  redirect("/dashboard")
}
