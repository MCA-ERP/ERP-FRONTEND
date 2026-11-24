"use client";

import { useEffect } from "react";

/** Keeps the sidebar following the page: when the address changes (a Quick action, a recent page, a link), the sidebar scrolls so the open module's current link is in view. */
export function useScrollActive(pathname: string, search = "") {
  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.querySelector('aside nav [aria-current="page"]') ?? document.querySelector('aside nav [aria-expanded="true"]');
      el?.scrollIntoView({ block: "nearest" });
    }, 60);
    return () => clearTimeout(t);
  }, [pathname, search]);
}
