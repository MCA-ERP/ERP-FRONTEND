"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { fetchServerUser } from "@/lib/api";

export type UserRole = "SuperAdmin" | "Principal" | "Registrar" | "Faculty" | "Student" | "Parent";
export type PortalType = "SuperAdmin" | "School";

export interface VerifiedUserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  schoolCode: string;
  schoolName: string;
}

/**
 * Enterprise Authentication & Session Logic
 * - Strict verification: ONLY verified Supabase accounts can access the ERP.
 * - Allows explicit selection of SuperAdmin ERP vs School Campus portal.
 * - Automatically routes to corresponding domain / dashboard role.
 * - Cleansed of any demo school or hardcoded fallback records.
 */
export function useLoginLogic() {
  const router = useRouter();

  // Portal selection: "SuperAdmin" (default for group admins) or "School" (for campus staff)
  const [portalType, setPortalType] = useState<PortalType>("SuperAdmin");

  // Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"error" | "success">("error");

  // Domain configurations
  const adminDashboardUrl = process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || "https://erp.myclassassist.in";
  const schoolDashboardUrl = process.env.NEXT_PUBLIC_SCHOOL_DASHBOARD_URL || "https://sch.myclassassist.in";

  // ── 1. Check existing verified session on mount ────────────────────────
  useEffect(() => {
    let isMounted = true;

    const verifyActiveSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          if (isMounted) setIsCheckingSession(false);
          return;
        }

        const user = session.user;
        if (isUserVerified(user)) {
          const profile = await resolveUserProfile(user, session.access_token);
          if (profile) {
            persistAndRedirect(profile);
            return;
          }
          await supabase.auth.signOut();
        }

        if (isMounted) setIsCheckingSession(false);
      } catch {
        if (isMounted) setIsCheckingSession(false);
      }
    };

    verifyActiveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { user, access_token } = session;
        if (isUserVerified(user)) {
          // Defer: supabase-js holds an auth lock while this callback runs.
          setTimeout(async () => {
            const profile = await resolveUserProfile(user, access_token);
            if (profile) persistAndRedirect(profile);
          }, 0);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── 2. Helper: Verify Email Confirmation ───────────────────────────────
  const isUserVerified = (user: { email_confirmed_at?: string | null; confirmed_at?: string | null }) => {
    return Boolean(user.email_confirmed_at || user.confirmed_at);
  };

  // ── 3. Helper: Resolve role from the backend (never from the client) ───
  const resolveUserProfile = async (
    user: {
      id: string;
      email?: string;
      user_metadata?: Record<string, any>;
      app_metadata?: Record<string, any>;
    },
    accessToken: string
  ): Promise<VerifiedUserProfile | null> => {
    let serverUser;
    try {
      serverUser = await fetchServerUser(accessToken);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not verify your ERP access.");
      setFeedbackType("error");
      return null;
    }

    const userEmail = (user.email || "").toLowerCase().trim();
    const metadata = { ...user.app_metadata, ...user.user_metadata };

    const role = serverUser.role as UserRole;
    const isSuperAdmin = role === "SuperAdmin";
    const schoolCode: string = isSuperAdmin ? "ALL" : (metadata.school_code || "MCA");
    const schoolName: string = isSuperAdmin
      ? "My Class Assist Multi-Campus Group"
      : (metadata.school_name || "My Class Assist Campus");

    const displayName = metadata.full_name || metadata.display_name || metadata.name || "";

    return {
      id: user.id,
      email: userEmail,
      displayName,
      role,
      schoolCode,
      schoolName,
    };
  };

  // ── 4. Helper: Multi-Tenant / Subdomain Redirect ───────────────────────
  const persistAndRedirect = (profile: VerifiedUserProfile) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("erp_user_id", profile.id);
      window.sessionStorage.setItem("erp_user_email", profile.email);
      if (profile.displayName) {
        window.sessionStorage.setItem("erp_user_name", profile.displayName);
      }
      window.sessionStorage.setItem("erp_role", profile.role);
      window.sessionStorage.setItem("erp_school_code", profile.schoolCode);
      window.sessionStorage.setItem("erp_school_name", profile.schoolName);

      const hostname = window.location.hostname;
      const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

      // Production Subdomain Dispatch
      if (!isLocalhost && process.env.NEXT_PUBLIC_APP_DOMAIN) {
        if (profile.role === "SuperAdmin" && adminDashboardUrl && !window.location.href.startsWith(adminDashboardUrl)) {
          window.location.href = `${adminDashboardUrl}/admin`;
          return;
        }
        if (profile.role !== "SuperAdmin" && schoolDashboardUrl && !window.location.href.startsWith(schoolDashboardUrl)) {
          window.location.href = `${schoolDashboardUrl}/dashboard`;
          return;
        }
      }
    }

    if (profile.role === "SuperAdmin") {
      router.replace("/admin");
      return;
    }

    router.replace(`/dashboard?role=${encodeURIComponent(profile.role)}&schoolCode=${encodeURIComponent(profile.schoolCode)}`);
  };

  // ── 5. Strict User Sign-In Handler ────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback("");

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setFeedback("Please enter your registered email address.");
      setFeedbackType("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setFeedback("Please enter a valid email address format.");
      setFeedbackType("error");
      return;
    }

    if (!password) {
      setFeedback("Please enter your password.");
      setFeedbackType("error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Authenticate strictly with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        let message = error.message;
        if (error.message.includes("Invalid login credentials")) {
          message = "Invalid email or password. Please verify your credentials and try again.";
        } else if (error.message.includes("Email not confirmed")) {
          message = "Your email address has not been verified yet. Please check your inbox and verify your email to access the ERP.";
        } else if (error.message.includes("Too many requests")) {
          message = "Too many failed attempts. Please wait a few moments before trying again.";
        }

        setFeedback(message);
        setFeedbackType("error");
        return;
      }

      if (!data?.user) {
        setFeedback("Authentication failed: User account not found.");
        setFeedbackType("error");
        return;
      }

      if (!isUserVerified(data.user)) {
        setFeedback("Your account requires email confirmation before you can sign in.");
        setFeedbackType("error");
        await supabase.auth.signOut();
        return;
      }

      setFeedbackType("success");
      setFeedback(`Verified! Accessing ${portalType === "SuperAdmin" ? "Trust SuperAdmin ERP" : "School Campus"}...`);

      const profile = await resolveUserProfile(data.user, data.session.access_token);
      if (!profile) {
        await supabase.auth.signOut();
        return;
      }
      persistAndRedirect(profile);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "An unexpected network error occurred. Please try again.");
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    portalType,
    setPortalType,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isCheckingSession,
    isSubmitting,
    feedback,
    feedbackType,
    handleLogin,
  };
}
