import type { ReactNode } from "react";
import { AccountManagement, LoginActivityPages, ParentLogins, StudentLogins } from "./pages";
import { Directory } from "./directory";

/**
 * The User Management menu. Each section is one sidebar link (/admin/users/<key>); each page inside it is a tab.
 * Titles and wording follow the Super Admin design.
 */
export interface UsersPage { key: string; title: string; description: string; render: () => ReactNode }
export interface UsersSection { key: string; label: string; pages: UsersPage[] }

const Note = ({ tone, children }: { tone: "info" | "warn"; children: ReactNode }) => (
  <p role="note" className={`mb-4 rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-800 ${tone === "warn" ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50"}`}>{children}</p>
);

export const USERS_SECTIONS: UsersSection[] = [
  {
    key: "platform", label: "Platform Users", pages: [
      {
        key: "super", title: "Super Admin", description: "People with full control of the platform.",
        render: () => (<><Note tone="warn">Keep at least two Super Admins so the platform is never locked out. Every Super Admin must use two-factor sign-in.</Note><Directory key="super_admin" fixedGroup="super_admin" layout="super" /></>),
      },
      { key: "support", title: "Support Staff", description: "Your platform team: managers, finance, support and content.", render: () => <Directory key="support_staff" fixedGroup="support_staff" layout="support" /> },
    ],
  },
  {
    key: "school", label: "School Users", pages: [
      { key: "admins", title: "School Admin", description: "Administrators of each school.", render: () => <Directory key="school_admin" fixedGroup="school_admin" layout="admins" /> },
      { key: "principals", title: "Principal", description: "Principals of each school.", render: () => <Directory key="principal" fixedGroup="principal" layout="principals" /> },
    ],
  },
  {
    key: "staff", label: "Staff Users", pages: [
      { key: "teachers", title: "Teachers", description: "Teacher accounts across all schools.", render: () => <Directory key="teachers" fixedGroup="teachers" layout="teachers" /> },
      { key: "accountants", title: "Accountants", description: "Staff who collect fees and manage accounts.", render: () => <Directory key="accountants" fixedGroup="accountants" layout="accountants" /> },
      { key: "other", title: "Other Staff", description: "Receptionists, librarians, transport and other staff.", render: () => <Directory key="other_staff" fixedGroup="other_staff" layout="otherstaff" /> },
    ],
  },
  {
    key: "students", label: "Student Accounts", pages: [
      { key: "logins", title: "Student Login Accounts", description: "Sign-in accounts for students in the student app.", render: () => <StudentLogins /> },
    ],
  },
  {
    key: "parents", label: "Parent Accounts", pages: [
      { key: "logins", title: "Parent Login Accounts", description: "Parents sign in with their mobile number and a one-time password.", render: () => <ParentLogins /> },
    ],
  },
  {
    key: "directory", label: "User Directory", pages: [
      { key: "all", title: "All Users", description: "Every account in one place.", render: () => <Directory layout="directory" key="all" /> },
      { key: "active", title: "Active", description: "Accounts that can sign in.", render: () => <Directory fixedState="active" layout="directory" key="active" /> },
      { key: "inactive", title: "Inactive", description: "Accounts that are turned off or never activated.", render: () => <Directory fixedState="inactive" layout="directory" key="inactive" /> },
      { key: "locked", title: "Locked", description: "Accounts locked after too many wrong passwords or by an admin.", render: () => <Directory fixedState="locked" layout="directory" key="locked" /> },
    ],
  },
  {
    key: "accounts", label: "Account Management", pages: [
      {
        key: "create", title: "Create", description: "Create an account for anyone on the platform.",
        render: () => <AccountManagement tab="create" key="create" />,
      },
      {
        key: "edit", title: "Edit", description: "Change someone's details, role or school.",
        render: () => <AccountManagement tab="edit" key="edit" />,
      },
      {
        key: "reset", title: "Reset Password", description: "Send a reset link or set a temporary password.",
        render: () => <AccountManagement tab="reset" key="reset" />,
      },
      {
        key: "disable", title: "Disable", description: "Turn accounts off. They can be turned back on any time.",
        render: () => <AccountManagement tab="disable" key="disable" />,
      },
    ],
  },
  {
    key: "login", label: "Login Activity", pages: [
      { key: "history", title: "Login History", description: "Recent sign-ins across the platform.", render: () => <LoginActivityPages tab="history" key="history" /> },
      { key: "failed", title: "Failed Attempts", description: "Sign-ins that failed, and accounts that were locked as a result.", render: () => <LoginActivityPages tab="failed" key="failed" /> },
      { key: "sessions", title: "Sessions", description: "Who is signed in right now. End any session you don't recognise.", render: () => <LoginActivityPages tab="sessions" key="sessions" /> },
    ],
  },
];

/** First page of a section, for links and redirects. */
export const firstSection = USERS_SECTIONS[0].key;
