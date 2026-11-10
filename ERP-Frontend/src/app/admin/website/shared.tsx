"use client";

import type { ReactNode } from "react";
import { adminFetch, json, type CmsItem, type CmsType } from "@/lib/admin-api";
import { useAction } from "@/components/admin/dash";
import { Badge, useLoad } from "@/components/admin/ui";

export { Pills } from "@/components/admin/pills";

/** Loads the items of one content type, with an action runner that reloads afterwards. */
export function useItems(type: CmsType) {
  const list = useLoad(() => adminFetch<{ items: CmsItem[] }>(`/cms/${type}`), [type]);
  const action = useAction(list.reload);
  return { items: list.data?.items ?? [], loading: list.loading, error: list.error || action.error, busy: action.busy, run: action.run, reload: list.reload };
}

export interface ItemPayload {
  title: string;
  slug?: string;
  body?: string;
  data?: Record<string, unknown>;
  status?: CmsItem["status"];
  sort_order?: number;
  starts_at?: string | null;
  ends_at?: string | null;
}

export const createItem = (type: CmsType, payload: ItemPayload) => adminFetch(`/cms/${type}`, json("POST", payload));
export const updateItem = (id: string, payload: Partial<ItemPayload>) => adminFetch(`/cms/items/${id}`, json("PATCH", payload));
export const deleteItem = (id: string) => adminFetch(`/cms/items/${id}`, { method: "DELETE" });

/** <input type="date"> value to the start or end of that day, and back. */
export const dayStart = (d: string) => (d ? new Date(d + "T00:00:00").toISOString() : null);
export const dayEnd = (d: string) => (d ? new Date(d + "T23:59:59").toISOString() : null);
export const toDay = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export function StatusBadge({ status }: { status: CmsItem["status"] }) {
  return status === "published" ? <Badge tone="green">Published</Badge> : status === "archived" ? <Badge tone="gray">Archived</Badge> : <Badge tone="blue">Draft</Badge>;
}

export const dataText = (i: CmsItem, key: string) => (typeof i.data?.[key] === "string" ? (i.data[key] as string) : "");

export function Empty({ loading, children }: { loading: boolean; children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-slate-400">{loading ? "Loading…" : children}</p>;
}

export const small = "!px-2.5 !py-1 text-xs";
