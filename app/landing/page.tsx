"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FaUsers, FaMoneyBillWave, FaChartLine, FaArrowRight,
  FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter,
  FaCheckCircle, FaStar, FaShieldAlt, FaBolt, FaLeaf, FaRocket,
  FaDownload, FaPhoneAlt, FaEnvelope, FaBars, FaTimes,
} from "react-icons/fa";
import { motion, AnimatePresence, useInView } from "framer-motion";
import TermsModal from "@/components/TermsModal/terms";
import Image from "next/image";
import Images from "@/constant/Image";

type ModalType = "terms" | "privacy" | "refund" | null;

/* ─── Animated counter ─── */
function AnimCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = value / (1800 / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Nav links ─── */
const NAV_LINKS = [
  { label: "Home",     href: "#home",     id: "home" },
  { label: "Products", href: "#products", id: "products" },
  { label: "About",    href: "#about",    id: "about" },
  { label: "Contact",  href: "#contact",  id: "contact" },
];

const MaverickHome = () => {
  const router = useRouter();
  const [modalType,      setModalType]      = useState<ModalType>(null);
  const [heroSlide,      setHeroSlide]      = useState(0);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [scrolled,       setScrolled]       = useState(false);
  /* ── NEW: track which section is currently in view ── */
  const [activeSection,  setActiveSection]  = useState("home");

  const openModal  = (type: ModalType) => setModalType(type);
  const closeModal = () => setModalType(null);

  /* scroll shadow + active section tracker */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── IntersectionObserver: highlight nav link for visible section ── */
  useEffect(() => {
    const sectionIds = NAV_LINKS.map(l => l.id);
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        {
          /* fire when section occupies ≥25% of viewport */
          threshold: 0.25,
          /* offset top by navbar height (~80px) */
          rootMargin: "-80px 0px 0px 0px",
        }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  /* hero auto-slide */
  useEffect(() => {
    const t = setInterval(() => setHeroSlide(p => (p + 1) % heroSlides.length), 5000);
    return () => clearInterval(t);
  }, []);

  /* ─── HERO SLIDES ─── */
  const heroSlides = [
    {
      tag: "Direct Selling · Wellness · Innovation",
      title: "Welcome to",
      brand: "Maverick",
      sub: "Empowering dreamers, doers, and innovators to achieve excellence through a uniquely blended hybrid opportunity.",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1729073810/samples/two-ladies.jpg",
    },
    {
      tag: "Eco · Smart · Sustainable",
      title: "Discover Our",
      brand: "Products",
      sub: "From EV bikes to health kits — science-backed products designed to elevate every aspect of your life.",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760075754/DAB-E-electric-bike-1-1_ikf7xa.jpg",
    },
    {
      tag: "Grow · Earn · Thrive",
      title: "Build Your",
      brand: "Future",
      sub: "Join 10,000+ members already earning with our Quad-Core Plan — achievable, residual, and long-term.",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1729073816/cld-sample-4.jpg",
    },
  ];

  /* ─── PRODUCTS ─── */
  const products = [
    {
      name: "Mobile",      tag: "Latest Tech",  category: "Technology",
      desc: "Next-gen mobile devices packed with performance and style.",
      downloadLabel: "Download Brochure",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760763474/ionizers_khpjpn.jpg",
    },
    {
      name: "Electronics", tag: "Smart Living", category: "Electronics",
      desc: "Smart home and lifestyle electronics for modern living.",
      downloadLabel: "Download Catalogue",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760075754/DAB-E-electric-bike-1-1_ikf7xa.jpg",
    },
    {
      name: "EV Bike",     tag: "Eco Mobility", category: "Transport",
      desc: "Zero-emission electric bikes for sustainable commuting.",
      downloadLabel: "Download Spec Sheet",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760075763/S500926465_1_qzukvk.webp",
    },
    {
      name: "Ionizer",     tag: "Pure Air",     category: "Wellness",
      desc: "Advanced air ionizers for a cleaner, healthier environment.",
      downloadLabel: "Download Guide",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
    },
    {
      name: "Health Kit",  tag: "Wellness",     category: "Health",
      desc: "Comprehensive health kits for daily wellness routines.",
      downloadLabel: "Download Health Guide",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1729073816/cld-sample-4.jpg",
    },
  ];

  const features = [
    { icon: <FaUsers />,         title: "Vibrant Community",  desc: "Connect, collaborate, and grow with visionaries from around the globe." },
    { icon: <FaMoneyBillWave />, title: "Smart Earnings",     desc: "Unlock diverse income opportunities and elevate your financial game." },
    { icon: <FaChartLine />,     title: "Limitless Growth",   desc: "Expand your personal and professional horizons with Maverick's ecosystem." },
    { icon: <FaShieldAlt />,     title: "Trusted & Verified", desc: "Every product and plan is backed by science, feasibility, and real results." },
    { icon: <FaBolt />,          title: "Fast Onboarding",    desc: "Get started in minutes. Our streamlined process puts you on the path quickly." },
    { icon: <FaLeaf />,          title: "Wellness-Driven",    desc: "Products designed to elevate physical, mental, and spiritual well-being." },
  ];

  const steps = [
    { title: "Join & Discover", icon: <FaRocket />,    desc: "Sign up and explore Maverick's ecosystem — products, plans, and community built for you." },
    { title: "Learn & Grow",    icon: <FaBolt />,      desc: "Enroll in our exclusive 4-phase Maverick Academy training and build entrepreneurial skills." },
    { title: "Earn & Thrive",   icon: <FaChartLine />, desc: "Activate your Quad-Core Plan, share products you believe in, and enjoy residual income." },
  ];

  const testimonials = [
    { name: "Ravi Kumar",   role: "Member since 2023", initials: "RK", text: "Joining Maverick changed my life. The products are genuine, the community is supportive, and the income opportunity is real." },
    { name: "Priya Sharma", role: "Team Leader",       initials: "PS", text: "Maverick Academy training gave me confidence and clarity. Now I lead a team and help others find the same path to wellness and freedom." },
    { name: "Anil Mehta",   role: "Entrepreneur",      initials: "AM", text: "Every product has a purpose, every plan is realistic. Maverick is not just a business — it's a movement built on real values." },
  ];

  const planTags = ["Achievable","Reliable","Realistic","Residual","Legitimate","Leveraged","Long-Term","Life-Fulfilling"];

  const fadeUp  = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

  /* ── helper: active link classes ── */
  const navLinkClass = (id: string) =>
    `px-3 lg:px-5 py-2 text-[13px] lg:text-[15px] font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
      activeSection === id
        ? "text-[#0C3978] bg-[#0C3978]/8 font-semibold"   /* active */
        : "text-gray-600 hover:text-[#0C3978] hover:bg-[#0C3978]/5" /* idle */
    }`;

  /* ── shared section scroll offset class — keeps content below floating navbar ── */
  /* scroll-mt-24 = 96px offset, so anchor scroll doesn't hide under navbar */
  const sectionClass = "scroll-mt-24";

  return (
    <div id="home" className="min-h-screen flex flex-col bg-white font-sans">

      {/* ════════════════════════════════════════════════════════
          NAVBAR — floating pill, active link highlights
      ════════════════════════════════════════════════════════ */}
      <div className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-5 md:px-8 pt-3 sm:pt-4">
        <motion.nav
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`
            w-full max-w-7xl mx-auto
            flex items-center justify-between
            px-4 sm:px-5 md:px-7
            h-[52px] sm:h-[56px] md:h-[60px]
            rounded-xl sm:rounded-2xl
            transition-all duration-300
            ${scrolled
              ? "bg-white/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(12,57,120,0.18)] border border-gray-200/80"
              : "bg-white/80 backdrop-blur-2xl shadow-[0_4px_24px_rgba(12,57,120,0.14)] border border-white/70"
            }
          `}
        >
          {/* Logo */}
          <a href="#home" className="flex-shrink-0 flex items-center" onClick={() => setMobileOpen(false)}>
            <Image src={Images.MaverickLogo} alt="Maverick" className="h-9 sm:h-10 md:h-12 w-auto" priority />
          </a>

          {/* Desktop nav links — centered, with active highlight */}
          <div className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map(link => (
              <a key={link.id} href={link.href} className={navLinkClass(link.id)}>
                {link.label}
                {/* active underline dot */}
                {activeSection === link.id && (
                  <motion.span
                    layoutId="nav-active-dot"
                    className="block mx-auto mt-0.5 w-1 h-1 rounded-full bg-[#16B8E4]"
                  />
                )}
              </a>
            ))}
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push("/auth/login")}
              className="px-4 lg:px-5 py-2 text-[13px] lg:text-sm font-semibold text-[#0C3978] border border-[#0C3978]/25 rounded-lg hover:bg-[#0C3978] hover:text-white hover:border-[#0C3978] transition-all duration-200"
            >Login</button>
            <button
              onClick={() => router.push("/auth/register")}
              className="px-4 lg:px-5 py-2 text-[13px] lg:text-sm font-bold text-white rounded-lg bg-gradient-to-r from-[#0C3978] to-[#16B8E4] shadow-md shadow-[#16B8E4]/25 hover:shadow-lg hover:shadow-[#16B8E4]/40 hover:-translate-y-0.5 transition-all duration-200"
            >Sign Up</button>
          </div>

          {/* Mobile: auth buttons + burger */}
          <div className="flex md:hidden items-center gap-2">
            <button onClick={() => router.push("/auth/login")}
              className="px-3 py-1.5 text-[11px] font-semibold text-[#0C3978] border border-[#0C3978]/30 rounded-lg hover:bg-[#0C3978]/8 transition-all"
            >Login</button>
            <button onClick={() => router.push("/auth/register")}
              className="px-3 py-1.5 text-[11px] font-bold text-white rounded-lg bg-gradient-to-r from-[#0C3978] to-[#16B8E4] shadow-sm transition-all"
            >Sign Up</button>
            <button onClick={() => setMobileOpen(v => !v)}
              className="ml-1 p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition" aria-label="Menu"
            >
              {mobileOpen ? <FaTimes size={16}/> : <FaBars size={16}/>}
            </button>
          </div>
        </motion.nav>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-7xl mx-auto mt-2 rounded-xl bg-white/95 backdrop-blur-2xl border border-gray-200/80 shadow-[0_8px_32px_rgba(12,57,120,0.14)] overflow-hidden"
            >
              <div className="px-4 py-3 flex flex-col gap-0.5">
                {NAV_LINKS.map(link => (
                  <a key={link.id} href={link.href} onClick={() => setMobileOpen(false)}
                    className={`px-4 py-2.5 text-sm rounded-lg transition flex items-center justify-between ${
                      activeSection === link.id
                        ? "text-[#0C3978] bg-[#0C3978]/8 font-semibold"
                        : "text-gray-700 hover:text-[#0C3978] hover:bg-[#0C3978]/5 font-medium"
                    }`}
                  >
                    {link.label}
                    {activeSection === link.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16B8E4] flex-shrink-0" />
                    )}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ════════════════════════════════════════════════════════
          HERO — full-width image slider (UNCHANGED)
      ════════════════════════════════════════════════════════ */}
      <section className="relative w-full h-screen min-h-[560px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={heroSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className="absolute inset-0"
          >
            <img src={heroSlides[heroSlide].img} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#051e45]/90 via-[#0C3978]/65 to-[#0C3978]/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 h-full flex items-center">
          <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={heroSlide}
                initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} variants={stagger}
                className="max-w-2xl pt-20 sm:pt-24"
              >
                <motion.div variants={fadeUp} className="mb-5 sm:mb-7">
                  <span className="inline-flex items-center gap-2 bg-white/12 border border-white/25 text-white text-[11px] sm:text-xs font-semibold px-4 py-2 rounded-full backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16B8E4] animate-pulse flex-shrink-0" />
                    {heroSlides[heroSlide].tag}
                  </span>
                </motion.div>

                <motion.h1 variants={fadeUp}
                  className="font-extrabold text-white leading-[1.04] mb-5 sm:mb-6"
                  style={{ fontSize: "clamp(2.6rem, 6vw, 5rem)" }}
                >
                  {heroSlides[heroSlide].title}<br />
                  <span className="bg-gradient-to-r from-[#16B8E4] via-[#38d0f5] to-white bg-clip-text text-transparent">
                    {heroSlides[heroSlide].brand}
                  </span>
                </motion.h1>

                <motion.p variants={fadeUp} className="text-white/70 text-sm sm:text-base md:text-lg leading-relaxed mb-8 sm:mb-10 max-w-md font-light">
                  {heroSlides[heroSlide].sub}
                </motion.p>

                <motion.div variants={fadeUp} className="flex flex-wrap gap-3 sm:gap-4">
                  <button onClick={() => router.push("/auth/register")}
                    className="flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#0C3978] to-[#16B8E4] text-white font-bold text-sm sm:text-base rounded-xl shadow-xl shadow-[#16B8E4]/30 hover:shadow-[#16B8E4]/50 hover:-translate-y-1 transition-all duration-200"
                  >Get Started <FaArrowRight className="text-xs sm:text-sm" /></button>
                  <button onClick={() => router.push("/auth/login")}
                    className="flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 border-2 border-white/45 text-white font-semibold text-sm sm:text-base rounded-xl hover:bg-white/12 hover:border-white/75 transition-all duration-200"
                  >Login</button>
                </motion.div>

                <motion.div variants={fadeUp} className="flex items-center gap-5 sm:gap-8 mt-8 sm:mt-10">
                  {[{ num: "10K+", label: "Members" },{ num: "5+", label: "Products" },{ num: "4.9★", label: "Rating" }].map((s, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="text-lg sm:text-xl font-extrabold text-white leading-none">{s.num}</span>
                      <span className="text-[10px] sm:text-xs text-white/50 font-medium uppercase tracking-wider mt-0.5">{s.label}</span>
                    </div>
                  ))}
                  <div className="hidden sm:block h-8 w-px bg-white/20" />
                  <div className="hidden sm:flex -space-x-2">
                    {["RK","PS","AM","SK"].map((init, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-white/60 bg-gradient-to-br from-[#0C3978] to-[#16B8E4] flex items-center justify-center text-white text-[9px] font-bold">{init}</div>
                    ))}
                    <div className="w-7 h-7 rounded-full border-2 border-white/60 bg-white/20 flex items-center justify-center text-white text-[8px] font-bold">+9k</div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {heroSlides.map((_, i) => (
            <button key={i} onClick={() => setHeroSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === heroSlide ? "w-8 bg-[#16B8E4]" : "w-2 bg-white/35 hover:bg-white/60"}`}
            />
          ))}
        </div>
        <button onClick={() => setHeroSlide(p => (p - 1 + heroSlides.length) % heroSlides.length)}
          className="absolute left-3 sm:left-5 md:left-7 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/12 border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-all backdrop-blur-sm"
        ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
        <button onClick={() => setHeroSlide(p => (p + 1) % heroSlides.length)}
          className="absolute right-3 sm:right-5 md:right-7 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/12 border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-all backdrop-blur-sm"
        ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
      </section>

      {/* ════════════════════════════════════════════════════════
          ALL SECTIONS — scroll-mt-24 added to each section that
          has an id, so anchor links don't hide content under navbar.
          Everything else inside is COMPLETELY UNCHANGED.
      ════════════════════════════════════════════════════════ */}

      {/* PRODUCTS */}
      <section id="products" className={`${sectionClass} px-4 sm:px-6 md:px-10 lg:px-16 py-16 sm:py-20 bg-white`}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-10 sm:mb-14">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-2 sm:mb-3">Our Products</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-3 sm:mb-4">
              Explore Our{" "}<span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">Innovative Range</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 max-w-lg mx-auto text-xs sm:text-sm leading-relaxed">Science-backed, quality-driven products. Download any product guide below.</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5"
          >
            {products.map((p, i) => (
              <motion.div key={i} variants={fadeUp} whileHover={{ y: -7 }}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#16B8E4]/30 transition-all duration-300 overflow-hidden flex flex-col"
              >
                <div className="relative overflow-hidden">
                  <img src={p.img} alt={p.name} className="w-full h-40 sm:h-44 md:h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-[#0C3978] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">{p.tag}</span>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-[10px] font-bold text-[#16B8E4] tracking-wider uppercase mb-0.5">{p.category}</p>
                  <h3 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1.5">{p.name}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed flex-1 mb-3">{p.desc}</p>
                  <a href="#" onClick={e => e.preventDefault()}
                    className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-[#0C3978] border border-[#0C3978]/20 rounded-lg px-3 py-2 hover:bg-[#0C3978] hover:text-white hover:border-[#0C3978] transition-all group/dl"
                  >
                    <FaDownload className="text-[#16B8E4] group-hover/dl:text-white transition-colors flex-shrink-0 text-[10px]" />
                    <span className="truncate">{p.downloadLabel}</span>
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <div className="text-center mt-8 sm:mt-10">
            <button onClick={() => router.push("/auth/register")}
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 border-2 border-[#0C3978]/25 text-[#0C3978] font-semibold text-sm rounded-lg hover:bg-[#0C3978] hover:text-white hover:border-[#0C3978] transition-all"
            >View All Products <FaArrowRight /></button>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="px-4 sm:px-6 md:px-10 lg:px-16 py-16 sm:py-20 bg-gradient-to-br from-[#0C3978] to-[#0a2d60] relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-[#16B8E4]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-10 sm:mb-14">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-2 sm:mb-3">Why Maverick</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Built for{" "}<span className="bg-gradient-to-r from-[#16B8E4] to-white bg-clip-text text-transparent">Real Impact</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/55 mt-3 max-w-xl mx-auto text-xs sm:text-sm">Everything you need to grow personally, financially, and professionally — all in one ecosystem.</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f, idx) => (
              <motion.div key={idx} variants={fadeUp} whileHover={{ y: -5 }}
                className="group bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-7 hover:bg-white/10 hover:border-[#16B8E4]/40 transition-all duration-300"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#16B8E4] to-[#0C3978] flex items-center justify-center text-white text-lg sm:text-xl mb-4 sm:mb-5 shadow-lg group-hover:scale-110 transition-transform">{f.icon}</div>
                <h3 className="text-white font-bold text-base sm:text-lg mb-1.5 sm:mb-2">{f.title}</h3>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* STORY OF WELLNESS */}
      <section className="px-4 sm:px-6 md:px-10 lg:px-16 py-16 sm:py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50/40 overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10 lg:gap-14 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="w-full lg:w-2/5 flex-shrink-0">
            <div className="relative w-full max-w-xs sm:max-w-sm mx-auto">
              <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
                <img src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1729073810/samples/two-ladies.jpg" alt="Wellness" className="w-full h-64 sm:h-72 lg:h-80 xl:h-96 object-cover" />
              </div>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute -bottom-4 -right-4 sm:-bottom-5 sm:-right-5 bg-white rounded-xl sm:rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2.5 border border-gray-100"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0C3978] to-[#16B8E4] flex items-center justify-center text-white"><FaLeaf className="text-sm" /></div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium leading-none">Members thriving</p>
                  <p className="text-base font-extrabold bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent leading-tight">10,000+</p>
                </div>
              </motion.div>
              <div className="absolute -top-3 -left-3 w-20 h-20 rounded-full border-4 border-[#16B8E4]/20 pointer-events-none" />
            </div>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="flex-1">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-2 sm:mb-3">Our Philosophy</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0c3978] mb-4 sm:mb-6 leading-tight">
              STORY OF{" "}<span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">WELLNESS</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#778598] mb-3 sm:mb-4 leading-relaxed text-sm">The <strong className="text-[#0c3978]">"Story of Wellness"</strong> reflects the journey toward complete well-being — physical, mental, emotional, and spiritual — emphasizing balance and harmony in all aspects of life.</motion.p>
            <motion.p variants={fadeUp} className="text-[#778598] mb-5 sm:mb-6 leading-relaxed text-sm">Wellness begins with an awakening — realizing the need to care for mind, body, and soul through purposeful living.</motion.p>
            <motion.div variants={stagger} className="flex flex-wrap gap-2 mb-5 sm:mb-6">
              {["Physical Balance","Mental Clarity","Emotional Calm","Spiritual Growth"].map((tag, i) => (
                <motion.span key={i} variants={fadeUp} className="flex items-center gap-1.5 bg-[#0C3978]/8 border border-[#16B8E4]/25 text-[#0c3978] text-[11px] font-semibold px-3 py-1.5 rounded-full">
                  <FaCheckCircle className="text-[#16B8E4] text-[9px]" />{tag}
                </motion.span>
              ))}
            </motion.div>
            <motion.div variants={fadeUp} className="border-t border-[#cacccd] pt-4 sm:pt-5">
              <p className="text-[#0c3978] font-semibold text-sm">Embracing Balance:{" "}<span className="text-[#778598] font-normal">Nurture mental clarity, emotional calm, and physical strength while discovering purpose and fulfillment.</span></p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className={`${sectionClass} px-4 sm:px-6 md:px-10 lg:px-16 py-16 sm:py-20 bg-white`}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-10 sm:mb-14">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-2 sm:mb-3">About Us</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900">
              About{" "}<span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">Maverick</span>
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-7">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="relative bg-gradient-to-br from-[#f0f7ff] to-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 border border-[#e0eeff] hover:shadow-2xl hover:border-[#16B8E4]/40 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-gradient-to-bl from-[#16B8E4]/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0C3978] to-[#16B8E4] flex items-center justify-center text-white text-lg sm:text-xl mb-5 shadow-lg"><FaUsers /></div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-3 sm:mb-4">Who We Are</h3>
              <p className="text-gray-600 leading-relaxed text-sm mb-3">We are an emerging Direct Selling company on a mission to manifest{" "}<span className="font-bold text-[#0C3978]">THE WAY TO HAPPINESS</span> — helping people achieve balance, freedom, financial abundance, and fulfillment.</p>
              <p className="text-gray-600 leading-relaxed text-sm">At <span className="font-bold text-[#16B8E4]">Maverick</span>, we empower individuals with a uniquely blended hybrid opportunity that enables them to grow on their own terms.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
              className="relative bg-gradient-to-br from-[#0C3978] to-[#0a2d60] rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-[#16B8E4]/10 blur-2xl pointer-events-none" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#16B8E4]/20 border border-[#16B8E4]/30 flex items-center justify-center text-[#16B8E4] text-lg sm:text-xl mb-5"><FaRocket /></div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-3 sm:mb-4">Resources, Innovation & Future</h3>
              <p className="text-white/70 leading-relaxed text-sm mb-4"><span className="text-yellow-400 font-semibold">Maverick</span> is committed to setting market-leading benchmarks through innovation. Every product is backed by science, feasibility, and results.</p>
              <p className="text-white/55 text-xs sm:text-sm mb-3 sm:mb-4">Our Quad-Core Plan is:</p>
              <div className="flex flex-wrap gap-2">
                {["Achievable","Reliable","Realistic","Residual"].map((t,i)=>(<span key={i} className="bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">{t}</span>))}
                {["Legitimate","Leveraged","Long-Term"].map((t,i)=>(<span key={i} className="bg-[#16B8E4]/15 border border-[#16B8E4]/25 text-[#16B8E4] text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">{t}</span>))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 sm:px-6 md:px-10 lg:px-16 py-16 sm:py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-12 sm:mb-16">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-2 sm:mb-3">Our Process</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900">
              Simple Steps to{" "}<span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">Success</span>
            </motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-7 relative">
            <div className="hidden sm:block absolute top-10 left-[calc(16.66%+36px)] right-[calc(16.66%+36px)] h-px border-t-2 border-dashed border-[#16B8E4]/25 pointer-events-none z-0" />
            {steps.map((step, idx) => (
              <motion.div key={idx} variants={fadeUp} whileHover={{ y: -7 }}
                className="relative z-10 flex flex-col items-center text-center bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl border border-gray-100 hover:border-[#16B8E4]/40 transition-all duration-300"
              >
                <div className="relative mb-5 sm:mb-6">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#0C3978] to-[#16B8E4] flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg shadow-[#16B8E4]/20">{step.icon}</div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white border-2 border-[#16B8E4] text-[#0C3978] text-[10px] sm:text-xs font-extrabold flex items-center justify-center shadow-sm">{idx+1}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-2 sm:mb-3">{step.title}</h3>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="bg-[#0C3978] py-4 sm:py-5">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10">
          {[
            { num: 10000, suf: "+", label: "Active Members" },
            { num: 5,     suf: "+", label: "Product Types" },
            { num: 93,    suf: "%", label: "Satisfaction" },
            { num: 49,    suf: "★", label: "Avg Rating / 5" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center py-2 px-3 sm:px-5">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white"><AnimCounter value={s.num} suffix={s.suf} /></span>
              <span className="text-[10px] sm:text-[11px] text-white/50 font-semibold tracking-wider uppercase mt-0.5 text-center">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 sm:px-6 md:px-10 lg:px-16 py-16 sm:py-20 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-10 sm:mb-14">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-2 sm:mb-3">Community</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900">
              Hear from Our{" "}<span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">Members</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 mt-3 max-w-lg mx-auto text-xs sm:text-sm">Real stories from real members who chose to grow with Maverick.</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((t, idx) => (
              <motion.div key={idx} variants={fadeUp} whileHover={{ y: -7 }}
                className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#16B8E4]/25 transition-all duration-300 flex flex-col"
              >
                <div className="absolute top-4 right-5 text-5xl font-serif text-[#0C3978]/6 leading-none select-none pointer-events-none">"</div>
                <div className="flex gap-1 text-yellow-400 text-[10px] sm:text-xs mb-3 sm:mb-4">{[...Array(5)].map((_,i)=><FaStar key={i}/>)}</div>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed italic flex-1 mb-5 sm:mb-6">{t.text}</p>
                <div className="flex items-center gap-3 pt-4 sm:pt-5 border-t border-gray-100">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#0C3978] to-[#16B8E4] flex items-center justify-center text-white font-extrabold text-xs sm:text-sm flex-shrink-0">{t.initials}</div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-[10px] sm:text-xs text-[#16B8E4] font-medium">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* QUAD-CORE PLAN */}
      <section className="px-4 sm:px-6 md:px-10 lg:px-16 py-16 sm:py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-6xl mx-auto">
          <div className="relative bg-gradient-to-br from-[#0C3978] to-[#061e4d] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
            <div className="absolute -top-16 -right-16 w-56 sm:w-64 h-56 sm:h-64 rounded-full bg-[#16B8E4]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-56 sm:w-64 h-56 sm:h-64 rounded-full bg-[#16B8E4]/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-12 p-6 sm:p-10 lg:p-14 xl:p-16 items-start lg:items-center">
              <motion.div initial={{ opacity: 0, x: -35 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65 }} className="flex-1">
                <p className="text-[#16B8E4] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-3 sm:mb-4">Maverick's Promise</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 sm:mb-5 leading-snug">
                  Entrepreneurial Growth &<br /><span className="bg-gradient-to-r from-[#16B8E4] to-white bg-clip-text text-transparent">Vertical Mobility</span>
                </h2>
                <p className="text-white/60 text-xs sm:text-sm leading-relaxed mb-6">Maverick nurtures people with an entrepreneurial mindset through exclusive 4-phase training via Maverick Academy. Financial abundance is not a dream — it's a structured roadmap.</p>
                <div className="flex flex-col gap-2 mb-6 sm:mb-8">
                  {["Success without growth is hollow","Built for Life Fulfillment"].map((line,i)=>(
                    <div key={i} className="flex items-center gap-2 text-white/75 text-xs sm:text-sm"><FaCheckCircle className="text-[#16B8E4] flex-shrink-0 text-xs" />{line}</div>
                  ))}
                </div>
                <button onClick={() => router.push("/auth/register")}
                  className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-gradient-to-r from-[#16B8E4] to-[#0C3978] text-white font-bold text-sm rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-fit"
                >Start Your Journey <FaArrowRight /></button>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 35 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.15 }}
                className="flex-1 grid grid-cols-2 gap-2.5 sm:gap-3 w-full lg:w-auto"
              >
                {planTags.map((tag, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, scale: 0.88 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: idx * 0.06, duration: 0.4 }} whileHover={{ scale: 1.04 }}
                    className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-[11px] sm:text-sm font-semibold hover:bg-white/14 hover:border-[#16B8E4]/35 transition-all"
                  ><FaCheckCircle className="text-[#16B8E4] flex-shrink-0 text-[10px] sm:text-xs" />{tag}</motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section id="contact" className={`${sectionClass} px-4 sm:px-6 md:px-10 lg:px-16 py-16 sm:py-20 bg-gradient-to-r from-gray-900 to-[#061e4d] text-white relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(22,184,228,0.10)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-3 sm:mb-4">Get In Touch</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 sm:mb-5 leading-tight">
              Take the Leap with{" "}<span className="bg-gradient-to-r from-[#16B8E4] to-white bg-clip-text text-transparent">Maverick</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/55 text-sm sm:text-base mb-6 sm:mb-8 leading-relaxed">Join a movement built on innovation, integrity, and inspiration. Let's redefine success — together.</motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-6 sm:mb-8">
              <button onClick={() => router.push("/auth/register")} className="flex items-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 bg-gradient-to-r from-[#0C3978] to-[#16B8E4] text-white font-bold text-sm rounded-lg shadow-lg hover:shadow-[#16B8E4]/30 hover:-translate-y-0.5 transition-all">Join Now <FaArrowRight /></button>
              <button onClick={() => router.push("/auth/login")} className="flex items-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 border-2 border-white/25 text-white font-semibold text-sm rounded-lg hover:bg-white/8 hover:border-white/50 transition-all">Login to Account</button>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col gap-2.5">
              <a href="mailto:info@maverick.com" className="flex items-center gap-3 text-white/55 hover:text-white transition text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0"><FaEnvelope className="text-[#16B8E4] text-xs" /></div>
                info@maverick.com
              </a>
              <a href="tel:+10095447818" className="flex items-center gap-3 text-white/55 hover:text-white transition text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0"><FaPhoneAlt className="text-[#16B8E4] text-xs" /></div>
                +1 (009) 544-7818
              </a>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.65 }}
            className="bg-white/6 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-sm"
          >
            <h3 className="text-lg sm:text-xl font-extrabold text-white mb-1.5 sm:mb-2">Ready to start?</h3>
            <p className="text-white/50 text-xs sm:text-sm mb-5 sm:mb-7 leading-relaxed">Sign up for free and explore the Maverick ecosystem. No obligations — just opportunities.</p>
            <div className="flex flex-col gap-3 sm:gap-4">
              {[
                { icon: <FaRocket />, title: "Free Registration",  desc: "Create your account in under 2 minutes" },
                { icon: <FaBolt />,   title: "Instant Access",     desc: "Explore all products and plans immediately" },
                { icon: <FaLeaf />,   title: "Start Earning",      desc: "Activate your plan and begin your journey" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-[#0C3978] to-[#16B8E4] flex items-center justify-center text-white text-xs sm:text-sm flex-shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white leading-tight">{item.title}</p>
                    <p className="text-[11px] sm:text-xs text-white/45 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => router.push("/auth/register")}
              className="w-full mt-6 sm:mt-8 py-3 sm:py-3.5 bg-gradient-to-r from-[#0C3978] to-[#16B8E4] text-white font-bold text-sm rounded-lg hover:shadow-lg hover:shadow-[#16B8E4]/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >Create Free Account <FaArrowRight /></button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 text-gray-400 px-4 sm:px-6 md:px-10 lg:px-16 pt-10 sm:pt-14 pb-5 sm:pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 pb-8 sm:pb-10 border-b border-white/6">
            <div className="sm:col-span-2">
              <div className="mb-3 sm:mb-4"><Image src={Images.MaverickLogo} alt="Maverick" className="h-8 sm:h-9 w-auto brightness-0 invert opacity-85" /></div>
              <p className="text-xs sm:text-sm leading-relaxed text-gray-500 max-w-sm mb-4 sm:mb-6">Pioneering a new era of opportunity, community, and growth. Empowering every individual to live their best life through wellness and smart earning.</p>
              <div className="flex gap-2">
                {[{icon:<FaFacebookF/>,href:"#"},{icon:<FaInstagram/>,href:"#"},{icon:<FaTwitter/>,href:"#"},{icon:<FaLinkedinIn/>,href:"#"}].map((s,i)=>(
                  <a key={i} href={s.href} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gradient-to-br hover:from-[#0C3978] hover:to-[#16B8E4] hover:border-transparent transition-all text-xs sm:text-sm">{s.icon}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-[10px] sm:text-xs tracking-[0.15em] uppercase mb-4 sm:mb-5">Quick Links</h4>
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
                <li><a href="#about" className="hover:text-[#16B8E4] transition">About Us</a></li>
                <li><a href="#products" className="hover:text-[#16B8E4] transition">Products</a></li>
                <li><a href="#contact" className="hover:text-[#16B8E4] transition">Contact</a></li>
                <li><span className="cursor-pointer hover:text-[#16B8E4] transition" onClick={() => openModal("privacy")}>Privacy Policy</span></li>
                <li><span className="cursor-pointer hover:text-[#16B8E4] transition" onClick={() => openModal("terms")}>Terms & Conditions</span></li>
                <li><span className="cursor-pointer hover:text-[#16B8E4] transition" onClick={() => openModal("refund")}>Refund Policy</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-[10px] sm:text-xs tracking-[0.15em] uppercase mb-4 sm:mb-5">Products</h4>
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
                {products.map((p,i)=>(
                  <li key={i}>
                    <a href="#products" className="flex items-center gap-1.5 hover:text-[#16B8E4] transition group/fp">
                      <FaDownload className="text-[8px] text-[#16B8E4] opacity-0 group-hover/fp:opacity-100 transition flex-shrink-0" />{p.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-600">
            <p>© {new Date().getFullYear()} Maverick. All Rights Reserved.</p>
            <div className="flex gap-4 sm:gap-5">
              <span className="cursor-pointer hover:text-[#16B8E4] transition" onClick={() => openModal("privacy")}>Privacy Policy</span>
              <span className="cursor-pointer hover:text-[#16B8E4] transition" onClick={() => openModal("terms")}>Terms & Conditions</span>
              <span className="cursor-pointer hover:text-[#16B8E4] transition" onClick={() => openModal("refund")}>Refund Policy</span>
            </div>
          </div>
        </div>
      </footer>

      <TermsModal isOpen={!!modalType} type={modalType} onClose={closeModal} />
    </div>
  );
};

export default MaverickHome;