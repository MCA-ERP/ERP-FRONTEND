"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./login.module.scss";
import { useLoginLogic } from "./login.logic";

/** Six single-digit boxes: type, paste or backspace between them. The value is one string of up to 6 digits. */
function CodeBoxes({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  const set = (i: number, d: string) => {
    const chars = value.padEnd(6, " ").split("");
    chars[i] = d || " ";
    onChange(chars.join("").replace(/ /g, "").slice(0, 6));
  };
  return (
    <div className={styles.otp} role="group" aria-label="6-digit code">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            set(i, d);
            if (d && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) { set(i - 1, ""); refs.current[i - 1]?.focus(); }
          }}
          onPaste={(e) => {
            const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!d) return;
            e.preventDefault();
            onChange(d);
            refs.current[Math.min(d.length, 5)]?.focus();
          }}
        />
      ))}
    </div>
  );
}

/** Sign-in: the Super Admin design. School staff, students and parents use the same page through the link under the form. */
export default function LoginView() {
  const L = useLoginLogic();

  if (L.isCheckingSession) {
    return (
      <div className={styles.loadingState} role="status">
        <div className={styles.spinner} />
        <span>Checking your session…</span>
      </div>
    );
  }

  const school = L.portalType === "School";

  return (
    <main className={styles.root}>
      <section className={styles.brand}>
        <Link href="/login" className={styles.logoLink} aria-label="My Class Assist">
          <Image src="/mca-logo.svg" alt="My Class Assist" width={225} height={127} priority style={{ width: "225px", height: "auto" }} />
        </Link>
        <h2 className={styles.headline}>{school ? "Your school, in one place." : "Run every school on one platform."}</h2>
        <p className={`${styles.lead} ${styles.hideSmall}`}>
          {school
            ? "The My Class Assist school portal: students, academics, billing and support for your school."
            : "The Super Admin portal for My Class Assist: schools, subscriptions, payments and support in one place."}
        </p>
        <ul className={`${styles.points} ${styles.hideSmall}`}>
          <li>Every school, plan and payment in one place</li>
          <li>Role-based access for every team member</li>
          <li>Every sign-in and change is recorded</li>
        </ul>
      </section>

      <section className={styles.side}>
        <div className={styles.card}>
          {L.step === "code" ? (
            <>
              <div>
                <span className={styles.eyebrow}>Step 2 of 2</span>
                <h1 className={styles.title}>Enter the code</h1>
              </div>
              <p className={styles.sub}>
                We sent a 6-digit code to {L.challenge?.channel === "sms" ? "your mobile number " : L.challenge?.channel === "email" ? "your email " : ""}
                <b>{L.challenge?.sentTo}</b>.
              </p>
              {L.feedback && <div role={L.feedbackType === "error" ? "alert" : "status"} className={`${styles.alert} ${L.feedbackType === "error" ? styles.error : styles.success}`}>{L.feedback}</div>}
              <form onSubmit={L.handleVerify} className={styles.form} noValidate>
                <CodeBoxes value={L.code} onChange={L.setCode} disabled={L.isSubmitting} />
                <label className={styles.check}>
                  <input type="checkbox" checked={L.trustDevice} onChange={(e) => L.setTrustDevice(e.target.checked)} /> Trust this device for 30 days
                </label>
                <button type="submit" className={styles.submit} disabled={L.isSubmitting || L.code.length !== 6}>{L.isSubmitting ? "Checking…" : "Verify and sign in"}</button>
              </form>
              <div className={styles.row}>
                <button type="button" className={styles.linkBtn} onClick={() => L.setStep("signin")}>← Use a different account</button>
                <button type="button" className={styles.linkBtn} disabled={L.isSubmitting} onClick={L.handleResend}>Resend code</button>
              </div>
            </>
          ) : L.step === "forgot" ? (
            <>
              <div>
                <h1 className={styles.title}>Reset your password</h1>
              </div>
              <p className={styles.sub}>Enter your {school ? "email" : "work email"}. We&apos;ll send a link to choose a new password.</p>
              {L.feedback && <div role={L.feedbackType === "error" ? "alert" : "status"} className={`${styles.alert} ${L.feedbackType === "error" ? styles.error : styles.success}`}>{L.feedback}</div>}
              <form onSubmit={L.handleForgot} className={styles.form} noValidate>
                <div className={styles.field}>
                  <label htmlFor="fg-email">{school ? "Email" : "Work email"}</label>
                  <input id="fg-email" type="email" autoComplete="email" value={L.email} onChange={(e) => L.setEmail(e.target.value)} disabled={L.isSubmitting} />
                </div>
                <button type="submit" className={styles.submit} disabled={L.isSubmitting}>{L.isSubmitting ? "Sending…" : "Send reset link"}</button>
              </form>
              <div className={styles.row}><button type="button" className={styles.linkBtn} onClick={() => L.setStep("signin")}>← Back to sign in</button></div>
            </>
          ) : (
            <>
              <div>
                <span className={styles.eyebrow}>{school ? "School portal" : "Super Admin · Portal 01"}</span>
                <h1 className={styles.title}>Sign in</h1>
              </div>
              <p className={styles.sub}>{school ? "Use your school email, or your student ID." : "Use your platform team account."}</p>
              {L.feedback && <div role={L.feedbackType === "error" ? "alert" : "status"} className={`${styles.alert} ${L.feedbackType === "error" ? styles.error : styles.success}`}>{L.feedback}</div>}
              <form onSubmit={L.handleLogin} className={styles.form} noValidate>
                <div className={styles.field}>
                  <label htmlFor="user-email">{school ? "Email or student ID" : "Work email"}</label>
                  <input
                    id="user-email" type={school ? "text" : "email"} inputMode="email" autoCapitalize="none" autoComplete="username" required
                    disabled={L.isSubmitting} value={L.email} onChange={(e) => L.setEmail(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="user-password">Password</label>
                  <div className={styles.pw}>
                    <input
                      id="user-password" type={L.showPassword ? "text" : "password"} autoComplete="current-password" required
                      disabled={L.isSubmitting} placeholder="Your password" value={L.password} onChange={(e) => L.setPassword(e.target.value)}
                    />
                    <button type="button" className={`${styles.linkBtn} ${styles.peek}`} aria-pressed={L.showPassword} onClick={() => L.setShowPassword(!L.showPassword)}>
                      {L.showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div className={styles.row}>
                  <span className={styles.help}>{school ? "Students: use your registration number." : ""}</span>
                  <button type="button" className={styles.linkBtn} onClick={() => L.setStep("forgot")}>Forgot password?</button>
                </div>
                <button type="submit" className={styles.submit} disabled={L.isSubmitting}>{L.isSubmitting ? "Signing in…" : "Sign in"}</button>
              </form>
              <p className={styles.help}>
                {school ? "Trouble signing in? Contact your school administrator." : "Trouble signing in? Contact your Super Admin."}{" "}
                <button type="button" className={styles.linkBtn} onClick={() => L.setPortalType(school ? "SuperAdmin" : "School")}>
                  {school ? "Platform team sign-in" : "School staff, students or parents?"}
                </button>
              </p>
            </>
          )}
        </div>
        <p className={styles.foot}>© {new Date().getFullYear()} My Class Assist · support@myclassassist.in</p>
      </section>
    </main>
  );
}
