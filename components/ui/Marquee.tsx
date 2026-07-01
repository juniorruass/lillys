"use client";

interface MarqueeProps {
  items: string[];
  speed?: number;        // segundos por ciclo completo
  direction?: "left" | "right";
  className?: string;
  itemClassName?: string;
  separator?: string;
}

export default function Marquee({
  items,
  speed = 30,
  direction = "left",
  className = "",
  itemClassName = "",
  separator = "•",
}: MarqueeProps) {
  const list = [...items, ...items]; // duplica pra loop perfeito

  return (
    <div className={`overflow-hidden whitespace-nowrap select-none ${className}`}>
      <div
        className="inline-flex gap-0"
        style={{
          animation: `marquee-${direction} ${speed}s linear infinite`,
        }}
      >
        {list.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-3 px-4 ${itemClassName}`}>
            <span className="text-[#00C8FF]/50 text-xs">{separator}</span>
            <span>{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
