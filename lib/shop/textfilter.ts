// Automatische Vorpruefung von Wunschtexten (laeuft im Browser UND auf dem Server, kein server-only).
// Ziel: offensichtlich unzulaessige Texte (Beleidigung, Hass-/NS-Bezug, geschuetzte Marken/Figuren) gar nicht erst bestellbar machen.
// Grenzen: reine Wortlisten, keine Bedeutungserkennung. Was nicht erkannt wird, prueft Alex weiter vor dem Druck (AGB-Vorbehalt).
//
// Listen-Schreibweise: "wort" = nur das ganze Wort (und Plural mit s); "*wort" = auch als Wortbestandteil (nur lange, eindeutige Begriffe);
// "zwei woerter" = Wortfolge (zusammengeschrieben ab 8 Zeichen ebenfalls erkannt).

export type Textpruefung = { ok: true } | { ok: false; grund: "unzulaessig" | "marke"; meldung: string };

export const TEXT_MELDUNG =
  "Dieser Text kann so leider nicht gedruckt werden (möglicherweise geschützte Marke oder unzulässiger Inhalt). Bitte ändere ihn oder schick eine individuelle Anfrage.";

const BELEIDIGUNG = `
*arschloch,arsch,*arschgeige,*arschkriecher,*wichser,wixer,*hurensohn,*hurenkind,hure,huren,nutte,nutten,fotze,fotzen,votze,fick,ficken,ficker,fickt,
*fuck,*scheiss,*schlampe,*miststueck,*vollidiot,idiot,idioten,spast,spasti,*missgeburt,*drecksau,*drecksack,kacke,kackbratze,pisser,pissnelke,
behindert,behinderter,mongo,mongos,spacko,kruppel,bastard,*hundesohn,*schwuchtel,*schwanzlutscher,pimmel,penis,vagina,titten,porno,wichsen,bumsen,
*kanake,neger,negerin,negern,nigga,niggas,*nigger,*zigeuner,*judensau,*judenschwein,*untermensch,*asshole,bitch,bitches,cunt,pussy,whore,slut,shit,bullshit,
*faggot,retard,retarded,tranny,wanker,twat,*motherfuck,*blowjob,*dumbass,dildo,rapist,*paedophil,*pedophil,pedo,*vergewalt,kinderficker,kinderschander
`;

const HASS = `
*hakenkreuz,*hitler,*siegheil,sieg heil,heil hitler,*heilhitler,nsdap,*sturmabteilung,*reichskriegsflagge,mein kampf,neonazi,neonazis,
juden raus,*judenraus,auslander raus,*auslanderraus,deutschland den deutschen,blut und boden,white power,*whitepower,*vergasen,*gaskammer,daesh
`;

const MARKEN = `
*disney,*pixar,*nintendo,*pokemon,*pikachu,*glurak,*charizard,*digimon,dragon ball,*dragonball,goku,*naruto,one piece,sailor moon,*totoro,*ghibli,
hello kitty,*hellokitty,snoopy,charlie brown,*minions,bluey,paw patrol,*pawpatrol,peppa pig,peppa wurst,*spongebob,mickey mouse,micky maus,minnie mouse,donald duck,
winnie pooh,winnie the pooh,tigger,pumuckl,benjamin blumchen,bibi blocksberg,feuerwehrmann sam,shaun das schaf,bugs bunny,tom und jerry,*scooby,*simpsons,homer simpson,
family guy,south park,rick and morty,garfield,asterix,obelix,lucky luke,
super mario,*supermario,mario kart,mario bros,luigi,bowser,yoshi,legend of zelda,*pacman,pac man,sonic the hedgehog,angry birds,candy crush,brawl stars,clash of clans,
*minecraft,*fortnite,*roblox,*playstation,ps5,ps4,*xbox,call of duty,gta,grand theft auto,league of legends,among us,world of warcraft,*overwatch,*valorant,counter strike,
*marvel,*batman,*superman,*spiderman,spider man,iron man,*ironman,captain america,*avengers,*deadpool,*wolverine,hulk,
harry potter,*harrypotter,*hogwarts,*gryffindor,*dumbledore,*voldemort,star wars,*starwars,darth vader,yoda,jedi,*stormtrooper,*mandalorian,*chewbacca,
lord of the rings,herr der ringe,game of thrones,*gandalf,
lego,*playmobil,barbie,hot wheels,*mattel,*hasbro,*duplo,fisher price,*schleich,*tonies,*tiptoi,
nike,*adidas,puma,*reebok,under armour,new balance,converse,*gucci,louis vuitton,*louisvuitton,*chanel,prada,*versace,*burberry,hermes,dior,*balenciaga,armani,
calvin klein,tommy hilfiger,ralph lauren,*lacoste,supreme,off white,north face,*patagonia,jack wolfskin,levis,hugo boss,michael kors,*rolex,*swarovski,*pandora,
ray ban,*oakley,*birkenstock,crocs,*hollister,*abercrombie,*zalando,
bmw,mercedes,*mercedesbenz,audi,*volkswagen,vw,*porsche,*ferrari,*lamborghini,*maserati,*bugatti,tesla,opel,toyota,honda,harley davidson,*harleydavidson,harley,*ducati,
*yamaha,*kawasaki,vespa,land rover,range rover,rolls royce,bentley,aston martin,*mclaren,skoda,renault,peugeot,fiat,volvo,mazda,nissan,hyundai,
*coca cola,*cocacola,pepsi,fanta,sprite,fritz kola,club mate,red bull,*redbull,monster energy,*jagermeister,jack daniels,*bacardi,*smirnoff,*heineken,*warsteiner,
*krombacher,*bitburger,*paulaner,*erdinger,*augustiner,*veltins,*hofbrau,
*nutella,*haribo,*milka,ritter sport,kinder bueno,*kinderschokolade,*ferrero,*lindt,oreo,snickers,twix,*nespresso,*nescafe,*tchibo,*lavazza,*starbucks,
*mcdonalds,burger king,kfc,
*google,*youtube,*tiktok,*instagram,*facebook,*whatsapp,*snapchat,*netflix,*spotify,*twitch,apple,iphone,*samsung,*huawei,sony,microsoft,amazon,*playboy,*marlboro,
*ikea,lidl,aldi,*kaufland,*edeka,*telekom,*vodafone,*stihl,*makita,*dewalt,*hilti,john deere,*caterpillar,
fc bayern,*fcbayern,bayern munchen,bvb,borussia dortmund,*borussia,*schalke,werder bremen,hamburger sv,hsv,rb leipzig,bayer leverkusen,eintracht frankfurt,vfb stuttgart,
vfl wolfsburg,fc augsburg,fca,fc koln,union berlin,hertha bsc,fsv mainz,tsg hoffenheim,sc freiburg,fc st pauli,fortuna dusseldorf,hannover 96,real madrid,fc barcelona,
manchester united,manchester city,*juventus,ac milan,inter mailand,paris saint germain,psg,dfb,uefa,fifa,*bundesliga,champions league,fcb
`;

// Harmlose Woerter/Namen, die sonst durch Wortbestandteil-Treffer ("*") faelschlich anschlagen koennten.
const ERLAUBT = new Set("marvelous fickert fickel fickler hasse hassel hasselbach".split(" "));

// Hinweiswoerter fuer "nazi" im verherrlichenden Kontext ("Grammatik-Nazi" bleibt erlaubt)
const NAZI_KONTEXT = new Set("stolz power forever pride sieg heil gruss rules fan love lebt".split(" "));

const LEET: Record<string, string> = { "0": "o", "3": "e", "4": "a", "5": "s", "7": "t" };

function kern(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`´]/g, "")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");
}
const einfach = (t: string) => (/^[0-9]+$/.test(t) ? t : t.replace(/([a-z])\1+/g, "$1"));

function zerlege(s: string): string[] {
  return kern(s).split(/[^a-z0-9]+/).filter(Boolean).map(einfach);
}

type Listen = { exakt: Set<string>; stamm: string[]; folgen: string[][] };

function baue(roh: string): Listen {
  const exakt = new Set<string>();
  const stamm: string[] = [];
  const folgen: string[][] = [];
  for (const eintrag of roh.split(/[,\n]/).map((e) => e.trim()).filter(Boolean)) {
    const istStamm = eintrag.startsWith("*");
    const toks = zerlege(istStamm ? eintrag.slice(1) : eintrag);
    if (toks.length === 0) continue;
    if (toks.length > 1) {
      folgen.push(toks);
      const glued = toks.join("");
      if (glued.length >= 8) stamm.push(glued); else exakt.add(glued);
    } else if (istStamm && toks[0].length >= 4) stamm.push(toks[0]);
    else exakt.add(toks[0]);
  }
  return { exakt, stamm, folgen };
}

const L_BELEIDIGUNG = baue(BELEIDIGUNG);
const L_HASS = baue(HASS);
const L_MARKEN = baue(MARKEN);

/** Anzahl der Eintraege je Liste (fuer Doku/Tests). */
export const LISTEN_GROESSE = {
  beleidigung: BELEIDIGUNG.split(/[,\n]/).filter((e) => e.trim()).length,
  hass: HASS.split(/[,\n]/).filter((e) => e.trim()).length,
  marken: MARKEN.split(/[,\n]/).filter((e) => e.trim()).length,
};

function trifftToken(l: Listen, t: string): boolean {
  if (ERLAUBT.has(t)) return false;
  if (l.exakt.has(t)) return true;
  if (t.length >= 4 && t.endsWith("s") && l.exakt.has(t.slice(0, -1))) return true;
  return l.stamm.some((s) => t.includes(s));
}

function trifftFolge(l: Listen, ts: string[]): boolean {
  return l.folgen.some((f) => {
    for (let i = 0; i + f.length <= ts.length; i++) if (f.every((w, k) => ts[i + k] === w)) return true;
    return false;
  });
}

function trifft(l: Listen, ts: string[]): boolean {
  return ts.some((t) => trifftToken(l, t)) || trifftFolge(l, ts);
}

function hassZahlen(ts: string[]): boolean {
  const hat = (w: string) => ts.includes(w);
  if (hat("1488") || ts.some((t, i) => t === "14" && ts[i + 1] === "88")) return true;
  if (hat("88") && ["heil", "hh", "hitler", "sieg", "nazi", "nazis"].some(hat)) return true;
  if ((hat("nazi") || hat("nazis")) && ts.some((t) => NAZI_KONTEXT.has(t))) return true;
  return false;
}

/** Varianten eines Textes: Original, Leetspeak (1 als i bzw. l), Ziffern entfernt. */
function varianten(basis: string[]): string[][] {
  // Einzelbuchstaben-Folgen ("N.i.k.e", "N 1 K E") zusaetzlich zusammengezogen als Wort aufnehmen
  const mitFolgen = [...basis];
  let lauf = "";
  const schliesse = () => { if (lauf.length >= 2) mitFolgen.push(lauf); lauf = ""; };
  for (const t of basis) { if (t.length === 1) lauf += t; else schliesse(); }
  schliesse();

  const hatBuchstabe = (t: string) => /[a-z]/.test(t) && /[0-9]/.test(t);
  const abbilden = (eins: string) => mitFolgen.map((t) =>
    hatBuchstabe(t) ? einfach(t.replace(/[0-9]/g, (d) => (d === "1" ? eins : LEET[d] ?? d))) : t);
  const ohneZiffern = mitFolgen.map((t) => (hatBuchstabe(t) ? einfach(t.replace(/[0-9]/g, "")) : t)).filter(Boolean);
  return [mitFolgen, abbilden("i"), abbilden("l"), ohneZiffern];
}

export function pruefeWunschtext(zeilen: string[]): Textpruefung {
  const basis = zerlege(zeilen.join(" "));
  if (basis.length === 0) return { ok: true };
  const vars = varianten(basis);
  const unz = /(^|[^a-z])k{3}([^a-z]|$)/.test(kern(zeilen.join(" "))) || vars.some((v) => trifft(L_BELEIDIGUNG, v) || trifft(L_HASS, v)) || hassZahlen(basis);
  if (unz) return { ok: false, grund: "unzulaessig", meldung: TEXT_MELDUNG };
  if (vars.some((v) => trifft(L_MARKEN, v))) return { ok: false, grund: "marke", meldung: TEXT_MELDUNG };
  return { ok: true };
}
