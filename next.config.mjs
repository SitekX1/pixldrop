/** @type {import('next').NextConfig} */
const nextConfig = {
  // Verrät sonst unnötig den verwendeten Stack.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Verhindert, dass die Seite (v.a. das Bestellformular) in einem
          // fremden iframe eingebettet und für Clickjacking missbraucht wird.
          // Bewusst nur frame-ancestors statt einer vollständigen CSP —
          // eine strenge default-src/script-src-Policy würde die eingebetteten
          // Spotify-Player und Next.js' eigene Inline-Skripte brechen.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
