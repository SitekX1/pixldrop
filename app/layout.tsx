import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PixlDrop — Digital Solutions",
  description:
    "PixlDrop: CGI-Tiere mit zu vielen Gefühlen. 100% digital, 0% echt, trotzdem mit Herz. Musik, Videos & mehr von PixlDrop.",
  metadataBase: new URL("https://pixldrop.de"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        {umamiWebsiteId ? (
          <script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id={umamiWebsiteId}
          />
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
