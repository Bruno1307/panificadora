export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6c7bff" />
          <stop offset="100%" stopColor="#9aa4ff" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#g)" />
      <path d="M20 40c8-2 10-10 20-10 6 0 10 4 10 8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="26" r="5" fill="#fff" opacity="0.9" />
    </svg>
  )
}
