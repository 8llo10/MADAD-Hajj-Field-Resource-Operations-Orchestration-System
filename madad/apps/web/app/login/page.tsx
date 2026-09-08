"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../../lib/api";

export default function Login() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    function fillDemoAccount() {
        setEmail("admin@madad.sa");
        setPassword("Madad@123");
        setError("");
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "تعذر تسجيل الدخول");
            }

            localStorage.setItem("madad_access_token", data.accessToken);
            localStorage.setItem("madad_user", JSON.stringify(data.user));

            router.push("/dashboard");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "حدث خطأ أثناء تسجيل الدخول"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="madad-login" dir="rtl">
            {/* Background video */}
            <video
                className="background-video"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
            >
                <source src="/videos/madad-bg.mp4" type="video/mp4" />
            </video>

            <div className="background-fallback" />
            <div className="video-overlay" />
            <div className="ambient ambient-one" />
            <div className="ambient ambient-two" />

            {/* Top brand */}
            <header className="topbar">
                <div className="brand">
                    <div className="brand-mark" aria-hidden="true">
                        <svg
                            viewBox="0 0 48 48"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M24 5L39 13.7V31.1L24 39.8L9 31.1V13.7L24 5Z"
                                stroke="currentColor"
                                strokeWidth="2"
                            />
                            <path
                                d="M17 27V18.8L24 14.7L31 18.8V27L24 31.1L17 27Z"
                                fill="currentColor"
                            />
                        </svg>
                    </div>

                    <div>
                        <strong>مَدَد</strong>
                        <span>منصة العمليات الميدانية</span>
                    </div>
                </div>

                <div className="system-state">
                    <span className="state-dot" />
                    الأنظمة التشغيلية متصلة
                </div>
            </header>

            <section className="login-layout">
                {/* Hero */}
                <section className="hero-panel">
                    <div className="hero-content">
                        <div className="hero-label">
                            منصة تنسيق الموارد والعمليات الميدانية
                        </div>

                        <h1>
                            إدارة الميدان
                            <span>من نقطة تشغيل واحدة.</span>
                        </h1>

                        <p>
                            مَدَد يربط البلاغات والفرق والموارد والمواقع في واجهة تشغيلية
                            واحدة تساعد مركز العمليات على اتخاذ القرار بسرعة ووضوح.
                        </p>

                        <div className="feature-row">
                            <article className="feature">
                                <div className="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M12 21s7-5.2 7-12A7 7 0 105 9c0 6.8 7 12 7 12Z"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                        />
                                        <circle
                                            cx="12"
                                            cy="9"
                                            r="2.4"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <strong>إدارة المواقع</strong>
                                    <span>متابعة المشاعر والمناطق</span>
                                </div>
                            </article>

                            <article className="feature">
                                <div className="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M4 17l4-4 3 3 8-9"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M15 7h4v4"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <strong>قرار أسرع</strong>
                                    <span>ترشيح الفرق حسب الجاهزية</span>
                                </div>
                            </article>

                            <article className="feature">
                                <div className="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M7 8a3 3 0 116 0v1M4 20v-3a5 5 0 015-5h2"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M15 13h5v5h-5z"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <strong>تنسيق الفرق</strong>
                                    <span>تكليف ومتابعة آنية</span>
                                </div>
                            </article>
                        </div>
                    </div>

                    <div className="hero-footer">
                        <span>جاهزية ميدانية</span>
                        <div className="hero-line" />
                        <span>تنسيق</span>
                        <span>استجابة</span>
                        <span>متابعة</span>
                    </div>
                </section>

                {/* Login Card */}
                <section className="auth-panel">
                    <div className="auth-card">
                        <div className="auth-heading">
                            <div className="mini-badge">
                                <span />
                                مركز العمليات
                            </div>

                            <h2>مرحبًا بعودتك</h2>

                            <p>
                                سجّل الدخول للوصول إلى لوحة القيادة ومتابعة العمليات
                                الميدانية.
                            </p>
                        </div>

                        {error && (
                            <div className="error-box" role="alert">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="9"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                    />
                                    <path
                                        d="M12 7.5v5M12 16.2v.2"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={submit} className="login-form">
                            <label className="field">
                                <span>البريد الإلكتروني</span>

                                <div className="input-shell">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M4 6h16v12H4V6Z"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        />
                                        <path
                                            d="m5 7 7 5 7-5"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        />
                                    </svg>

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@organization.sa"
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </label>

                            <label className="field">
                                <div className="field-heading">
                                    <span>كلمة المرور</span>
                                </div>

                                <div className="input-shell">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <rect
                                            x="5"
                                            y="10"
                                            width="14"
                                            height="10"
                                            rx="2"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        />
                                        <path
                                            d="M8 10V7a4 4 0 018 0v3"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        />
                                    </svg>

                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="أدخل كلمة المرور"
                                        autoComplete="current-password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={
                                            showPassword
                                                ? "إخفاء كلمة المرور"
                                                : "إظهار كلمة المرور"
                                        }
                                    >
                                        {showPassword ? (
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <path
                                                    d="M3 3l18 18"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                />
                                                <path
                                                    d="M10.6 10.8a2 2 0 002.7 2.7"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                />
                                                <path
                                                    d="M9.1 5.4A9.7 9.7 0 0112 5c5.6 0 9 7 9 7a15 15 0 01-2.4 3.2M6.2 6.2C4.2 7.6 3 10 3 12c0 0 3.4 7 9 7 1.1 0 2.1-.2 3-.5"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <path
                                                    d="M3 12s3.4-7 9-7 9 7 9 7-3.4 7-9 7-9-7-9-7Z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                />
                                                <circle
                                                    cx="12"
                                                    cy="12"
                                                    r="2.5"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </label>

                            <button
                                className="login-button"
                                type="submit"
                                disabled={loading}
                            >
                                <span>
                                    {loading ? "جاري التحقق..." : "الدخول إلى مركز العمليات"}
                                </span>

                                {!loading && (
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M15 6l-6 6 6 6"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}

                                {loading && <span className="loader" />}
                            </button>

                            <div className="separator">
                                <span />
                                <p>للعرض التجريبي</p>
                                <span />
                            </div>

                            <button
                                type="button"
                                className="demo-button"
                                onClick={fillDemoAccount}
                            >
                                <div>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M7 12h10M12 7l5 5-5 5"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>

                                <span>
                                    <strong>استخدام حساب العرض</strong>
                                    <small>تعبئة بيانات الدخول تلقائيًا</small>
                                </span>
                            </button>
                        </form>

                        <footer className="auth-footer">
                            <div className="secure">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M12 3 5 6v5c0 4.6 2.7 8 7 10 4.3-2 7-5.4 7-10V6l-7-3Z"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    />
                                    <path
                                        d="m9.5 12 1.7 1.7 3.6-4"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    />
                                </svg>
                                اتصال آمن
                            </div>

                            <span>مَدَد · MADAD</span>
                        </footer>
                    </div>
                </section>
            </section>

            <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        .madad-login {
          --deep-olive: #2f3a2e;
          --sage: #8e9a86;
          --bone: #ece7dc;
          --moss: #bdc7a4;
          --cocoa: #5d4538;
          --ink: #101510;

          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          background: #0b100d;
          color: var(--bone);
          font-family:
            Arial,
            "Segoe UI",
            Tahoma,
            sans-serif;
        }

        .background-video,
        .background-fallback,
        .video-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .background-video {
          object-fit: cover;
          z-index: -5;
          opacity: 0.5;
          filter: saturate(0.72) brightness(0.65);
          transform: scale(1.025);
          animation: bgZoom 20s ease-in-out infinite alternate;
        }

        .background-fallback {
          z-index: -6;
          background:
            radial-gradient(
              circle at 14% 25%,
              rgba(121, 152, 100, 0.34),
              transparent 30%
            ),
            radial-gradient(
              circle at 85% 78%,
              rgba(93, 69, 56, 0.3),
              transparent 35%
            ),
            linear-gradient(
              135deg,
              #111913 0%,
              #1d291f 42%,
              #0a0e0b 100%
            );
        }

        .video-overlay {
          z-index: -4;
          background:
            linear-gradient(
              90deg,
              rgba(5, 10, 7, 0.47),
              rgba(6, 11, 8, 0.72)
            ),
            linear-gradient(
              180deg,
              rgba(4, 8, 5, 0.16),
              rgba(4, 8, 5, 0.75)
            );
          backdrop-filter: blur(1.5px);
        }

        .ambient {
          position: absolute;
          border-radius: 999px;
          filter: blur(120px);
          pointer-events: none;
          z-index: -2;
          opacity: 0.32;
        }

        .ambient-one {
          width: 420px;
          height: 420px;
          background: #667d55;
          top: -190px;
          right: 20%;
          animation: floatOne 13s ease-in-out infinite alternate;
        }

        .ambient-two {
          width: 330px;
          height: 330px;
          background: #7a5744;
          bottom: -190px;
          left: 4%;
          animation: floatTwo 16s ease-in-out infinite alternate;
        }

        .topbar {
          height: 96px;
          width: min(1440px, calc(100% - 72px));
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(236, 231, 220, 0.11);
          animation: fadeDown 0.65s ease both;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(236, 231, 220, 0.2);
          background: rgba(236, 231, 220, 0.08);
          backdrop-filter: blur(16px);
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: var(--moss);
        }

        .brand-mark svg {
          width: 27px;
          height: 27px;
        }

        .brand div:last-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .brand strong {
          font-size: 20px;
          letter-spacing: 0.04em;
        }

        .brand span {
          font-size: 11px;
          color: rgba(236, 231, 220, 0.52);
        }

        .system-state {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(236, 231, 220, 0.64);
          font-size: 12px;
        }

        .state-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #b4d67d;
          box-shadow: 0 0 0 5px rgba(180, 214, 125, 0.09);
          animation: pulse 2s infinite;
        }

        .login-layout {
          width: min(1440px, calc(100% - 72px));
          margin: 0 auto;
          min-height: calc(100vh - 96px);
          display: grid;
          grid-template-columns: minmax(0, 1.22fr) minmax(420px, 0.78fr);
          gap: 72px;
          align-items: center;
          padding: 52px 0 66px;
        }

        .hero-panel {
          min-height: 610px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          animation: heroEnter 0.8s 0.1s ease both;
        }

        .hero-content {
          max-width: 760px;
          padding-top: 38px;
        }

        .hero-label {
          display: inline-flex;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(189, 199, 164, 0.19);
          background: rgba(45, 58, 46, 0.25);
          color: #cad4b6;
          backdrop-filter: blur(18px);
          font-size: 12px;
          margin-bottom: 30px;
        }

        .hero-panel h1 {
          margin: 0;
          font-size: clamp(54px, 6vw, 90px);
          line-height: 0.99;
          letter-spacing: -0.055em;
          font-weight: 750;
          max-width: 760px;
        }

        .hero-panel h1 span {
          display: block;
          color: var(--moss);
          margin-top: 9px;
        }

        .hero-panel > .hero-content > p {
          color: rgba(236, 231, 220, 0.64);
          max-width: 640px;
          font-size: 16px;
          line-height: 2;
          margin: 29px 0 39px;
        }

        .feature-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          max-width: 760px;
        }

        .feature {
          min-height: 86px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(236, 231, 220, 0.1);
          background: rgba(17, 25, 19, 0.36);
          backdrop-filter: blur(20px);
          transition:
            transform 0.3s ease,
            background 0.3s ease,
            border-color 0.3s ease;
        }

        .feature:hover {
          transform: translateY(-4px);
          border-color: rgba(189, 199, 164, 0.26);
          background: rgba(38, 52, 40, 0.52);
        }

        .feature-icon {
          width: 39px;
          height: 39px;
          flex: 0 0 39px;
          border-radius: 12px;
          background: rgba(189, 199, 164, 0.12);
          display: grid;
          place-items: center;
          color: var(--moss);
        }

        .feature-icon svg {
          width: 20px;
          height: 20px;
        }

        .feature > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .feature strong {
          font-size: 12px;
        }

        .feature span {
          font-size: 10px;
          color: rgba(236, 231, 220, 0.44);
          line-height: 1.5;
        }

        .hero-footer {
          display: flex;
          align-items: center;
          gap: 16px;
          color: rgba(236, 231, 220, 0.38);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .hero-line {
          height: 1px;
          width: 80px;
          background: rgba(236, 231, 220, 0.15);
        }

        .auth-panel {
          display: flex;
          justify-content: flex-end;
          animation: cardEnter 0.85s 0.16s ease both;
        }

        .auth-card {
          width: 100%;
          max-width: 500px;
          padding: 42px;
          border-radius: 32px;
          border: 1px solid rgba(236, 231, 220, 0.13);
          background:
            linear-gradient(
              135deg,
              rgba(23, 32, 24, 0.82),
              rgba(11, 17, 13, 0.76)
            );
          backdrop-filter: blur(28px);
          box-shadow:
            0 34px 100px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          overflow: hidden;
          position: relative;
        }

        .auth-card::before {
          content: "";
          position: absolute;
          top: 0;
          right: 42px;
          left: 42px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(189, 199, 164, 0.45),
            transparent
          );
        }

        .mini-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #b9c7a5;
          font-size: 11px;
          margin-bottom: 18px;
        }

        .mini-badge span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #a9bf7c;
        }

        .auth-heading h2 {
          margin: 0;
          font-size: 32px;
          letter-spacing: -0.04em;
        }

        .auth-heading p {
          margin: 12px 0 29px;
          color: rgba(236, 231, 220, 0.5);
          font-size: 13px;
          line-height: 1.8;
          max-width: 370px;
        }

        .error-box {
          min-height: 46px;
          display: flex;
          gap: 9px;
          align-items: center;
          padding: 10px 13px;
          border-radius: 13px;
          margin-bottom: 18px;
          background: rgba(148, 68, 55, 0.16);
          border: 1px solid rgba(201, 106, 88, 0.2);
          color: #e9aa9c;
          font-size: 12px;
          animation: shake 0.35s ease;
        }

        .error-box svg {
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 9px;
          font-size: 12px;
          color: rgba(236, 231, 220, 0.72);
        }

        .field-heading {
          display: flex;
          justify-content: space-between;
        }

        .input-shell {
          height: 55px;
          border: 1px solid rgba(236, 231, 220, 0.11);
          border-radius: 15px;
          background: rgba(7, 12, 8, 0.38);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 15px;
          transition:
            border-color 0.25s ease,
            background 0.25s ease,
            box-shadow 0.25s ease,
            transform 0.25s ease;
        }

        .input-shell:focus-within {
          border-color: rgba(189, 199, 164, 0.48);
          background: rgba(19, 29, 21, 0.64);
          box-shadow: 0 0 0 4px rgba(189, 199, 164, 0.06);
          transform: translateY(-1px);
        }

        .input-shell > svg {
          width: 19px;
          height: 19px;
          flex: 0 0 19px;
          color: #97a68b;
        }

        .input-shell input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--bone);
          font-size: 13px;
          direction: rtl;
        }

        .input-shell input::placeholder {
          color: rgba(236, 231, 220, 0.24);
        }

        .password-toggle {
          width: 31px;
          height: 31px;
          border: 0;
          background: transparent;
          color: rgba(236, 231, 220, 0.43);
          cursor: pointer;
          display: grid;
          place-items: center;
          border-radius: 9px;
          transition:
            color 0.2s ease,
            background 0.2s ease;
        }

        .password-toggle:hover {
          color: var(--bone);
          background: rgba(236, 231, 220, 0.06);
        }

        .password-toggle svg {
          width: 19px;
          height: 19px;
        }

        .login-button {
          border: 0;
          min-height: 56px;
          margin-top: 4px;
          border-radius: 15px;
          background: var(--moss);
          color: #192018;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          font-size: 13px;
          font-weight: 750;
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            filter 0.25s ease;
          position: relative;
          overflow: hidden;
        }

        .login-button::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent 30%,
            rgba(255, 255, 255, 0.28),
            transparent 70%
          );
          transform: translateX(130%);
          transition: transform 0.65s ease;
        }

        .login-button:hover::before {
          transform: translateX(-130%);
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 13px 28px rgba(112, 132, 92, 0.23);
          filter: brightness(1.06);
        }

        .login-button:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .login-button svg {
          width: 21px;
          height: 21px;
        }

        .loader {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(25, 32, 24, 0.24);
          border-top-color: #192018;
          animation: spin 0.75s linear infinite;
        }

        .separator {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 10px;
          color: rgba(236, 231, 220, 0.3);
          font-size: 10px;
          margin: 1px 0;
        }

        .separator span {
          height: 1px;
          background: rgba(236, 231, 220, 0.08);
        }

        .separator p {
          margin: 0;
        }

        .demo-button {
          min-height: 62px;
          display: flex;
          align-items: center;
          text-align: right;
          gap: 12px;
          border-radius: 15px;
          border: 1px solid rgba(236, 231, 220, 0.09);
          background: rgba(236, 231, 220, 0.035);
          color: var(--bone);
          cursor: pointer;
          padding: 9px 12px;
          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            background 0.25s ease;
        }

        .demo-button:hover {
          transform: translateY(-2px);
          border-color: rgba(189, 199, 164, 0.24);
          background: rgba(189, 199, 164, 0.07);
        }

        .demo-button > div {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border-radius: 11px;
          background: rgba(189, 199, 164, 0.09);
          display: grid;
          place-items: center;
          color: var(--moss);
        }

        .demo-button svg {
          width: 18px;
          height: 18px;
          transform: rotate(180deg);
        }

        .demo-button > span {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .demo-button strong {
          font-size: 11px;
        }

        .demo-button small {
          color: rgba(236, 231, 220, 0.36);
          font-size: 9px;
        }

        .auth-footer {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid rgba(236, 231, 220, 0.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: rgba(236, 231, 220, 0.3);
          font-size: 9px;
        }

        .secure {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .secure svg {
          width: 14px;
          height: 14px;
          color: #98a98d;
        }

        @keyframes fadeDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes heroEnter {
          from {
            opacity: 0;
            transform: translateX(28px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateX(-24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes bgZoom {
          from {
            transform: scale(1.025);
          }
          to {
            transform: scale(1.08);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.45;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes floatOne {
          from {
            transform: translate(0, 0);
          }
          to {
            transform: translate(-40px, 60px);
          }
        }

        @keyframes floatTwo {
          from {
            transform: translate(0, 0);
          }
          to {
            transform: translate(50px, -35px);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          30% {
            transform: translateX(4px);
          }
          60% {
            transform: translateX(-4px);
          }
        }

        @media (max-width: 1050px) {
          .login-layout {
            grid-template-columns: 1fr 430px;
            gap: 30px;
          }

          .feature-row {
            grid-template-columns: 1fr;
            max-width: 360px;
          }

          .feature:nth-child(3) {
            display: none;
          }

          .hero-panel h1 {
            font-size: 58px;
          }
        }

        @media (max-width: 860px) {
          .topbar {
            width: calc(100% - 36px);
            height: 78px;
          }

          .system-state {
            display: none;
          }

          .login-layout {
            width: calc(100% - 36px);
            min-height: calc(100vh - 78px);
            display: flex;
            flex-direction: column;
            gap: 30px;
            padding: 34px 0 42px;
          }

          .hero-panel {
            width: 100%;
            min-height: auto;
          }

          .hero-content {
            padding: 0;
          }

          .hero-panel h1 {
            font-size: clamp(43px, 11vw, 64px);
          }

          .hero-panel > .hero-content > p {
            margin-bottom: 0;
            font-size: 13px;
          }

          .feature-row,
          .hero-footer {
            display: none;
          }

          .auth-panel {
            width: 100%;
          }

          .auth-card {
            max-width: none;
          }
        }

        @media (max-width: 520px) {
          .topbar,
          .login-layout {
            width: calc(100% - 24px);
          }

          .topbar {
            height: 70px;
          }

          .brand-mark {
            width: 37px;
            height: 37px;
          }

          .brand strong {
            font-size: 17px;
          }

          .brand span {
            font-size: 9px;
          }

          .login-layout {
            padding-top: 26px;
          }

          .hero-label {
            margin-bottom: 20px;
            font-size: 10px;
          }

          .hero-panel h1 {
            line-height: 1.05;
          }

          .hero-panel > .hero-content > p {
            line-height: 1.8;
            margin-top: 20px;
          }

          .auth-card {
            padding: 27px 20px 22px;
            border-radius: 25px;
          }

          .auth-heading h2 {
            font-size: 27px;
          }

          .auth-heading p {
            font-size: 11px;
          }

          .input-shell {
            height: 52px;
          }

          .auth-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
        </main>
    );
}