import data from "./menu.json";

/**
 * The Super Admin menu: every module, its submenus (sidebar links) and the pages inside each one (tabs).
 * The list lives in menu.json so the site config can read it too. Lightweight on purpose: the sidebar imports this file.
 */
export interface MenuPage { key: string; title: string; description: string }
export interface MenuSection { key: string; label: string; pages: MenuPage[] }
export interface MenuModule { label: string; area: string; sections: MenuSection[] }

export const MENU = data as Record<string, MenuModule>;

/** The address of a submenu. The site config rewrites it to the shared section page, so the address stays short. */
export const sectionHref = (module: string, section: string) => `/super-admin/${module}/${section}`;
