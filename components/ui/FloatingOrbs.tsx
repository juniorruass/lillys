"use client";
import { useEffect, useRef } from "react";

interface OrbConfig {
  size: string;
  top: string;
  left: string;
  color: string;
  duration: string;
  delay: string;
  blur: string;
}

const ORBS: OrbConfig[] = [
  { size: "400px", top: "-10%",  left: "60%",  color: "rgba(0,200,255,0.09)",  duration: "18s", delay: "0s",    blur: "80px"  },
  { size: "300px", top: "50%",   left: "-5%",  color: "rgba(0,153,204,0.07)",  duration: "22s", delay: "3s",    blur: "70px"  },
  { size: "250px", top: "70%",   left: "80%",  color: "rgba(0,200,255,0.06)",  duration: "15s", delay: "1.5s",  blur: "60px"  },
  { size: "180px", top: "25%",   left: "30%",  color: "rgba(176,230,255,0.08)","duration": "20s", delay: "5s",  blur: "50px"  },
  { size: "320px", top: "85%",   left: "40%",  color: "rgba(0,200,255,0.05)",  duration: "25s", delay: "2s",    blur: "90px"  },
];

interface FloatingOrbsProps {
  parallax?: boolean;  // responde ao mouse
  className?: string;
}

export default function FloatingOrbs({ parallax = false, className = "" }: FloatingOrbsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parallax) return;
    const el = containerRef.current;
    if (!el) return;

    function onMove(e: MouseEvent) {
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;  // -1 → 1
      const dy = (e.clientY - cy) / cy;

      el!.querySelectorAll<HTMLElement>("[data-orb]").forEach((orb, i) => {
        const depth = (i + 1) * 8; // cada orbe se move em velocidade diferente
        orb.style.transform = `translate(${dx * depth}px, ${dy * depth}px)`;
      });
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [parallax]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {ORBS.map((orb, i) => (
        <div
          key={i}
          data-orb={i}
          className="absolute rounded-full orb-float"
          style={{
            width:  orb.size,
            height: orb.size,
            top:    orb.top,
            left:   orb.left,
            background: orb.color,
            filter: `blur(${orb.blur})`,
            animationDuration: orb.duration,
            animationDelay:    orb.delay,
            transition: parallax ? "transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
          }}
        />
      ))}
    </div>
  );
}
