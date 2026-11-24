/**
 * The Applicant portal menu: each module is a sidebar item, its sections are the links under it and the pages inside a
 * section are its tabs. Groups follow the design: OVERVIEW, APPLY and ADMISSION.
 */
export interface MenuPage { key: string; title: string }
export interface MenuSection { key: string; label: string; pages: MenuPage[] }
export interface MenuModule { label: string; group: string; sections: MenuSection[] }

export const MENU: Record<string, MenuModule> = {
  dashboard: { label: "Dashboard", group: "Overview", sections: [{ key: "application-status", label: "Application Status", pages: [{ key: "my-application", title: "My Application" }, { key: "notifications", title: "Notifications" }] }] },
  school: { label: "About the School", group: "Overview", sections: [{ key: "about-the-school", label: "About the School", pages: [{ key: "overview", title: "Overview" }, { key: "classes-seats", title: "Classes & Seats" }, { key: "fee-structure", title: "Fee Structure" }, { key: "admission-calendar", title: "Admission Calendar" }, { key: "faqs", title: "FAQs" }, { key: "subjects", title: "Subjects by Class" }] }] },
  enquiry: { label: "Enquiry & Visit", group: "Apply", sections: [{ key: "enquiry-and-visit", label: "Enquiry & Visit", pages: [{ key: "make-an-enquiry", title: "Make an Enquiry" }, { key: "campus-visit", title: "Campus Visit" }] }] },
  application: { label: "Application", group: "Apply", sections: [{ key: "application", label: "Application", pages: [{ key: "my-application", title: "My Application" }, { key: "eligibility-check", title: "Eligibility Check" }, { key: "new-application", title: "New Application" }, { key: "my-applications", title: "My Applications" }, { key: "merit-and-offer", title: "Merit and Offer" }, { key: "admission-letter", title: "Admission Letter" }] }] },
  documents: { label: "Documents", group: "Apply", sections: [{ key: "upload-documents", label: "Upload Documents", pages: [{ key: "upload-documents", title: "Upload Documents" }] }] },
  assessment: { label: "Assessment", group: "Apply", sections: [{ key: "assessment", label: "Assessment", pages: [{ key: "book-a-slot", title: "Book a Slot" }, { key: "admit-card", title: "Admit Card" }, { key: "what-to-expect", title: "What to Expect" }, { key: "results", title: "Results" }] }] },
  fees: { label: "Fees & Payment", group: "Admission", sections: [{ key: "fees-and-payment", label: "Fees & Payment", pages: [{ key: "application-fee", title: "Application Fee" }, { key: "admission-fee", title: "Admission Fee" }, { key: "receipts", title: "Receipts" }] }] },
  messages: { label: "Messages", group: "Admission", sections: [{ key: "messages", label: "Messages", pages: [{ key: "messages", title: "Messages" }] }] },
};

export const sectionHref = (module: string, section: string) => `/applicant/${module}/${section}`;
