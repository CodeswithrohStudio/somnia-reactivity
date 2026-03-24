import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import Hls from "hls.js";
import { ArrowRight } from "lucide-react";

const VIDEO_SRC = "https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8";
const POSTER = "https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5JTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3Njg5NzIyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080";

interface Props {
  onGetStarted: () => void;
  onSeeHeir: () => void;
}

/* ── Navbar ──────────────────────────────────────────────────────────────── */

function Navbar({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent px-6 py-4 flex items-center justify-between">
      {/* Logo */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {[0,45,90,135,180,225,270,315].map((deg, i) => (
          <line
            key={i}
            x1="12" y1="12"
            x2={12 + 10 * Math.cos((deg * Math.PI) / 180)}
            y2={12 + 10 * Math.sin((deg * Math.PI) / 180)}
            stroke="white" strokeWidth="1.5" strokeLinecap="round"
          />
        ))}
        <circle cx="12" cy="12" r="2" fill="white" />
      </svg>


      {/* Right */}
      <div className="flex items-center gap-3">
        <button
          className="hidden sm:block text-sm font-medium text-white/80 hover:text-white transition-colors"
          style={{ fontFamily: "'Instrument Sans', sans-serif" }}
        >
          Book A Demo
        </button>
        <button
          onClick={onGetStarted}
          className="bg-white text-black rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 transition-colors"
          style={{ fontFamily: "'Instrument Sans', sans-serif" }}
        >
          Get Started
        </button>
      </div>
    </nav>
  );
}

/* ── Hero ────────────────────────────────────────────────────────────────── */

export function Hero({ onGetStarted, onSeeHeir }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(VIDEO_SRC);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => console.log("Auto-play prevented:", e));
      });
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = VIDEO_SRC;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch((e) => console.log("Auto-play prevented:", e));
      });
    }
  }, []);

  return (
    <>
      <Navbar onGetStarted={onGetStarted} />

      <section
        className="relative w-full min-h-screen overflow-hidden text-white"
        style={{ backgroundColor: "#000000" }}
      >
        {/* Background video */}
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          poster={POSTER}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.6 }}
        />

        {/* Video overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

        {/* Decorative gradients */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-20%", left: "20%",
            width: 600, height: 600,
            background: "rgba(30, 58, 138, 0.2)",
            filter: "blur(120px)",
            mixBlendMode: "screen",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "-10%", right: "20%",
            width: 500, height: 500,
            background: "rgba(49, 46, 129, 0.2)",
            filter: "blur(120px)",
            mixBlendMode: "screen",
          }}
        />

        {/* Content */}
        <div
          className="relative z-10 mx-auto max-w-5xl flex flex-col items-center text-center mt-20 space-y-12 px-4 pb-24"
          style={{ paddingTop: "8rem" }}
        >
          {/* Pre-headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-5xl lg:text-[48px] leading-[1.1] text-white"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Your legacy, guaranteed on-chain.
          </motion.h2>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-6xl sm:text-8xl lg:text-[136px] font-semibold leading-[0.9] tracking-tighter"
            style={{
              fontFamily: "'Instrument Sans', sans-serif",
              background: "linear-gradient(to bottom, #ffffff, #ffffff, #b4c0ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Will.eth
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-lg sm:text-[20px] leading-[1.65] text-white max-w-xl"
            style={{ fontFamily: "'Instrument Sans', sans-serif" }}
          >
            A dead man's switch on Somnia Testnet. Deposit once, check in monthly,
            and your heirs receive their inheritance instantly the moment it's needed —
            no lawyers, no delays, no refresh.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            {/* Primary */}
            <button
              onClick={onGetStarted}
              className="group flex items-center gap-3 pl-6 pr-2 py-2 rounded-full bg-white transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105"
              style={{ fontFamily: "'Instrument Sans', sans-serif" }}
            >
              <span className="font-medium text-lg" style={{ color: "#0a0400" }}>
                Create Your Will
              </span>
              <span
                className="h-10 w-10 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: "#3054ff" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2040e0")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3054ff")}
              >
                <ArrowRight size={20} color="white" />
              </span>
            </button>

            {/* Secondary */}
            <button
              onClick={onSeeHeir}
              className="group flex items-center gap-2 px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 backdrop-blur-sm transition-all"
              style={{ fontFamily: "'Instrument Sans', sans-serif" }}
            >
              <span>I'm an Heir</span>
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
