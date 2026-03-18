# ◈ Photon Transition

> **Lightweight WebGL2 circular mask transition library** with chromatic aberration & refraction distortion effects — zero dependencies.

![Version](https://img.shields.io/badge/version-1.1.0-a78bfa?style=flat-square)
![Size](https://img.shields.io/badge/size-~16KB-34d399?style=flat-square)
![Dependencies](https://img.shields.io/badge/dependencies-0-6366f1?style=flat-square)
![WebGL2](https://img.shields.io/badge/WebGL2-GLSL%20ES%203.0-f97316?style=flat-square)

---

## ✨ Features

- **Circular expanding mask** that originates from the exact click position
- **Chromatic aberration** (per-channel RGB offset) on the mask edge
- **Refraction distortion** (radial UV warping) simulating a lens/bubble effect
- **Configurable speed & easing** — 5 speed presets + 7 easing curves + custom functions
- **Zero dependencies** — raw WebGL2 + inline GLSL shaders
- **~16 KB** total bundle (no build step required)
- **Responsive** — adapts to container resize via `ResizeObserver`
- **HiDPI ready** — renders at `devicePixelRatio` for sharp output

---

## 📦 Project Structure

```
ruby-photon/
├── photon-transition.js   # Core library (WebGL2 + GLSL shaders)
├── app.js                 # Demo app (event wiring, UI state)
├── index.css              # Design system (dark mode)
├── index.html             # HTML shell
├── README.md              # This file
└── assets/
    ├── scene-01.png       # Demo images (01–06)
    ├── scene-02.png
    ├── scene-03.png
    ├── scene-04.png
    ├── scene-05.png
    └── scene-06.png
```

---

## 🚀 Quick Start

### 1. Run the demo

No build step needed — just serve the files:

```bash
# Using Python
python3 -m http.server 3000

# Or using Node.js
npx -y serve .
```

Then open **http://localhost:3000** in your browser.

### 2. Interact

| Input | Action |
|-------|--------|
| Click sidebar item | Navigate to specific scene |
| Click viewport | Cycle to next scene |
| `Arrow Right` / `↓` | Next scene |
| `Arrow Left` / `↑` | Previous scene |
| Settings panel | Adjust speed & easing live |

---

## 🔧 Integration Guide

### Minimal Setup (3 steps)

**Step 1: Include the library**

```html
<script type="module">
  import { PhotonTransition } from './photon-transition.js';
</script>
```

**Step 2: Create a container**

```html
<div id="viewport" style="width: 100%; height: 100vh;"></div>
```

**Step 3: Initialize**

```javascript
import { PhotonTransition } from './photon-transition.js';

const photon = new PhotonTransition({
  container: document.getElementById('viewport'),
  images: [
    'images/photo-01.jpg',
    'images/photo-02.jpg',
    'images/photo-03.jpg',
  ],
  duration: 1400,                      // ms (optional, default: 1400)
  easing: 'easeOutQuart',             // string or function (optional)
  onTransitionStart: ({ from, to }) => {
    console.log(`Transitioning from ${from} to ${to}`);
  },
  onTransitionEnd: ({ current }) => {
    console.log(`Now showing image ${current}`);
  },
});

// Trigger a transition on click
document.addEventListener('click', (e) => {
  const nextIdx = (photon.currentIdx + 1) % 3;
  photon.transitionTo(nextIdx, e.clientX, e.clientY);
});
```

That's it — the library handles canvas creation, WebGL context, shader compilation, texture loading, and the render loop automatically.

---

## 📖 API Reference

### Constructor

```javascript
new PhotonTransition(options)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | **required** | DOM element to mount the WebGL canvas into |
| `images` | `string[]` | **required** | Array of image URLs to preload |
| `duration` | `number` | `1400` | Transition duration in milliseconds |
| `easing` | `string \| Function` | `'easeOutQuart'` | Easing preset name or custom `fn(t) → t` |
| `onTransitionStart` | `Function` | `null` | Callback `({ from, to }) => void` |
| `onTransitionEnd` | `Function` | `null` | Callback `({ current }) => void` |

### Instance Methods

#### `transitionTo(index, clientX, clientY)`

Start a transition to the image at `index`. The circular mask expands from the `(clientX, clientY)` screen coordinates.

```javascript
// Navigate to image 2, expanding from a button click
button.addEventListener('click', (e) => {
  photon.transitionTo(2, e.clientX, e.clientY);
});
```

#### `setDuration(ms)`

Change the transition duration at runtime. Clamped to `100–5000ms`.

```javascript
photon.setDuration(800);   // fast transition
photon.setDuration(2500);  // slow, cinematic transition
```

#### `setSpeed(preset)`

Convenience method using named speed presets:

```javascript
photon.setSpeed('ultra-fast');  //  500ms
photon.setSpeed('fast');        //  900ms
photon.setSpeed('normal');      // 1400ms
photon.setSpeed('slow');        // 2200ms
photon.setSpeed('ultra-slow');  // 3000ms
```

#### `setEasing(easing)`

Change the easing curve. Accepts a preset name or a custom function:

```javascript
// Using a preset
photon.setEasing('easeOutElastic');

// Using a custom function
photon.setEasing(t => t * t);  // quadratic ease-in
```

#### `destroy()`

Clean up WebGL context, canvas, and observers.

```javascript
photon.destroy();
```

### Instance Properties (read-only)

| Property | Type | Description |
|----------|------|-------------|
| `currentIdx` | `number` | Index of the currently displayed image |
| `isAnimating` | `boolean` | Whether a transition is in progress |
| `progress` | `number` | Raw animation progress `0 → 1` |
| `easedProgress` | `number` | Eased animation progress `0 → 1` |
| `duration` | `number` | Current duration in ms |
| `easingName` | `string` | Current easing preset name (or `'custom'`) |
| `speedLabel` | `string` | Current speed label (e.g. `'fast'` or `'1200ms'`) |

### Static Properties

```javascript
PhotonTransition.EASING_PRESETS
// → ['linear', 'easeOutQuart', 'easeInOutCubic', 'easeOutExpo',
//    'easeInOutQuint', 'easeOutBack', 'easeOutElastic']

PhotonTransition.SPEED_PRESETS
// → { 'ultra-slow': 3000, slow: 2200, normal: 1400, fast: 900, 'ultra-fast': 500 }
```

---

## 🎨 Available Easing Curves

| Preset | Character | Best For |
|--------|-----------|----------|
| `linear` | Constant speed | Debug, mechanical feel |
| `easeOutQuart` | Fast start, smooth stop | **Default** — natural navigation |
| `easeInOutCubic` | Smooth start & stop | Cinematic reveals |
| `easeOutExpo` | Very fast start, long tail | Snappy UI transitions |
| `easeInOutQuint` | Dramatic acceleration | Theatrical effects |
| `easeOutBack` | Slight overshoot & settle | Playful interactions |
| `easeOutElastic` | Bouncy, spring-like | Creative, experimental |

### Custom Easing Functions

Any function `f(t) → t` where `t ∈ [0, 1]` works:

```javascript
// Bounce easing
photon.setEasing(t => {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
});

// Steps (like CSS steps())
photon.setEasing(t => Math.floor(t * 8) / 8);
```

---

## 🏗 Architecture

### How the Shader Works

The fragment shader divides the screen into 3 zones based on distance from the click point:

```
┌─────────────────────────────────────────┐
│                                         │
│     ZONE 3: Current image (untouched)   │
│                                         │
│        ┌─────────────────────┐          │
│        │  ZONE 2: The Ring   │          │
│        │  Distortion + Chroma│          │
│        │  + Blend             │         │
│        │    ┌───────────┐    │          │
│        │    │  ZONE 1   │    │          │
│        │    │ Next image │    │          │
│        │    │ (clean)    │    │          │
│        │    └───────────┘    │          │
│        └─────────────────────┘          │
│                                         │
└─────────────────────────────────────────┘
```

- **Zone 1 (inside ring)**: Shows the new image cleanly
- **Zone 2 (the ring)**: Applies refraction distortion + chromatic aberration + blends both images
- **Zone 3 (outside ring)**: Shows the current image untouched

As `progress` goes from `0 → 1`, the ring expands outward from the click point until it covers the entire viewport.

### Chromatic Aberration

The RGB channels are sampled at slightly different UV offsets along the radial direction:

```glsl
float R = texture(tex, uvWarped + offsetR).r;  // shifted outward
float G = texture(tex, uvWarped).g;            // center
float B = texture(tex, uvWarped + offsetB).b;  // shifted inward
```

This creates the characteristic color-fringing effect seen in camera lenses.

### Refraction Distortion

UV coordinates are warped radially using a bell curve that peaks at the center of the ring:

```glsl
float bellCurve = sin(ringPos * PI);
vec2 uvWarped = uv + distortDir * distortAmount * bellCurve;
```

This simulates light bending through a curved surface (like a glass bubble).

### Easing Pipeline

```
Click Event
    ↓
progress = elapsed / duration        (linear 0→1)
    ↓
easedProgress = easingFn(progress)   (shaped by JS easing function)
    ↓
Shader receives u_progress           (pre-eased value)
    ↓
Mask radius = easedProgress * maxDist
```

The easing is computed in JavaScript and passed to the shader as a pre-eased value. This allows runtime easing changes without recompiling the shader.

---

## 🌐 Browser Support

| Browser | Support |
|---------|---------|
| Chrome 56+ | ✅ Full |
| Firefox 51+ | ✅ Full |
| Safari 15+ | ✅ Full |
| Edge 79+ | ✅ Full |
| iOS Safari 15+ | ✅ Full |
| Chrome Android 56+ | ✅ Full |

> Requires **WebGL2** support. All modern browsers support WebGL2 since ~2017–2021.

---

## 🔌 Integration with Frameworks

### React

```jsx
import { useEffect, useRef } from 'react';
import { PhotonTransition } from './photon-transition.js';

function ImageViewer({ images }) {
  const containerRef = useRef(null);
  const photonRef = useRef(null);

  useEffect(() => {
    photonRef.current = new PhotonTransition({
      container: containerRef.current,
      images,
      duration: 1200,
    });
    return () => photonRef.current.destroy();
  }, [images]);

  const handleClick = (idx, e) => {
    photonRef.current.transitionTo(idx, e.clientX, e.clientY);
  };

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
```

### Vue 3

```vue
<template>
  <div ref="container" style="width: 100%; height: 100vh" @click="handleClick" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { PhotonTransition } from './photon-transition.js';

const container = ref(null);
let photon = null;

onMounted(() => {
  photon = new PhotonTransition({
    container: container.value,
    images: ['/img/01.jpg', '/img/02.jpg', '/img/03.jpg'],
    duration: 1400,
    easing: 'easeOutExpo',
  });
});

onUnmounted(() => photon?.destroy());

function handleClick(e) {
  const next = (photon.currentIdx + 1) % 3;
  photon.transitionTo(next, e.clientX, e.clientY);
}
</script>
```

### Vanilla JS (CDN-free)

```html
<div id="gallery" style="width:100%;height:500px"></div>
<script type="module">
  import { PhotonTransition } from './photon-transition.js';

  const pt = new PhotonTransition({
    container: document.getElementById('gallery'),
    images: ['a.jpg', 'b.jpg', 'c.jpg'],
    easing: 'easeOutBack',
  });

  document.getElementById('gallery').onclick = (e) => {
    pt.transitionTo((pt.currentIdx + 1) % 3, e.clientX, e.clientY);
  };
</script>
```

---

## 📝 Why WebGL over CSS?

| Criterion | CSS `clip-path` / `mask-image` | WebGL (this library) |
|-----------|-------------------------------|---------------------|
| Circular mask | ✅ `circle()` | ✅ Distance field |
| Chromatic aberration | ❌ Impossible | ✅ Per-channel UV offset |
| Refraction distortion | ❌ Only `blur()` | ✅ UV warping |
| 60fps performance | ⚠️ Layout reflows | ✅ GPU-native |
| Ring-localized effects | ❌ Global filters | ✅ Per-pixel precision |
| Custom easing | ✅ | ✅ |

CSS approaches are limited to global filters and can't achieve the per-pixel distortion effects needed for the lens/bubble look.

---

## 📄 License

MIT — free for personal and commercial use.

---

**Built with ◈ Photon Transition** — WebGL2 · GLSL · Vanilla JS
