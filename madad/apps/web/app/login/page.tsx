"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../../lib/api";
import styles from "./login.module.css";

type Language = "ar" | "en";

const copy = {
    ar: {
        platform: "منصة العمليات الميدانية",
        status: "الأنظمة التشغيلية متصلة",
        eyebrow: "تنسيق الموارد والعمليات الميدانية",
        heroTitle: "الميدان كله.",
        heroAccent: "في صورة واحدة.",
        heroDescription:
            "مَدَد يجمع البلاغات والفرق والموارد والمواقع في مركز عمليات موحّد، لتكون الاستجابة أسرع والقرار أوضح.",
        feature1Title: "رؤية موحّدة",
        feature1Text: "البلاغات والفرق والموارد",
        feature2Title: "استجابة أسرع",
        feature2Text: "ترشيح الفرق حسب الجاهزية",
        feature3Title: "متابعة ميدانية",
        feature3Text: "حالة العمليات لحظة بلحظة",
        commandCenter: "مركز العمليات",
        welcome: "مرحبًا بعودتك",
        loginDescription: "أدخل بياناتك للوصول إلى مركز عمليات مَدَد.",
        email: "البريد الإلكتروني",
        emailPlaceholder: "name@organization.sa",
        password: "كلمة المرور",
        passwordPlaceholder: "أدخل كلمة المرور",
        showPassword: "إظهار كلمة المرور",
        hidePassword: "إخفاء كلمة المرور",
        login: "الدخول إلى مركز العمليات",
        loading: "جاري التحقق...",
        demoDivider: "أو جرّب النظام",
        demoTitle: "الدخول بحساب العرض",
        demoText: "تعبئة بيانات الدخول تلقائيًا",
        secure: "اتصال آمن",
        error: "تعذر تسجيل الدخول",
        genericError: "حدث خطأ أثناء تسجيل الدخول",
        language: "EN",
    },

    en: {
        platform: "Field Operations Platform",
        status: "Operational systems connected",
        eyebrow: "Field Resource & Operations Orchestration",
        heroTitle: "The entire field.",
        heroAccent: "One operational view.",
        heroDescription:
            "MADAD brings incidents, teams, resources and locations into one operations center for faster response and clearer decisions.",
        feature1Title: "Unified View",
        feature1Text: "Incidents, teams and resources",
        feature2Title: "Faster Response",
        feature2Text: "Team recommendations by readiness",
        feature3Title: "Field Visibility",
        feature3Text: "Live operational status",
        commandCenter: "Operations Center",
        welcome: "Welcome back",
        loginDescription: "Enter your credentials to access MADAD Operations Center.",
        email: "Email address",
        emailPlaceholder: "name@organization.sa",
        password: "Password",
        passwordPlaceholder: "Enter your password",
        showPassword: "Show password",
        hidePassword: "Hide password",
        login: "Enter Operations Center",
        loading: "Verifying...",
        demoDivider: "or explore the platform",
        demoTitle: "Use demo account",
        demoText: "Fill demo credentials automatically",
        secure: "Secure connection",
        error: "Unable to sign in",
        genericError: "An error occurred while signing in",
        language: "عربي",
    },
};

export default function Login() {
    const router = useRouter();

    const [language, setLanguage] = useState<Language>("ar");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const t = copy[language];
    const isArabic = language === "ar";

    useEffect(() => {
        const savedLanguage = localStorage.getItem("madad_language");

        if (savedLanguage === "ar" || savedLanguage === "en") {
            setLanguage(savedLanguage);
        }
    }, []);

    function changeLanguage() {
        const nextLanguage: Language = language === "ar" ? "en" : "ar";

        setLanguage(nextLanguage);
        localStorage.setItem("madad_language", nextLanguage);
        setError("");
    }

    function fillDemoAccount() {
        setEmail("admin@madad.sa");
        setPassword("Madad@123");
        setError("");
    }

    async function submit(e: FormEvent<HTMLFormElement>) {
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
                throw new Error(data.error || t.error);
            }

            localStorage.setItem("madad_access_token", data.accessToken);
            localStorage.setItem("madad_user", JSON.stringify(data.user));

            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : t.genericError);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main
            className={styles.page}
            dir={isArabic ? "rtl" : "ltr"}
            lang={language}
        >
            {/* ================= BACKGROUND ================= */}

            <div className={styles.background} aria-hidden="true">
                <video
                    className={styles.video}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                >
                    <source src="/videos/madad-bg.mp4" type="video/mp4" />
                </video>

                <div className={styles.fallback} />
                <div className={styles.videoOverlay} />

                <div className={`${styles.glow} ${styles.glowOlive}`} />
                <div className={`${styles.glow} ${styles.glowBrown}`} />

                <div className={styles.noise} />
            </div>

            {/* ================= HEADER ================= */}

            <header className={styles.header}>
                <div className={styles.brand}>
                    <div className={styles.logo} aria-hidden="true">
                        <svg viewBox="0 0 48 48" fill="none">
                            <path
                                d="M24 5 39 13.7v17.4L24 39.8 9 31.1V13.7L24 5Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                            />

                            <path
                                d="M24 12.8 33 18v12l-9 5.2L15 30V18l9-5.2Z"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                opacity=".55"
                            />

                            <circle cx="24" cy="24" r="4.2" fill="currentColor" />
                        </svg>
                    </div>

                    <div className={styles.brandText}>
                        <strong>مَدَد</strong>
                        <span>{t.platform}</span>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    <div className={styles.systemStatus}>
                        <span className={styles.statusPulse}>
                            <span />
                        </span>

                        <span>{t.status}</span>
                    </div>

                    <button
                        type="button"
                        className={styles.languageButton}
                        onClick={changeLanguage}
                        aria-label="Change language"
                    >
                        <svg viewBox="0 0 24 24" fill="none">
                            <circle
                                cx="12"
                                cy="12"
                                r="8.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            />

                            <path
                                d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5"
                                stroke="currentColor"
                                strokeWidth="1.3"
                            />
                        </svg>

                        <span>{t.language}</span>
                    </button>
                </div>
            </header>

            {/* ================= CONTENT ================= */}

            <div className={styles.layout}>
                {/* HERO */}

                <section className={styles.hero}>
                    <div className={styles.heroMain}>
                        <div className={styles.eyebrow}>
                            <span />
                            {t.eyebrow}
                        </div>

                        <h1 className={styles.heroTitle}>
                            {t.heroTitle}
                            <span>{t.heroAccent}</span>
                        </h1>

                        <p className={styles.heroDescription}>
                            {t.heroDescription}
                        </p>

                        <div className={styles.features}>
                            <article className={styles.feature}>
                                <div className={styles.featureNumber}>01</div>

                                <div>
                                    <strong>{t.feature1Title}</strong>
                                    <span>{t.feature1Text}</span>
                                </div>
                            </article>

                            <article className={styles.feature}>
                                <div className={styles.featureNumber}>02</div>

                                <div>
                                    <strong>{t.feature2Title}</strong>
                                    <span>{t.feature2Text}</span>
                                </div>
                            </article>

                            <article className={styles.feature}>
                                <div className={styles.featureNumber}>03</div>

                                <div>
                                    <strong>{t.feature3Title}</strong>
                                    <span>{t.feature3Text}</span>
                                </div>
                            </article>
                        </div>
                    </div>

                    <div className={styles.heroFooter}>
                        <span>MADAD</span>
                        <div />
                        <span>FIELD OPERATIONS</span>
                        <span>2026</span>
                    </div>
                </section>

                {/* LOGIN */}

                <section className={styles.authSection}>
                    <div className={styles.authCard}>
                        <div className={styles.cardAccent} />

                        <div className={styles.authHeader}>
                            <div className={styles.commandBadge}>
                                <span />
                                {t.commandCenter}
                            </div>

                            <h2>{t.welcome}</h2>

                            <p>{t.loginDescription}</p>
                        </div>

                        {error && (
                            <div className={styles.error} role="alert">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="8.5"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    />
                                    <path
                                        d="M12 7.5v5M12 16v.3"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                    />
                                </svg>

                                <span>{error}</span>
                            </div>
                        )}

                        <form className={styles.form} onSubmit={submit}>
                            {/* EMAIL */}

                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>{t.email}</span>

                                <div className={styles.inputWrapper}>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <rect
                                            x="3.5"
                                            y="5.5"
                                            width="17"
                                            height="13"
                                            rx="2.5"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        />
                                        <path
                                            d="m5 7 7 5 7-5"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        />
                                    </svg>

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t.emailPlaceholder}
                                        autoComplete="email"
                                        dir="ltr"
                                        required
                                    />
                                </div>
                            </label>

                            {/* PASSWORD */}

                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>{t.password}</span>

                                <div className={styles.inputWrapper}>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <rect
                                            x="5"
                                            y="10"
                                            width="14"
                                            height="10"
                                            rx="2.5"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        />

                                        <path
                                            d="M8 10V7a4 4 0 0 1 8 0v3"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        />
                                    </svg>

                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={t.passwordPlaceholder}
                                        autoComplete="current-password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPassword((value) => !value)}
                                        aria-label={
                                            showPassword ? t.hidePassword : t.showPassword
                                        }
                                    >
                                        {showPassword ? (
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <path
                                                    d="M3 3l18 18"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                />

                                                <path
                                                    d="M10.5 10.5a2.2 2.2 0 0 0 3 3"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                />

                                                <path
                                                    d="M9 5.5A9.6 9.6 0 0 1 12 5c5.5 0 9 7 9 7a14.5 14.5 0 0 1-2.4 3.2M6.2 6.2C4.2 7.7 3 10 3 12c0 0 3.5 7 9 7 1.1 0 2.1-.2 3-.5"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <path
                                                    d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z"
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

                            {/* LOGIN BUTTON */}

                            <button
                                type="submit"
                                className={styles.loginButton}
                                disabled={loading}
                            >
                                <span>
                                    {loading ? t.loading : t.login}
                                </span>

                                {loading ? (
                                    <span className={styles.loader} />
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path
                                            d={
                                                isArabic
                                                    ? "M15 6l-6 6 6 6"
                                                    : "M9 6l6 6-6 6"
                                            }
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </button>

                            {/* DIVIDER */}

                            <div className={styles.divider}>
                                <span />
                                <p>{t.demoDivider}</p>
                                <span />
                            </div>

                            {/* DEMO */}

                            <button
                                type="button"
                                className={styles.demoButton}
                                onClick={fillDemoAccount}
                            >
                                <div className={styles.demoIcon}>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M5 12h14M14 7l5 5-5 5"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>

                                <div className={styles.demoText}>
                                    <strong>{t.demoTitle}</strong>
                                    <span>{t.demoText}</span>
                                </div>
                            </button>
                        </form>

                        <footer className={styles.authFooter}>
                            <div>
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

                                <span>{t.secure}</span>
                            </div>

                            <span>MADAD · مَدَد</span>
                        </footer>
                    </div>
                </section>
            </div>
        </main>
    );
}