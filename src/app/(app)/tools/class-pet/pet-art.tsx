import type { PetStage, SkinKind } from "@/lib/class-pet";

const PALETTE: Record<string, { body: string; belly: string; inner: string; mark: string }> = {
  fox: { body: "#E07A3D", belly: "#F8E2CF", inner: "#F3B08A", mark: "#FFF8F2" },
  rabbit: { body: "#E6E1DC", belly: "#F7F4F1", inner: "#F3B6C4", mark: "#FFFFFF" },
  cat: { body: "#3E4450", belly: "#5C6574", inner: "#F0C36B", mark: "#F7F4EF" },
  seal: { body: "#7E9AAD", belly: "#E7EEF2", inner: "#D5E2EA", mark: "#F8FBFC" },
  owl: { body: "#C4A574", belly: "#F4E6CC", inner: "#8C6239", mark: "#FFF8EE" },
  tiger: { body: "#F0A05A", belly: "#FBE6CF", inner: "#F6C9A2", mark: "#6A3B22" },
};

export function PetArt({
  speciesId,
  stage,
  skin,
  image,
  color = "#E7D7B1",
  label,
  className = "",
}: {
  speciesId: string;
  stage: PetStage;
  skin?: SkinKind;
  image?: string;
  color?: string;
  label: string;
  className?: string;
}) {
  if (image) return <img src={image} alt={label} className={`object-contain ${className}`} />;
  if (stage === "egg" || speciesId === "egg") return <Egg label={label} className={className} />;

  const palette = PALETTE[speciesId] ?? { body: color, belly: "#FFF8F1", inner: "#F3B6C4", mark: "#2C261F" };
  const young = stage === "baby";
  const head = young ? 50 : 42;
  const headY = young ? 96 : 88;

  return (
    <svg viewBox="0 0 200 210" role="img" aria-label={label} className={className}>
      <ellipse cx="100" cy="188" rx="48" ry="10" fill="#1F1A17" opacity="0.08" />
      <Ears speciesId={speciesId} fill={palette.body} inner={palette.inner} young={young} />
      {speciesId === "fox" ? <ellipse cx="158" cy="156" rx="24" ry="14" fill={palette.body} transform="rotate(-28 158 156)" /> : null}
      {speciesId === "fox" ? <ellipse cx="176" cy="146" rx="8" ry="6" fill={palette.mark} /> : null}
      <ellipse cx="100" cy={young ? 148 : 150} rx={young ? 46 : 58} ry={young ? 34 : 40} fill={palette.body} />
      {speciesId === "seal" ? (
        <g>
          <ellipse cx="58" cy="156" rx="16" ry="10" fill={palette.inner} transform="rotate(-20 58 156)" />
          <ellipse cx="142" cy="156" rx="16" ry="10" fill={palette.inner} transform="rotate(20 142 156)" />
        </g>
      ) : null}
      <ellipse cx="100" cy={headY} rx={head} ry={head - 2} fill={palette.body} />
      <ellipse cx="100" cy={headY + 16} rx={head * 0.46} ry={head * 0.32} fill={palette.belly} />
      {speciesId === "tiger" ? <Stripes /> : null}
      {speciesId === "owl" ? <OwlEyes y={headY} /> : <Eyes y={headY - 2} light={speciesId === "cat"} />}
      {speciesId === "owl" ? <path d="M94 104 L100 114 L106 104 Z" fill="#E7A23A" /> : <Nose speciesId={speciesId} y={headY + 10} />}
      <Smile y={speciesId === "owl" ? headY + 24 : headY + 18} />
      {skin === "scarf" ? <Scarf /> : null}
      {skin === "hat" ? <Hat young={young} /> : null}
    </svg>
  );
}

function Egg({ label, className }: { label: string; className: string }) {
  return (
    <svg viewBox="0 0 200 210" role="img" aria-label={label} className={className}>
      <ellipse cx="100" cy="188" rx="42" ry="10" fill="#1F1A17" opacity="0.08" />
      <ellipse cx="100" cy="112" rx="52" ry="68" fill="#F6E7C1" />
      <ellipse cx="82" cy="92" rx="16" ry="24" fill="#FFF8EA" opacity="0.85" />
      <circle cx="78" cy="126" r="7" fill="#E7C56A" />
      <circle cx="118" cy="108" r="5" fill="#E7C56A" />
      <circle cx="108" cy="146" r="4" fill="#E7C56A" />
      <path d="M92 78 Q100 88 108 76" fill="none" stroke="#D7B56A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Ears({ speciesId, fill, inner, young }: { speciesId: string; fill: string; inner: string; young: boolean }) {
  const y = young ? 8 : 0;
  if (speciesId === "rabbit") {
    return (
      <g transform={`translate(0 ${y})`}>
        <ellipse cx="76" cy="62" rx="13" ry="36" fill={fill} />
        <ellipse cx="124" cy="62" rx="13" ry="36" fill={fill} />
        <ellipse cx="76" cy="66" rx="6" ry="24" fill={inner} />
        <ellipse cx="124" cy="66" rx="6" ry="24" fill={inner} />
      </g>
    );
  }
  if (speciesId === "fox") {
    return (
      <g>
        <path d="M58 92 L76 28 L108 74 Z" fill={fill} />
        <path d="M142 92 L124 28 L92 74 Z" fill={fill} />
        <path d="M68 82 L80 42 L98 72 Z" fill={inner} />
        <path d="M132 82 L120 42 L102 72 Z" fill={inner} />
      </g>
    );
  }
  if (speciesId === "cat" || speciesId === "tiger") {
    return (
      <g>
        <path d="M64 86 L78 34 L102 70 Z" fill={fill} />
        <path d="M136 86 L122 34 L98 70 Z" fill={fill} />
        <path d="M72 78 L82 46 L96 70 Z" fill={inner} />
        <path d="M128 78 L118 46 L104 70 Z" fill={inner} />
      </g>
    );
  }
  if (speciesId === "owl") {
    return (
      <g>
        <path d="M72 78 L86 40 L100 74 Z" fill={fill} />
        <path d="M128 78 L114 40 L100 74 Z" fill={fill} />
      </g>
    );
  }
  return null;
}

function Eyes({ y, light }: { y: number; light: boolean }) {
  return (
    <g>
      <circle cx="82" cy={y} r="7" fill="#2C261F" />
      <circle cx="118" cy={y} r="7" fill="#2C261F" />
      <circle cx="84.5" cy={y - 2.5} r="2.2" fill="#fff" />
      <circle cx="120.5" cy={y - 2.5} r="2.2" fill="#fff" />
      {light ? <circle cx="100" cy={y + 18} r="2" fill="#F0C36B" /> : null}
    </g>
  );
}

function OwlEyes({ y }: { y: number }) {
  return (
    <g>
      <circle cx="78" cy={y + 2} r="16" fill="#FFF8EE" />
      <circle cx="122" cy={y + 2} r="16" fill="#FFF8EE" />
      <circle cx="80" cy={y + 2} r="7" fill="#2C261F" />
      <circle cx="124" cy={y + 2} r="7" fill="#2C261F" />
      <circle cx="82" cy={y} r="2" fill="#fff" />
      <circle cx="126" cy={y} r="2" fill="#fff" />
    </g>
  );
}

function Nose({ speciesId, y }: { speciesId: string; y: number }) {
  const fill = speciesId === "cat" ? "#F0C36B" : speciesId === "rabbit" ? "#F3B6C4" : "#2C261F";
  return <ellipse cx="100" cy={y} rx="5" ry="3.5" fill={fill} />;
}

function Smile({ y }: { y: number }) {
  return <path d={`M90 ${y} Q100 ${y + 8} 110 ${y}`} fill="none" stroke="#2C261F" strokeWidth="2.5" strokeLinecap="round" />;
}

function Stripes() {
  return (
    <g fill="none" stroke="#6A3B22" strokeWidth="3" strokeLinecap="round">
      <path d="M70 78 Q82 88 68 100" />
      <path d="M130 78 Q118 88 132 100" />
      <path d="M86 150 Q100 158 114 150" />
    </g>
  );
}

function Scarf() {
  return (
    <g>
      <path d="M64 124 Q100 142 136 124 Q122 150 100 144 Q78 150 64 124" fill="#E25B4A" />
      <path d="M118 136 L130 172 L144 158 L128 130" fill="#C4473A" />
    </g>
  );
}

function Hat({ young }: { young: boolean }) {
  const y = young ? 8 : 0;
  return (
    <g transform={`translate(0 ${y})`}>
      <ellipse cx="100" cy="62" rx="36" ry="8" fill="#2F6F62" />
      <path d="M72 62 Q100 18 128 62" fill="#3D8F7A" />
      <circle cx="100" cy="28" r="6" fill="#F2D160" />
    </g>
  );
}
