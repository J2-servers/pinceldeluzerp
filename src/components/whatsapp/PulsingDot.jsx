export default function PulsingDot({ active }) {
  return (
    <span className="relative flex h-3 w-3">
      {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
    </span>
  );
}
