# Vivid View homepage

The homepage is a single React Three Fiber scene rendered with Three.js. Native page scroll moves the camera continuously through five chapters: hero, selected work, people, testimonials, and contact. The text and cards are WebGL objects; a hidden semantic copy keeps the content available to screen readers.

## Run

```sh
npm install
npm run dev
npm run build
```

The scene uses local fonts and images, so it does not need a media CDN at runtime. Images use a subtle vertex and fragment shader for pointer distortion, and the background uses a procedural shader. The hero cards cycle from the center to the edges like the [first motion reference](https://pin.it/14QiYnthx). The testimonial deck slides on controls and while in view, following the [third motion reference](https://pin.it/1XCz8GnfE). Reduced motion preferences keep the scene and cards still.

Portfolio image provenance and copy still requiring review are listed in [ASSET_SOURCES.md](ASSET_SOURCES.md). The prior Nuxt hero is retained under `legacy-nuxt/` for reference.
