import { notFound, redirect } from "next/navigation";
import { MENU, sectionHref } from "../p/menu-config";

/** /principal/<module> opens the module's first submenu. */
export default async function ModuleHome({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const mod = MENU[module];
  if (!mod) notFound();
  redirect(sectionHref(module, mod.sections[0].key));
}
