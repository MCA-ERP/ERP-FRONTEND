"use client";

import { useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { PageHeader } from "@/components/admin/ui";
import { BannersTab } from "./banners";
import { BlogTab } from "./blog";
import { FaqTab } from "./faq";
import { PagesTab } from "./pages";
import { SeoTab } from "./seo";
import { TestimonialsTab } from "./testimonials";

type Tab = "pages" | "banners" | "blog" | "testimonials" | "faq" | "seo";

export default function WebsitePage({ initialTab, embedded }: { initialTab?: Tab; embedded?: boolean } = {}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "pages");
  return (
    <>
      <PageHeader title="Website" subtitle="Pages, banners, blog, testimonials, FAQ and search settings for the public site. Only published content is served." />
      {!embedded && (<TabBar value={tab} onChange={setTab} tabs={[["pages", "Pages"], ["banners", "Banners"], ["blog", "Blog"], ["testimonials", "Testimonials"], ["faq", "FAQ"], ["seo", "SEO"]]} />)}
      {tab === "pages" && <PagesTab />}
      {tab === "banners" && <BannersTab />}
      {tab === "blog" && <BlogTab />}
      {tab === "testimonials" && <TestimonialsTab />}
      {tab === "faq" && <FaqTab />}
      {tab === "seo" && <SeoTab />}
      <p className="mt-4 text-xs text-slate-400">
        Your website reads published content from <code className="rounded bg-slate-100 px-1">/api/v1/public/cms/&#123;page, blog, blog_category, banner, testimonial, faq&#125;</code>.
      </p>
    </>
  );
}
