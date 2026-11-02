import { servicesTravel } from './servicesData'
export const PAPER = '#f5f4f0'
export const INK = '#252622'
export const ids = ['home', 'work', 'services', 'people', 'reviews', 'contact'] as const
export type SectionId = typeof ids[number]
export type SectionLayout = { id: SectionId; index: number; top: number; height: number; scale: number; width: number; designHeight: number }

// The design coordinates follow the supplied 1600px wireframes. Scroll distance
// comes from these measured bounds; no section shares or guesses another's height.
export function makeLayout(width: number, galleryTravel = 0) {
  const mobile = width < 760
  const designWidth = mobile ? 390 : 1600
  const scale = width / designWidth
  const heights = mobile ? [810, 940 + galleryTravel, 800 + servicesTravel, 1200, 890, 1130] : [900, 1000 + galleryTravel, 900 + servicesTravel, 1200, 1000, 900]
  const gap = (mobile ? 44 : 64) * scale
  // Extra room after the pinned services stage, so the people collage's
  // fly-in (which spills above its own section) starts only once it is reached.
  const extraBefore: Partial<Record<SectionId, number>> = { people: (mobile ? 130 : 220) * scale }
  let top = 0
  const sections: SectionLayout[] = ids.map((id, index) => {
    top += extraBefore[id] ?? 0
    const height = heights[index] * scale
    const section = { id, index, top, height, scale, width: designWidth, designHeight: heights[index] }
    top += height + gap
    return section
  })
  return { sections, mobile, total: top - gap, gap }
}

export const works = [
  { title: "KIPLING'S", sub: 'Branding - Packaging', category: 'BRANDING', src: '/images/stock-packaging-a.webp' },
  { title: 'Soul Spaces', sub: 'Brand Identity', category: 'SPACES', src: '/images/stock-0.webp' },
  { title: 'DRAVIDA', sub: 'Campaign - Content', category: 'CAMPAIGNS', src: '/images/stock-3.webp' },
  { title: 'CRAVERY', sub: 'Menu Design - Branding', category: 'BRANDING', src: '/images/cravery-1.webp', href: 'https://thevividview.in/media-production/cravery' },
  { title: "KIPLING'S", sub: 'Branding - Packaging - Content', category: 'CONTENT', src: '/images/stock-packaging-b.webp' },
  { title: 'ISHTAA', sub: 'Digital Campaign', category: 'DIGITAL', src: '/images/stock-2.webp' },
  { title: 'VIVID VIEW', sub: 'Brand Identity', category: 'BRANDING', src: '/images/who-0.webp' },
  { title: 'Website Design', sub: 'UI/UX - Development', category: 'DIGITAL', src: '/images/stock-1.webp' },
  { title: 'Print Design', sub: 'Collaterals', category: 'CONSULTING', src: '/images/stock-4.webp' },
]

export const reviews = [
  { quote: 'The team understood our vision instantly and turned it into something truly special.', name: 'Sarah K.', role: 'Brand Manager', initial: 'S' },
  { quote: 'Creative, responsive and super easy to work with. They brought fresh ideas and real value to our brand.', name: 'Rohan M.', role: 'Founder, ZIPPED', initial: 'R' },
  { quote: 'Professional, passionate and incredibly talented. We couldn’t have asked for a better collaboration.', name: 'Ayesha S.', role: 'Marketing Lead', initial: 'A' },
  { quote: 'They made the entire process feel smooth and exciting. The results? Beyond our expectations.', name: 'Tanishq V.', role: 'Product Manager', initial: 'T' },
  { quote: 'A rare mix of creativity and strategy. Working with them was an absolute pleasure.', name: 'Neha P.', role: 'Co-founder', initial: 'N' },
]
