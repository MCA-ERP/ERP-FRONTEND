"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { API_BASE, fetchServerUser, homePathFor } from "@/lib/api";

const DEVICE_KEY = "mca_trusted_device";
const readDeviceToken = (): string | undefined => {
  try { return window.localStorage.getItem(DEVICE_KEY) ?? undefined; } catch { return undefined; }
};
const writeDeviceToken = (t: string) => {
  try { window.localStorage.setItem(DEVICE_KEY, t); } catch { /* the code will simply be asked for again next time */ }
};

export type UserRole = "SuperAdmin" | "Principal" | "Registrar" | "Faculty" | "Student" | "Parent";
export type PortalType = "SuperAdmin" | "School";

export interface VerifiedUserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  schoolCode: string;
  schoolName: string;
  mustChangePassword: boolean;
  home: string;
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
  const [step, setStep] = useState<"signin" | "forgot" | "code">("signin");
  const [challenge, setChallenge] = useState<{ id: string; channel: string; sentTo: string } | null>(null);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
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
    // arriving after signing out
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("signedout") === "1") {
      setFeedback("You've signed out.");
      setFeedbackType("success");
    }

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
      mustChangePassword: serverUser.mustChangePassword === true,
      home: homePathFor(serverUser),
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
          window.location.href = `${schoolDashboardUrl}/school`;
          return;
        }
      }
    }

    if (profile.mustChangePassword) {
      router.replace("/change-password");
      return;
    }

    router.replace(profile.home);
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

    // an email, or a student's registration number
    const looksValid = cleanEmail.includes("@") ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) : /^[a-z0-9._-]{3,60}$/.test(cleanEmail);
    if (!looksValid) {
      setFeedback("Please enter a valid email address (students can use their registration number).");
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
      const body = await postLogin("/auth/login", { email: cleanEmail, password, deviceToken: readDeviceToken() });
      if (!body) return;
      if (body.code_required) {
        setChallenge({ id: body.challenge_id, channel: body.channel, sentTo: body.sent_to });
        setCode("");
        setStep("code");
        setFeedback("");
        return;
      }
      await completeSignIn(body);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "An unexpected network error occurred. Please try again.");
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Posts to the backend; returns the reply, or null after showing why it failed. */
  const postLogin = async (path: string, payload: Record<string, unknown>) => {
    let reply: Response;
    try {
      reply = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch {
      setFeedback("Cannot reach the ERP backend. Check your connection and try again.");
      setFeedbackType("error");
      return null;
    }
    const body = await reply.json().catch(() => ({}));
    if (!reply.ok) {
      let message: string = body.error || "Sign-in failed.";
      if (/email not confirmed/i.test(message)) message = "Your email address has not been verified yet. Please check your inbox and verify your email to access the ERP.";
      else if (reply.status === 429 && !body.error) message = "Too many sign-in attempts. Please wait a few minutes before trying again.";
      setFeedback(message);
      setFeedbackType("error");
      return null;
    }
    return body;
  };

  /** The backend approved the sign-in: give the session to the Supabase client and go to the right portal. */
  const completeSignIn = async (body: { token: string; refreshToken: string }) => {
    const { data, error } = await supabase.auth.setSession({ access_token: body.token, refresh_token: body.refreshToken });
    if (error || !data.session) {
      setFeedback(error?.message ?? "Could not start your session. Please try again.");
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
    setFeedback("Signed in. Opening your portal…");
    const profile = await resolveUserProfile(data.user, data.session.access_token);
    if (!profile) {
      await supabase.auth.signOut();
      return;
    }
    persistAndRedirect(profile);
  };

  // ── Step two: the code sent to the person's phone ─────────────────────
  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback("");
    if (!/^\d{6}$/.test(code)) {
      setFeedback("Enter all 6 digits of the code.");
      setFeedbackType("error");
      return;
    }
    if (!challenge) return;
    setIsSubmitting(true);
    try {
      const body = await postLogin("/auth/login/verify", { email: email.toLowerCase().trim(), password, challenge_id: challenge.id, code, trust_device: trustDevice });
      if (!body) return;
      if (body.deviceToken) writeDeviceToken(body.deviceToken);
      await completeSignIn(body);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setFeedback("");
    setIsSubmitting(true);
    try {
      const body = await postLogin("/auth/login", { email: email.toLowerCase().trim(), password });
      if (body?.code_required) {
        setChallenge({ id: body.challenge_id, channel: body.channel, sentTo: body.sent_to });
        setCode("");
        setFeedbackType("success");
        setFeedback("A new code was sent.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Forgot password: email a reset link ───────────────────────────────
  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback("");
    const clean = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setFeedback("Enter a valid email address.");
      setFeedbackType("error");
      return;
    }
    setIsSubmitting(true);
    try {
      await supabase.auth.resetPasswordForEmail(clean, { redirectTo: `${window.location.origin}/change-password` });
    } catch {
      /* the answer below is the same either way, so the page never reveals whether an account exists */
    } finally {
      setIsSubmitting(false);
    }
    setFeedback(`If ${clean} has an account, a reset link is on its way.`);
    setFeedbackType("success");
    setStep("signin");
  };

  return {
    step,
    setStep: (s: "signin" | "forgot" | "code") => { setStep(s); setFeedback(""); if (s === "signin") { setCode(""); setChallenge(null); setPassword(""); } },
    challenge,
    code,
    setCode,
    trustDevice,
    setTrustDevice,
    handleVerify,
    handleResend,
    handleForgot,
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
