"use client";

import React, { useState, useEffect } from "react";
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
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import TermsModal from "@/components/TermsModal/terms";

type ModalType = "terms" | "privacy" | "refund" | null;

const MaverickHome = () => {
  const router = useRouter();

  const [modalType, setModalType] = useState<ModalType>(null);

  const openModal = (type: ModalType) => {
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
  };

  // --- PRODUCTS ---
  const products = [
    {
      name: "Mobile",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760763474/ionizers_khpjpn.jpg",
    },
    {
      name: "Electronics",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760075754/DAB-E-electric-bike-1-1_ikf7xa.jpg",
    },
    {
      name: "EV Bike",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760075763/S500926465_1_qzukvk.webp",
    },
    {
      name: "Ionizer",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1756102475/vlife_sample_product_djlcgg.avif",
    },
    {
      name: "Health Kit",
      img: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1729073816/cld-sample-4.jpg",
    },
  ];

  const [index, setIndex] = useState(0);
  const [itemsPerSlide, setItemsPerSlide] = useState(5);

  // RESPONSIVE ITEMS
  useEffect(() => {
    const updateSlides = () => {
      if (window.innerWidth < 640) setItemsPerSlide(2);
      else if (window.innerWidth < 1024) setItemsPerSlide(3);
      else setItemsPerSlide(5);
    };
    updateSlides();
    window.addEventListener("resize", updateSlides);
    return () => window.removeEventListener("resize", updateSlides);
  }, []);

  // AUTO LOOP
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % products.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // COMPUTE SLIDE IMAGES
  const slideItems = [];
  for (let i = 0; i < itemsPerSlide; i++) {
    slideItems.push(products[(index + i) % products.length]);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white font-sans">
      {/* HEADER */}
      <header className="w-full fixed top-0 left-0 z-50 bg-white/70 backdrop-blur-md shadow-md">
        <div className="max-w-8xl mx-auto flex justify-between items-center px-3 md:px-5 py-2 lg:py-3">
          <h1 className="text-xl md:text-3xl font-extrabold tracking-wide">
            MAVERICK
          </h1>
          <div className="space-x-3 md:space-x-6 flex items-center">
            <button
              onClick={() => router.push("/auth/login")}
              className="px-4 py-1.5 max-lg:py-1.5 font-semibold text-sm md:text-base border border-black text-black rounded-lg hover:bg-black hover:text-white transition-all cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/auth/register")}
              className="px-4 py-1.5 max-lg:py-1.5 font-semibold text-sm md:text-base bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 transition-all cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>
      {/* HERO SECTION */}
      <section className="flex flex-col justify-center items-center text-center flex-grow px-6 pt-32 max-md:pt-24 max-md:pb-8 pb-12 bg-gradient-to-b from-yellow-100 via-white to-yellow-50 relative overflow-hidden shadow-[0_0_80px_20px_rgba(255,223,93,0.45)]">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl lg:text-6xl font-extrabold text-gray-900 leading-tight max-w-xl md:max-w-none"
        >
          Welcome to{" "}
          <span className="bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">
            Maverick
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-3 md:mt-4 text-base md:text-xl text-gray-700 md:text-gray-600 max-w-sm md:max-w-2xl"
        >
          Empowering dreamers, doers, and innovators to achieve excellence.
        </motion.p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/auth/register")}
          className="mt-6 md:mt-8 px-6 md:px-8 py-3 bg-yellow-400 text-black font-semibold rounded-full shadow-lg hover:bg-yellow-300 transition flex items-center gap-2"
        >
          Get Started <FaArrowRight />
        </motion.button>
        <div className="hidden md:block absolute w-[500px] h-[500px] bg-white rounded-full blur-3xl opacity-30 top-[-200px] left-[-100px]" />
        <div className="hidden md:block absolute w-[400px] h-[400px] bg-purple-100 rounded-full blur-3xl opacity-30 bottom-[-100px] right-[-100px]" />
      </section>
      {/* FEATURES SECTION */}
      <section className="px-6 md:px-12 py-15 max-md:py-12 bg-white relative">
        <h2 className="text-2xl lg:text-4xl font-bold text-center text-gray-700 mb-10 max-md:mb-6">
          Why Choose <span className="text-yellow-400">Maverick</span>?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {[
            {
              icon: <FaUsers />,
              title: "Vibrant Community",
              desc: "Connect, collaborate, and grow with visionaries from around the globe.",
            },
            {
              icon: <FaMoneyBillWave />,
              title: "Smart Earnings",
              desc: "Unlock diverse income opportunities and elevate your financial game.",
            },
            {
              icon: <FaChartLine />,
              title: "Limitless Growth",
              desc: "Expand your personal and professional horizons with Maverick’s ecosystem.",
            },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -8 }}
              className="bg-gradient-to-b from-gray-50 to-white py-8 max-md:py-6 px-5 rounded-2xl shadow-md hover:shadow-xl border-t-8 border-gray-500 transition text-center"
            >
              <div className="text-yellow-400 text-5xl mb-4 flex justify-center">
                {feature.icon}
              </div>
              <p className="text-xl font-semibold text-gray-900 mb-3 text-center">
                {feature.title}
              </p>
              <p className="text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRODUCTS SHOWCASE */}
      <section className="w-full py-12 bg-white overflow-hidden max-lg:-mt-8 -mt-5">
        <div className="text-center mb-8">
          <h2 className="text-2xl lg:text-3xl font-semibold">Our Products</h2>
          <p className="text-gray-600 mt-2">
            Explore our innovative product range
          </p>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 ">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ x: 150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -150, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="flex gap-8 justify-center"
            >
              {slideItems.map((item, i) => (
                <div key={i}>
                  <div className="w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-gray-300 shadow-lg">
                    <img
                      src={item.img}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="bg-gradient-to-r from-gray-600 to-gray-900 text-white py-12 max-md:py-8 text-center px-6">
        <h2 className="text-2xl md:text-4xl font-bold mb-6">
          Take the Leap with Maverick
        </h2>
        <p className="max-w-2xl mx-auto text-lg max-md:text-sm text-gray-200 mb-8">
          Join a movement built on innovation, integrity, and inspiration. Let’s
          redefine success—together.
        </p>
        <button
          onClick={() => router.push("/auth/register")}
          className="bg-white text-blue-800 px-8 py-3 max-md:px-6 max-md:py-2 font-semibold rounded-full hover:bg-gray-100 transition transform hover:scale-105"
        >
          Join Now
        </button>
      </section>

      {/* CARDS SECTION */}
      <section className="w-full py-2 px-4 md:px-16 md:py-8 bg-white  rounded-lg mb-5">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl xl:shadow-xl overflow-hidden flex flex-col lg:flex-row">
            {/* IMAGE (TOP on mobile, RIGHT on desktop) */}
            <div className="w-full lg:w-2/5 relative flex justify-center items-center p-6 lg:p-6 ">
              <div className="w-48 h-48 lg:w-80 lg:h-80 rounded-[60%] overflow-hidden shadow-xl">
                <img
                  src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1729073810/samples/two-ladies.jpg"
                  alt="Wellness Image"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* TEXT SECTION (WHITE BACKGROUND) */}
            <div className="w-full lg:w-3/5 p-4 md:p-8">
              <h2 className="text-xl md:text-4xl font-extrabold text-[#0c3978] mb-6">
                STORY OF WELLNESS
              </h2>

              <p className="text-[#778598] mb-4 leading-relaxed text-sm md:text-base">
                The <strong>"Story of Wellness"</strong> reflects the journey
                toward complete well-being—physical, mental, emotional, and
                spiritual—emphasizing balance and harmony in all aspects of
                life.
              </p>

              <p className="text-[#778598] mb-6 leading-relaxed text-sm md:text-base">
                Wellness often begins with an awakening—realizing the need to
                care for mind, body, and soul. This shift comes from personal
                experiences, challenges, or the desire for a better quality of
                life.
              </p>

              <div className="text-[#0c3978] font-semibold text-sm md:text-base border-t border-[#cacccd] pt-4">
                Embracing Balance:
                <span className="text-[#778598] font-normal">
                  {" "}
                  As the journey continues, individuals learn to nurture mental
                  clarity, emotional calm, and physical strength while
                  discovering purpose and fulfillment.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section
        id="about"
        className="px-6 md:px-16 py-10 bg-gradient-to-br from-gray-50 via-white to-gray-100"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-6 max-md:mb-3 max-md:text-left">
            About <span className="text-yellow-500"> {""}Maverick</span>
          </h2>
          <div className="grid grid-cols-1  gap-10">
            <div className="bg-white rounded-2xl max-lg:shadow-none shadow-xl xl:p-6 max-md:py-4  max-lg:border-0 border border-gray-200 hover:shadow-2xl transition-all">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 max-md:mb-2">
                Who We Are
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We are an emerging Direct Selling company on a mission to
                manifest
                <span className="font-semibold text-gray-900">
                  {" "}
                  THE WAY TO HAPPINESS{" "}
                </span>
                by helping people achieve balance, freedom, financial abundance,
                and fulfillment. <br /> <br /> At
                <span className="text-yellow-500 font-bold"> Maverick</span>, we
                empower individuals with a uniquely blended hybrid opportunity
                that enables them to grow on their own terms.
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-2xl shadow-xl p-8 max-md:px-3 hover:shadow-2xl transition-all">
              <h3 className="max-lg:text-xl text-2xl font-bold mb-4">
                Resources, Innovation & Future
              </h3>
              <p className="text-gray-200 leading-relaxed max-md:text-sm">
                <span className="text-yellow-400 font-semibold">Maverick </span>
                is committed to setting market-leading benchmarks through
                innovation and superior hybrid opportunities. <br /> <br />
                Every product and opportunity is backed by science, feasibility,
                and results. <br /> <br /> Our Quad-Core Plan is:
                <span className="block font-semibold text-yellow-300 mt-2">
                  Achievable • Reliable • Realistic • Residual • Legitimate •
                  Leveraged • Long-Term
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ENTREPRENEURSHIP */}
      {/* <section>
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-gray-900 rounded-2xl shadow-xl p-8 m-8 hover:shadow-2xl transition-all md:col-span-2">
          <h3 className="text-2xl font-bold mb-4">
            Entrepreneurial Growth & Vertical Mobility
          </h3>
          <p className="leading-relaxed text-gray-800">
            Maverick nurtures people with an entrepreneurial mindset through
            exclusive 4-phase training programs offered by the Maverick Academy.
            <br /> <br /> Financial abundance is not a dream — it’s a structured
            roadmap at Maverick. <br /> <br />
            <span className="font-semibold text-gray-900">
              Success without growth is hollow, and life without success is
              subtle.
            </span>
            Maverick is built for
            <span className="font-bold">Life Fulfillment.</span>
          </p>
        </div>
      </section> */}

      {/* FOOTER */}
      <footer className="bg-gray-700 text-gray-300 py-4 max-md:py-4 px-6 md:px-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
          {/* LEFT — 2/4 WIDTH */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold text-white mb-1">Maverick</h3>
            <p className="text-gray-400 text-sm">
              Pioneering a new era of opportunity, community, and growth.
            </p>
          </div>

          {/* MIDDLE — 1/4 WIDTH */}
          <div className="lg:col-span-1">
            <h4 className="text-lg font-semibold text-white mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span
                  className="cursor-pointer hover:text-yellow-400 transition"
                  onClick={() => {
                    const section = document.getElementById("about");
                    section?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  About Us
                </span>
              </li>

              <li>
                <span
                  className="cursor-pointer hover:text-yellow-400 transition"
                  onClick={() => {
                    const el = document.getElementById("about");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  About Us
                </span>
                <span
                  className="cursor-pointer hover:text-yellow-400 transition"
                  onClick={() => router.push("/#contact")}
                >
                  Contact
                </span>
              </li>

              <li>
                <span
                  className="cursor-pointer hover:text-yellow-400 transition"
                  onClick={() => openModal("privacy")}
                >
                  Privacy Policy
                </span>
              </li>

              <li>
                <span
                  className="cursor-pointer hover:text-yellow-400 transition"
                  onClick={() => openModal("terms")}
                >
                  Terms & Conditions
                </span>
              </li>
            </ul>
          </div>

          {/* RIGHT — 1/4 WIDTH */}
          <div className="lg:col-span-1 flex flex-col items-center md:items-start xl:items-center">
            <h4 className="text-lg font-semibold text-white mb-3">Follow Us</h4>
            <div className="flex space-x-4 text-lg">
              <a href="#" className="hover:text-yellow-400 transition">
                <FaFacebookF />
              </a>
              <a href="#" className="hover:text-yellow-400 transition">
                <FaInstagram />
              </a>
              <a href="#" className="hover:text-yellow-400 transition">
                <FaTwitter />
              </a>
              <a href="#" className="hover:text-yellow-400 transition">
                <FaLinkedinIn />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-2 pt-2 max-lg:text-center max-md:text-xs text-sm text-gray-400 mb-3">
          © {new Date().getFullYear()} Maverick. All Rights Reserved.
        </div>
      </footer>
      <TermsModal isOpen={!!modalType} type={modalType} onClose={closeModal} />
    </div>
  );
};

export default MaverickHome;
