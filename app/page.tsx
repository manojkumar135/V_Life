"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FaUsers,
  FaMoneyBillWave,
  FaChartLine,
  FaArrowRight,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
  FaCheckCircle,
  FaStar,
  FaShieldAlt,
  FaBolt,
  FaLeaf,
  FaRocket,
} from "react-icons/fa";
import { motion, AnimatePresence, useInView } from "framer-motion";
import TermsModal from "@/components/TermsModal/terms";
import Image from "next/image";
import Images from "@/constant/Image";

type ModalType = "terms" | "privacy" | "refund" | null;

/* ─── animated counter ─── */
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

const MaverickHome = () => {
  const router = useRouter();
  const [modalType, setModalType] = useState<ModalType>(null);
  const openModal  = (type: ModalType) => setModalType(type);
  const closeModal = () => setModalType(null);

  /* ─── PRODUCTS ─── */
  const products = [
    { name: "Mobile",      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760763474/ionizers_khpjpn.jpg" },
    { name: "Electronics", img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760075754/DAB-E-electric-bike-1-1_ikf7xa.jpg" },
    { name: "EV Bike",     img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760075763/S500926465_1_qzukvk.webp" },
    { name: "Ionizer",     img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif" },
    { name: "Health Kit",  img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1729073816/cld-sample-4.jpg" },
  ];
  const [index, setIndex]             = useState(0);
  const [itemsPerSlide, setItemsPerSlide] = useState(5);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640)       setItemsPerSlide(2);
      else if (window.innerWidth < 1024) setItemsPerSlide(3);
      else                               setItemsPerSlide(5);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIndex(p => (p + 1) % products.length), 9000);
    return () => clearInterval(t);
  }, []);

  const slideItems = Array.from({ length: itemsPerSlide }, (_, i) =>
    products[(index + i) % products.length]
  );

  /* ─── DATA ─── */
  const features = [
    { icon: <FaUsers />,         title: "Vibrant Community",  desc: "Connect, collaborate, and grow with visionaries from around the globe." },
    { icon: <FaMoneyBillWave />, title: "Smart Earnings",     desc: "Unlock diverse income opportunities and elevate your financial game." },
    { icon: <FaChartLine />,     title: "Limitless Growth",   desc: "Expand your personal and professional horizons with Maverick's ecosystem." },
    { icon: <FaShieldAlt />,     title: "Trusted & Verified", desc: "Every product and plan is backed by science, feasibility, and real results." },
    { icon: <FaBolt />,          title: "Fast Onboarding",    desc: "Get started in minutes. Our streamlined process puts you on the path quickly." },
    { icon: <FaLeaf />,          title: "Wellness-Driven",    desc: "Products designed to elevate physical, mental, and spiritual well-being." },
  ];

  const steps = [
    { num: "01", title: "Join & Discover", icon: <FaRocket />,    desc: "Sign up and explore Maverick's ecosystem — products, plans, and community built for you." },
    { num: "02", title: "Learn & Grow",    icon: <FaBolt />,      desc: "Enroll in our exclusive 4-phase Maverick Academy training and build entrepreneurial skills." },
    { num: "03", title: "Earn & Thrive",   icon: <FaChartLine />, desc: "Activate your Quad-Core Plan, share products you believe in, and enjoy residual income." },
  ];

  const testimonials = [
    { name: "Ravi Kumar",   role: "Member since 2023", initials: "RK", text: "Joining Maverick changed my life. The products are genuine, the community is supportive, and the income opportunity is real. I've grown both personally and financially since day one." },
    { name: "Priya Sharma", role: "Team Leader",       initials: "PS", text: "The Maverick Academy training gave me confidence and clarity. Now I lead a team and help others discover the same path to wellness and freedom. Truly life-changing." },
    { name: "Anil Mehta",   role: "Entrepreneur",      initials: "AM", text: "What impressed me most is the legitimacy. Every product has a purpose, every plan is realistic. Maverick is not just a business — it's a movement built on real values." },
  ];

  const planTags = ["Achievable","Reliable","Realistic","Residual","Legitimate","Leveraged","Long-Term","Life-Fulfilling"];

  /* ─── VARIANTS ─── */
  const fadeUp  = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.13 } } };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white font-sans">

      {/* ════════════════════════════════════════════
          HEADER — UNTOUCHED
      ════════════════════════════════════════════ */}
      <header className="w-full fixed top-0 left-0 z-50 bg-white/50 backdrop-blur-sm shadow-md">
        <div className="max-w-8xl mx-auto flex justify-between items-center px-3 md:px-5 py-2 lg:py-3">
          <Image src={Images.MaverickLogo} alt="Maverick Logo" className="h-10 w-auto md:h-12" priority />
          <div className="space-x-3 md:space-x-6 flex items-center">
            <button
              onClick={() => router.push("/auth/login")}
              className="px-4 py-1.5 max-lg:py-1.5 font-semibold text-sm md:text-base border border-black text-black rounded-lg hover:bg-black hover:text-white transition-all cursor-pointer"
            >Login</button>
            <button
              onClick={() => router.push("/auth/register")}
              className="px-4 py-1.5 max-lg:py-1.5 font-semibold text-sm md:text-base bg-gradient-to-r from-[#16B8E4] to-[#0C3978] text-white rounded-lg transition-all cursor-pointer"
            >Sign Up</button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════
          HERO — UNTOUCHED
      ════════════════════════════════════════════ */}
      <section className="flex flex-col justify-center items-center text-center flex-grow px-6 pt-32 max-md:pt-24 max-md:pb-8 pb-12 bg-gradient-to-b from-blue-50 via-white to-gray-50 relative overflow-hidden shadow-[0_0_80px_20px_rgba(62,199,253,0.45)]">
        <motion.h1
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="text-4xl lg:text-6xl font-semibold text-gray-900 leading-tight max-w-xl md:max-w-none font-sans"
        >
          Welcome to{" "}
          <span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent font-bold">Maverick</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-3 md:mt-4 text-base md:text-xl text-gray-700 md:text-gray-600 max-w-sm md:max-w-2xl"
        >
          Empowering dreamers, doers, and innovators to achieve excellence.
        </motion.p>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/auth/register")}
          className="mt-6 md:mt-8 px-6 md:px-8 py-3 bg-gradient-to-r from-[#0C3978] to-[#16B8E4] text-white font-semibold rounded-full shadow-lg transition flex items-center gap-2"
        >
          Get Started <FaArrowRight />
        </motion.button>
        <div className="hidden md:block absolute w-[500px] h-[500px] bg-white rounded-full blur-3xl opacity-30 top-[-200px] left-[-100px]" />
        <div className="hidden md:block absolute w-[400px] h-[400px] bg-purple-100 rounded-full blur-3xl opacity-30 bottom-[-100px] right-[-100px]" />
      </section>

      {/* ════════════════════════════════════════════
          PRODUCTS SHOWCASE — UNTOUCHED
      ════════════════════════════════════════════ */}
      <section className="w-full py-12 bg-white overflow-hidden max-lg:-mt-8 -mt-5">
        <div className="text-center mb-8">
          <h2 className="text-2xl lg:text-3xl font-semibold">Our Products</h2>
          <p className="text-gray-600 mt-2">Explore our innovative product range</p>
        </div>
        <div className="relative mx-auto max-w-6xl px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ x: 150, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -150, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="flex gap-8 justify-center"
            >
              {slideItems.map((item, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-gray-300 shadow-lg">
                    <img src={item.img} className="w-full h-full object-cover" alt={item.name} />
                  </div>
                  <p className="text-center text-sm font-medium text-gray-600 mt-2">{item.name}</p>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          WHY CHOOSE — DARK ADVANCED GRID
      ════════════════════════════════════════════ */}
      <section className="px-6 md:px-16 py-20 bg-gradient-to-br from-[#0C3978] to-[#0a2d60] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#16B8E4]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-sm font-bold tracking-[0.2em] uppercase mb-3">Why Maverick</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
              Built for{" "}
              <span className="bg-gradient-to-r from-[#16B8E4] to-white bg-clip-text text-transparent">Real Impact</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/60 mt-4 max-w-xl mx-auto text-base">
              Everything you need to grow personally, financially, and professionally — all in one ecosystem.
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((f, idx) => (
              <motion.div key={idx} variants={fadeUp} whileHover={{ y: -6, scale: 1.02 }}
                className="group bg-white/5 border border-white/10 rounded-2xl p-7 hover:bg-white/10 hover:border-[#16B8E4]/40 transition-all duration-300 cursor-default"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#16B8E4] to-[#0C3978] flex items-center justify-center text-white text-xl mb-5 shadow-lg group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          ANIMATED STATS BANNER
      ════════════════════════════════════════════ */}
      <section className="bg-white py-14 px-6 md:px-16 border-y border-gray-100">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
          className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {[
            { value: 10000, suffix: "+", label: "Active Members",       grad: "from-[#0C3978] to-[#16B8E4]" },
            { value: 5,     suffix: "+", label: "Product Categories",   grad: "from-[#16B8E4] to-[#0C3978]" },
            { value: 93,    suffix: "%", label: "Satisfaction Rate",    grad: "from-[#0C3978] to-[#16B8E4]" },
            { value: 49,    suffix: "★", label: "Average Rating / 5",   grad: "from-[#16B8E4] to-[#0C3978]" },
          ].map((s, i) => (
            <motion.div key={i} variants={fadeUp} className="flex flex-col items-center gap-1">
              <span className={`text-4xl md:text-5xl font-extrabold bg-gradient-to-r ${s.grad} bg-clip-text text-transparent`}>
                <AnimCounter value={s.value} suffix={s.suffix} />
              </span>
              <span className="text-xs text-gray-500 font-semibold tracking-widest uppercase">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════
          STORY OF WELLNESS — ADVANCED REDESIGN
      ════════════════════════════════════════════ */}
      <section className="px-6 md:px-16 py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50 overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-14 items-center">

          {/* image */}
          <motion.div initial={{ opacity: 0, x: -48 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="w-full lg:w-2/5 relative flex-shrink-0"
          >
            <div className="relative w-full max-w-sm mx-auto">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-white">
                <img
                  src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1729073810/samples/two-ladies.jpg"
                  alt="Wellness"
                  className="w-full h-80 lg:h-96 object-cover"
                />
              </div>
              <motion.div
                animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute -bottom-5 -right-5 bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-3 border border-gray-100"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0C3978] to-[#16B8E4] flex items-center justify-center text-white text-lg">
                  <FaLeaf />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Members thriving</p>
                  <p className="text-lg font-extrabold bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">10,000+</p>
                </div>
              </motion.div>
              <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full border-4 border-[#16B8E4]/20 pointer-events-none" />
            </div>
          </motion.div>

          {/* text */}
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="flex-1">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-sm font-bold tracking-[0.2em] uppercase mb-3">Our Philosophy</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-[#0c3978] mb-6 leading-tight">
              STORY OF{" "}
              <span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">WELLNESS</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#778598] mb-4 leading-relaxed text-sm md:text-base">
              The <strong className="text-[#0c3978]">"Story of Wellness"</strong> reflects the journey toward complete
              well-being — physical, mental, emotional, and spiritual — emphasizing balance and harmony in all aspects of life.
            </motion.p>
            <motion.p variants={fadeUp} className="text-[#778598] mb-6 leading-relaxed text-sm md:text-base">
              Wellness often begins with an awakening — realizing the need to care for mind, body, and soul.
              This shift comes from personal experiences, challenges, or the desire for a better quality of life.
            </motion.p>
            <motion.div variants={stagger} className="flex flex-wrap gap-3 mb-6">
              {["Physical Balance","Mental Clarity","Emotional Calm"].map((tag, i) => (
                <motion.span key={i} variants={fadeUp}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#0C3978]/10 to-[#16B8E4]/10 border border-[#16B8E4]/30 text-[#0c3978] text-xs font-semibold px-4 py-2 rounded-full"
                >
                  <FaCheckCircle className="text-[#16B8E4] text-xs" /> {tag}
                </motion.span>
              ))}
            </motion.div>
            <motion.div variants={fadeUp} className="border-t border-[#cacccd] pt-5">
              <p className="text-[#0c3978] font-semibold text-sm md:text-base">
                Embracing Balance:{" "}
                <span className="text-[#778598] font-normal">
                  As the journey continues, individuals learn to nurture mental clarity, emotional calm,
                  and physical strength while discovering purpose and fulfillment.
                </span>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          ABOUT MAVERICK — ADVANCED TWO-COLUMN
      ════════════════════════════════════════════ */}
      <section id="about" className="px-6 md:px-16 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-sm font-bold tracking-[0.2em] uppercase mb-3">About Us</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold text-gray-900">
              About{" "}
              <span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">Maverick</span>
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* who we are */}
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.7 }}
              className="group relative bg-gradient-to-br from-[#f0f7ff] to-white rounded-3xl p-8 md:p-10 border border-[#e0eeff] hover:shadow-2xl hover:border-[#16B8E4]/40 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#16B8E4]/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0C3978] to-[#16B8E4] flex items-center justify-center text-white text-xl mb-6 shadow-lg">
                <FaUsers />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-4">Who We Are</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We are an emerging Direct Selling company on a mission to manifest{" "}
                <span className="font-bold text-[#0C3978]">THE WAY TO HAPPINESS</span> — helping people achieve
                balance, freedom, financial abundance, and fulfillment.
              </p>
              <p className="text-gray-600 leading-relaxed">
                At <span className="font-bold text-[#16B8E4]">Maverick</span>, we empower individuals with a uniquely
                blended hybrid opportunity that enables them to grow on their own terms.
              </p>
            </motion.div>

            {/* innovation */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.7 }}
              className="relative bg-gradient-to-br from-[#0C3978] to-[#0a2d60] rounded-3xl p-8 md:p-10 overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-[#16B8E4]/10 blur-2xl pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-[#16B8E4]/20 border border-[#16B8E4]/30 flex items-center justify-center text-[#16B8E4] text-xl mb-6">
                <FaRocket />
              </div>
              <h3 className="text-2xl font-extrabold text-white mb-4">Resources, Innovation & Future</h3>
              <p className="text-white/70 leading-relaxed mb-5">
                <span className="text-yellow-400 font-semibold">Maverick</span> is committed to setting
                market-leading benchmarks through innovation and superior hybrid opportunities. Every product
                and opportunity is backed by science, feasibility, and results.
              </p>
              <p className="text-white/60 text-sm mb-4">Our Quad-Core Plan is:</p>
              <div className="flex flex-wrap gap-2">
                {["Achievable","Reliable","Realistic","Residual"].map((t, i) => (
                  <span key={i} className="bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-xs font-semibold px-3 py-1.5 rounded-full">{t}</span>
                ))}
                {["Legitimate","Leveraged","Long-Term"].map((t, i) => (
                  <span key={i} className="bg-[#16B8E4]/15 border border-[#16B8E4]/25 text-[#16B8E4] text-xs font-semibold px-3 py-1.5 rounded-full">{t}</span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          HOW IT WORKS — ICON TIMELINE
      ════════════════════════════════════════════ */}
      <section className="px-6 md:px-16 py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-sm font-bold tracking-[0.2em] uppercase mb-3">Our Process</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold text-gray-900">
              Simple Steps to{" "}
              <span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">Success</span>
            </motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
          >
            <div className="hidden md:block absolute top-12 left-[calc(16.66%+32px)] right-[calc(16.66%+32px)] h-px border-t-2 border-dashed border-[#16B8E4]/30 pointer-events-none z-0" />
            {steps.map((step, idx) => (
              <motion.div key={idx} variants={fadeUp} whileHover={{ y: -8 }}
                className="relative z-10 flex flex-col items-center text-center bg-white rounded-3xl p-8 shadow-md hover:shadow-2xl border border-gray-100 hover:border-[#16B8E4]/40 transition-all duration-300"
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0C3978] to-[#16B8E4] flex items-center justify-center text-white text-2xl shadow-lg shadow-[#16B8E4]/25">
                    {step.icon}
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-[#16B8E4] text-[#0C3978] text-xs font-extrabold flex items-center justify-center shadow-sm">
                    {idx + 1}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════════ */}
      <section className="px-6 md:px-16 py-20 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0C3978] via-[#16B8E4] to-[#0C3978]" />
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-[#16B8E4] text-sm font-bold tracking-[0.2em] uppercase mb-3">Testimonials</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold text-gray-900">
              Hear from Our{" "}
              <span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">Community</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 mt-4 max-w-lg mx-auto text-sm">
              Real stories from real members who chose to grow with Maverick.
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {testimonials.map((t, idx) => (
              <motion.div key={idx} variants={fadeUp} whileHover={{ y: -8, scale: 1.02 }}
                className="relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100 shadow-md hover:shadow-2xl hover:border-[#16B8E4]/30 transition-all duration-300 flex flex-col"
              >
                <div className="absolute top-5 right-6 text-6xl font-serif text-[#0C3978]/8 leading-none select-none pointer-events-none">"</div>
                <div className="flex gap-1 text-yellow-400 text-xs mb-4">
                  {[...Array(5)].map((_, i) => <FaStar key={i} />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic flex-1 mb-6">{t.text}</p>
                <div className="flex items-center gap-4 pt-5 border-t border-gray-100">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0C3978] to-[#16B8E4] flex items-center justify-center text-white font-extrabold text-sm shadow-md flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-[#16B8E4] font-medium">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          QUAD-CORE PLAN
      ════════════════════════════════════════════ */}
      <section className="px-6 md:px-16 py-20 bg-gradient-to-br from-gray-50 to-blue-50/40">
        <div className="max-w-6xl mx-auto">
          <div className="relative bg-gradient-to-br from-[#0C3978] to-[#061e4d] rounded-3xl overflow-hidden shadow-2xl">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#16B8E4]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[#16B8E4]/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row gap-10 p-8 md:p-12 lg:p-16 items-center">
              <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7 }} className="flex-1"
              >
                <p className="text-[#16B8E4] text-sm font-bold tracking-[0.2em] uppercase mb-4">Maverick's Promise</p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5 leading-snug">
                  Entrepreneurial Growth &<br />
                  <span className="bg-gradient-to-r from-[#16B8E4] to-white bg-clip-text text-transparent">Vertical Mobility</span>
                </h2>
                <p className="text-white/65 text-sm leading-relaxed mb-8">
                  Maverick nurtures people with an entrepreneurial mindset through exclusive 4-phase training
                  programs offered by the Maverick Academy. Financial abundance is not a dream — it's a structured roadmap at Maverick.
                </p>
                <div className="flex flex-col gap-2 mb-8">
                  {["Success without growth is hollow","Built for Life Fulfillment"].map((line, i) => (
                    <div key={i} className="flex items-center gap-2 text-white/80 text-sm">
                      <FaCheckCircle className="text-[#16B8E4] flex-shrink-0" /> {line}
                    </div>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/auth/register")}
                  className="px-8 py-3.5 bg-gradient-to-r from-[#16B8E4] to-[#0C3978] text-white font-bold rounded-full shadow-lg shadow-[#16B8E4]/30 hover:shadow-xl transition flex items-center gap-2 w-fit"
                >
                  Start Your Journey <FaArrowRight />
                </motion.button>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }}
                className="flex-1 grid grid-cols-2 gap-4"
              >
                {planTags.map((tag, idx) => (
                  <motion.div key={idx}
                    initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }} transition={{ delay: idx * 0.07, duration: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-3 bg-white/8 border border-white/12 rounded-2xl px-4 py-3.5 text-white text-sm font-semibold hover:bg-white/15 hover:border-[#16B8E4]/40 transition-all cursor-default"
                  >
                    <FaCheckCircle className="text-[#16B8E4] flex-shrink-0 text-base" /> {tag}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FINAL CTA STRIP
      ════════════════════════════════════════════ */}
      <section className="px-6 md:px-16 py-16 bg-gradient-to-r from-gray-800 to-gray-950 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(22,184,228,0.12)_0%,transparent_70%)] pointer-events-none" />
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
          className="max-w-3xl mx-auto relative z-10"
        >
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold mb-5 leading-tight">
            Take the Leap with{" "}
            <span className="bg-gradient-to-r from-[#16B8E4] to-white bg-clip-text text-transparent">Maverick</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/60 text-base mb-10 leading-relaxed">
            Join a movement built on innovation, integrity, and inspiration. Let's redefine success — together.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/auth/register")}
              className="px-8 py-3.5 bg-gradient-to-r from-[#0C3978] to-[#16B8E4] text-white font-bold rounded-full shadow-lg shadow-[#16B8E4]/25 hover:shadow-xl transition flex items-center gap-2"
            >
              Join Now <FaArrowRight />
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/auth/login")}
              className="px-8 py-3.5 border-2 border-white/30 text-white font-bold rounded-full hover:bg-white/10 hover:border-white/60 transition"
            >
              Already a Member? Login
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER — REDESIGNED, ALL LINKS KEPT
      ════════════════════════════════════════════ */}
      <footer className="bg-gray-900 text-gray-400 px-6 md:px-16 pt-14 pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-10 border-b border-white/8">

            {/* brand */}
            <div className="lg:col-span-2">
              <h3 className="text-2xl font-extrabold text-white mb-3">
                Mave<span className="bg-gradient-to-r from-[#0C3978] to-[#16B8E4] bg-clip-text text-transparent">rick</span>
              </h3>
              <p className="text-sm leading-relaxed text-gray-500 max-w-sm mb-6">
                Pioneering a new era of opportunity, community, and growth. Empowering every individual to live their best life through wellness and smart earning.
              </p>
              <div className="flex gap-3">
                {[
                  { icon: <FaFacebookF />,  href: "#" },
                  { icon: <FaInstagram />,  href: "#" },
                  { icon: <FaTwitter />,    href: "#" },
                  { icon: <FaLinkedinIn />, href: "#" },
                ].map((s, i) => (
                  <a key={i} href={s.href}
                    className="w-9 h-9 rounded-lg bg-white/6 border border-white/8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gradient-to-br hover:from-[#0C3978] hover:to-[#16B8E4] hover:border-transparent transition-all text-sm"
                  >{s.icon}</a>
                ))}
              </div>
            </div>

            {/* quick links — all original links preserved */}
            <div>
              <h4 className="text-white font-bold text-sm tracking-widest uppercase mb-5">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <span className="cursor-pointer hover:text-[#16B8E4] transition"
                    onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>
                    About Us
                  </span>
                </li>
                <li>
                  <span className="cursor-pointer hover:text-[#16B8E4] transition"
                    onClick={() => router.push("/#contact")}>
                    Contact
                  </span>
                </li>
                <li>
                  <span className="cursor-pointer hover:text-[#16B8E4] transition"
                    onClick={() => openModal("privacy")}>
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <span className="cursor-pointer hover:text-[#16B8E4] transition"
                    onClick={() => openModal("terms")}>
                    Terms & Conditions
                  </span>
                </li>
                <li>
                  <span className="cursor-pointer hover:text-[#16B8E4] transition"
                    onClick={() => openModal("refund")}>
                    Refund Policy
                  </span>
                </li>
              </ul>
            </div>

            {/* products */}
            <div>
              <h4 className="text-white font-bold text-sm tracking-widest uppercase mb-5">Products</h4>
              <ul className="space-y-3 text-sm">
                {products.map((p, i) => (
                  <li key={i}><span className="hover:text-[#16B8E4] transition cursor-default">{p.name}</span></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} Maverick. All Rights Reserved.</p>
            <div className="flex gap-5">
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