"use client";

import { createContext, useContext } from "react";

/** Lets a page send the person to another tab of the same submenu (after saving a form, for example). */
export const TabContext = createContext<(tab: string) => void>(() => undefined);
export const useGoTab = () => useContext(TabContext);
