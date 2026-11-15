import { redirect } from "next/navigation";

// User Management lives in the shared menu; its first submenu opens by default.
export default function UsersPage() {
  redirect("/super-admin/users/platform");
}
