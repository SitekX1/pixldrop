export function TikTokIcon() {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="11" fill="#000" />
      <path
        d="M31.5 12.5c1 2.6 3 4.4 5.9 4.8v4.4c-2.1.1-4-.5-5.9-1.7v9.3c0 5.4-4.4 9.7-9.7 9.7s-9.7-4.3-9.7-9.7 4.4-9.7 9.7-9.7c.5 0 1 0 1.5.1v4.5c-.5-.2-1-.3-1.5-.3-2.8 0-5.1 2.3-5.1 5.1s2.3 5.1 5.1 5.1 5.3-2.2 5.3-5v-16.6h4.4Z"
        fill="#25F4EE"
        transform="translate(-1.1,-0.9)"
      />
      <path
        d="M31.5 12.5c1 2.6 3 4.4 5.9 4.8v4.4c-2.1.1-4-.5-5.9-1.7v9.3c0 5.4-4.4 9.7-9.7 9.7s-9.7-4.3-9.7-9.7 4.4-9.7 9.7-9.7c.5 0 1 0 1.5.1v4.5c-.5-.2-1-.3-1.5-.3-2.8 0-5.1 2.3-5.1 5.1s2.3 5.1 5.1 5.1 5.3-2.2 5.3-5v-16.6h4.4Z"
        fill="#FE2C55"
        transform="translate(1.1,0.9)"
      />
      <path d="M31.5 12.5c1 2.6 3 4.4 5.9 4.8v4.4c-2.1.1-4-.5-5.9-1.7v9.3c0 5.4-4.4 9.7-9.7 9.7s-9.7-4.3-9.7-9.7 4.4-9.7 9.7-9.7c.5 0 1 0 1.5.1v4.5c-.5-.2-1-.3-1.5-.3-2.8 0-5.1 2.3-5.1 5.1s2.3 5.1 5.1 5.1 5.3-2.2 5.3-5v-16.6h4.4Z" fill="#fff" />
    </svg>
  );
}

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="11" fill="url(#ig-grad)" />
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="48" x2="48" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.35" stopColor="#D62976" />
          <stop offset="0.7" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="11.5" y="11.5" width="25" height="25" rx="7.5" stroke="#fff" strokeWidth="2.3" fill="none" />
      <circle cx="24" cy="24" r="6.3" stroke="#fff" strokeWidth="2.3" fill="none" />
      <circle cx="32.3" cy="15.7" r="1.7" fill="#fff" />
    </svg>
  );
}

export function YouTubeIcon() {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="11" fill="#FF0000" />
      <path d="M20 16.5L32.5 24L20 31.5V16.5Z" fill="#fff" />
    </svg>
  );
}

export function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#1ED760" />
      <path
        d="M6.5 9.6c3.4-1 7.1-.8 9.9.9M7 12.6c2.8-.8 5.8-.6 8.2.8M7.4 15.4c2.3-.6 4.7-.5 6.6.6"
        stroke="#0b1a10"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16 }}>
      <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
