"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/lib/i18n/provider";

export default function LandingPage() {
  const { t, lang, setLang } = useLang();

  // ── Auth state ──
  const [user, setUser] = useState<unknown>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── UI state ──
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [countersAnimated, setCountersAnimated] = useState(false);
  const [counterValues, setCounterValues] = useState([0, 0, 0]);

  // ── CTA form state ──
  const [ctaForm, setCtaForm] = useState({
    name: "",
    email: "",
    phone: "",
    hostType: "",
  });

  const statsRef = useRef<HTMLDivElement>(null);

  // ── Nav links data (depends on t) ──
  const navLinks = [
    { label: t("landing.nav.problem"), href: "#problem" },
    { label: t("landing.nav.solution"), href: "#solution" },
    { label: t("landing.nav.billing"), href: "#billing" },
    { label: t("landing.nav.goodCop"), href: "#good-cop" },
    { label: t("landing.nav.pricing"), href: "#pricing" },
    { label: t("landing.nav.faq"), href: "#faq" },
  ];

  // ── FAQ data (depends on t) ──
  const faqs = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4") },
    { q: t("landing.faq.q5"), a: t("landing.faq.a5") },
    { q: t("landing.faq.q6"), a: t("landing.faq.a6") },
    { q: t("landing.faq.q7"), a: t("landing.faq.a7") },
    { q: t("landing.faq.q8"), a: t("landing.faq.a8") },
    { q: t("landing.faq.q9"), a: t("landing.faq.a9") },
  ];

  // ── Auth check ──
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoading(false);
    });
  }, []);

  // ── Scroll progress ──
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Counter animation ──
  const animateCounters = useCallback(() => {
    if (countersAnimated) return;
    setCountersAnimated(true);
    const targets = [75, 70, 80];
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounterValues(targets.map((t) => Math.round(t * eased)));
      if (step >= steps) clearInterval(timer);
    }, interval);
  }, [countersAnimated]);

  useEffect(() => {
    const node = statsRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) animateCounters();
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [animateCounters]);

  // ── Smooth scroll helper ──
  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // ── CTA form submit ──
  const handleCtaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(
      t("landing.cta.thankYou").replace("{name}", ctaForm.name) +
        `\n${t("landing.cta.emailLabel")}: ${ctaForm.email}\n${t("landing.cta.phoneLabel")}: ${ctaForm.phone}\n${t("landing.cta.hostTypeLabel")}: ${ctaForm.hostType}`
    );
    setCtaForm({ name: "", email: "", phone: "", hostType: "" });
  };

  return (
    <>
      {/* ── Scroll Progress Bar ── */}
      <div
        className="tk-scroll-progress"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* ── Mobile Menu Overlay ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[1999]"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Mobile Menu ── */}
      <div className={`tk-mobile-menu ${mobileMenuOpen ? "active" : ""}`}>
        <div className="flex justify-between items-center mb-8">
          <span className="text-xl font-bold text-[var(--tk-blue)]">
            <i className="fas fa-shield-check mr-2" />
            Trust Keeper
          </span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-2xl text-[var(--tk-gray-600)]"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        <nav className="flex flex-col gap-4">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-left text-[var(--tk-gray-700)] hover:text-[var(--tk-blue)] font-medium py-2"
            >
              {link.label}
            </button>
          ))}
          <hr className="my-2 border-[var(--tk-gray-200)]" />
          {/* Mobile language toggle */}
          <button
            onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            className="text-left text-sm font-medium text-[var(--tk-gray-600)] hover:text-[var(--tk-blue)] transition-colors py-2"
          >
            {lang === "ko" ? "EN" : "KO"}
          </button>
          {!authLoading &&
            (user ? (
              <>
                <Link
                  href="/host"
                  className="text-[var(--tk-blue)] font-semibold py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("landing.nav.myMeetups")}
                </Link>
                <Link
                  href="/create"
                  className="tk-gradient-primary text-white text-center py-3 rounded-lg font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("landing.nav.createMeetup")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/host/login"
                  className="text-[var(--tk-blue)] font-semibold py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("landing.nav.hostLogin")}
                </Link>
                <Link
                  href="/host/login"
                  className="tk-gradient-primary text-white text-center py-3 rounded-lg font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("landing.nav.freeTrial")}
                </Link>
              </>
            ))}
        </nav>
      </div>

      {/* ══════════════════════════════════════════
          NAVIGATION
      ══════════════════════════════════════════ */}
      <nav className="tk-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2"
            >
              <i className="fas fa-shield-check text-2xl text-[var(--tk-blue)]" />
              <span className="text-xl font-bold text-[var(--tk-gray-900)]">
                Trust Keeper
              </span>
            </button>

            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-sm font-medium text-[var(--tk-gray-600)] hover:text-[var(--tk-blue)] transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop auth buttons */}
            <div className="hidden lg:flex items-center gap-3">
              {!authLoading &&
                (user ? (
                  <>
                    <Link
                      href="/host"
                      className="text-sm font-medium text-[var(--tk-blue)] hover:text-[var(--tk-blue-dark)] transition-colors"
                    >
                      {t("landing.nav.myMeetups")}
                    </Link>
                    <Link
                      href="/create"
                      className="tk-gradient-primary text-white px-5 py-2 rounded-lg text-sm font-semibold tk-btn-hover"
                    >
                      {t("landing.nav.createMeetup")}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/host/login"
                      className="text-sm font-medium text-[var(--tk-blue)] hover:text-[var(--tk-blue-dark)] transition-colors"
                    >
                      {t("landing.nav.hostLogin")}
                    </Link>
                    <Link
                      href="/host/login"
                      className="tk-gradient-primary text-white px-5 py-2 rounded-lg text-sm font-semibold tk-btn-hover"
                    >
                      {t("landing.nav.freeTrial")}
                    </Link>
                  </>
                ))}
              {/* Desktop language toggle */}
              <button
                onClick={() => setLang(lang === "ko" ? "en" : "ko")}
                className="text-sm font-medium text-[var(--tk-gray-600)] hover:text-[var(--tk-blue)] transition-colors"
              >
                {lang === "ko" ? "EN" : "KO"}
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden text-2xl text-[var(--tk-gray-700)]"
              onClick={() => setMobileMenuOpen(true)}
            >
              <i className="fas fa-bars" />
            </button>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section className="tk-hero pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full text-sm font-medium text-[var(--tk-blue)] mb-6 shadow-sm">
            <i className="fas fa-rocket" />
            {t("landing.hero.badge")}
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--tk-gray-900)] mb-6 leading-tight">
            {t("landing.hero.title")}
            <span className="text-[var(--tk-blue)]">{t("landing.hero.titleHighlight")}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-[var(--tk-gray-600)] max-w-3xl mx-auto mb-10 leading-relaxed">
            {t("landing.hero.subtitle")}
            <br className="hidden sm:block" />
            {t("landing.hero.subtitleLine2")}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => {
                if (user) {
                  scrollTo("#cta");
                } else {
                  window.location.href = "/host/login";
                }
              }}
              className="tk-gradient-primary text-white px-8 py-4 rounded-xl text-lg font-bold tk-btn-hover shadow-lg shadow-blue-500/25"
            >
              <i className="fas fa-bolt mr-2" />
              {t("landing.hero.ctaFree")}
            </button>
            <button
              onClick={() => scrollTo("#how-it-works")}
              className="border-2 border-[var(--tk-blue)] text-[var(--tk-blue)] bg-white px-8 py-4 rounded-xl text-lg font-bold tk-btn-hover hover:bg-blue-50"
            >
              <i className="fas fa-play-circle mr-2" />
              {t("landing.hero.ctaHow")}
            </button>
          </div>

          {/* Stat cards */}
          <div
            ref={statsRef}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {/* Stat 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg tk-card-hover">
              <div className="text-4xl font-black text-[var(--tk-blue)] mb-1">
                <span className="tk-stat-value">{counterValues[0]}</span>
              </div>
              <div className="text-sm font-semibold text-[var(--tk-gray-900)] mb-1">
                {t("landing.stat1.label")}
              </div>
              <div className="text-xs text-[var(--tk-gray-500)]">
                {t("landing.stat1.detail")}
              </div>
            </div>
            {/* Stat 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg tk-card-hover">
              <div className="text-4xl font-black text-[var(--tk-green)] mb-1">
                <span className="tk-stat-value">{counterValues[1]}</span>
              </div>
              <div className="text-sm font-semibold text-[var(--tk-gray-900)] mb-1">
                {t("landing.stat2.label")}
              </div>
              <div className="text-xs text-[var(--tk-gray-500)]">
                {t("landing.stat2.detail")}
              </div>
            </div>
            {/* Stat 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg tk-card-hover">
              <div className="text-4xl font-black text-[var(--tk-orange)] mb-1">
                <span className="tk-stat-value">{counterValues[2]}</span>
              </div>
              <div className="text-sm font-semibold text-[var(--tk-gray-900)] mb-1">
                {t("landing.stat3.label")}
              </div>
              <div className="text-xs text-[var(--tk-gray-500)]">
                {t("landing.stat3.detail")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROBLEM SECTION
      ══════════════════════════════════════════ */}
      <section id="problem" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-red-100 text-[var(--tk-red)] text-sm font-semibold px-4 py-1 rounded-full mb-4">
              {t("landing.problem.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--tk-gray-900)] mb-4">
              {t("landing.problem.title")}
              <span className="text-[var(--tk-red)]">{t("landing.problem.titleHighlight")}</span>
            </h2>
            <p className="text-[var(--tk-gray-600)] max-w-2xl mx-auto">
              {t("landing.problem.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Problem 1 */}
            <div className="bg-white border border-[var(--tk-gray-200)] rounded-2xl p-8 tk-card-hover text-center">
              <div className="w-16 h-16 tk-gradient-danger rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-coins text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-[var(--tk-gray-900)] mb-3">
                {t("landing.problem.card1.title")}
              </h3>
              <p className="text-[var(--tk-gray-600)] mb-4">
                {t("landing.problem.card1.desc")}
              </p>
              <div className="tk-badge-bad inline-block px-3 py-1 rounded-full text-sm font-semibold">
                {t("landing.problem.card1.badge")}
              </div>
            </div>

            {/* Problem 2 */}
            <div className="bg-white border border-[var(--tk-gray-200)] rounded-2xl p-8 tk-card-hover text-center">
              <div className="w-16 h-16 tk-gradient-danger rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-user-clock text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-[var(--tk-gray-900)] mb-3">
                {t("landing.problem.card2.title")}
              </h3>
              <p className="text-[var(--tk-gray-600)] mb-4">
                {t("landing.problem.card2.desc")}
              </p>
              <div className="tk-badge-bad inline-block px-3 py-1 rounded-full text-sm font-semibold">
                {t("landing.problem.card2.badge")}
              </div>
            </div>

            {/* Problem 3 */}
            <div className="bg-white border border-[var(--tk-gray-200)] rounded-2xl p-8 tk-card-hover text-center">
              <div className="w-16 h-16 tk-gradient-danger rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-heart-broken text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-[var(--tk-gray-900)] mb-3">
                {t("landing.problem.card3.title")}
              </h3>
              <p className="text-[var(--tk-gray-600)] mb-4">
                {t("landing.problem.card3.desc")}
              </p>
              <div className="tk-badge-bad inline-block px-3 py-1 rounded-full text-sm font-semibold">
                {t("landing.problem.card3.badge")}
              </div>
            </div>
          </div>

          {/* Verification box */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <i className="fas fa-check-circle text-[var(--tk-blue)] text-xl mr-2" />
            <span className="text-[var(--tk-gray-700)] font-medium">
              <strong className="text-[var(--tk-blue)]">{t("landing.problem.verification")}</strong> +{" "}
              <strong className="text-[var(--tk-blue)]">{t("landing.problem.verificationPlus")}</strong>{" "}
              {t("landing.problem.verificationSuffix")}
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SOLUTION SECTION
      ══════════════════════════════════════════ */}
      <section id="solution" className="py-20 bg-[var(--tk-gray-100)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-100 text-[var(--tk-blue)] text-sm font-semibold px-4 py-1 rounded-full mb-4">
              {t("landing.solution.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--tk-gray-900)] mb-4">
              {t("landing.solution.title")}
              <span className="text-[var(--tk-blue)]">{t("landing.solution.titleHighlight")}</span>
            </h2>
            <p className="text-[var(--tk-gray-600)] max-w-2xl mx-auto">
              {t("landing.solution.subtitle")}
            </p>
          </div>

          {/* Good Cop vs Bad Cop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
            {/* Good Cop */}
            <div className="bg-white border-2 border-[var(--tk-green)] rounded-2xl p-8 text-center tk-card-hover">
              <div className="w-20 h-20 tk-gradient-success rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-smile text-white text-3xl" />
              </div>
              <div className="tk-badge-good inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3">
                {t("landing.solution.goodCop.badge")}
              </div>
              <h3 className="text-2xl font-bold text-[var(--tk-gray-900)] mb-2">
                {t("landing.solution.goodCop.title")}
              </h3>
              <p className="text-[var(--tk-gray-600)]">
                {t("landing.solution.goodCop.desc")}
              </p>
            </div>

            {/* Bad Cop */}
            <div className="bg-[var(--tk-gray-900)] border-2 border-[var(--tk-gray-700)] rounded-2xl p-8 text-center tk-card-hover">
              <div className="w-20 h-20 bg-[var(--tk-gray-700)] rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-robot text-[var(--tk-blue)] text-3xl" />
              </div>
              <div className="inline-block bg-[var(--tk-gray-700)] text-[var(--tk-blue)] px-3 py-1 rounded-full text-sm font-semibold mb-3">
                {t("landing.solution.badCop.badge")}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {t("landing.solution.badCop.title")}
              </h3>
              <p className="text-[var(--tk-gray-400)]">
                {t("landing.solution.badCop.desc")}
              </p>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 tk-card-hover">
              <div className="w-12 h-12 tk-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-credit-card text-white text-lg" />
              </div>
              <h4 className="font-bold text-[var(--tk-gray-900)] mb-2">
                {t("landing.solution.feature1.title")}
              </h4>
              <p className="text-sm text-[var(--tk-gray-600)]">
                {t("landing.solution.feature1.desc")}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 tk-card-hover">
              <div className="w-12 h-12 tk-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-bell text-white text-lg" />
              </div>
              <h4 className="font-bold text-[var(--tk-gray-900)] mb-2">
                {t("landing.solution.feature2.title")}
              </h4>
              <p className="text-sm text-[var(--tk-gray-600)]">
                {t("landing.solution.feature2.desc")}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 tk-card-hover">
              <div className="w-12 h-12 tk-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-chart-bar text-white text-lg" />
              </div>
              <h4 className="font-bold text-[var(--tk-gray-900)] mb-2">
                {t("landing.solution.feature3.title")}
              </h4>
              <p className="text-sm text-[var(--tk-gray-600)]">
                {t("landing.solution.feature3.desc")}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 tk-card-hover">
              <div className="w-12 h-12 tk-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-handshake text-white text-lg" />
              </div>
              <h4 className="font-bold text-[var(--tk-gray-900)] mb-2">
                {t("landing.solution.feature4.title")}
              </h4>
              <p className="text-sm text-[var(--tk-gray-600)]">
                {t("landing.solution.feature4.desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BILLING SECTION
      ══════════════════════════════════════════ */}
      <section id="billing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-100 text-[var(--tk-blue)] text-sm font-semibold px-4 py-1 rounded-full mb-4">
              {t("landing.billing.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--tk-gray-900)] mb-4">
              {t("landing.billing.title")}
              <span className="text-[var(--tk-blue)]">{t("landing.billing.titleHighlight")}</span>
            </h2>
            <p className="text-[var(--tk-gray-600)] max-w-2xl mx-auto">
              {t("landing.billing.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* AS-IS */}
            <div className="border-2 border-[var(--tk-red)] rounded-2xl p-8 relative">
              <div className="tk-badge-bad inline-block px-4 py-1 rounded-full text-sm font-bold mb-6">
                {t("landing.billing.asis")}
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[var(--tk-red)]">1</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--tk-gray-900)]">{t("landing.billing.asis.step1")}</p>
                    <p className="text-sm text-[var(--tk-gray-500)]">{t("landing.billing.asis.step1Desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[var(--tk-red)]">2</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--tk-gray-900)]">{t("landing.billing.asis.step2")}</p>
                    <p className="text-sm text-[var(--tk-gray-500)]">{t("landing.billing.asis.step2Desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[var(--tk-red)]">3</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--tk-gray-900)]">{t("landing.billing.asis.step3")}</p>
                    <p className="text-sm text-[var(--tk-gray-500)]">{t("landing.billing.asis.step3Desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[var(--tk-red)]">4</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--tk-gray-900)]">{t("landing.billing.asis.step4")}</p>
                    <p className="text-sm text-[var(--tk-gray-500)]">{t("landing.billing.asis.step4Desc")}</p>
                  </div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-[var(--tk-red)] font-bold">
                    <i className="fas fa-exclamation-triangle mr-1" />
                    {t("landing.billing.asis.result")}
                  </p>
                </div>
              </div>
            </div>
            {/* TO-BE */}
            <div className="border-2 border-[var(--tk-green)] rounded-2xl p-8 relative">
              <div className="tk-badge-good inline-block px-4 py-1 rounded-full text-sm font-bold mb-6">
                {t("landing.billing.tobe")}
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[var(--tk-green)]">1</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--tk-gray-900)]">{t("landing.billing.tobe.step1")}</p>
                    <p className="text-sm text-[var(--tk-gray-500)]">{t("landing.billing.tobe.step1Desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[var(--tk-green)]">2</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--tk-gray-900)]">{t("landing.billing.tobe.step2")}</p>
                    <p className="text-sm text-[var(--tk-gray-500)]">{t("landing.billing.tobe.step2Desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[var(--tk-green)]">3</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--tk-gray-900)]">{t("landing.billing.tobe.step3")}</p>
                    <p className="text-sm text-[var(--tk-gray-500)]">{t("landing.billing.tobe.step3Desc")}</p>
                    <p className="text-sm text-[var(--tk-gray-500)]">{t("landing.billing.tobe.step3Desc2")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[var(--tk-green)]">4</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--tk-gray-900)]">{t("landing.billing.tobe.step4")}</p>
                    <p className="text-sm text-[var(--tk-gray-500)]">{t("landing.billing.tobe.step4Desc")}</p>
                    <p className="text-sm text-[var(--tk-gray-500)]">{t("landing.billing.tobe.step4Desc2")}</p>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-[var(--tk-green)] font-bold">
                    <i className="fas fa-check-circle mr-1" />
                    {t("landing.billing.tobe.result")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Host benefit card */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-[var(--tk-gray-900)] mb-4">
              {t("landing.billing.benefit.title")}
            </h3>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <div className="text-center">
                <p className="text-sm text-[var(--tk-gray-500)] mb-1">{t("landing.billing.benefit.feeLabel")}</p>
                <p className="text-2xl font-bold text-[var(--tk-gray-900)]">₩29,000</p>
              </div>
              <i className="fas fa-arrow-right text-[var(--tk-gray-400)] text-xl" />
              <div className="text-center">
                <p className="text-sm text-[var(--tk-gray-500)] mb-1">{t("landing.billing.benefit.fullFeeLabel")}</p>
                <p className="text-2xl font-bold text-[var(--tk-green)]">₩29,000</p>
              </div>
              <i className="fas fa-plus text-[var(--tk-gray-400)] text-xl" />
              <div className="text-center">
                <p className="text-sm text-[var(--tk-gray-500)] mb-1">{t("landing.billing.benefit.penaltyLabel")}</p>
                <p className="text-2xl font-bold text-[var(--tk-green)]">{t("landing.billing.benefit.penaltyRate")}</p>
                <p className="text-xs text-[var(--tk-gray-400)] mt-1">{t("landing.billing.benefit.penaltyExample")}</p>
              </div>
            </div>
            <p className="text-sm text-[var(--tk-green)] font-semibold mt-4">
              {t("landing.billing.benefit.totalLabel")}
            </p>
            <p className="text-xs text-[var(--tk-gray-500)] mt-1">
              {t("landing.billing.benefit.note")}
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          GOOD COP SECTION
      ══════════════════════════════════════════ */}
      <section id="good-cop" className="py-20 bg-[var(--tk-gray-100)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-green-100 text-[var(--tk-green)] text-sm font-semibold px-4 py-1 rounded-full mb-4">
              {t("landing.goodCop.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--tk-gray-900)] mb-4">
              {t("landing.goodCop.title")}
              <span className="text-[var(--tk-green)]">{t("landing.goodCop.titleHighlight")}</span>{t("landing.goodCop.titleSuffix")}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
            {/* Left: reasons */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 tk-gradient-success rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-shield-alt text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--tk-gray-900)] mb-1">
                    {t("landing.goodCop.reason1.title")}
                  </h4>
                  <p className="text-[var(--tk-gray-600)]">
                    {t("landing.goodCop.reason1.desc")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 tk-gradient-success rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-heart text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--tk-gray-900)] mb-1">
                    {t("landing.goodCop.reason2.title")}
                  </h4>
                  <p className="text-[var(--tk-gray-600)]">
                    {t("landing.goodCop.reason2.desc")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 tk-gradient-success rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-users text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--tk-gray-900)] mb-1">
                    {t("landing.goodCop.reason3.title")}
                  </h4>
                  <p className="text-[var(--tk-gray-600)]">
                    {t("landing.goodCop.reason3.desc")}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: example meetup post */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-[var(--tk-gray-200)]">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--tk-gray-200)]">
                <div className="w-10 h-10 tk-gradient-primary rounded-full flex items-center justify-center">
                  <i className="fas fa-wine-glass-alt text-white text-sm" />
                </div>
                <div>
                  <p className="font-bold text-[var(--tk-gray-900)]">
                    {t("landing.goodCop.example.title")}
                  </p>
                  <p className="text-xs text-[var(--tk-gray-500)]">
                    {t("landing.goodCop.example.host")}
                  </p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--tk-gray-500)]">
                    <i className="fas fa-calendar mr-2" />
                    {t("landing.goodCop.example.dateLabel")}
                  </span>
                  <span className="font-medium text-[var(--tk-gray-900)]">
                    {t("landing.goodCop.example.date")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--tk-gray-500)]">
                    <i className="fas fa-map-marker-alt mr-2" />
                    {t("landing.goodCop.example.locationLabel")}
                  </span>
                  <span className="font-medium text-[var(--tk-gray-900)]">
                    {t("landing.goodCop.example.location")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--tk-gray-500)]">
                    <i className="fas fa-users mr-2" />
                    {t("landing.goodCop.example.capacityLabel")}
                  </span>
                  <span className="font-medium text-[var(--tk-gray-900)]">
                    {t("landing.goodCop.example.capacity")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--tk-gray-500)]">
                    <i className="fas fa-won-sign mr-2" />
                    {t("landing.goodCop.example.feeLabel")}
                  </span>
                  <span className="font-medium text-[var(--tk-gray-900)]">
                    {t("landing.goodCop.example.fee")}
                  </span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-green-50 rounded-xl text-sm text-[var(--tk-green)]">
                <i className="fas fa-check-circle mr-1" />
                {t("landing.goodCop.example.badge")}
              </div>
              <button className="w-full mt-4 tk-gradient-primary text-white py-3 rounded-xl font-bold tk-btn-hover">
                {t("landing.goodCop.example.btn")}
              </button>
            </div>
          </div>

          {/* Bottom benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 text-center tk-card-hover">
              <div className="text-3xl mb-3">
                <i className="fas fa-smile-beam text-[var(--tk-green)]" />
              </div>
              <h4 className="font-bold text-[var(--tk-gray-900)] mb-2">
                {t("landing.goodCop.benefit1.title")}
              </h4>
              <p className="text-sm text-[var(--tk-gray-600)]">
                {t("landing.goodCop.benefit1.desc")}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center tk-card-hover">
              <div className="text-3xl mb-3">
                <i className="fas fa-clock text-[var(--tk-green)]" />
              </div>
              <h4 className="font-bold text-[var(--tk-gray-900)] mb-2">
                {t("landing.goodCop.benefit2.title")}
              </h4>
              <p className="text-sm text-[var(--tk-gray-600)]">
                {t("landing.goodCop.benefit2.desc")}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center tk-card-hover">
              <div className="text-3xl mb-3">
                <i className="fas fa-chart-line text-[var(--tk-green)]" />
              </div>
              <h4 className="font-bold text-[var(--tk-gray-900)] mb-2">
                {t("landing.goodCop.benefit3.title")}
              </h4>
              <p className="text-sm text-[var(--tk-gray-600)]">
                {t("landing.goodCop.benefit3.desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-100 text-[var(--tk-blue)] text-sm font-semibold px-4 py-1 rounded-full mb-4">
              {t("landing.howItWorks.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--tk-gray-900)] mb-4">
              <span className="text-[var(--tk-blue)]">{t("landing.howItWorks.titleHighlight")}</span>{t("landing.howItWorks.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 tk-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
                <i className="fas fa-calendar-plus text-white text-3xl" />
              </div>
              <div className="text-sm font-bold text-[var(--tk-blue)] mb-2">
                {t("landing.howItWorks.step1.label")}
              </div>
              <h3 className="text-xl font-bold text-[var(--tk-gray-900)] mb-3">
                {t("landing.howItWorks.step1.title")}
              </h3>
              <p className="text-[var(--tk-gray-600)]">
                {t("landing.howItWorks.step1.desc")}
              </p>
            </div>

            {/* Arrow (desktop) */}
            <div className="hidden md:flex items-center justify-center -mt-8">
              {/* Handled by layout */}
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 tk-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
                <i className="fas fa-share-alt text-white text-3xl" />
              </div>
              <div className="text-sm font-bold text-[var(--tk-blue)] mb-2">
                {t("landing.howItWorks.step2.label")}
              </div>
              <h3 className="text-xl font-bold text-[var(--tk-gray-900)] mb-3">
                {t("landing.howItWorks.step2.title")}
              </h3>
              <p className="text-[var(--tk-gray-600)]">
                {t("landing.howItWorks.step2.desc")}
              </p>
            </div>
          </div>

          {/* Step 3 - full width */}
          <div className="text-center mt-12 max-w-md mx-auto">
            <div className="w-20 h-20 tk-gradient-success rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25">
              <i className="fas fa-magic text-white text-3xl" />
            </div>
            <div className="text-sm font-bold text-[var(--tk-green)] mb-2">
              {t("landing.howItWorks.step3.label")}
            </div>
            <h3 className="text-xl font-bold text-[var(--tk-gray-900)] mb-3">
              {t("landing.howItWorks.step3.title")}
            </h3>
            <p className="text-[var(--tk-gray-600)]">
              {t("landing.howItWorks.step3.desc")}
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BENEFITS (Before & After Table)
      ══════════════════════════════════════════ */}
      <section className="py-20 bg-[var(--tk-gray-100)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-100 text-[var(--tk-blue)] text-sm font-semibold px-4 py-1 rounded-full mb-4">
              {t("landing.benefits.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--tk-gray-900)] mb-4">
              {t("landing.benefits.title")}
              <span className="text-[var(--tk-blue)]">{t("landing.benefits.titleHighlight")}</span>
            </h2>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-4xl mx-auto mb-12">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="tk-gradient-primary text-white">
                    <th className="py-4 px-6 text-left font-semibold">{t("landing.benefits.table.category")}</th>
                    <th className="py-4 px-6 text-center font-semibold">{t("landing.benefits.table.before")}</th>
                    <th className="py-4 px-6 text-center font-semibold">{t("landing.benefits.table.after")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--tk-gray-200)]">
                    <td className="py-4 px-6 font-medium text-[var(--tk-gray-900)]">
                      {t("landing.benefits.table.noshowRate")}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="tk-table-before px-3 py-1 rounded-full text-sm font-semibold">
                        {t("landing.benefits.table.noshowBefore")}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="tk-table-after px-3 py-1 rounded-full text-sm font-semibold">
                        {t("landing.benefits.table.noshowAfter")}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--tk-gray-200)]">
                    <td className="py-4 px-6 font-medium text-[var(--tk-gray-900)]">
                      {t("landing.benefits.table.timeLabel")}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="tk-table-before px-3 py-1 rounded-full text-sm font-semibold">
                        {t("landing.benefits.table.timeBefore")}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="tk-table-after px-3 py-1 rounded-full text-sm font-semibold">
                        {t("landing.benefits.table.timeAfter")}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--tk-gray-200)]">
                    <td className="py-4 px-6 font-medium text-[var(--tk-gray-900)]">
                      {t("landing.benefits.table.lossLabel")}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="tk-table-before px-3 py-1 rounded-full text-sm font-semibold">
                        {t("landing.benefits.table.lossBefore")}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="tk-table-after px-3 py-1 rounded-full text-sm font-semibold">
                        {t("landing.benefits.table.lossAfter")}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-[var(--tk-gray-900)]">
                      {t("landing.benefits.table.stressLabel")}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="tk-table-before px-3 py-1 rounded-full text-sm font-semibold">
                        {t("landing.benefits.table.stressBefore")}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="tk-table-after px-3 py-1 rounded-full text-sm font-semibold">
                        {t("landing.benefits.table.stressAfter")}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white rounded-2xl p-8 max-w-3xl mx-auto text-center shadow-lg">
            <i className="fas fa-quote-left text-3xl text-[var(--tk-blue)] opacity-30 mb-4" />
            <p className="text-lg text-[var(--tk-gray-700)] italic mb-6 leading-relaxed">
              &quot;{t("landing.benefits.testimonial")}&quot;
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 tk-gradient-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold">AK</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-[var(--tk-gray-900)]">{t("landing.benefits.testimonialAuthor")}</p>
                <p className="text-sm text-[var(--tk-gray-500)]">
                  {t("landing.benefits.testimonialRole")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════ */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-100 text-[var(--tk-blue)] text-sm font-semibold px-4 py-1 rounded-full mb-4">
              {t("landing.pricing.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--tk-gray-900)] mb-4">
              {t("landing.pricing.title")}
              <span className="text-[var(--tk-blue)]">{t("landing.pricing.titleHighlight")}</span>
            </h2>
            <p className="text-[var(--tk-gray-600)] max-w-2xl mx-auto">
              {t("landing.pricing.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-white border border-[var(--tk-gray-200)] rounded-2xl p-8 tk-card-hover">
              <h3 className="text-lg font-bold text-[var(--tk-gray-900)] mb-2">
                {t("landing.pricing.starter.name")}
              </h3>
              <div className="mb-2">
                <span className="text-4xl font-black text-[var(--tk-gray-900)]">
                  {t("landing.pricing.starter.price")}
                </span>
                <span className="text-[var(--tk-gray-500)]">{t("landing.pricing.starter.period")}</span>
              </div>
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 bg-green-50 text-[var(--tk-green)] text-sm font-semibold px-3 py-1 rounded-full">
                  <i className="fas fa-gift text-xs" />
                  {t("landing.pricing.starter.freeOffer")} &mdash; <span className="line-through text-[var(--tk-gray-400)]">{t("landing.pricing.starter.price")}</span> ₩0
                </span>
              </div>

              <p className="text-xs font-semibold text-[var(--tk-gray-500)] uppercase tracking-wider mb-3">{t("landing.pricing.scaleLabel")}</p>
              <ul className="space-y-2.5 mb-5">
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.starter.max")}
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.starter.limit")}
                </li>
              </ul>

              <p className="text-xs font-semibold text-[var(--tk-gray-500)] uppercase tracking-wider mb-3">{t("landing.pricing.noshowBasicLabel")}</p>
              <ul className="space-y-2.5 mb-8">
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.starter.feature1")}
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.starter.feature2")}
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.starter.feature3")}
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.starter.feature4")}
                </li>
              </ul>

              <button
                onClick={() => scrollTo("#cta")}
                className="w-full border-2 border-[var(--tk-blue)] text-[var(--tk-blue)] py-3 rounded-xl font-bold tk-btn-hover hover:bg-blue-50"
              >
                {t("landing.pricing.starter.btn")}
              </button>
            </div>

            {/* Pro (popular) */}
            <div className="tk-pricing-popular bg-white rounded-2xl p-8 tk-card-hover">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 tk-gradient-primary text-white text-sm font-bold px-4 py-1 rounded-full">
                {t("landing.pricing.pro.popular")}
              </div>
              <h3 className="text-lg font-bold text-[var(--tk-gray-900)] mb-2">
                {t("landing.pricing.pro.name")}
              </h3>
              <div className="mb-6">
                <span className="text-4xl font-black text-[var(--tk-blue)]">
                  {t("landing.pricing.pro.price")}
                </span>
                <span className="text-[var(--tk-gray-500)]">{t("landing.pricing.pro.period")}</span>
              </div>

              <p className="text-xs font-semibold text-[var(--tk-gray-500)] uppercase tracking-wider mb-3">{t("landing.pricing.scaleLabel")}</p>
              <ul className="space-y-2.5 mb-5">
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.pro.max")}
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.pro.limit")}
                </li>
              </ul>

              <p className="text-xs font-semibold text-[var(--tk-gray-500)] uppercase tracking-wider mb-3">{t("landing.pricing.noshowBasicAllLabel")}</p>
              <ul className="space-y-2.5 mb-5">
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.pro.includes")}
                </li>
              </ul>

              <p className="text-xs font-semibold text-[var(--tk-blue)] uppercase tracking-wider mb-3">{t("landing.pricing.extraLabel")}</p>
              <ul className="space-y-2.5 mb-8">
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-blue)]" />
                  {t("landing.pricing.pro.feature1")}
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-600)]">
                  <i className="fas fa-check text-[var(--tk-blue)]" />
                  {t("landing.pricing.pro.feature2")}
                </li>
              </ul>

              <button
                onClick={() => scrollTo("#cta")}
                className="w-full tk-gradient-primary text-white py-3 rounded-xl font-bold tk-btn-hover shadow-lg shadow-blue-500/25"
              >
                {t("landing.pricing.pro.btn")}
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-[var(--tk-gray-900)] rounded-2xl p-8 tk-card-hover">
              <h3 className="text-lg font-bold text-white mb-2">
                {t("landing.pricing.enterprise.name")}
              </h3>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">
                  {t("landing.pricing.enterprise.price")}
                </span>
                <span className="text-[var(--tk-gray-400)]">{t("landing.pricing.enterprise.period")}</span>
              </div>

              <p className="text-xs font-semibold text-[var(--tk-gray-400)] uppercase tracking-wider mb-3">{t("landing.pricing.scaleLabel")}</p>
              <ul className="space-y-2.5 mb-5">
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-300)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.enterprise.max")}
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-300)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.enterprise.limit")}
                </li>
              </ul>

              <p className="text-xs font-semibold text-[var(--tk-gray-400)] uppercase tracking-wider mb-3">{t("landing.pricing.noshowBasicAllLabel")}</p>
              <ul className="space-y-2.5 mb-5">
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-300)]">
                  <i className="fas fa-check text-[var(--tk-green)]" />
                  {t("landing.pricing.enterprise.includes")}
                </li>
              </ul>

              <p className="text-xs font-semibold text-[var(--tk-orange)] uppercase tracking-wider mb-3">{t("landing.pricing.extraLabel")}</p>
              <ul className="space-y-2.5 mb-8">
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-300)]">
                  <i className="fas fa-check text-[var(--tk-orange)]" />
                  {t("landing.pricing.enterprise.feature1")}
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--tk-gray-300)]">
                  <i className="fas fa-check text-[var(--tk-orange)]" />
                  {t("landing.pricing.enterprise.feature2")}
                </li>
              </ul>

              <button
                onClick={() => scrollTo("#cta")}
                className="w-full bg-white text-[var(--tk-gray-900)] py-3 rounded-xl font-bold tk-btn-hover hover:bg-[var(--tk-gray-100)]"
              >
                {t("landing.pricing.enterprise.btn")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SOCIAL PROOF
      ══════════════════════════════════════════ */}
      <section className="tk-social-proof py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-white">
            <div>
              <div className="text-4xl sm:text-5xl font-black mb-2">500+</div>
              <div className="text-blue-100 font-medium">{t("landing.social.hosts")}</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black mb-2">
                10,000+
              </div>
              <div className="text-blue-100 font-medium">{t("landing.social.noshowRate")}</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black mb-2">5.0</div>
              <div className="text-blue-100 font-medium">{t("landing.social.satisfaction")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════ */}
      <section id="faq" className="py-20 bg-[var(--tk-gray-100)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-100 text-[var(--tk-blue)] text-sm font-semibold px-4 py-1 rounded-full mb-4">
              {t("landing.faq.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--tk-gray-900)] mb-4">
              {t("landing.faq.title")}
              <span className="text-[var(--tk-blue)]">{t("landing.faq.titleHighlight")}</span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() =>
                    setOpenFaq(openFaq === index ? null : index)
                  }
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-semibold text-[var(--tk-gray-900)] pr-4">
                    {faq.q}
                  </span>
                  <i
                    className={`fas fa-chevron-down text-[var(--tk-gray-400)] tk-faq-chevron ${
                      openFaq === index ? "open" : ""
                    }`}
                  />
                </button>
                <div
                  className={`tk-faq-answer ${
                    openFaq === index ? "open" : ""
                  }`}
                >
                  <div className="px-6 pb-6 text-[var(--tk-gray-600)] leading-relaxed">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA SECTION
      ══════════════════════════════════════════ */}
      <section id="cta" className="py-20 tk-gradient-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              {t("landing.cta.title")}
            </h2>
            <p className="text-blue-100 text-lg">
              {t("landing.cta.subtitle")}
            </p>
          </div>

          {/* Beta Test Notice */}
          <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-5 mb-8 text-white">
            <div className="flex items-start gap-3">
              <i className="fas fa-flask text-lg mt-0.5"></i>
              <div className="space-y-2 text-sm leading-relaxed">
                <p className="font-bold text-base">{t("landing.cta.betaTitle")}</p>
                <ul className="space-y-1">
                  <li><i className="fas fa-check mr-2 text-green-300"></i>{t("landing.cta.beta1")}</li>
                  <li><i className="fas fa-check mr-2 text-green-300"></i>{t("landing.cta.beta2")}</li>
                  <li><i className="fas fa-check mr-2 text-green-300"></i>{t("landing.cta.beta3")}</li>
                </ul>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleCtaSubmit}
            className="bg-white rounded-2xl p-8 shadow-2xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[var(--tk-gray-700)] mb-1">
                  {t("landing.cta.nameLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={ctaForm.name}
                  onChange={(e) =>
                    setCtaForm({ ...ctaForm, name: e.target.value })
                  }
                  placeholder={t("landing.cta.namePlaceholder")}
                  className="w-full border border-[var(--tk-gray-300)] rounded-xl px-4 py-3 text-[var(--tk-gray-900)] placeholder:text-[var(--tk-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--tk-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--tk-gray-700)] mb-1">
                  {t("landing.cta.emailLabel")}
                </label>
                <input
                  type="email"
                  required
                  value={ctaForm.email}
                  onChange={(e) =>
                    setCtaForm({ ...ctaForm, email: e.target.value })
                  }
                  placeholder={t("landing.cta.emailPlaceholder")}
                  className="w-full border border-[var(--tk-gray-300)] rounded-xl px-4 py-3 text-[var(--tk-gray-900)] placeholder:text-[var(--tk-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--tk-blue)] focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[var(--tk-gray-700)] mb-1">
                  {t("landing.cta.phoneLabel")}
                </label>
                <input
                  type="tel"
                  value={ctaForm.phone}
                  onChange={(e) =>
                    setCtaForm({ ...ctaForm, phone: e.target.value })
                  }
                  placeholder={t("landing.cta.phonePlaceholder")}
                  className="w-full border border-[var(--tk-gray-300)] rounded-xl px-4 py-3 text-[var(--tk-gray-900)] placeholder:text-[var(--tk-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--tk-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--tk-gray-700)] mb-1">
                  {t("landing.cta.hostTypeLabel")}
                </label>
                <select
                  value={ctaForm.hostType}
                  onChange={(e) =>
                    setCtaForm({ ...ctaForm, hostType: e.target.value })
                  }
                  className="w-full border border-[var(--tk-gray-300)] rounded-xl px-4 py-3 text-[var(--tk-gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--tk-blue)] focus:border-transparent bg-white"
                >
                  <option value="">{t("landing.cta.hostTypeDefault")}</option>
                  <option value="book">{t("landing.cta.hostTypeBook")}</option>
                  <option value="dining">{t("landing.cta.hostTypeDining")}</option>
                  <option value="wine">{t("landing.cta.hostTypeWine")}</option>
                  <option value="study">{t("landing.cta.hostTypeStudy")}</option>
                  <option value="sports">{t("landing.cta.hostTypeSports")}</option>
                  <option value="workshop">{t("landing.cta.hostTypeWorkshop")}</option>
                  <option value="other">{t("landing.cta.hostTypeOther")}</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full tk-gradient-primary text-white py-4 rounded-xl text-lg font-bold tk-btn-hover shadow-lg shadow-blue-500/25"
            >
              <i className="fas fa-paper-plane mr-2" />
              {t("landing.cta.submitBtn")}
            </button>
            <p className="text-center text-xs text-[var(--tk-gray-500)] mt-3">
              {t("landing.cta.submitNote")}
            </p>
          </form>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="bg-[var(--tk-gray-900)] text-[var(--tk-gray-400)] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Logo & description */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <i className="fas fa-shield-check text-2xl text-[var(--tk-blue)]" />
                <span className="text-xl font-bold text-white">
                  Trust Keeper
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-6">
                {t("landing.footer.desc")}
              </p>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="w-10 h-10 bg-[var(--tk-gray-800)] rounded-full flex items-center justify-center hover:bg-[var(--tk-blue)] transition-colors"
                >
                  <i className="fab fa-instagram text-white" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-[var(--tk-gray-800)] rounded-full flex items-center justify-center hover:bg-[var(--tk-blue)] transition-colors"
                >
                  <i className="fab fa-youtube text-white" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-[var(--tk-gray-800)] rounded-full flex items-center justify-center hover:bg-[var(--tk-blue)] transition-colors"
                >
                  <i className="fab fa-linkedin text-white" />
                </a>
              </div>
            </div>

            {/* Column 1 */}
            <div>
              <h4 className="text-white font-bold mb-4">{t("landing.footer.service")}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => scrollTo("#solution")}
                    className="hover:text-white transition-colors"
                  >
                    {t("landing.footer.solutionIntro")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollTo("#billing")}
                    className="hover:text-white transition-colors"
                  >
                    {t("landing.footer.billingSystem")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollTo("#pricing")}
                    className="hover:text-white transition-colors"
                  >
                    {t("landing.footer.plans")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollTo("#faq")}
                    className="hover:text-white transition-colors"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2 */}
            <div>
              <h4 className="text-white font-bold mb-4">{t("landing.footer.company")}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("landing.footer.about")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("landing.footer.blog")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("landing.footer.careers")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("landing.footer.contact")}
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3 */}
            <div>
              <h4 className="text-white font-bold mb-4">{t("landing.footer.support")}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("landing.footer.helpCenter")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("landing.footer.guide")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("landing.footer.apiDocs")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("landing.footer.statusPage")}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--tk-gray-800)] pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm">
                &copy; 2025 Trust Keeper. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm">
                <a href="#" className="hover:text-white transition-colors">
                  {t("landing.footer.terms")}
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  {t("landing.footer.privacy")}
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  {t("landing.footer.cookies")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
