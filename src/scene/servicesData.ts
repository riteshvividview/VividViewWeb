// Services and copy from thevividview.in/our-services (fetched 2026-10-26).
// Background images reuse portfolio shots; graphic design, e-commerce and SEO
// have no dedicated set yet, so they borrow the closest category.
const range = (name: string, count: number) => Array.from({ length: count }, (_, i) => `/images/portfolio/${name}-${String(i + 1).padStart(2, '0')}.jpg`)
const web = range('website-development', 5), branding = range('branding', 12), digital = range('digital-marketing', 12), media = range('media-production', 12)

export type Service = { title: string; tag: string; text: string; includes: string[]; images: string[] }
export const services: Service[] = [
  { title: 'Web & App\nDevelopment', tag: 'WEB & APP', text: 'All-inclusive app and website creation: tailored designs, adaptable layouts and UI/UX, from backend integration to app store roll-outs and continual upkeep.', includes: ['Custom Design', 'UI/UX Optimization', 'CMS Integration', 'Backend Integration', 'Maintenance', 'Domain Management'], images: [...web, '/images/stock-1.webp'] },
  { title: 'Graphic\nDesign', tag: 'GRAPHIC DESIGN', text: 'Eye-catching visuals that reflect your brand, from logos and brochures to social media graphics and packaging.', includes: ['Logo Design', 'Marketing Materials', 'Packaging Design', 'Web UI Assets', 'Custom Illustrations', 'Social Media Graphics'], images: ['/images/stock-packaging-a.webp', '/images/stock-packaging-b.webp', '/images/branding-4.webp', '/images/branding-5.webp', '/images/branding-7.webp', '/images/branding-8.webp', '/images/branding-10.webp', '/images/kulfi-2.webp', '/images/stock-4.webp'] },
  { title: 'Branding', tag: 'BRANDING', text: 'Distinctive brand identities that make businesses stand out and build recognition and trust with your audience.', includes: ['Logo Design', 'Brand Guidelines', 'Packaging Design', 'Brand Strategy', 'Visual Identity', 'Brand Positioning'], images: branding },
  { title: 'Digital\nMarketing', tag: 'DIGITAL MARKETING', text: 'Social media, PPC and email strategies tailored to your goals, connecting you with the right audience.', includes: ['Social Media Marketing', 'Conversion Optimization', 'Content Strategy', 'Pay-per-click Ads', 'Influencer Marketing', 'Analytics & Tracking'], images: digital },
  { title: 'Media\nProduction', tag: 'MEDIA PRODUCTION', text: 'Captivating visuals, from dynamic videos with seamless edits to high-quality imagery that enhances brand storytelling.', includes: ['Social Media Reels', 'Influencer Collaborations', 'Photography', 'Video Editing', 'VFX, CGI & Green Screen', 'Ads'], images: [...media, '/images/cravery-1.webp', '/images/cravery-2.webp'] },
  { title: 'E-Commerce\nSolutions', tag: 'E-COMMERCE', text: 'Solutions that drive leads, optimise conversions and boost sales with expert SEO and engaging content.', includes: ['Lead Generation', 'Conversion', 'Sales Growth', 'Brand Strategy', 'SEO', 'Visual Content Creation'], images: ['/images/kulfi-3.webp', '/images/kulfi-4.webp', '/images/stock-packaging-a.webp', ...digital.slice(6), web[1]] },
  { title: 'Search Engine\nOptimization', tag: 'SEO', text: 'Better visibility on search engines through on-page and off-page optimisation, keyword research and content creation.', includes: ['On-page SEO', 'Off-page SEO', 'Technical SEO', 'Keyword Research', 'Performance Reports', 'Local SEO'], images: [...web.slice(2), ...digital.slice(0, 5), '/images/stock-1.webp'] },
]
// Scroll distance (design units) spent on each service, plus lead-in/out.
export const SERVICE_STEP = 560, SERVICE_LEAD = 260
export const servicesTravel = (services.length - 1) * SERVICE_STEP + SERVICE_LEAD * 2
