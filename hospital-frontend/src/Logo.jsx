function Logo({ size = 40, showText = true }) {
  return (
    <div className="brand">
      <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="MediCore logo">
        <rect width="40" height="40" rx="10" fill="#0F6FB5" />
        <path
          d="M6 21H13L17 11L23 31L27 21H34"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <div>
          <div className="brand-name">MediCore</div>
          <div className="brand-sub">Hospital management</div>
        </div>
      )}
    </div>
  );
}

export default Logo;
