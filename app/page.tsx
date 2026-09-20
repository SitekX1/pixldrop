import HeroLogo from "@/components/HeroLogo";
import EddieCameo from "@/components/EddieCameo";
import TikTokStats from "@/components/TikTokStats";
import SongCard from "@/components/SongCard";
import TrackedLink from "@/components/TrackedLink";
import LegalFooter from "@/components/LegalFooter";
import SpotifyLinkButton from "@/components/SpotifyLinkButton";
import {
  TikTokIcon,
  InstagramIcon,
  YouTubeIcon,
  ChevronDown,
  ExternalArrow,
} from "@/components/Icons";

const SONGS = [
  { title: "Schon wieder Montag", trackId: "1OBsbwEzhFstbQWtZhwftq", cover: "/song-covers/montag.jpg" },
  { title: "Schon wieder Mittwoch", trackId: "4i8yV3ODVXS5sWAZn75LeU", cover: "/song-covers/mittwoch.jpg" },
  { title: "Dienstag ist wie Montag", trackId: "3sNTLakwqSOH7qfA1YREvz", cover: "/song-covers/dienstag.jpg" },
  { title: "Endlich Samstag", trackId: "6nWMTYQIVyGTxuxW3SFfUP", cover: "/song-covers/samstag.jpg" },
  { title: "Kollegen Mittwoch", trackId: "2PSJdcbvCOzWeDfmXwhJlX", cover: "/song-covers/mittwoch-kollegen.jpg" },
];

const LINKS = {
  spotifyArtist: "https://open.spotify.com/artist/4yHsRD3lNUT4JO4jUPtsgz",
  aicut: "https://www.aicut.pro/?via=alex65",
  tiktok: "https://www.tiktok.com/@pixldropai",
  instagram: "https://www.instagram.com/pixl.drop",
  youtube: "https://www.youtube.com/@pixldropai",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  const { src } = await searchParams;
  // ?src=tiktok / ?src=instagram kommt vom Bio-Link der jeweiligen Plattform
  // (siehe Datenschutz/Doku) — wird 1:1 an den Spiel-Link weitergereicht,
  // damit das Spiel dort nur den passenden Folgen-Button zeigt.
  const normalizedSrc = src === "tiktok" || src === "instagram" ? src : undefined;
  const gameHref = normalizedSrc ? `/pixlgame?src=${normalizedSrc}` : "/pixlgame";

  return (
    <>
      <main className="page">
        <div className="eyebrow">
          <HeroLogo />
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
          <div className="section-label">🎮 Minigame</div>
          <TrackedLink
            href={gameHref}
            id="pixlgame-target"
            className="card pixlgame-card"
            event="pixlgame-click"
            eventData={{ platform: normalizedSrc ?? "direct" }}
          >
            <div className="card-glow" />
            <img
              src="/pixlgame-media/promo-card.jpg"
              alt=""
              className="promo-card-img"
              style={{ aspectRatio: "900 / 483" }}
            />
            <div className="eyebrow-small">Eddie hat sich ins Café geschlichen</div>
            <h3>Eddie&apos;s Café — jetzt spielen</h3>
            <p>
              Schieß Kaffeebohnen &amp; Tassen für Punkte, überleb 30 Sekunden Rush und schnapp
              dir einen Platz in der Rangliste.
            </p>
            <span className="pill-btn">Jetzt spielen →</span>
            <EddieCameo side="right" targetId="pixlgame-target" />
          </TrackedLink>

          <div className="section-label">🎬 Meine Tools &amp; Musik</div>
          <TrackedLink
            href={LINKS.aicut}
            target="_blank"
            rel="noopener noreferrer"
            className="card aicut-card"
            event="aicut-click"
          >
            <div className="card-glow" />
            <img
              src="/aicut-promo-card.jpg"
              alt=""
              className="promo-card-img"
              style={{ aspectRatio: "900 / 503" }}
            />
            <div className="eyebrow-small">Werbung &middot; So mache ich meine Videos</div>
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

          <div className="song-grid">
            {SONGS.map((song) => (
              <SongCard
                key={song.trackId}
                title={song.title}
                trackId={song.trackId}
                cover={song.cover}
              />
            ))}
          </div>
        </section>
      </main>

      <footer id="page-bottom-target">
        <EddieCameo side="left" targetId="page-bottom-target" />
        <LegalFooter />
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
