// Every animation of the landing, loaded after the first paint. The page is complete without it: what moves starts
// in its final, readable state in the HTML (html.pending only hides the sketch and the title for a moment, with a
// 1.5-second safety net), and with reduced motion or the "pause motion" button it stays still.
//
// The story, in order:
//   1. The tamandua is sketched in ink, then washed with colour; its eye follows the pointer.
//   2. Wide screens: bugs crawl all over the page and run from the pointer. As you scroll, one tongue winds out of the
//      snout through every bug, eating each one its tip reaches. Phones and tablets get a lighter version: the mascot
//      snacks on the bugs beside it. Everywhere, the specimens (already caught) are stamped as they scroll in.
//   3. The terminal types itself, the ledger gets its hanko, the tags ride a conveyor, the Jira card turns over, the
//      naturalist's notes write themselves and, on wide screens, each plate is uncovered like a turning page.

type Gsap = typeof import('gsap').gsap
type Trigger = typeof import('gsap/ScrollTrigger').ScrollTrigger
type Point = { x: number; y: number }

const STORAGE = 'tamandua-motion'
const root = document.documentElement
const WIDE = '(min-width: 64rem)'
let teardown: (() => void) | null = null

// The counter in the header: bugs eaten around the page, and specimens caught.
const tally = { page: 0, specimens: 0 }

export function start() {
  wireCopyButtons()
  wireMotionToggle()
  wireThemeToggle()
  const wanted = !root.classList.contains('still') && !matchMedia('(prefers-reduced-motion: reduce)').matches
  if (wanted) void run()
  else settle()
}

// The final state, without animation: specimens caught, the tongue drawn, nothing hidden.
function settle() {
  root.classList.remove('pending')
  document.querySelectorAll<HTMLElement>('[data-type]').forEach(element => { element.textContent = element.dataset.command ?? element.textContent })
  const caught = document.querySelectorAll<HTMLElement>('[data-specimen]')
  caught.forEach(item => item.classList.add('is-caught'))
  Object.assign(tally, { page: 0, specimens: caught.length })
  paintCounter()
  const built = buildTongue([])
  if (built) built.paths.forEach(path => { path.style.strokeDashoffset = '0' })
}

async function run() {
  const [{ gsap }, { ScrollTrigger }, { SplitText }, { DrawSVGPlugin }, Lenis] = await Promise.all([
    import('gsap'), import('gsap/ScrollTrigger'), import('gsap/SplitText'), import('gsap/DrawSVGPlugin'),
    import('lenis').then(module => module.default),
  ])
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin)
  // On phones the address bar shows and hides as you scroll, changing the viewport's height: recomputing the held
  // plates then would make the page jump under the finger.
  ScrollTrigger.config({ ignoreMobileResize: true })
  const lenis = new Lenis({ anchors: true, lerp: 0.12 })
  const onTick = (time: number) => lenis.raf(time * 1000)
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(onTick)
  gsap.ticker.lagSmoothing(0)
  Object.assign(tally, { page: 0, specimens: 0 })
  paintCounter()

  const cleanups: (() => void)[] = []
  const media = gsap.matchMedia()
  // The safety net already showed the page (the script came late): don't hide it again to animate its entrance.
  const late = !root.classList.contains('pending')
  const context = gsap.context(() => {
    ink(gsap, late)
    cleanups.push(eyes(gsap))
    // The big set pieces (the tongue across the page, the turning pages) are for wide screens. On phones and
    // tablets the mascot just snacks on the bugs beside it and the specimens are stamped as they scroll in: lighter,
    // and nothing fights with touch scrolling.
    media.add({ wide: WIDE, narrow: `not all and ${WIDE}` }, matched => {
      Object.assign(tally, { page: 0, specimens: 0 })
      paintCounter()
      stamps(gsap, ScrollTrigger)
      if (!matched.conditions?.wide) return snack(gsap, ScrollTrigger)
      const bugsOnPage = swarm(gsap, ScrollTrigger)
      tongue(gsap, ScrollTrigger, bugsOnPage)
      pages(gsap)
      return () => {
        bugsOnPage.cleanup()
        document.querySelectorAll('[data-tongue-path], [data-tongue-twin]').forEach(path => path.removeAttribute('d'))
        document.querySelectorAll('.leaf').forEach(element => element.remove())
      }
    })
    reveals(gsap, SplitText)
    terminal(gsap, ScrollTrigger)
    ledger(gsap, ScrollTrigger)
    belt(gsap)
    card(gsap)
    numerals(gsap)
    notes(gsap, ScrollTrigger, late)
  })
  root.classList.remove('pending')
  teardown = () => {
    cleanups.forEach(cleanup => cleanup())
    media.revert()
    context.revert()
    document.querySelectorAll('.critter, .lick, .leaf').forEach(element => element.remove())
    gsap.ticker.remove(onTick)
    lenis.destroy()
  }
  // Only if the fonts weren't there yet: a refresh once the reader is scrolling moves the held plates under them.
  if (document.fonts.status !== 'loaded') void document.fonts.ready.then(() => ScrollTrigger.refresh())
}

// --- 1. the ink sketch ------------------------------------------------------------------------------------------------

function ink(gsap: Gsap, late: boolean) {
  const mascot = document.querySelector('[data-mascot]')
  if (!mascot) return
  if (!late) {
    const strokes = mascot.querySelectorAll('[data-ink]')
    const washes = mascot.querySelectorAll('[data-wash]')
    gsap.set(strokes, { drawSVG: '0%' })
    gsap.set(washes, { opacity: 0 })
    gsap.timeline({ delay: 0.2 })
      .to(strokes, { drawSVG: '100%', duration: 1.5, stagger: 0.14, ease: 'sine.inOut' })
      .to(washes, { opacity: 1, duration: 0.9, stagger: 0.05, ease: 'sine.out' }, '-=0.5')
    // The lines of the title rise into place.
    // y: 0 as well: while the page loaded, CSS held them down, and GSAP would otherwise keep that offset in pixels.
    gsap.fromTo('.hero .line-inner', { y: 0, yPercent: 130 }, { y: 0, yPercent: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out' })
    gsap.from('.hero [data-reveal]', { y: 18, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.5 })
  }
  // Alive, quietly: it breathes and its head sways a little.
  gsap.to('.mascot-body', { scaleY: 1.012, svgOrigin: '22 64', duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 })
  gsap.to('.mascot-head', { rotation: 1.6, svgOrigin: '24 40', duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.4 })
  blink(gsap)
}

// A real blink: the lid comes down fast, rises a bit slower, at uneven intervals, now and then twice.
function blink(gsap: Gsap) {
  const lid = document.querySelector('[data-lid]')
  if (!lid) return
  gsap.set(lid, { scaleY: 0, svgOrigin: '27.5 25.7' })
  const once = () => gsap.timeline().to(lid, { scaleY: 1, duration: 0.07, ease: 'sine.in' }).to(lid, { scaleY: 0, duration: 0.13, ease: 'sine.out' })
  const next = () => {
    if (root.classList.contains('still') || !root.contains(lid)) return  // motion was paused: stop blinking
    const timeline = once()
    if (Math.random() < 0.25) timeline.add(once(), '+=0.12')
    gsap.delayedCall(gsap.utils.random(2.8, 6.5), next)
  }
  gsap.delayedCall(3.2, next)
}

// The pupil looks toward the pointer.
function eyes(gsap: Gsap) {
  const pupil = document.querySelector<SVGElement>('[data-pupil]')
  const eye = document.querySelector<SVGElement>('[data-eye]')
  if (!pupil || !eye) return () => {}
  const moveX = gsap.quickTo(pupil, 'x', { duration: 0.35, ease: 'power3.out' })
  const moveY = gsap.quickTo(pupil, 'y', { duration: 0.35, ease: 'power3.out' })
  const look = (event: PointerEvent) => {
    const box = eye.getBoundingClientRect()
    const dx = event.clientX - (box.left + box.width / 2), dy = event.clientY - (box.top + box.height / 2)
    const distance = Math.hypot(dx, dy) || 1
    moveX((dx / distance) * 0.9)
    moveY((dy / distance) * 0.9)
  }
  addEventListener('pointermove', look, { passive: true })
  return () => removeEventListener('pointermove', look)
}

// --- 2. the tongue -------------------------------------------------------------------------------------------------------

// One tongue, out of the snout and across the whole page: it winds through every bug and its tip eats each one it
// reaches. The cover's bugs go first, as soon as the reader starts scrolling; after that, the scroll draws it on.
function tongue(gsap: Gsap, ScrollTrigger: Trigger, swarm: Swarm) {
  let built: Built | null = null
  let reached = 0, goal = 0, intro = 0, started = false, introduced = false, catching = false
  const paint = () => {
    if (!built) return
    built.paths.forEach(path => { path.style.strokeDashoffset = String(built!.total - reached) })
    built.visits.forEach(visit => { if (reached >= visit.length) swarm.eat(visit.id) })
  }
  // Once the cover's bugs are eaten, the tip eases over to wherever the scroll has got to.
  const catchUp = () => {
    catching = true
    const state = { length: reached }
    gsap.to(state, { length: () => goal, duration: 0.3, ease: 'power2.out', onUpdate: () => { reached = state.length; paint() },
                     onComplete: () => { catching = false; reached = goal; paint() } })
  }

  // The cover's part plays by itself once the drawing is done (or as soon as the reader scrolls).
  const begin = () => {
    if (started) return
    started = true
    const state = { length: 0 }
    gsap.to(state, { length: () => built?.head ?? 0, duration: 1 + swarm.cover * 0.25, ease: 'sine.inOut',
                     onUpdate: () => { intro = state.length; update() },
                     onComplete: () => { introduced = true; catching = true; update(); catchUp() } })
  }
  gsap.delayedCall(2.2, begin)

  const update = () => {
    if (!built) return
    if (!started && scrollY > 24) begin()
    const target = scrollY + innerHeight * 0.62 - built.offset
    goal = !started ? 0 : introduced ? Math.max(built.head, lengthAtY(built, target)) : intro
    if (!catching) { reached = goal; paint() }
  }

  const rebuild = () => { built = buildTongue(swarm.visits()); update(); paint() }
  rebuild()
  ScrollTrigger.create({ trigger: '[data-field]', start: 'top top', end: 'bottom bottom', onUpdate: update, onRefresh: rebuild })
}

// A tamandua has one tongue: every lick (bugs and specimens) waits its turn, and when several wait it just eats faster.
let mouth = Promise.resolve()
let waiting = 0
function feed(play: () => GSAPTimeline | null) {
  waiting += 1
  mouth = mouth.then(() => new Promise<void>(settled => {
    const done = () => { waiting -= 1; settled() }
    const timeline = play()
    if (!timeline) return done()
    timeline.eventCallback('onComplete', done)
    timeline.timeScale(1 + Math.min(waiting - 1, 4) * 0.5)
  }))
}

// A quick flick of the tongue's tip (or from `from`) to an element and back: a separate path, drawn out then pulled in.
function lick(gsap: Gsap, field: HTMLElement, svg: SVGSVGElement, target: Element, start: Point) {
  const end = centre(target, field.getBoundingClientRect())
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const bend = (start.y + end.y) / 2 - Math.min(90, Math.abs(start.x - end.x) * 0.18)
  path.setAttribute('d', `M${start.x} ${start.y} Q${(start.x + end.x) / 2} ${bend} ${end.x} ${end.y}`)
  path.setAttribute('class', 'lick')
  svg.appendChild(path)
  const total = path.getTotalLength()
  gsap.set(path, { strokeDasharray: total, strokeDashoffset: total })
  return gsap.timeline({ onComplete: () => path.remove() })
    .to(path, { strokeDashoffset: 0, duration: 0.28, ease: 'power3.out' })
    .to(path, { strokeDashoffset: total, duration: 0.42, ease: 'power2.in' }, '+=0.12')
    .set(path, { opacity: 0 })
}

// Caught and pinned, not eaten: a specimen stays in the collection, with its stamp.
function pin(gsap: Gsap, item: HTMLElement) {
  const bug = item.querySelector('[data-bug]')
  const stamp = item.querySelector('[data-caught]')
  const timeline = gsap.timeline()
  if (bug) timeline.to(bug, { keyframes: [{ rotate: -14, duration: 0.07 }, { rotate: 12, duration: 0.07 }, { rotate: -8, duration: 0.07 }, { rotate: 0, scale: 0.94, duration: 0.18 }] })
  timeline.call(() => item.classList.add('is-caught'))
  if (stamp) timeline.fromTo(stamp, { scale: 1.8, opacity: 0, rotate: -18 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.45, ease: 'back.out(3)' }, '-=0.05')
  return timeline.call(() => { tally.specimens = document.querySelectorAll('[data-specimen].is-caught').length; paintCounter() })
}

// Phones and tablets: three bugs crawl beside the drawing; when it comes into view the tongue flicks out of the snout
// for each, one after another.
function snack(gsap: Gsap, ScrollTrigger: Trigger) {
  const field = document.querySelector<HTMLElement>('[data-field]')
  const svg = field?.querySelector<SVGSVGElement>('[data-tongue-front]')
  const frame = document.querySelector<HTMLElement>('.hero .frame')
  const snout = document.querySelector('[data-tongue="start"]')
  if (!field || !svg || !frame || !snout) return () => {}
  const fit = () => svg.setAttribute('viewBox', `0 0 ${field.offsetWidth} ${field.offsetHeight}`)
  fit()
  const spots = [{ u: 0.9, v: 0.66 }, { u: 0.62, v: 0.86 }, { u: 0.88, v: 0.9 }]
  const bugs = spots.map(() => critter(field))
  const layout = () => {
    const box = field.getBoundingClientRect(), frameBox = frame.getBoundingClientRect()
    bugs.forEach((bug, index) => gsap.set(bug, { left: frameBox.left - box.left + spots[index].u * frameBox.width - 13,
                                                   top: frameBox.top - box.top + spots[index].v * frameBox.height - 11 }))
    fit()
  }
  layout()
  ScrollTrigger.addEventListener('refreshInit', layout)
  bugs.forEach((bug, index) => {
    gsap.fromTo(bug, { opacity: 0, scale: 0.5, rotation: index * 120 }, { opacity: 1, scale: 1, duration: 0.6, delay: 1.4 + index * 0.15, ease: 'back.out(1.8)' })
    gsap.to(bug.querySelector('.critter-body'), { x: 'random(-8, 8)', y: 'random(-6, 6)', rotation: 'random(-30, 30)',
      duration: 'random(1.6, 3)', ease: 'sine.inOut', repeat: -1, yoyo: true, repeatRefresh: true })
  })
  ScrollTrigger.create({ trigger: frame, start: 'center 70%', once: true, onEnter: () => bugs.forEach(bug => feed(() => {
    const nose = centre(snout, field.getBoundingClientRect())
    const at = centre(bug, field.getBoundingClientRect())
    const flick = lick(gsap, field, svg, bug, nose)
    return gsap.timeline()
      .add(flick)
      .to(bug, { x: `+=${nose.x - at.x}`, y: `+=${nose.y - at.y}`, scale: 0.2, duration: 0.42, ease: 'power2.in' }, 0.3)
      .to(bug, { opacity: 0, duration: 0.12 }, 0.62)
      .call(() => { tally.page += 1; paintCounter() }, [], 0.62)
  })) })
  return () => {
    ScrollTrigger.removeEventListener('refreshInit', layout)
    bugs.forEach(bug => bug.remove())
    document.querySelectorAll('.lick').forEach(element => element.remove())
  }
}

// The specimens get their stamp as they scroll in.
function stamps(gsap: Gsap, ScrollTrigger: Trigger) {
  gsap.utils.toArray<HTMLElement>('[data-specimen]').forEach(item => {
    item.classList.remove('is-caught')
    ScrollTrigger.create({ trigger: item, start: 'top 70%', once: true, onEnter: () => pin(gsap, item) })
  })
}

// --- 3. the plates ------------------------------------------------------------------------------------------------

function reveals(gsap: Gsap, Split: typeof import('gsap/SplitText').SplitText) {
  gsap.utils.toArray<HTMLElement>('.plate [data-split]').forEach(title => {
    Split.create(title, { type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: self => {
        // The masks clip each line; room above and below keeps accents and descenders (é, g, p) whole.
        self.masks.forEach(mask => Object.assign((mask as HTMLElement).style, { paddingBlock: '0.16em', marginBlock: '-0.16em' }))
        return gsap.from(self.lines, { yPercent: 120, duration: 1, ease: 'expo.out', stagger: 0.08,
          scrollTrigger: { trigger: title, start: 'top 85%', once: true } })
      } })
  })
  gsap.utils.toArray<HTMLElement>('.plate [data-reveal]').forEach(element => {
    gsap.from(element, { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 88%', once: true } })
  })
}

function terminal(gsap: Gsap, ScrollTrigger: Trigger) {
  const box = document.querySelector<HTMLElement>('[data-terminal]')
  const typed = box?.querySelector<HTMLElement>('[data-type]')
  if (!box || !typed) return
  const command = typed.dataset.command ?? typed.textContent ?? ''
  const lines = box.querySelectorAll('[data-out]')
  gsap.set(lines, { opacity: 0, y: 6 })
  typed.textContent = ''
  ScrollTrigger.create({ trigger: box, start: 'top 75%', once: true, onEnter: () => {
    const state = { count: 0 }
    gsap.timeline()
      .to(state, { count: command.length, duration: command.length * 0.045, ease: 'none', onUpdate: () => { typed.textContent = command.slice(0, Math.round(state.count)) } })
      .to(lines, { opacity: 1, y: 0, duration: 0.35, stagger: 0.12, ease: 'power2.out' }, '+=0.35')
  } })
}

function ledger(gsap: Gsap, ScrollTrigger: Trigger) {
  const book = document.querySelector<HTMLElement>('[data-ledger]')
  const stamp = book?.querySelector<HTMLElement>('[data-hanko]')
  if (!book || !stamp) return
  gsap.set(stamp, { opacity: 0 })
  ScrollTrigger.create({ trigger: book, start: 'top 60%', once: true, onEnter: () => {
    gsap.timeline()
      .from(book.querySelectorAll('[data-row]'), { x: -16, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' })
      .fromTo(stamp, { scale: 2.4, opacity: 0, rotate: 6 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.55, ease: 'back.out(2.6)' }, '+=0.2')
      .fromTo(book, { x: 0 }, { x: 3, duration: 0.05, repeat: 3, yoyo: true, ease: 'none' }, '<0.35')
  } })
}

// Tied to the scroll, so nothing moves on its own.
function belt(gsap: Gsap) {
  const track = document.querySelector<HTMLElement>('[data-belt-track]')
  const belt = document.querySelector<HTMLElement>('[data-belt]')
  if (!track || !belt) return
  // The whole plate stops while scrolling carries every tag past, then the page goes on.
  const plate = belt.closest<HTMLElement>('.plate') ?? belt
  const distance = () => Math.max(0, track.scrollWidth - belt.clientWidth)
  gsap.to(track, { x: () => -distance(), ease: 'none', scrollTrigger: held(plate, () => distance()) })
}

function card(gsap: Gsap) {
  const element = document.querySelector<HTMLElement>('[data-card]')
  const stage = document.querySelector<HTMLElement>('[data-card-stage]')
  if (!element || !stage) return
  // The plate stops: the front can be read, the card turns over, the back can be read, and the page goes on.
  const plate = stage.closest<HTMLElement>('.plate') ?? stage
  // A short hold (about half a screen of scrolling): long enough to turn it, never so long the page seems to end here.
  gsap.timeline({ scrollTrigger: held(plate, () => innerHeight * 0.55) })
    .fromTo(element, { rotateY: 0, rotateZ: -2 }, { rotateY: 0, rotateZ: 0, duration: 0.15 })
    .to(element, { rotateY: 180, rotateZ: 1.5, duration: 0.6, ease: 'power2.inOut' })
    .to({}, { duration: 0.25 })
}

// Holds a plate still for `distance` pixels of scrolling: its bottom at the bottom of the screen, or centred if it fits.
function held(plate: HTMLElement, distance: () => number) {
  return { trigger: plate, start: () => (plate.offsetHeight > innerHeight ? 'bottom bottom' : 'center center'),
           end: () => `+=${distance()}`, pin: true, scrub: 0.5, invalidateOnRefresh: true }
}

function numerals(gsap: Gsap) {
  gsap.utils.toArray<HTMLElement>('.plate-num').forEach(number => {
    gsap.fromTo(number, { yPercent: 20 }, { yPercent: -20, ease: 'none', scrollTrigger: { trigger: number, start: 'top bottom', end: 'bottom top', scrub: true } })
  })
}

// The naturalist's notes write themselves: the words appear left to right, then the arrow is drawn.
function notes(gsap: Gsap, ScrollTrigger: Trigger, late: boolean) {
  gsap.utils.toArray<HTMLElement>('[data-note]').forEach(note => {
    if (late && note.closest('[data-hero]')) return
    const words = note.querySelector('[data-note-text]')
    const ink = note.querySelectorAll('[data-note-ink]')
    gsap.set(words, { clipPath: 'inset(-20% 100% -20% 0)' })
    gsap.set(ink, { drawSVG: '0%' })
    const write = () => gsap.timeline({ delay: note.closest('[data-hero]') ? 2.2 : 0.2 })
      .to(words, { clipPath: 'inset(-20% 0% -20% 0)', duration: Math.min(1.6, 0.05 * (words?.textContent?.length ?? 20)), ease: 'none' })
      .to(ink, { drawSVG: '100%', duration: 0.35, stagger: 0.18, ease: 'power2.out' })
    ScrollTrigger.create({ trigger: note, start: 'top 88%', once: true, onEnter: write })
  })
}

// Each plate arrives under a blank leaf that peels off diagonally, top right to bottom left, as you scroll: the part
// already lifted is mirrored across the fold line and drawn as the leaf's back, with its shadow on the plate.
function pages(gsap: Gsap) {
  gsap.utils.toArray<HTMLElement>('.plate').forEach(plate => {
    const leaf = document.createElement('div')
    leaf.className = 'leaf'
    leaf.setAttribute('aria-hidden', 'true')
    leaf.innerHTML = '<div class="leaf-cover"></div><div class="leaf-fold"><div class="leaf-flap"></div></div>'
    plate.appendChild(leaf)
    const cover = leaf.querySelector<HTMLElement>('.leaf-cover')!
    const flap = leaf.querySelector<HTMLElement>('.leaf-flap')!
    const draw = (progress: number) => {
      const width = plate.offsetWidth, height = plate.offsetHeight
      // The fold is the line x − y = d; it travels from the top right corner (d = width) past the bottom left (d = −height).
      const d = width - progress * (width + height + 40)
      const rect: Point[] = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }]
      const kept = halfPlane(rect, point => d - (point.x - point.y))
      const lifted = halfPlane(rect, point => (point.x - point.y) - d)
      const back = lifted.map(point => ({ x: point.y + d, y: point.x - d }))  // mirrored across the fold
      cover.style.clipPath = polygon(kept)
      flap.style.clipPath = polygon(back)
      leaf.style.visibility = progress >= 1 ? 'hidden' : 'visible'
    }
    draw(0)
    gsap.timeline({ scrollTrigger: { trigger: plate, start: 'top 92%', end: 'top 25%', scrub: 0.5,
                                     onUpdate: self => draw(self.progress), onRefresh: self => draw(self.progress) } })
  })
}

// The part of a convex polygon where side(point) >= 0 (Sutherland–Hodgman against one line).
function halfPlane(points: Point[], side: (point: Point) => number): Point[] {
  const out: Point[] = []
  points.forEach((current, index) => {
    const previous = points[(index + points.length - 1) % points.length]
    const a = side(previous), b = side(current)
    if (b >= 0) {
      if (a < 0) out.push(lerp(previous, current, a / (a - b)))
      out.push(current)
    } else if (a >= 0) out.push(lerp(previous, current, a / (a - b)))
  })
  return out
}
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const polygon = (points: Point[]) => points.length < 3 ? 'polygon(0 0, 0 0, 0 0)'
  : `polygon(${points.map(point => `${point.x.toFixed(1)}px ${point.y.toFixed(1)}px`).join(', ')})`

// --- bugs all over the page ----------------------------------------------------------------------------------------

// A few over the cover's title and two on every plate. They crawl in place, run from the pointer on a desktop, and
// are eaten when the tongue's tip passes over them (its path is drawn through each one).
type Visit = { id: number; at: Point; cover: boolean }
type Swarm = { visits: () => Visit[]; eat: (id: number) => void; cover: number; cleanup: () => void }

function swarm(gsap: Gsap, ScrollTrigger: Trigger): Swarm {
  const field = document.querySelector<HTMLElement>('[data-field]')
  const title = document.querySelector<HTMLElement>('.hero-title')
  if (!field || !title) return { visits: () => [], eat: () => {}, cover: 0, cleanup: () => {} }
  // None among the specimens (already caught) or on the plates held still over the tongue.
  const plates = gsap.utils.toArray<HTMLElement>('.plate').filter(plate => plate.id !== 'specimens' && !plate.hasAttribute('data-held'))
  const random = mulberry(11)
  type Wild = { el: HTMLElement; home: Point; pos: Point; eaten: boolean; cover: boolean; crawl?: gsap.core.Tween }
  const spots = [
    ...Array.from({ length: 3 }, () => ({ plate: -1, u: random(), v: random() })),
    ...plates.flatMap((_, index) => [{ plate: index, u: 0.55 + random() * 0.35, v: 0.08 + random() * 0.12 },
                                      { plate: index, u: 0.02 + random() * 0.08, v: 0.45 + random() * 0.3 }]),
  ]
  const wild: Wild[] = spots.map(spot => ({ el: critter(field), home: { x: 0, y: 0 }, pos: { x: 0, y: 0 }, eaten: false, cover: spot.plate < 0 }))
  const lines = gsap.utils.toArray<HTMLElement>('.line-inner', title)
  const layout = () => {
    const box = field.getBoundingClientRect()
    wild.forEach((bug, index) => {
      const spot = spots[index]
      if (spot.plate < 0) {
        // At the end of each line of the cover's title, so the tongue fetches them without crossing the words.
        const line = lines[index % lines.length], row = line.parentElement!.getBoundingClientRect()
        bug.home = { x: line.getBoundingClientRect().right - box.left + 20 + spot.u * 14, y: row.top - box.top + row.height * (0.45 + spot.v * 0.15) }
      } else {
        const plate = plates[spot.plate].getBoundingClientRect()
        bug.home = { x: 20 + spot.u * (field.offsetWidth - 40), y: plate.top - box.top + spot.v * plate.height }
      }
      if (!bug.eaten) gsap.set(bug.el, { left: bug.home.x - 13, top: bug.home.y - 11 })
    })
  }
  layout()
  ScrollTrigger.addEventListener('refreshInit', layout)
  wild.forEach((bug, index) => {
    gsap.set(bug.el, { rotation: random() * 360 })
    gsap.fromTo(bug.el, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.6, delay: bug.cover ? 1.4 + index * 0.12 : 0, ease: 'back.out(1.8)' })
    bug.crawl = gsap.to(bug.el.querySelector('.critter-body'), { x: 'random(-14, 14)', y: 'random(-10, 10)', rotation: 'random(-30, 30)',
      duration: 'random(1.6, 3)', ease: 'sine.inOut', repeat: -1, yoyo: true, repeatRefresh: true })
  })

  // Eaten: back onto the tongue where it passes, a last wriggle, gone.
  const eat = (id: number) => {
    const bug = wild[id]
    if (!bug || bug.eaten) return
    bug.eaten = true
    bug.crawl?.kill()
    const body = bug.el.querySelector('.critter-body')
    gsap.timeline()
      .to(bug.el, { x: 0, y: 0, duration: 0.2, ease: 'power2.out', overwrite: true })
      .to(body, { x: 0, y: 0, keyframes: [{ rotation: '+=24', duration: 0.07 }, { rotation: '-=40', duration: 0.07 }, { rotation: '+=16', duration: 0.07 }] }, 0)
      .to(bug.el, { scale: 0, opacity: 0, duration: 0.28, ease: 'back.in(2)' }, 0.2)
      .call(() => { tally.page += 1; paintCounter() })
  }

  // On a desktop, they run from the pointer (not far: the tongue still knows where they live).
  let frame = 0
  const onMove = (event: PointerEvent) => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const box = field.getBoundingClientRect()
      const pointer = { x: event.clientX - box.left, y: event.clientY - box.top }
      wild.forEach(bug => {
        if (bug.eaten) return
        const at = { x: bug.home.x + bug.pos.x, y: bug.home.y + bug.pos.y }
        const dx = at.x - pointer.x, dy = at.y - pointer.y, distance = Math.hypot(dx, dy) || 1
        if (distance < 130) {
          const push = (130 - distance) * 0.9
          bug.pos = { x: clamp(bug.pos.x + (dx / distance) * push, -120, 120), y: clamp(bug.pos.y + (dy / distance) * push, -90, 90) }
          gsap.to(bug.el, { x: bug.pos.x, y: bug.pos.y, rotation: (Math.atan2(dy, dx) * 180) / Math.PI + 90, duration: 0.5, ease: 'power3.out', overwrite: 'auto' })
        }
      })
    })
  }
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
  if (fine) addEventListener('pointermove', onMove, { passive: true })
  return {
    visits: () => wild.map((bug, id) => ({ id, at: bug.home, cover: bug.cover })),
    eat,
    cover: wild.filter(bug => bug.cover).length,
    cleanup: () => {
      ScrollTrigger.removeEventListener('refreshInit', layout)
      if (fine) removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
      wild.forEach(bug => bug.el.remove())
    },
  }
}

// --- the spine's path ---------------------------------------------------------------------------------------------

type Sample = { length: number; x: number; y: number; top: number }
// `path` is the tongue behind the content; `paths`, it and its twin on top.
type Built = { path: SVGPathElement; paths: SVGPathElement[]; total: number; offset: number; spineX: number;
               samples: Sample[]; head: number; headTop: number; visits: { id: number; length: number }[] }

function centre(element: Element, box: DOMRect): Point {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top }
}

// A smooth curve through the points (Catmull-Rom turned into cubic Béziers), and points along it every few pixels,
// measured here: asking the browser (getPointAtLength) thousands of times on a long path takes over a second.
function spline(points: Point[]): { d: string; samples: Sample[] } {
  if (points.length < 2) return { d: '', samples: [] }
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  const samples: Sample[] = [{ length: 0, ...points[0], top: points[0].y }]
  let length = 0
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[index - 1] ?? points[index], p1 = points[index], p2 = points[index + 1], p3 = points[index + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    const steps = Math.max(4, Math.ceil((Math.hypot(c1.x - p1.x, c1.y - p1.y) + Math.hypot(c2.x - c1.x, c2.y - c1.y) + Math.hypot(p2.x - c2.x, p2.y - c2.y)) / 6))
    for (let step = 1; step <= steps; step++) {
      const t = step / steps, u = 1 - t
      const x = u * u * u * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p2.x
      const y = u * u * u * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p2.y
      const last = samples[samples.length - 1]
      length += Math.hypot(x - last.x, y - last.y)
      samples.push({ length, x, y, top: y })
    }
  }
  return { d, samples }
}

// From the snout through the cover's bugs, then down the page through every other bug, winding a
// little between them, to the end of the page.
function buildTongue(visits: Visit[]): Built | null {
  const field = document.querySelector<HTMLElement>('[data-field]')
  const back = field?.querySelector<SVGSVGElement>('[data-tongue-svg]')
  const path = back?.querySelector<SVGPathElement>('[data-tongue-path]')
  const svg = field?.querySelector<SVGSVGElement>('[data-tongue-front]')
  const twin = svg?.querySelector<SVGPathElement>('[data-tongue-twin]')
  const clip = svg?.querySelector<SVGRectElement>('[data-tongue-clip]')
  const frame = field?.querySelector('.hero .frame')
  const snout = field?.querySelector('[data-tongue="start"]')
  if (!field || !back || !path || !svg || !twin || !clip || !snout) return null
  const box = field.getBoundingClientRect()
  const width = field.offsetWidth, height = field.offsetHeight
  const gutter = parseFloat(getComputedStyle(document.querySelector('.wrap') ?? field).paddingRight) || 24
  const spineX = width - Math.max(10, gutter * 0.45)
  const nose = centre(snout, box)

  // The cover's bugs first, bottom up (it reaches the title from below), then the rest top to bottom.
  const order = [...visits.filter(visit => visit.cover).sort((a, b) => b.at.y - a.at.y),
                 ...visits.filter(visit => !visit.cover).sort((a, b) => a.at.y - b.at.y)]
  const heads = order.filter(visit => visit.cover).length

  // Inside the drawing's frame (drawn on top there) it goes out of the snout, down the free side and along the empty
  // strip under the body, and leaves by the frame's left edge, never across the mascot. It ends before the dark
  // install plate, where it couldn't be seen behind.
  const frameBox = (frame ?? snout).getBoundingClientRect()
  const left = frameBox.left - box.left, right = frameBox.right - box.left, top = frameBox.top - box.top, bottom = frameBox.bottom - box.top
  const drawing = snout.closest('svg')?.getBoundingClientRect()
  const strip = drawing ? (drawing.bottom - box.top + bottom) / 2 : bottom - 24
  const route = frame ? [{ x: Math.min(nose.x + 36, right - 18), y: nose.y + 14 }, { x: right - 34, y: (nose.y + strip) / 2 },
                         { x: right - 70, y: strip }, { x: left + 50, y: strip }, { x: left - 36, y: strip - 40 }] : []
  const slab = field.querySelector('.install')
  const end = slab ? slab.getBoundingClientRect().top - box.top - 60 : height - 40
  const stops = [nose, ...route, ...order.map(visit => visit.at), { x: spineX, y: end }]
  const points: Point[] = [stops[0]]
  // Down the page, a gentle bend halfway between two stops, alternating sides, so it winds instead of running straight.
  stops.slice(1).forEach((stop, index) => {
    const from = stops[index], dx = stop.x - from.x, dy = stop.y - from.y, distance = Math.hypot(dx, dy)
    if (index >= route.length + heads && distance > 220) {
      const bend = Math.min(110, distance * 0.14) * (index % 2 ? 1 : -1)
      points.push({ x: clamp((from.x + stop.x) / 2 - (dy / distance) * bend, 12, width - 12), y: (from.y + stop.y) / 2 + (dx / distance) * bend })
    }
    points.push(stop)
  })
  const { d, samples } = spline(points)
  for (const layer of [back, svg]) layer.setAttribute('viewBox', `0 0 ${width} ${height}`)
  for (const layer of [path, twin]) layer.setAttribute('d', d)
  Object.entries({ x: left, y: top, width: right - left, height: bottom - top })
    .forEach(([name, value]) => clip.setAttribute(name, String(value)))
  // The browser's own length, for the dash; ours is scaled to it.
  const total = path.getTotalLength()
  const scale = total / (samples[samples.length - 1]?.length || 1)
  for (const sample of samples) sample.length *= scale

  // Where the path passes through each bug, in order along it.
  let cursor = 0
  const placed = order.map(visit => {
    let best = cursor
    for (let index = cursor; index < samples.length; index++) {
      const distance = Math.hypot(samples[index].x - visit.at.x, samples[index].y - visit.at.y)
      if (distance < Math.hypot(samples[best].x - visit.at.x, samples[best].y - visit.at.y)) best = index
      if (distance < 6) break
    }
    cursor = best
    return { id: visit.id, length: samples[best].length, index: best }
  })
  // After the cover, the scroll drives the tip by height: each sample remembers the lowest point reached so far.
  const headIndex = heads ? placed[heads - 1].index : 0
  for (let index = headIndex, top = -Infinity; index < samples.length; index++) top = samples[index].top = Math.max(top, samples[index].y)
  for (const layer of [path, twin]) Object.assign(layer.style, { strokeDasharray: String(total), strokeDashoffset: String(total) })
  return { path, paths: [path, twin], total, offset: box.top + scrollY, spineX, samples, head: samples[headIndex].length,
           headTop: samples[headIndex].top, visits: placed.map(({ id, length }) => ({ id, length })) }
}

// How much tongue is out when the scroll line is at a given height (never less than the cover's part).
function lengthAtY(built: Built, y: number): number {
  if (y <= built.headTop) return 0
  const sample = built.samples.find(item => item.length >= built.head && item.top >= y)
  return sample ? sample.length : built.total
}

// --- small things -------------------------------------------------------------------------------------------------

function critter(parent: HTMLElement): HTMLElement {
  const template = document.querySelector<HTMLTemplateElement>('[data-bug-template]')
  const element = template!.content.firstElementChild!.cloneNode(true) as HTMLElement
  parent.appendChild(element)
  return element
}

function paintCounter() {
  const value = tally.page + tally.specimens
  document.querySelectorAll('[data-counter]').forEach(element => { element.textContent = String(value) })
  document.querySelectorAll<HTMLElement>('[data-counter-label]').forEach(label => {
    label.textContent = (value === 1 ? label.dataset.one : label.dataset.other) ?? label.textContent
  })
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// A small seeded random: the swarm lands in the same places on every visit.
function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function wireCopyButtons() {
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(button => {
    const label = button.textContent
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy ?? '')
        button.textContent = button.dataset.copied ?? label
        setTimeout(() => { button.textContent = label }, 1600)
      } catch { /* the text stays selectable */ }
    })
  })
}

function wireMotionToggle() {
  const button = document.querySelector<HTMLButtonElement>('[data-motion-toggle]')
  if (!button) return
  const paint = () => {
    const still = root.classList.contains('still')
    const label = button.querySelector('[data-motion-label]')
    if (label) label.textContent = still ? button.dataset.play ?? '' : button.dataset.pause ?? ''
    button.setAttribute('aria-pressed', String(still))
  }
  paint()
  button.addEventListener('click', () => {
    const still = !root.classList.contains('still')
    root.classList.toggle('still', still)
    try { localStorage.setItem(STORAGE, still ? 'off' : 'on') } catch { /* a convenience only */ }
    if (still) { teardown?.(); teardown = null; settle() }
    else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) void run()
    paint()
  })
}

// Day or night notebook: follows the system until the visitor chooses (remembered per browser).
function wireThemeToggle() {
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')
  if (!button) return
  button.addEventListener('click', () => {
    const night = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    root.dataset.theme = night ? 'light' : 'dark'
    try { localStorage.setItem('tamandua-theme', root.dataset.theme) } catch { /* a convenience only */ }
  })
}
