// Handgezeichneter Kaffeering (Signature-Motiv). Dekorativ, nie Informationsträger.
export default function Ring({ className = "", draw = false, ink = false }: { className?: string; draw?: boolean; ink?: boolean }) {
  return (
    <svg
      className={`shop-ring ${draw ? "shop-ring--draw" : ""} ${ink ? "shop-ring--ink" : ""} ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        pathLength={1}
        d="M52 5C78 3 96 24 95 51C94 77 74 96 48 95C22 94 4 74 6 47C8 21 28 7 56 9C66 10 74 13 80 18"
      />
    </svg>
  );
}
