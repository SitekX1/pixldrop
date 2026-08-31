import Image from "next/image";
import TikTokStats from "@/components/TikTokStats";
import SpotifyEmbed from "@/components/SpotifyEmbed";
import TrackedLink from "@/components/TrackedLink";
import SpotifyLinkButton from "@/components/SpotifyLinkButton";
import {
  TikTokIcon,
  InstagramIcon,
  YouTubeIcon,
  ChevronDown,
  ExternalArrow,
} from "@/components/Icons";

const SONGS = [
  { title: "Schon wieder Montag", trackId: "1OBsbwEzhFstbQWtZhwftq" },
  { title: "Dienstag ist wie Montag", trackId: "3sNTLakwqSOH7qfA1YREvz" },
  { title: "Kollegen Mittwoch", trackId: "2PSJdcbvCOzWeDfmXwhJlX" },
  { title: "Endlich Samstag", trackId: "6nWMTYQIVyGTxuxW3SFfUP" },
];

const LINKS = {
  spotifyArtist: "https://open.spotify.com/artist/4yHsRD3lNUT4JO4jUPtsgz",
  aicut: "https://www.aicut.pro/?via=alex65",
  tiktok: "https://www.tiktok.com/@pixldropai",
  instagram: "https://www.instagram.com/pixl.drop",
  youtube: "https://www.youtube.com/@pixldropai",
};

export default function Home() {
  return (
    <>
      <Image
        src="/pixldrop-logo-transparent.png"
        alt=""
        width={868}
        height={628}
        className="bg-logo"
        priority
      />

      <main className="page">
        <div className="eyebrow">
          <Image
            src="/pixldrop-header-logo.png"
            alt="PixlDrop"
            width={728}
            height={536}
            className="header-logo"
            priority
          />
          <p className="tagline">
            🐾 CGI-Tiere mit zu vielen Gefühlen.
            <br />
            ✨ 100% digital. 0% echt. Trotzdem mit Herz.
            <br />
            Die volle Packung Motivation 💪
          </p>
        </div>

        <TikTokStats />

        <p className="trust-note">Danke für euer Vertrauen in PixlDrop 🙏</p>

        <div className="social-row">
          <TrackedLink
            href={LINKS.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon"
            event="social-click"
            eventData={{ platform: "tiktok" }}
            aria-label="TikTok"
          >
            <TikTokIcon />
          </TrackedLink>
          <TrackedLink
            href={LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon"
            event="social-click"
            eventData={{ platform: "instagram" }}
            aria-label="Instagram"
          >
            <InstagramIcon />
          </TrackedLink>
          <TrackedLink
            href={LINKS.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon"
            event="social-click"
            eventData={{ platform: "youtube" }}
            aria-label="YouTube"
          >
            <YouTubeIcon />
          </TrackedLink>
        </div>

        <div className="scroll-hint">
          <span>mehr entdecken</span>
          <ChevronDown />
        </div>

        <section className="bento">
          <TrackedLink
            href={LINKS.aicut}
            target="_blank"
            rel="noopener noreferrer"
            className="card aicut-card"
            event="aicut-click"
          >
            <div className="card-glow" />
            <div className="eyebrow-small">So mache ich meine Videos</div>
            <h3>aicut — von der Idee zum fertigen Clip</h3>
            <p>
              Das KI-Tool, mit dem ich Eddie &amp; Co. zum Leben erwecke. Schau's dir an und
              probier's selbst aus.
            </p>
            <span className="pill-btn">
              Jetzt entdecken <ExternalArrow />
            </span>
          </TrackedLink>

          <div className="card card-wide spotify-artist-card">
            <div>
              <div className="label">Alle Songs auf Spotify</div>
              <div className="sub">Der komplette Katalog &amp; alles Neue zuerst</div>
            </div>
            <SpotifyLinkButton href={LINKS.spotifyArtist} />
          </div>

          {SONGS.map((song) => (
            <div className="card" key={song.trackId}>
              <div className="song-title">{song.title}</div>
              <SpotifyEmbed trackId={song.trackId} title={song.title} />
            </div>
          ))}
        </section>
      </main>

      <footer>
        <div className="footer-links">
          <a href="/impressum">Impressum</a>
          <a href="/datenschutz">Datenschutz</a>
        </div>
        <div className="powered-by">
          Powered by{" "}
          <a href="https://sitekx.de" target="_blank" rel="noopener noreferrer">
            <span className="sitek">Sitek</span>
            <span className="x">X</span>
          </a>
        </div>
      </footer>
    </>
  );
}
