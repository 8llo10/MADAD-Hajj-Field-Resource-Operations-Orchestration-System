"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    ReactNode,
    useEffect,
    useMemo,
    useState,
} from "react";

import styles from "./AppShell.module.css";

type Language = "ar" | "en";

type NavItem = {
    href: string;
    ar: string;
    en: string;
    icon: ReactNode;
};

const icons = {
    dashboard: (
        <svg viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="7" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
            <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
    ),

    incidents: (
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 3 21 19H3L12 3Z" />
            <path d="M12 9v4" />
            <path d="M12 16.5v.1" />
        </svg>
    ),

    dispatch: (
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="2.3" />
            <path d="m13.7 10.3 3.7-3.7-1.2 4.9" />
            <path d="M6 18 9.5 14.5" />
        </svg>
    ),

    teams: (
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="8" r="3" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M3.5 19c.4-4 2.4-6 5.5-6s5.1 2 5.5 6" />
            <path d="M15 14c3.2 0 4.8 1.7 5 5" />
        </svg>
    ),

    resources: (
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" />
            <path d="m4 12 8 4.5 8-4.5" />
            <path d="m4 16.5 8 4.5 8-4.5" />
        </svg>
    ),

    inventory: (
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16v13H4V7Z" />
            <path d="M3 4h18v3H3V4Z" />
            <path d="M9 11h6" />
        </svg>
    ),

    reports: (
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 20V10" />
            <path d="M12 20V4" />
            <path d="M19 20v-7" />
            <path d="M3 20h18" />
        </svg>
    ),
};

const navItems: NavItem[] = [
    {
        href: "/dashboard",
        ar: "مركز العمليات",
        en: "Operations Center",
        icon: icons.dashboard,
    },
    {
        href: "/incidents",
        ar: "البلاغات",
        en: "Incidents",
        icon: icons.incidents,
    },
    {
        href: "/dispatch",
        ar: "توجيه الفرق",
        en: "Dispatch",
        icon: icons.dispatch,
    },
    {
        href: "/teams",
        ar: "الفرق الميدانية",
        en: "Field Teams",
        icon: icons.teams,
    },
    {
        href: "/resources",
        ar: "الموارد",
        en: "Resources",
        icon: icons.resources,
    },
    {
        href: "/inventory",
        ar: "المخزون",
        en: "Inventory",
        icon: icons.inventory,
    },
    {
        href: "/reports",
        ar: "التقارير",
        en: "Reports",
        icon: icons.reports,
    },
];

const text = {
    ar: {
        platform: "منصة العمليات الميدانية",
        navigation: "التشغيل",
        connected: "الأنظمة متصلة",
        language: "EN",
        menu: "القائمة",
        close: "إغلاق",
        logout: "تسجيل الخروج",
        userFallback: "مستخدم مَدَد",
        roleFallback: "مركز العمليات",
    },

    en: {
        platform: "Field Operations Platform",
        navigation: "OPERATIONS",
        connected: "Systems connected",
        language: "عربي",
        menu: "Menu",
        close: "Close",
        logout: "Sign out",
        userFallback: "MADAD User",
        roleFallback: "Operations Center",
    },
};

export default function AppShell({
    children,
}: {
    children: ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();

    const [language, setLanguage] = useState<Language>("ar");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [ready, setReady] = useState(false);
    const [userName, setUserName] = useState("");
    const [userRole, setUserRole] = useState("");

    const t = text[language];
    const isArabic = language === "ar";

    useEffect(() => {
        const token = localStorage.getItem("madad_access_token");

        if (!token) {
            router.replace("/login");
            return;
        }

        const savedLanguage = localStorage.getItem("madad_language");

        if (savedLanguage === "ar" || savedLanguage === "en") {
            setLanguage(savedLanguage);
        }

        const storedUser = localStorage.getItem("madad_user");

        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);

                setUserName(
                    user.name ||
                    user.fullName ||
                    user.email ||
                    ""
                );

                setUserRole(
                    user.role ||
                    user.department ||
                    ""
                );
            } catch {
                // Ignore invalid stored user data.
            }
        }

        setReady(true);
    }, [router]);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!mobileOpen) {
            document.body.style.overflow = "";
            return;
        }

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    const currentPage = useMemo(() => {
        return (
            navItems.find(
                (item) =>
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
            ) || navItems[0]
        );
    }, [pathname]);

    function isActive(href: string) {
        return (
            pathname === href ||
            pathname.startsWith(`${href}/`)
        );
    }

    function toggleLanguage() {
        const nextLanguage: Language =
            language === "ar" ? "en" : "ar";

        setLanguage(nextLanguage);
        localStorage.setItem(
            "madad_language",
            nextLanguage
        );
    }

    function logout() {
        localStorage.removeItem("madad_access_token");
        localStorage.removeItem("madad_user");

        router.replace("/login");
    }

    if (!ready) {
        return (
            <div className={styles.loadingPage}>
                <div className={styles.loadingMark}>
                    <span>م</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className={styles.shell}
            dir={isArabic ? "rtl" : "ltr"}
            lang={language}
        >
            {/* BACKGROUND */}

            <div
                className={styles.background}
                aria-hidden="true"
            >
                <video
                    className={styles.backgroundVideo}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                >
                    <source
                        src="/videos/madad-bg.mp4"
                        type="video/mp4"
                    />
                </video>

                <div className={styles.backgroundFallback} />
                <div className={styles.backgroundOverlay} />
                <div className={styles.backgroundTexture} />
            </div>

            {/* DESKTOP SIDEBAR */}

            <aside className={styles.sidebar}>
                <div className={styles.sidebarTop}>
                    <Link
                        href="/dashboard"
                        className={styles.brand}
                    >
                        <div className={styles.logo}>
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
                                    opacity=".5"
                                />

                                <circle
                                    cx="24"
                                    cy="24"
                                    r="4"
                                    fill="currentColor"
                                />
                            </svg>
                        </div>

                        <div className={styles.brandCopy}>
                            <strong>مَدَد</strong>
                            <span>{t.platform}</span>
                        </div>
                    </Link>

                    <div className={styles.connection}>
                        <span className={styles.connectionDot}>
                            <span />
                        </span>

                        {t.connected}
                    </div>
                </div>

                <div className={styles.navigation}>
                    <div className={styles.navigationLabel}>
                        {t.navigation}
                    </div>

                    <nav className={styles.nav}>
                        {navItems.map((item) => {
                            const active = isActive(item.href);

                            return (
                                <Link
                                    href={item.href}
                                    key={item.href}
                                    className={`${styles.navLink} ${active ? styles.navLinkActive : ""
                                        }`}
                                >
                                    <span className={styles.navIcon}>
                                        {item.icon}
                                    </span>

                                    <span className={styles.navText}>
                                        {isArabic ? item.ar : item.en}
                                    </span>

                                    {active && (
                                        <span
                                            className={styles.activeIndicator}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className={styles.sidebarBottom}>
                    <button
                        type="button"
                        className={styles.languageButton}
                        onClick={toggleLanguage}
                    >
                        <span className={styles.languageIcon}>
                            <svg viewBox="0 0 24 24" fill="none">
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="8.5"
                                />

                                <path d="M3.8 12h16.4" />

                                <path d="M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5" />

                                <path d="M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5" />
                            </svg>
                        </span>

                        <span>{t.language}</span>
                    </button>

                    <div className={styles.profile}>
                        <div className={styles.avatar}>
                            {userName
                                ? userName.trim().charAt(0).toUpperCase()
                                : "M"}
                        </div>

                        <div className={styles.profileCopy}>
                            <strong>
                                {userName || t.userFallback}
                            </strong>

                            <span>
                                {userRole || t.roleFallback}
                            </span>
                        </div>

                        <button
                            type="button"
                            className={styles.logoutIcon}
                            onClick={logout}
                            aria-label={t.logout}
                            title={t.logout}
                        >
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" />

                                <path d="M14 8l4 4-4 4" />

                                <path d="M18 12H9" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* MOBILE HEADER */}

            <header className={styles.mobileHeader}>
                <Link
                    href="/dashboard"
                    className={styles.mobileBrand}
                >
                    <div className={styles.mobileLogo}>
                        <svg viewBox="0 0 48 48" fill="none">
                            <path
                                d="M24 5 39 13.7v17.4L24 39.8 9 31.1V13.7L24 5Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                            />

                            <circle
                                cx="24"
                                cy="24"
                                r="4"
                                fill="currentColor"
                            />
                        </svg>
                    </div>

                    <div>
                        <strong>مَدَد</strong>
                        <span>
                            {isArabic
                                ? currentPage.ar
                                : currentPage.en}
                        </span>
                    </div>
                </Link>

                <div className={styles.mobileActions}>
                    <button
                        type="button"
                        className={styles.mobileLanguage}
                        onClick={toggleLanguage}
                    >
                        {t.language}
                    </button>

                    <button
                        type="button"
                        className={styles.menuButton}
                        onClick={() => setMobileOpen(true)}
                        aria-label={t.menu}
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </div>
            </header>

            {/* MOBILE OVERLAY */}

            <button
                type="button"
                aria-label={t.close}
                className={`${styles.drawerBackdrop} ${mobileOpen
                        ? styles.drawerBackdropVisible
                        : ""
                    }`}
                onClick={() => setMobileOpen(false)}
            />

            {/* MOBILE DRAWER */}

            <aside
                className={`${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : ""
                    }`}
            >
                <div className={styles.drawerHeader}>
                    <div className={styles.drawerBrand}>
                        <div className={styles.logo}>
                            <svg viewBox="0 0 48 48" fill="none">
                                <path
                                    d="M24 5 39 13.7v17.4L24 39.8 9 31.1V13.7L24 5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                />

                                <circle
                                    cx="24"
                                    cy="24"
                                    r="4"
                                    fill="currentColor"
                                />
                            </svg>
                        </div>

                        <div>
                            <strong>مَدَد</strong>
                            <span>{t.platform}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={() => setMobileOpen(false)}
                        aria-label={t.close}
                    >
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="m6 6 12 12M18 6 6 18" />
                        </svg>
                    </button>
                </div>

                <div className={styles.drawerConnection}>
                    <span className={styles.connectionDot}>
                        <span />
                    </span>

                    {t.connected}
                </div>

                <nav className={styles.drawerNav}>
                    {navItems.map((item) => {
                        const active = isActive(item.href);

                        return (
                            <Link
                                href={item.href}
                                key={item.href}
                                className={`${styles.drawerLink} ${active
                                        ? styles.drawerLinkActive
                                        : ""
                                    }`}
                            >
                                <span className={styles.navIcon}>
                                    {item.icon}
                                </span>

                                <span>
                                    {isArabic ? item.ar : item.en}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.drawerFooter}>
                    <div className={styles.profile}>
                        <div className={styles.avatar}>
                            {userName
                                ? userName.trim().charAt(0).toUpperCase()
                                : "M"}
                        </div>

                        <div className={styles.profileCopy}>
                            <strong>
                                {userName || t.userFallback}
                            </strong>

                            <span>
                                {userRole || t.roleFallback}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className={styles.mobileLogout}
                        onClick={logout}
                    >
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" />
                            <path d="M14 8l4 4-4 4" />
                            <path d="M18 12H9" />
                        </svg>

                        <span>{t.logout}</span>
                    </button>
                </div>
            </aside>

            {/* PAGE */}

            <main className={styles.content}>
                {children}
            </main>
        </div>
    );
}