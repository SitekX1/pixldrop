import Image from "next/image";
import Landung from "./Landung";

// Hero-Bühne (Server-Komponente): Nachtlandschaft als Hintergrund (LCP-Bild, priority), darüber der echte Santa (Landung, Client),
// davor eine Kopie des Hintergrunds als Vordergrund-Schnee (oben weich ausgeblendet, versteckt die Hufe) und Verläufe zur Seite hin.
// Alles dekorativ (aria-hidden); Bilder: Gemini-Assets von Alex, freigestellt mit rembg (isnet-general-use), siehe weihnachten-assets.
const BG = "/shop/weihnachten/hintergrund-nacht.webp";

export default function WeihnachtenBuehne() {
  return (
    <Landung
      hinten={<Image className="wn-hg" src={BG} alt="" width={1024} height={572} priority sizes="100vw" />}
      vorn={
        <>
          <Image className="wn-hg wn-hg-vorn" src={BG} alt="" width={1024} height={572} sizes="100vw" />
          <div className="wn-verlauf" />
        </>
      }
    />
  );
}
