# Homepage media and content status

The homepage uses locally stored, resized images from the existing [Vivid View website](https://thevividview.in). Their local copies are in `public/images/`.

| Local files | Source page | Use |
| --- | --- | --- |
| `cravery-*` | https://thevividview.in/media-production/cravery | Cravery project image and scene collage |
| `kulfi-*` | https://thevividview.in/branding/kulfi-kulture | Scene, packaging, and contact imagery |
| `who-*` | https://thevividview.in/who-are-we | Vivid View people collage |
| `people-08`, `people-10` to `people-12` | https://thevividview.in/who-are-we | Additional team portraits from the same people page |
| `branding-*` | https://thevividview.in/branding | Additional portfolio imagery |
| `stock-0` to `stock-4` | [Unsplash image CDN](https://images.unsplash.com/) | Provisional, unbranded interior, design, dining, and digital imagery |
| `stock-packaging-*` | [Lummi packaging photo A](https://www.lummi.ai/photo/minimalist-product-design-hloz6), [photo B](https://www.lummi.ai/photo/minimalist-packaging-design-fdyxq) | Provisional unbranded packaging imagery |

Unsplash image IDs used for the five stock photos: `photo-1600210492486-724fe5c67fb0`, `photo-1545235617-9465d2a55698`, `photo-1460925895917-afdab827c52f`, `photo-1552566626-52f8b828add9`, and `photo-1534670007418-fbb7f6cf32c3`, in filename order. See the [Unsplash license](https://unsplash.com/license).

The wireframe names Kipling's, Soul Spaces, Dravida, Ishtaa, Print Design, and Website Design were preserved. I could not find matching case pages or images for these names on the current public site. Their work cards use **provisional stock imagery** and need the correct case media before publication. The testimonial names and quotes are copied from the supplied wireframe and need content approval before publication.

The typefaces are [Inter](https://github.com/google/fonts/tree/main/ofl/inter), [Newsreader](https://github.com/google/fonts/tree/main/ofl/newsreader), and [Noto Sans Symbols](https://github.com/google/fonts/tree/main/ofl/notosanssymbols); license notices are stored beside the fonts in `public/fonts/`.

The earlier Nuxt hero remains in `legacy-nuxt/` as a reference for rollback. The live application runs on Vite, React, React Three Fiber, Drei, and Three.js.
