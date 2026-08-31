import Image from "next/image";
import TikTokStats from "@/components/TikTokStats";
import SpotifyEmbed from "@/components/SpotifyEmbed";
import {
  TikTokIcon,
  InstagramIcon,
  YouTubeIcon,
  SpotifyIcon,
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
          <a
            href={LINKS.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon"
            data-umami-event="social-click"
            data-umami-event-platform="tiktok"
            aria-label="TikTok"
          >
            <TikTokIcon />
          </a>
          <a
            href={LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon"
            data-umami-event="social-click"
            data-umami-event-platform="instagram"
            aria-label="Instagram"
          >
            <InstagramIcon />
          </a>
          <a
            href={LINKS.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon"
            data-umami-event="social-click"
            data-umami-event-platform="youtube"
            aria-label="YouTube"
          >
            <YouTubeIcon />
          </a>
        </div>

        <div className="scroll-hint">
          <span>mehr entdecken</span>
          <ChevronDown />
        </div>

        <section className="bento">
          <a
            href={LINKS.aicut}
            target="_blank"
            rel="noopener noreferrer"
            className="card aicut-card"
            data-umami-event="aicut-click"
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
          </a>

          <div className="card card-wide spotify-artist-card">
            <div>
              <div className="label">Alle Songs auf Spotify</div>
              <div className="sub">Der komplette Katalog &amp; alles Neue zuerst</div>
            </div>
            <a
              href={LINKS.spotifyArtist}
              target="_blank"
              rel="noopener noreferrer"
              className="pill-btn"
              data-umami-event="spotify-artist-click"
            >
              <SpotifyIcon />
              Profil
            </a>
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
