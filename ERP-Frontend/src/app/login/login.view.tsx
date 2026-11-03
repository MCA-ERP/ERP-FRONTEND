"use client";

import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Check, ArrowRight, ShieldCheck, Building2 } from "lucide-react";
import styles from "./login.module.scss";
import { useLoginLogic } from "./login.logic";

/**
 * MCA Educational ERP — Enterprise Login View
 * Strictly authenticated & verified users only.
 * 70% White / Light Neutral Hero Canvas & 30% Class Blue Portal Panel.
 */
export default function LoginView() {
  const {
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
  } = useLoginLogic();

  if (isCheckingSession) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <span>Verifying secure enterprise session...</span>
      </div>
    );
  }

  return (
    <main className={styles.root}>
      {/* ── Left Column: 70% White Canvas (MCA Logo, Educational System Illustration) ── */}
      <section className={styles.leftCanvas}>
        {/* Top: Official MCA Brand Logo */}
        <div className={styles.logoArea}>
          <Link href="/login" className={styles.brandLogoLink} aria-label="My Class Assist Home">
            <Image
              src="/mca-logo.svg"
              alt="My Class Assist Logo"
              width={180}
              height={100}
              priority
              style={{ width: "auto", height: "64px" }}
            />
          </Link>
        </div>

        {/* Center: Educational Vector Illustration & System Title */}
        <div className={styles.illustrationArea}>
          <Image
            src="/login-illustration.svg"
            alt="Educational Management System Illustration"
            width={540}
            height={400}
            priority
            className={styles.illustrationImg}
          />
          <h2 className={styles.systemTitle}>Educational Management System</h2>
          <p className={styles.systemSub}>Unified Academic Administration, Multi-Campus &amp; Student Information System</p>
        </div>

        {/* Bottom Left: Enterprise Security & Brand Tag */}
        <div className={styles.leftFooter}>
          <span>MCA Cloud Campus • Multi-Tenant Institutional Platform</span>
          <span>© {new Date().getFullYear()} My Class Assist</span>
        </div>
      </section>

      {/* ── Right Column: 30% Class Blue (#0294CE) Authentication Panel ── */}
      <section className={styles.rightColumn}>
        <div className={styles.formWrapper}>
          {/* Header */}
          <div className={styles.headerBox}>
            <h1 className={styles.welcomeHeading}>Welcome !</h1>
            <p className={styles.welcomeSub}>Sign in to your account</p>
          </div>

          {/* Portal Switcher (SuperAdmin ERP vs School Campus) */}
          <div className={styles.portalTabs} role="tablist" aria-label="Select ERP Portal">
            <button
              type="button"
              role="tab"
              aria-selected={portalType === "SuperAdmin"}
              className={`${styles.portalTab} ${portalType === "SuperAdmin" ? styles.portalTabActive : ""}`}
              onClick={() => setPortalType("SuperAdmin")}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <ShieldCheck size={15} /> SuperAdmin ERP
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={portalType === "School"}
              className={`${styles.portalTab} ${portalType === "School" ? styles.portalTabActive : ""}`}
              onClick={() => setPortalType("School")}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <Building2 size={15} /> School Campus
              </span>
            </button>
          </div>

          {/* Form with Unique Email & Password (Strictly Verified Authentication) */}
          <form onSubmit={handleLogin} className={styles.loginForm} noValidate>
            {/* Email Field */}
            <div className={styles.inputGroup}>
              <label htmlFor="user-email" className={styles.inputLabel}>
                {portalType === "SuperAdmin" ? "SuperAdmin Email" : "Institutional User Email"}
              </label>
              <input
                id="user-email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                placeholder={
                  portalType === "SuperAdmin"
                    ? "Enter administrator email"
                    : "Enter your registered school email"
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.inputField}
              />
            </div>

            {/* Password Field with Eye Toggle */}
            <div className={styles.inputGroup}>
              <label htmlFor="user-password" className={styles.inputLabel}>
                Password
              </label>
              <div className={styles.passwordWrap}>
                <input
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${styles.inputField} ${styles.passwordInput}`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.eyeButton}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                role="alert"
                className={`${styles.feedbackMsg} ${feedbackType === "error" ? styles.error : styles.success}`}
              >
                {feedback}
              </div>
            )}

            {/* CTA Button: 10% Accent (Assist Red #E53A35) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.loginBtn}
            >
              {isSubmitting ? (
                "Signing In..."
              ) : (
                <>
                  <span>
                    {portalType === "SuperAdmin" ? "Login to SuperAdmin ERP" : "Login to School Portal"}
                  </span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Technical Assistance Block */}
          <div className={styles.assistanceSection}>
            <h3 className={styles.assistanceHeader}>FOR TECHNICAL ASSISTANCE</h3>
            <ul className={styles.assistanceList}>
              <li className={styles.assistanceItem}>
                <Check size={16} className={styles.checkIcon} />
                <span>Contact - 18002003022 / 07674999569</span>
              </li>
              <li className={styles.assistanceItem}>
                <Check size={16} className={styles.checkIcon} />
                <span>(From 9:30am to 6:30pm)</span>
              </li>
              <li className={styles.assistanceItem}>
                <Check size={16} className={styles.checkIcon} />
                <span>Drop an E-mail to - techsupport@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Right: Powered By */}
        <div className={styles.poweredBy}>
          <span>Powered by <strong>My Class Assist</strong></span>
        </div>
      </section>
    </main>
  );
}
