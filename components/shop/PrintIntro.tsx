'use client'

// Vollbild-3D-Intro (reines three.js, keine weitere Bibliothek):
// Echte extrudierte Buchstaben (PIXLDROP / 3D DRUCK SHOP) fliegen von links und rechts herein und rasten ein,
// ein 3D-Drucker-Portal druckt dabei Schicht für Schicht das Logo (Clipping-Ebene von unten nach oben) und fährt dann
// aus dem Bild. Warmes Wandlicht mit weichen Schatten (Shadow-Map 1024).
// Glyphen: lib/introGlyphs.json (Libre Baskerville Bold, SIL OFL 1.1, per fontTools vorab erzeugt, keine Laufzeit-Requests).
// Debug (nur Entwicklung): ?introT=2.5 friert die Szene bei 2,5 s ein (für Screenshots). Im Produktions-Build wirkungslos.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import glyphData from '@/lib/introGlyphs.json'

type Props = { onEnde?: () => void; onFehler?: () => void; onSkip?: () => void }

type Glyph = { adv: number; c: number[][][] }
const FONT = glyphData as unknown as { upm: number; cap: number; glyphs: Record<string, Glyph> }

// Zeitplan (Sekunden)
const T_ROW1 = 0.35
const T_ROW2 = 1.5
const T_PRINT0 = 0.9
const T_PRINT1 = 4.15
const T_EXIT0 = 4.3
const T_EXIT1 = 5.1
const T_END = 5.3

const WALL = 0xf1ece4
const INK = 0x1b1916
const ORANGE = 0xff7a1a

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)
const easeInCubic = (p: number) => p * p * p
const easeInOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2
// Ease-out mit kleinem Nachfedern (cubic-bezier-artig, leichtes Überschwingen)
const easeOutBack = (p: number) => { const c1 = 0.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2) }

// Deterministische Zufallszahlen (gleiche Flugbahnen bei jedem Start)
function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } }

function inPoly(pt: number[], poly: number[][]) {
  let ins = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) ins = !ins
  }
  return ins
}
const area = (c: number[][]) => { let a = 0; for (let i = 0; i < c.length; i++) { const [x1, y1] = c[i], [x2, y2] = c[(i + 1) % c.length]; a += x1 * y2 - x2 * y1 } return a / 2 }

// Glyph-Konturen -> extrudierte Geometrie, um die Glyphenmitte zentriert (Schriftgrößen-Einheiten)
function glyphGeometry(ch: string) {
  const g = FONT.glyphs[ch]
  const cs = g.c
  const big = cs.reduce((m, c) => (Math.abs(area(c)) > Math.abs(m) ? area(c) : m), 0)
  const outers: { pts: number[][]; holes: number[][][] }[] = []
  const holes: number[][][] = []
  for (const c of cs) (Math.sign(area(c)) === Math.sign(big) ? outers.push({ pts: c, holes: [] }) : holes.push(c))
  for (const h of holes) (outers.find((o) => inPoly(h[0], o.pts)) ?? outers[0]).holes.push(h)
  const shapes = outers.map((o) => {
    const s = new THREE.Shape(o.pts.map(([x, y]) => new THREE.Vector2(x, y)))
    for (const h of o.holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))))
    return s
  })
  const depth = FONT.cap * 0.34
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 7, bevelSize: 5, bevelSegments: 1, curveSegments: 1 })
  geo.translate(-g.adv / 2, -FONT.cap / 2, -depth / 2)
  return { geo, depth }
}

type Letter = { mesh: THREE.Mesh; row: number; localX: number; t0: number; dur: number; from: THREE.Vector3; rot: THREE.Vector3; depth: number }

export default function PrintIntro({ onEnde, onFehler, onSkip }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [ende, setEnde] = useState(false)
  const cbs = useRef({ onEnde, onFehler })
  cbs.current = { onEnde, onFehler }

  useEffect(() => {
    const host = box.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      cbs.current.onFehler?.()
      return
    }
    let dead = false
    let raf = 0
    let stopped = false
    let T = 0
    let last = 0
    let ended = false

    let freeze: number | null = null
    if (process.env.NODE_ENV !== 'production') {
      const q = new URLSearchParams(window.location.search).get('introT')
      if (q !== null && !Number.isNaN(Number(q))) freeze = Number(q)
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.localClippingEnabled = true
    renderer.setClearColor(WALL, 1)
    const canvas = renderer.domElement
    canvas.setAttribute('aria-hidden', 'true')
    canvas.className = 'pi-canvas'
    host.appendChild(canvas)

    const scene = new THREE.Scene()
    const FOV = 28
    const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 120)

    // ---------- Licht: ein Spot (weiche Schatten, leichte Vignette) + Hemisphere ----------
    scene.add(new THREE.HemisphereLight(0xffffff, 0xf0e6d8, 1.75))
    const spot = new THREE.SpotLight(0xfff4e6, 2.2, 0, 0.82, 1, 0)
    spot.castShadow = true
    spot.shadow.mapSize.set(1024, 1024)
    spot.shadow.bias = -0.0004
    spot.shadow.normalBias = 0.02
    spot.shadow.radius = 7
    spot.shadow.camera.near = 4
    spot.shadow.camera.far = 60
    scene.add(spot, spot.target)

    // ---------- Wand ----------
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: WALL, roughness: 1, metalness: 0 }))
    wall.receiveShadow = true
    scene.add(wall)

    // ---------- Buchstaben ----------
    const letterMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.85, metalness: 0 })
    const rows = ['PIXLDROP', '3D DRUCK SHOP']
    const tracking = [60, 150]
    const geoCache = new Map<string, { geo: THREE.ExtrudeGeometry; depth: number }>()
    const letters: Letter[] = []
    const rowWidth: number[] = [] // in Schriftgrößen-Einheiten
    const rand = rng(7)
    let k = 0
    rows.forEach((txt, ri) => {
      const chars = txt.split('')
      const adv = (c: string) => (c === ' ' ? 300 : FONT.glyphs[c].adv)
      const total = chars.reduce((s, c) => s + adv(c), 0) + tracking[ri] * (chars.length - 1)
      rowWidth.push(total)
      let x = -total / 2
      let idx = 0
      for (const c of chars) {
        if (c !== ' ') {
          const key = c
          if (!geoCache.has(key)) geoCache.set(key, glyphGeometry(c))
          const { geo, depth } = geoCache.get(key)!
          const mesh = new THREE.Mesh(geo, letterMat)
          mesh.castShadow = true
          mesh.receiveShadow = true
          mesh.visible = false
          scene.add(mesh)
          const side = k % 2 === 0 ? -1 : 1
          const base = ri === 0 ? T_ROW1 : T_ROW2
          const step = ri === 0 ? 0.055 : 0.045
          letters.push({
            mesh, row: ri, localX: x + adv(c) / 2, depth,
            t0: base + idx * step, dur: ri === 0 ? 1.05 : 0.95,
            from: new THREE.Vector3(side * (9 + rand() * 4), 2.5 + rand() * 3, 6 + rand() * 3),
            rot: new THREE.Vector3((rand() - 0.5) * 5, side * (2 + rand() * 2.5), (rand() - 0.5) * 3),
          })
          k++
        }
        x += adv(c) + tracking[ri]
        idx++
      }
    })

    // ---------- Logo: gestapelte Kreisscheiben, die von unten nach oben aufgedeckt werden ----------
    const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1e3)
    const logoGroup = new THREE.Group()
    scene.add(logoGroup)
    const logoLayers: THREE.Mesh[] = []
    const logoMats: THREE.MeshStandardMaterial[] = []
    const LAYERS = 10
    const circle = new THREE.CircleGeometry(1, 72)
    const depthMat = new THREE.MeshDepthMaterial({ clippingPlanes: [clip] })
    let logoTex: THREE.Texture | null = null
    const addLayers = (tex: THREE.Texture) => {
      for (let i = 0; i < LAYERS; i++) {
        const c = 0.26 + 0.2 * (1 - i / (LAYERS - 1)) // Licht (Hemisphere + Umgebung) ergibt ca. das 2,2-fache: Vorderseite so auf ca. 1,0 abgestimmt, sonst ausgewaschen; hintere Schichten dunkler: sichtbare Druckschichten an der Kante
        const m = new THREE.MeshStandardMaterial({ map: i === 0 ? tex : tex, color: new THREE.Color(c, c, c), roughness: 0.9, metalness: 0, alphaTest: 0.5, clippingPlanes: [clip] })
        m.alphaToCoverage = true
        const mesh = new THREE.Mesh(circle, m)
        mesh.position.z = -i * 0.012
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.customDepthMaterial = depthMat
        logoGroup.add(mesh)
        logoLayers.push(mesh)
        logoMats.push(m)
      }
    }

    // ---------- Drucker (Bambu-artig: abgerundete Gehäuseteile, Aluminium, Messing, Spule mit PTFE-Schlauch) ----------
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRT.texture
    scene.environmentIntensity = 0.55

    const metalDark = new THREE.MeshStandardMaterial({ color: 0x24231f, roughness: 0.42, metalness: 0.35 })
    const metalMid = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.5, metalness: 0.3 })
    const alu = new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.32, metalness: 0.85 })
    const brass = new THREE.MeshStandardMaterial({ color: 0xd2a94c, roughness: 0.28, metalness: 0.9 })
    const orangeMat = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.5, emissive: ORANGE, emissiveIntensity: 0.3 })
    const hot = new THREE.MeshBasicMaterial({ color: 0xff8a2c })
    const rr = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, Math.max(0.004, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002)))
    const bx = (w: number, h: number, d: number, m: THREE.Material, r = 0.05) => {
      const o = new THREE.Mesh(rr(w, h, d, r), m); o.castShadow = true; o.receiveShadow = true; return o
    }
    const resizeBox = (o: THREE.Mesh, w: number, h: number, d: number, r: number) => { o.geometry.dispose(); o.geometry = rr(w, h, d, r) }

    const base = new THREE.Group() // Platte + Schienen + Spulenhalter
    scene.add(base)
    const plate = bx(1, 0.3, 1.8, metalDark, 0.12)
    const plateTop = bx(1, 0.06, 1.5, metalMid, 0.03)
    const railL = bx(0.17, 1, 0.4, metalDark, 0.07)
    const railR = bx(0.17, 1, 0.4, metalDark, 0.07)
    const footL = bx(0.7, 0.18, 1.2, metalDark, 0.08)
    const footR = bx(0.7, 0.18, 1.2, metalDark, 0.08)
    const strip = bx(1, 0.05, 0.05, orangeMat, 0.02)
    const rodGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 14)
    const rodL = new THREE.Mesh(rodGeo, alu)
    const rodR = new THREE.Mesh(rodGeo, alu)
    base.add(plate, plateTop, railL, railR, footL, footR, strip, rodL, rodR)

    const gantry = new THREE.Group() // Querträger (fährt mit der Druckhöhe)
    scene.add(gantry)
    const cross = bx(1, 0.3, 0.32, alu, 0.09)
    const crossTop = bx(1, 0.05, 0.34, orangeMat, 0.02)
    gantry.add(cross, crossTop)

    const head = new THREE.Group() // Schlitten + Hotend, Ursprung = Düsenspitze
    gantry.add(head)
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.26, 24), brass)
    nozzle.rotation.x = Math.PI; nozzle.position.y = 0.13; nozzle.castShadow = true
    const heater = bx(0.38, 0.2, 0.3, brass, 0.06); heater.position.y = 0.38
    const heaterGlow = bx(0.4, 0.04, 0.32, orangeMat, 0.015); heaterGlow.position.y = 0.38
    head.add(nozzle, heater, heaterGlow)
    for (let i = 0; i < 5; i++) { const f = bx(0.5, 0.03, 0.42, alu, 0.012); f.position.y = 0.56 + i * 0.09; head.add(f) }
    const carriage = bx(1.1, 1.0, 0.34, metalDark, 0.14); carriage.position.set(0, 1.05, 0.1)
    const fanBox = bx(0.92, 0.82, 0.46, metalMid, 0.16); fanBox.position.set(0, 0.98, 0.5)
    const shroud = bx(0.95, 0.18, 0.5, orangeMat, 0.07); shroud.position.set(0, 0.52, 0.5)
    const fanFace = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 32), metalDark)
    fanFace.rotation.x = Math.PI / 2; fanFace.position.set(0, 0.98, 0.76)
    const fanSpin = new THREE.Group(); fanSpin.position.set(0, 0.98, 0.8)
    for (let i = 0; i < 7; i++) {
      const bl = bx(0.3, 0.1, 0.02, alu, 0.01); bl.position.x = 0.15
      const piv = new THREE.Group(); piv.rotation.z = (i * Math.PI * 2) / 7; piv.add(bl); fanSpin.add(piv)
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 20), orangeMat)
    hub.rotation.x = Math.PI / 2; hub.position.set(0, 0.98, 0.82)
    const tipDot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), hot); tipDot.position.y = 0.01
    // Leuchten der Düsenspitze (weicher Schein)
    const gc = document.createElement('canvas'); gc.width = gc.height = 64
    const gx = gc.getContext('2d')!
    const gr = gx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, 'rgba(255,150,50,0.95)'); gr.addColorStop(0.35, 'rgba(255,122,26,0.45)'); gr.addColorStop(1, 'rgba(255,122,26,0)')
    gx.fillStyle = gr; gx.fillRect(0, 0, 64, 64)
    const glowTex = new THREE.CanvasTexture(gc); glowTex.colorSpace = THREE.SRGBColorSpace
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, depthWrite: false, transparent: true }))
    glow.scale.setScalar(0.95); glow.position.set(0, 0.04, 0.12)
    head.add(carriage, fanBox, shroud, fanFace, fanSpin, hub, tipDot, glow)

    // ---------- Layout (Hochformat gestapelt, Querformat Logo links / Text rechts) ----------
    const L = { R: 2.5, lx: 0, ly: 0, LZ: 0.9, rowY: [0, 0], rowCx: 0, rowS: [0, 0], cx: 0, cy: 0, k: 1, top: 6 }
    let dist = 20
    const STAND = 0.22
    const applyLayout = (w: number, h: number) => {
      const aspect = w / h
      const portrait = aspect < 1.1
      const W = 7.0
      const s1 = W / rowWidth[0], s2 = W / rowWidth[1]
      L.rowS = [s1, s2]
      const cap1 = FONT.cap * s1, cap2 = FONT.cap * s2
      let needW: number, needH: number
      if (portrait) {
        L.R = 2.5
        L.rowCx = 0
        L.rowY[1] = 0
        L.rowY[0] = cap2 / 2 + 0.75 + cap1 / 2
        L.ly = L.rowY[0] + cap1 / 2 + 1.0 + L.R + 0.3
        L.lx = 0
        const yMin = -cap2 / 2 - 0.3, yMax = L.ly + L.R + 2.0
        L.cy = (yMin + yMax) / 2
        L.cx = 0
        needW = 8.4; needH = yMax - yMin + 1.2
      } else {
        L.R = 2.35
        L.lx = -4.6
        L.rowCx = 3.4
        L.rowY[1] = -0.6
        L.rowY[0] = L.rowY[1] + cap2 / 2 + 0.6 + cap1 / 2
        L.ly = 0.1
        const left = L.lx - (L.R + 0.8), right = L.rowCx + W / 2
        L.cx = (left + right) / 2
        const yMin = L.ly - L.R - 0.6, yMax = L.ly + L.R + 2.0
        L.cy = (yMin + yMax) / 2
        needW = right - left + 1.6; needH = yMax - yMin + 1.0
      }
      L.k = L.R / 2.4
      const th = Math.tan((FOV / 2) * (Math.PI / 180))
      dist = Math.max(needW / (2 * th * aspect), needH / (2 * th)) * 1.04
      camera.aspect = aspect
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)

      // Lichtposition relativ zur Szene
      spot.position.set(L.cx - 8, L.cy + 6.5, 9.5)
      spot.target.position.set(L.cx, L.cy, 0)
      spot.target.updateMatrixWorld()
      spot.angle = portrait ? 0.95 : 0.9

      // Buchstaben
      for (const l of letters) {
        const s = L.rowS[l.row]
        l.mesh.scale.setScalar(s)
      }
      // Logo
      logoGroup.scale.setScalar(L.R)
      logoGroup.position.set(L.lx, L.ly, L.LZ)
      // Drucker
      const R = L.R
      const pw = R * 2 + 1.7
      const plateY = L.ly - R - 0.15
      resizeBox(plate, pw, 0.3, 1.8, 0.12); plate.position.set(L.lx, plateY, L.LZ - 0.1)
      resizeBox(plateTop, pw - 0.25, 0.06, 1.5, 0.03); plateTop.position.set(L.lx, plateY + 0.18, L.LZ - 0.1)
      resizeBox(strip, pw, 0.05, 0.05, 0.02); strip.position.set(L.lx, plateY - 0.1, L.LZ + 0.72)
      const rx = R + 0.62
      const railH = 2 * R + 1.9
      const railY = plateY + 0.15 + railH / 2
      for (const [r, f, sx] of [[railL, footL, -1], [railR, footR, 1]] as const) {
        resizeBox(r, 0.17, railH, 0.4, 0.07); r.position.set(L.lx + sx * rx, railY, L.LZ + 0.35)
        f.position.set(L.lx + sx * rx, plateY - 0.02, L.LZ + 0.05)
      }
      resizeBox(cross, rx * 2 + 0.24, 0.3, 0.32, 0.09); resizeBox(crossTop, rx * 2 + 0.24, 0.05, 0.34, 0.02)
      for (const [rod, sx] of [[rodL, -1], [rodR, 1]] as const) {
        rod.scale.y = railH - 0.3; rod.position.set(L.lx + sx * (rx - 0.02), railY, L.LZ + 0.58)
      }
      cross.position.set(L.lx, 1.35 * L.k, 0.1 * L.k + 0.3)
      crossTop.position.set(L.lx, 1.35 * L.k + 0.17, 0.1 * L.k + 0.3)
      head.scale.setScalar(L.k)
      head.position.z = 0.12 // Düsenspitze knapp vor der Logofläche (gantry.z wird unten gesetzt)
      gantry.position.z = L.LZ
      head.position.z = 0.1
      cross.position.z = 0.3 * L.k
      crossTop.position.z = 0.3 * L.k
      L.top = L.ly + L.R + 1.4
    }

    const layoutLetters = () => {
      for (const l of letters) {
        const s = L.rowS[l.row]
        l.mesh.userData.to = [L.rowCx + l.localX * s, L.rowY[l.row], STAND + (l.depth * s) / 2]
      }
    }

    // ---------- Zeitverlauf ----------
    const tmp = new THREE.Vector3()
    const update = (t: number) => {
      // Kamera: sanftes Schwanken, am Ende ruhig
      const fade = 1 - easeInOutSine(clamp01(t / T_END))
      camera.position.set(L.cx + 0.45 + Math.sin(t * 0.9) * 0.7 * fade, L.cy + 0.3 + Math.sin(t * 0.7 + 1) * 0.35 * fade, dist)
      camera.lookAt(L.cx, L.cy, 0)

      for (const l of letters) {
        const p = clamp01((t - l.t0) / l.dur)
        l.mesh.visible = p > 0
        if (p <= 0) continue
        const to = l.mesh.userData.to as number[]
        const e = easeOutBack(p), ez = easeOutCubic(p)
        l.mesh.position.set(to[0] + l.from.x * (1 - e), to[1] + l.from.y * (1 - e), to[2] + l.from.z * (1 - ez))
        l.mesh.rotation.set(l.rot.x * (1 - e), l.rot.y * (1 - e), l.rot.z * (1 - e))
      }

      // Druckfortschritt
      const pp = clamp01((t - T_PRINT0) / (T_PRINT1 - T_PRINT0))
      const yBottom = L.ly - L.R, yTop = L.ly + L.R
      const printY = yBottom + (yTop - yBottom) * easeInOutSine(pp)
      clip.constant = pp >= 1 ? 1e3 : printY + 0.02
      const chord = Math.sqrt(Math.max(0.05, L.R * L.R - (printY - L.ly) * (printY - L.ly)))
      const sweep = pp > 0 && pp < 1 ? Math.sin(pp * Math.PI * 2 * 9) * chord * 0.92 : 0

      // Ein- und Ausfahren des Druckers
      const inP = easeOutCubic(clamp01(t / 1.0))
      const outP = easeInCubic(clamp01((t - T_EXIT0) / (T_EXIT1 - T_EXIT0)))
      const upShift = (1 - inP) * 14 + outP * 26
      const downShift = (1 - inP) * 14 + outP * 26
      base.position.y = -downShift
      const headY = (pp < 1 ? printY : yTop) + upShift
      gantry.position.y = headY
      head.position.x = L.lx + sweep
      // Querträger bleibt mittig zwischen den Schienen: Kopf läuft darauf
      cross.position.x = L.lx; crossTop.position.x = L.lx
      // Gantry-Gruppe liegt bei x=0, deshalb Querträger/Kopf in Weltkoordinaten oben gesetzt
      gantry.position.x = 0
      logoGroup.visible = t > T_PRINT0 - 0.05

      fanSpin.rotation.z = -t * 26
      glow.material.opacity = 0.75 + Math.sin(t * 17) * 0.12
      glow.visible = pp < 1 && pp > 0
      tipDot.visible = pp < 1
    }

    const resize = () => {
      const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight)
      applyLayout(w, h)
      layoutLetters()
      update(freeze ?? Math.min(T, T_END))
      if (stopped || freeze !== null) renderer.render(scene, camera)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    const finish = () => {
      if (ended) return
      ended = true
      stopped = true
      cancelAnimationFrame(raf)
      renderer.render(scene, camera) // letzter Frame bleibt stehen, danach kein Rendering mehr
      setEnde(true)
      if (freeze === null || freeze >= T_END) cbs.current.onEnde?.()
    }
    const loop = (now: number) => {
      if (dead || stopped) return
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      T += dt
      if (T >= T_END) { T = T_END; update(T); finish(); return }
      update(T)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (dead) return
      resize()
      if (freeze !== null) {
        stopped = true
        update(freeze)
        renderer.render(scene, camera)
        if (freeze >= T_END) { setEnde(true); cbs.current.onEnde?.() }
        return
      }
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }

    // Logo-Textur laden (lokal), danach Start; schlägt das fehl, wird das Intro übersprungen
    const loader = new THREE.TextureLoader()
    loader.load('/shop/logo-pixldrop-3d.webp', (tex) => {
      if (dead) { tex.dispose(); return }
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
      logoTex = tex
      addLayers(tex)
      start()
    }, undefined, () => { if (!dead) cbs.current.onFehler?.() })

    return () => {
      dead = true
      stopped = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose()
      })
      geoCache.forEach((v) => v.geo.dispose())
      logoTex?.dispose(); glowTex.dispose(); depthMat.dispose(); circle.dispose(); envRT.dispose(); pmrem.dispose(); rodGeo.dispose()
      logoMats.forEach((m) => m.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    }
  }, [])

  return (
    <div className="pi" ref={box}>
      <h1 className="pi-sr" aria-label="Pixldrop 3D Druck Shop">Pixldrop 3D Druck Shop</h1>
      <button type="button" className="pi-skip" onClick={onSkip}>Überspringen</button>
      <div className="pi-hint" data-show={ende ? '1' : '0'} aria-hidden="true">
        <span>Nach unten scrollen</span>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </div>
    </div>
  )
}
