type Tone = "default" | "warm" | "ink";
type Size = "default" | "lg";

const toneClass: Record<Tone, string> = {
  default: "",
  warm: "bg-paper-warm/40",
  ink: "bg-ink text-paper-warm",
};

const sizeClass: Record<Size, string> = {
  default: "py-20 md:py-28",
  lg: "py-24 md:py-36",
};

export function Plate({
  children,
  tone = "default",
  size = "default",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  size?: Size;
  className?: string;
}) {
  return (
    <section
      className={`relative border-t border-paper-edge/60 ${toneClass[tone]} ${className}`}
    >
      <div className={`mx-auto max-w-[1440px] px-6 md:px-10 ${sizeClass[size]}`}>
        {children}
      </div>
    </section>
  );
}
