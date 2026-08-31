import { redirect } from "next/navigation";

/** Settings opens on the plainest facts about the business. */
export default function SettingsIndex() {
  redirect("/admin/settings/business");
}
