import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Paintbrush, 
  RotateCcw, 
  Zap, 
  Crown, 
  ArrowRight, 
  Flame, 
  X,
  Award,
  Users,
  CheckCircle2,
  Share2
} from "lucide-react";

interface AnniversaryGraffitiIntroProps {
  onComplete: () => void;
  autoCloseDelay?: number; // In ms, default 12000
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  dripRate?: number;
}

interface Drip {
  x: number;
  y: number;
  length: number;
  currentLength: number;
  color: string;
  width: number;
  speed: number;
}

export const AnniversaryGraffitiIntro: React.FC<AnniversaryGraffitiIntroProps> = ({
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeColor, setActiveColor] = useState<string>("#38BDF8"); // Cyan default
  const [spraySize, setSpraySize] = useState<number>(24);
  const [isSprayingUser, setIsSprayingUser] = useState(false);
  const [phase, setPhase] = useState<"intro" | "painting" | "celebrate" | "interactive">("intro");
  const [autoProgress, setAutoProgress] = useState(0); // 0 to 100%
  const [copied, setCopied] = useState(false);

  // Audio Context Ref for synthesized spray sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const colors = [
    { name: "Electric Cyan", hex: "#38BDF8", glow: "rgba(56, 189, 248, 0.6)" },
    { name: "Neon Pink", hex: "#EC4899", glow: "rgba(236, 72, 153, 0.6)" },
    { name: "Vibrant Lime", hex: "#10B981", glow: "rgba(16, 185, 129, 0.6)" },
    { name: "Imperial Gold", hex: "#F59E0B", glow: "rgba(245, 158, 11, 0.6)" },
    { name: "Royal Purple", hex: "#8B5CF6", glow: "rgba(139, 92, 246, 0.6)" },
    { name: "Pure White", hex: "#FFFFFF", glow: "rgba(255, 255, 255, 0.8)" }
  ];

  // Sound Synthesizer using Web Audio API
  const playSpraySound = (isStart: boolean) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      if (isStart) {
        if (noiseNodeRef.current) return; // Already playing

        // White noise buffer generator for spray hiss
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        // Bandpass filter for hiss texture
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 2800;
        filter.Q.value = 1.2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noiseNodeRef.current = noise;
        gainNodeRef.current = gain;
      } else {
        if (gainNodeRef.current && ctx) {
          gainNodeRef.current.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          setTimeout(() => {
            if (noiseNodeRef.current) {
              (noiseNodeRef.current as any).stop();
              noiseNodeRef.current = null;
              gainNodeRef.current = null;
            }
          }, 150);
        }
      }
    } catch (e) {
      // Audio not supported or blocked
    }
  };

  const playMarbleClackSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch (e) {
      // Ignore
    }
  };

  // Particles & Canvas Drips logic
  const particlesRef = useRef<Particle[]>([]);
  const dripsRef = useRef<Drip[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Render loop
    const render = () => {
      if (!ctx || !canvas) return;

      // Subtle fade trailing for dynamic paint mist
      ctx.fillStyle = "rgba(10, 15, 30, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Occasional paint drips creation
        if (p.dripRate && Math.random() < p.dripRate) {
          dripsRef.current.push({
            x: p.x,
            y: p.y,
            length: Math.random() * 80 + 30,
            currentLength: 0,
            color: p.color,
            width: Math.random() * 3.5 + 1.5,
            speed: Math.random() * 2 + 1
          });
        }

        ctx.restore();
      }

      // Render Drips
      const drips = dripsRef.current;
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        d.currentLength += d.speed;

        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = d.color;
        ctx.lineWidth = d.width;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + (Math.random() - 0.5) * 0.5, d.y + d.currentLength);
        ctx.stroke();

        // Drip bottom droplet bulb
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y + d.currentLength, d.width * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (d.currentLength >= d.length) {
          // Slow fade out or cap length
          if (Math.random() < 0.05) {
            drips.splice(i, 1);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Function to emit spray particle mist
  const emitSpray = (x: number, y: number, colorHex: string, size: number = 25, count: number = 18) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (size / 2);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * (size / 2),
        y: y + (Math.random() - 0.5) * (size / 2),
        vx,
        vy,
        color: colorHex,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.7 + 0.3,
        decay: Math.random() * 0.015 + 0.005,
        dripRate: i === 0 ? 0.08 : 0
      });
    }
  };

  // Automated Spray Performance Sequence on Mount
  useEffect(() => {
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;
    let autoSprayInterval: NodeJS.Timeout;

    // Phase 1: Intro Marble Shake sound
    playMarbleClackSound();
    setTimeout(() => playMarbleClackSound(), 200);

    // Phase 2: Start automated spray outlining
    timer1 = setTimeout(() => {
      setPhase("painting");
      playSpraySound(true);

      let step = 0;
      const maxSteps = 120;
      const width = window.innerWidth;
      const height = window.innerHeight;

      autoSprayInterval = setInterval(() => {
        step++;
        const pct = step / maxSteps;
        setAutoProgress(Math.min(100, Math.round(pct * 100)));

        // Spray in an explosive celebratory spiral figure 8 around center
        const centerX = width / 2;
        const centerY = height / 2 - 30;
        const radiusX = Math.min(width * 0.35, 420);
        const radiusY = Math.min(height * 0.22, 220);

        const angle = pct * Math.PI * 4;
        const x = centerX + Math.cos(angle) * radiusX * (0.8 + 0.2 * Math.sin(pct * Math.PI * 2));
        const y = centerY + Math.sin(angle * 2) * radiusY;

        const activeHex = colors[step % colors.length].hex;
        emitSpray(x, y, activeHex, 35, 25);

        if (step >= maxSteps) {
          clearInterval(autoSprayInterval);
          playSpraySound(false);
          setPhase("celebrate");
        }
      }, 40);
    }, 1200);

    // Auto transition to interactive state after reveal
    timer2 = setTimeout(() => {
      setPhase("interactive");
    }, 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (autoSprayInterval) clearInterval(autoSprayInterval);
      playSpraySound(false);
    };
  }, []);

  // Mouse / Touch handlers for interactive user spraying
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsSprayingUser(true);
    playSpraySound(true);
    emitSpray(e.clientX, e.clientY, activeColor, spraySize, 30);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isSprayingUser) return;
    emitSpray(e.clientX, e.clientY, activeColor, spraySize, 20);
  };

  const handlePointerUp = () => {
    setIsSprayingUser(false);
    playSpraySound(false);
  };

  const clearCanvas = () => {
    playMarbleClackSound();
    particlesRef.current = [];
    dripsRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#0a0f1d] text-white select-none font-sans"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Background Brick / Urban Wall Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "60px 30px"
        }}
      />

      {/* Urban Ambient Neon Spotlights */}
      <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[15%] w-[550px] h-[550px] bg-pink-500/20 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: "4s" }} />
      <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] bg-amber-500/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Interactive Paint Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 touch-none cursor-crosshair"
      />

      {/* Top Header Bar: Controls & Skip */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-md border border-amber-500/40 rounded-full px-4 py-2 shadow-2xl">
            <Crown className="w-6 h-6 md:w-7 md:h-7 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse" />
            <span className="text-xs md:text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 uppercase">
              3 Year Celebration
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-xl cursor-pointer"
            title={soundEnabled ? "Mute Spray Audio" : "Enable Spray Audio"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {copied && (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-full animate-fade-in">
              Anniversary Link Copied!
            </span>
          )}
          <button
            onClick={handleShare}
            className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-xl cursor-pointer"
            title="Share Celebration"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={onComplete}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.5)] hover:shadow-[0_0_30px_rgba(56,189,248,0.8)] transition-all transform hover:scale-110 active:scale-95 cursor-pointer border border-sky-300/40 flex items-center justify-center"
            title="Enter App"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Center Content: Dynamic Graffiti Anniversary Artwork */}
      <div className="relative z-20 h-full w-full flex flex-col items-center justify-center px-4 pointer-events-none">
        
        {/* Step 1: Initial Shaking Spray Can Loading Prompt */}
        <AnimatePresence>
          {phase === "intro" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: [-6, 6, -6, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 via-pink-500 to-sky-500 p-1 shadow-[0_0_50px_rgba(245,158,11,0.5)] flex items-center justify-center"
                >
                  <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                    <Paintbrush className="w-12 h-12 text-amber-400 animate-pulse" />
                  </div>
                </motion.div>
                <div className="absolute -bottom-2 -right-2 bg-pink-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-full border border-pink-300 shadow-lg">
                  3 YEARS!
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-sky-300">
                Shaking Spray Cans...
              </h2>
              <p className="text-xs text-slate-400 font-medium">Preparing Valley Reigns 3rd Anniversary Street Art</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2 & 3: Graffiti Banner & Anniversary Typography */}
        {(phase === "painting" || phase === "celebrate" || phase === "interactive") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-4"
          >
            {/* Top Minimal Anniversary Tag Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-sky-500/20 border border-amber-400/30 rounded-full px-4 py-1.5 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.25)]"
            >
              <Award className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "8s" }} />
              <span className="text-[11px] md:text-xs font-black uppercase tracking-widest text-amber-300">
                2023 — 2026 • 3RD YEAR ANNIVERSARY
              </span>
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            </motion.div>

            {/* Giant Wildstyle Graffiti Title: VALLEY REIGNS */}
            <div className="relative my-2 sm:my-4">
              <motion.h1
                initial={{ filter: "blur(10px)", scale: 0.9 }}
                animate={{ filter: "blur(0px)", scale: 1 }}
                transition={{ duration: 0.8 }}
                className="text-6xl sm:text-8xl md:text-[7rem] lg:text-[9.5rem] xl:text-[11.5rem] font-black tracking-tight uppercase leading-none font-serif italic"
                style={{
                  fontFamily: "'Impact', 'Trebuchet MS', sans-serif",
                  color: "#FFFFFF",
                  textShadow: `
                    0 0 15px #38BDF8,
                    0 0 30px #38BDF8,
                    0 0 50px #38BDF8,
                    4px 4px 0px #EC4899,
                    8px 8px 0px #0F172A,
                    12px 12px 25px rgba(0,0,0,0.9)
                  `
                }}
              >
                VALLEY REIGNS
              </motion.h1>

              {/* 3D Giant 3 Anniversary Emblem */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 6 }}
                transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.5 }}
                className="absolute -top-10 -right-4 md:-right-10 lg:-right-14 bg-gradient-to-tr from-amber-500 via-pink-600 to-sky-500 p-1 rounded-2xl shadow-[0_8px_30px_rgba(236,72,153,0.6)] transform rotate-6 hover:rotate-0 transition-transform pointer-events-auto"
              >
                <div className="bg-slate-950 px-3 py-1.5 md:px-5 md:py-2.5 rounded-[14px] flex flex-col items-center border border-amber-300/40">
                  <span className="text-2xl sm:text-4xl md:text-5xl font-black text-amber-400 leading-none drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
                    3RD
                  </span>
                  <span className="text-[9px] md:text-[11px] font-black uppercase text-pink-400 tracking-wider">
                    ANNIVERSARY
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Artistic Sub-text: Tap the screen to Celebrate with us */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mt-3 md:mt-5 px-5 py-2 md:px-7 md:py-2.5 rounded-2xl bg-slate-950/80 border border-pink-500/40 backdrop-blur-md shadow-[0_0_30px_rgba(236,72,153,0.35)] inline-flex items-center gap-2.5 pointer-events-auto"
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-amber-400 animate-bounce" />
              <p className="text-xs sm:text-base md:text-lg lg:text-xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-sky-300 drop-shadow-[0_2px_10px_rgba(236,72,153,0.6)] font-sans">
                Tap the screen to Celebrate with us
              </p>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-sky-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Bottom Interactive Toolbar (Spray Palette & Action Controls) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-auto">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 md:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          {/* Color Palette Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider hidden sm:inline">
              Spray Paint:
            </span>
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
              {colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    setActiveColor(c.hex);
                    playMarbleClackSound();
                  }}
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-lg transition-all transform hover:scale-110 active:scale-95 cursor-pointer relative ${
                    activeColor === c.hex ? "ring-2 ring-white scale-110 shadow-lg" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.hex, boxShadow: activeColor === c.hex ? `0 0 15px ${c.glow}` : "none" }}
                  title={`Spray ${c.name}`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons: Clear Canvas & Continue */}
          <div className="flex items-center gap-2.5 justify-end">
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Clear Wall"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            <button
              onClick={onComplete}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-pink-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-slate-950 text-xs md:text-sm font-black uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.7)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              title="Continue to App"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 font-bold" />
            </button>
          </div>
        </motion.div>

        {/* Tip text */}
        <p className="text-center text-[10px] text-slate-400/80 mt-2 font-medium">
          🎨 <span className="text-slate-300">Click & Drag</span> anywhere to spray graffiti on the anniversary wall!
        </p>
      </div>
    </motion.div>
  );
};
