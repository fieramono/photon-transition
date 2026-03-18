/**
 * PhotonTransition – Lightweight WebGL circular mask transition
 * with chromatic aberration & refraction distortion.
 *
 * Zero dependencies. Uses raw WebGL2 + custom GLSL shaders.
 *
 * @author  Ruby Photon
 * @version 1.1.0
 */

// ─── Easing Presets ─────────────────────────────────────────────────
const EASING_PRESETS = {
    linear:        t => t,
    easeOutQuart:  t => 1 - Math.pow(1 - t, 4),
    easeInOutCubic:t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2,
    easeOutExpo:   t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeInOutQuint:t => t < 0.5 ? 16*t*t*t*t*t : 1 - Math.pow(-2*t + 2, 5) / 2,
    easeOutBack:   t => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    easeOutElastic: t => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
    },
};

// ─── Speed Presets (duration multipliers) ───────────────────────────
const SPEED_PRESETS = {
    'ultra-slow': 3000,
    slow:         2200,
    normal:       1400,
    fast:         900,
    'ultra-fast':  500,
};

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord  = a_texCoord;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in  vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texCurrent;   // current (outgoing) image
uniform sampler2D u_texNext;      // next (incoming) image
uniform vec2      u_resolution;   // canvas size in px
uniform vec2      u_clickPos;     // click position in UV space [0-1]
uniform float     u_progress;     // 0 → 1  (already eased by JS)
uniform float     u_direction;    // 1.0 = expand, -1.0 = shrink (unused for now)

// ─── main ───────────────────────────────────────────────────────────
void main() {
    vec2 uv   = v_texCoord;
    vec2 diff = uv - u_clickPos;

    // correct aspect ratio so the mask is a true circle
    float aspect = u_resolution.x / u_resolution.y;
    diff.x *= aspect;

    float dist = length(diff);

    // maximum possible distance (corner to click)
    float maxDist = max(
        max(length(vec2(0.0, 0.0) - u_clickPos * vec2(aspect, 1.0)),
            length(vec2(aspect, 0.0) - u_clickPos * vec2(aspect, 1.0))),
        max(length(vec2(0.0, 1.0) - u_clickPos * vec2(aspect, 1.0)),
            length(vec2(aspect, 1.0) - u_clickPos * vec2(aspect, 1.0)))
    );

    // u_progress is already eased by JS – use directly
    float easedProgress = u_progress;
    float radius = easedProgress * maxDist * 1.1;  // slight overshoot so it fills corners

    // ring where distortion lives  (relative to radius)
    float ringWidth   = 0.12 + 0.08 * (1.0 - easedProgress);  // thicker at start
    float ringOuter   = radius;
    float ringInner   = radius - ringWidth * maxDist;

    // normalised position within the ring  [0=inner edge, 1=outer edge]
    float ringPos = clamp((dist - ringInner) / (ringOuter - ringInner), 0.0, 1.0);

    // ── distortion strength (bell curve within ring) ──
    float bellCurve     = sin(ringPos * 3.14159265);   // peaks at center of ring
    float distortAmount = bellCurve * 0.06 * (1.0 - easedProgress * 0.7);

    // direction of distortion  (radial, outward)
    vec2 distortDir = normalize(diff + 0.0001);

    // refraction / lens warp
    vec2 uvWarped = uv + distortDir * distortAmount * bellCurve;

    // ── chromatic aberration on ring edges ──
    float chromaStrength = bellCurve * 0.025 * (1.0 - easedProgress * 0.6);
    vec2 offsetR = distortDir * chromaStrength;
    vec2 offsetB = -distortDir * chromaStrength;

    // decide which texture to sample
    bool insideMask = dist < ringInner;

    // ── composite ──
    if (insideMask) {
        // fully inside the new image zone
        fragColor = texture(u_texNext, uv);
    } else if (dist < ringOuter) {
        // inside the ring: blend + distort + chromatic aberration
        float blendFactor = 1.0 - ringPos;  // 1 at inner, 0 at outer

        // current (outgoing) with distortion
        float cR = texture(u_texCurrent, uvWarped + offsetR).r;
        float cG = texture(u_texCurrent, uvWarped).g;
        float cB = texture(u_texCurrent, uvWarped + offsetB).b;
        vec4  currentDistorted = vec4(cR, cG, cB, 1.0);

        // next (incoming) with distortion
        float nR = texture(u_texNext, uvWarped + offsetR).r;
        float nG = texture(u_texNext, uvWarped).g;
        float nB = texture(u_texNext, uvWarped + offsetB).b;
        vec4  nextDistorted = vec4(nR, nG, nB, 1.0);

        // blend between distorted versions
        vec4 blended = mix(currentDistorted, nextDistorted, blendFactor);

        // add a subtle glow / brightness boost at the ring center
        float glow = bellCurve * 0.15 * (1.0 - easedProgress);
        blended.rgb += glow;

        fragColor = blended;
    } else {
        // outside the mask: show current image untouched
        fragColor = texture(u_texCurrent, uv);
    }
}
`;

// ─── Utility: compile shader ────────────────────────────────────────
function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

// ─── Main class ─────────────────────────────────────────────────────
export class PhotonTransition {

    /** Available easing presets (static, for UI discovery) */
    static EASING_PRESETS = Object.keys(EASING_PRESETS);

    /** Available speed presets (static, for UI discovery) */
    static SPEED_PRESETS  = SPEED_PRESETS;

    /**
     * @param {Object} opts
     * @param {HTMLElement}  opts.container  – DOM element to mount into
     * @param {string[]}     opts.images     – array of image URLs (01‑06)
     * @param {number}       [opts.duration=1400] – transition duration in ms
     * @param {string|Function} [opts.easing='easeOutQuart'] – easing name or custom fn(t)→t
     * @param {Function}     [opts.onTransitionStart]
     * @param {Function}     [opts.onTransitionEnd]
     */
    constructor(opts) {
        this.container   = opts.container;
        this.imageSrcs   = opts.images;
        this.duration    = opts.duration ?? 1400;
        this.onStart     = opts.onTransitionStart ?? (() => {});
        this.onEnd       = opts.onTransitionEnd   ?? (() => {});

        // easing: accept string preset name or custom function
        this._easingName = 'easeOutQuart';
        this._easingFn   = EASING_PRESETS.easeOutQuart;
        if (opts.easing) this.setEasing(opts.easing);

        this.currentIdx  = 0;
        this.nextIdx     = -1;
        this.isAnimating = false;
        this.progress    = 0;
        this.easedProgress = 0;   // exposed for UI progress bars
        this.clickUV     = [0.5, 0.5];

        this._textures   = [];
        this._loadedCount = 0;

        this._initCanvas();
        this._initGL();
        this._loadImages();
        this._render();  // start loop
    }

    /* ─── canvas & sizing ─────────────────────────────────────── */
    _initCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
        this.container.style.position = 'relative';
        this.container.style.overflow  = 'hidden';
        this.container.appendChild(this.canvas);
        this._resize();
        this._resizeObserver = new ResizeObserver(() => this._resize());
        this._resizeObserver.observe(this.container);
    }

    _resize() {
        const dpr = window.devicePixelRatio || 1;
        const w   = this.container.clientWidth;
        const h   = this.container.clientHeight;
        this.canvas.width  = w * dpr;
        this.canvas.height = h * dpr;
        if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    /* ─── WebGL bootstrap ─────────────────────────────────────── */
    _initGL() {
        const gl = this.canvas.getContext('webgl2', { antialias: true, alpha: false });
        if (!gl) throw new Error('WebGL2 not available');
        this.gl = gl;

        this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
        gl.useProgram(this.program);

        // full‑screen quad
        const verts = new Float32Array([
            -1, -1,  0, 1,
             1, -1,  1, 1,
            -1,  1,  0, 0,
             1,  1,  1, 0,
        ]);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

        const aPos   = gl.getAttribLocation(this.program, 'a_position');
        const aCoord = gl.getAttribLocation(this.program, 'a_texCoord');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos,   2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(aCoord);
        gl.vertexAttribPointer(aCoord, 2, gl.FLOAT, false, 16, 8);

        // uniform locations
        this.loc = {
            texCurrent:  gl.getUniformLocation(this.program, 'u_texCurrent'),
            texNext:     gl.getUniformLocation(this.program, 'u_texNext'),
            resolution:  gl.getUniformLocation(this.program, 'u_resolution'),
            clickPos:    gl.getUniformLocation(this.program, 'u_clickPos'),
            progress:    gl.getUniformLocation(this.program, 'u_progress'),
            direction:   gl.getUniformLocation(this.program, 'u_direction'),
        };
    }

    /* ─── image loading ───────────────────────────────────────── */
    _loadImages() {
        const gl = this.gl;
        this.imageSrcs.forEach((src, i) => {
            const tex = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            // placeholder 1×1
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                this._loadedCount++;
            };
            img.src = src;
            this._textures.push(tex);
        });
    }

    /* ─── public: trigger transition ──────────────────────────── */
    /**
     * Start a transition towards image at `toIndex`.
     * @param {number} toIndex  – target image index (0-based)
     * @param {number} clientX  – click pageX
     * @param {number} clientY  – click pageY
     */
    transitionTo(toIndex, clientX, clientY) {
        if (this.isAnimating) return;
        if (toIndex === this.currentIdx) return;

        const rect = this.canvas.getBoundingClientRect();
        this.clickUV = [
            (clientX - rect.left) / rect.width,
            (clientY - rect.top)  / rect.height,
        ];

        this.nextIdx     = toIndex;
        this.isAnimating = true;
        this.progress    = 0;
        this.easedProgress = 0;
        this._startTime  = performance.now();
        this.onStart({ from: this.currentIdx, to: toIndex });
    }

    /* ─── public: configuration setters ───────────────────────── */

    /**
     * Set the transition duration in milliseconds.
     * Can be called at any time; takes effect on the next transition.
     * @param {number} ms – duration in milliseconds (100–5000)
     */
    setDuration(ms) {
        this.duration = Math.max(100, Math.min(5000, ms));
    }

    /**
     * Set the easing function by preset name or custom function.
     * @param {string|Function} easing – preset name or fn(t)→t
     */
    setEasing(easing) {
        if (typeof easing === 'function') {
            this._easingFn   = easing;
            this._easingName = 'custom';
        } else if (EASING_PRESETS[easing]) {
            this._easingFn   = EASING_PRESETS[easing];
            this._easingName = easing;
        } else {
            console.warn(`PhotonTransition: unknown easing "${easing}". Available: ${Object.keys(EASING_PRESETS).join(', ')}`);
        }
    }

    /**
     * Convenience: set speed by preset name.
     * @param {'ultra-slow'|'slow'|'normal'|'fast'|'ultra-fast'} preset
     */
    setSpeed(preset) {
        if (SPEED_PRESETS[preset]) {
            this.duration = SPEED_PRESETS[preset];
        } else {
            console.warn(`PhotonTransition: unknown speed "${preset}". Available: ${Object.keys(SPEED_PRESETS).join(', ')}`);
        }
    }

    /** Get current easing preset name (or 'custom') */
    get easingName() { return this._easingName; }

    /** Get current speed label based on duration */
    get speedLabel() {
        for (const [label, ms] of Object.entries(SPEED_PRESETS)) {
            if (this.duration === ms) return label;
        }
        return `${this.duration}ms`;
    }

    /* ─── render loop ─────────────────────────────────────────── */
    _render = () => {
        requestAnimationFrame(this._render);
        const gl = this.gl;

        // update progress
        if (this.isAnimating) {
            const elapsed = performance.now() - this._startTime;
            this.progress = Math.min(elapsed / this.duration, 1);
            this.easedProgress = this._easingFn(this.progress);
            if (this.progress >= 1) {
                this.currentIdx  = this.nextIdx;
                this.isAnimating = false;
                this.progress    = 0;
                this.easedProgress = 0;
                this.onEnd({ current: this.currentIdx });
            }
        }

        gl.useProgram(this.program);

        // textures
        const curIdx  = this.currentIdx;
        const nextIdx = this.isAnimating ? this.nextIdx : this.currentIdx;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._textures[curIdx]);
        gl.uniform1i(this.loc.texCurrent, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._textures[nextIdx]);
        gl.uniform1i(this.loc.texNext, 1);

        gl.uniform2f(this.loc.resolution, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.loc.clickPos, this.clickUV[0], this.clickUV[1]);
        gl.uniform1f(this.loc.progress, this.isAnimating ? this.easedProgress : 0);
        gl.uniform1f(this.loc.direction, 1.0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    /* ─── cleanup ─────────────────────────────────────────────── */
    destroy() {
        this._resizeObserver.disconnect();
        this.gl.getExtension('WEBGL_lose_context')?.loseContext();
        this.canvas.remove();
    }
}
