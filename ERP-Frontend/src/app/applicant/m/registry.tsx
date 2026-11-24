"use client";

import type { ReactNode } from "react";
import { AdmitCard, BookSlot, Results, WhatToExpect } from "./assess";
import { AdmissionLetter, EligibilityCheck, MeritOffer, MyApplication, MyApplications, NewApplication } from "./apply";
import { Notifications, Status } from "./dash";
import { UploadDocuments } from "./docs";
import { CampusVisit, MakeEnquiry } from "./enquiry";
import { AdmissionFee, ApplicationFee, Receipts } from "./fees";
import { Messages } from "./messages";
import { AdmissionCalendar, ClassesSeats, FeeStructure, Faqs, SchoolOverview, SubjectsByClass } from "./school";

/** The screen for one tab of one section: "<module>/<tab>". */
export function renderPage(module: string, _section: string, tab: string, setTab: (t: string) => void): ReactNode {
  switch (`${module}/${tab}`) {
    case "dashboard/my-application": return <Status />;
    case "dashboard/notifications": return <Notifications />;
    case "school/overview": return <SchoolOverview />;
    case "school/classes-seats": return <ClassesSeats />;
    case "school/fee-structure": return <FeeStructure />;
    case "school/admission-calendar": return <AdmissionCalendar />;
    case "school/faqs": return <Faqs />;
    case "school/subjects": return <SubjectsByClass />;
    case "enquiry/make-an-enquiry": return <MakeEnquiry />;
    case "enquiry/campus-visit": return <CampusVisit />;
    case "application/my-application": return <MyApplication />;
    case "application/eligibility-check": return <EligibilityCheck setTab={setTab} />;
    case "application/new-application": return <NewApplication />;
    case "application/my-applications": return <MyApplications setTab={setTab} />;
    case "application/merit-and-offer": return <MeritOffer />;
    case "application/admission-letter": return <AdmissionLetter />;
    case "documents/upload-documents": return <UploadDocuments />;
    case "assessment/book-a-slot": return <BookSlot />;
    case "assessment/admit-card": return <AdmitCard setTab={setTab} />;
    case "assessment/what-to-expect": return <WhatToExpect />;
    case "assessment/results": return <Results />;
    case "fees/application-fee": return <ApplicationFee />;
    case "fees/admission-fee": return <AdmissionFee />;
    case "fees/receipts": return <Receipts />;
    case "messages/messages": return <Messages />;
    default: return null;
  }
}
