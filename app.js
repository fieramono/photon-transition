import { PhotonTransition } from './photon-transition.js';

/* ─── Scene Data ────────────────────────────────────────────────── */
const SCENES = [
    {
        id: 0,
        title: 'Alpine Sunset',
        meta: 'Mountains · Golden Hour',
        image: 'assets/scene-01.png',
        desc: 'Dramatic peaks illuminated by the last rays of a fiery sunset across the alpine skyline.',
    },
    {
        id: 1,
        title: 'Twilight Shore',
        meta: 'Ocean · Blue Hour',
        image: 'assets/scene-02.png',
        desc: 'Soft waves meet white sand beneath a deep twilight canvas of blue and teal tones.',
    },
    {
        id: 2,
        title: 'Ancient Forest',
        meta: 'Forest · Morning Mist',
        image: 'assets/scene-03.png',
        desc: 'Golden light filters through ancient trees, painting the misty forest floor in emerald hues.',
    },
    {
        id: 3,
        title: 'Red Sands',
        meta: 'Desert · Aerial View',
        image: 'assets/scene-04.png',
        desc: 'An ocean of red sand dunes stretches to the horizon, sculpted by wind into flowing patterns.',
    },
    {
        id: 4,
        title: 'Aurora Dreams',
        meta: 'Arctic · Northern Lights',
        image: 'assets/scene-05.png',
        desc: 'Vivid ribbons of green and purple dance across the frozen arctic sky above a pristine lake.',
    },
    {
        id: 5,
        title: 'Neon Metropolis',
        meta: 'City · Night',
        image: 'assets/scene-06.png',
        desc: 'A cyberpunk skyline pulses with neon, its lights shimmering in reflections across dark waters.',
    },
];

/* ─── DOM References ────────────────────────────────────────────── */
const listEl       = document.getElementById('scene-list');
const viewportEl   = document.getElementById('viewport');
const titleEl      = document.getElementById('viewport-title');
const descEl       = document.getElementById('viewport-desc');
const overlayEl    = document.getElementById('viewport-overlay');
const progressEl   = document.getElementById('progress-bar');
const counterCur   = document.getElementById('counter-current');
const counterTotal = document.getElementById('counter-total');
const cursorHint   = document.getElementById('cursor-hint');

/* ─── Build Scene List ──────────────────────────────────────────── */
SCENES.forEach((scene, i) => {
    const li = document.createElement('li');
    li.className = 'scene-item' + (i === 0 ? ' active' : '');
    li.dataset.index = i;
    li.innerHTML = `
        <span class="scene-item__indicator"></span>
        <img class="scene-item__thumb" src="${scene.image}" alt="${scene.title}" loading="lazy">
        <div class="scene-item__info">
            <span class="scene-item__title">${scene.title}</span>
            <span class="scene-item__meta">${scene.meta}</span>
        </div>
        <span class="scene-item__number">${String(i + 1).padStart(2, '0')}</span>
    `;
    listEl.appendChild(li);
});

counterTotal.textContent = String(SCENES.length).padStart(2, '0');

/* ─── Initialise Photon Transition ──────────────────────────────── */
let photon;
let animFrameId;

function updateOverlay(idx) {
    titleEl.textContent = SCENES[idx].title;
    descEl.textContent  = SCENES[idx].desc;
    counterCur.textContent = String(idx + 1).padStart(2, '0');
}

updateOverlay(0);

photon = new PhotonTransition({
    container: viewportEl,
    images:    SCENES.map(s => s.image),
    duration:  1400,
    onTransitionStart({ from, to }) {
        // hide overlay text during transition
        overlayEl.classList.add('transitioning');
        cursorHint.classList.add('hidden');

        // progress bar animation
        if (animFrameId) cancelAnimationFrame(animFrameId);
        const tick = () => {
            progressEl.style.width = (photon.progress * 100) + '%';
            if (photon.isAnimating) animFrameId = requestAnimationFrame(tick);
        };
        tick();

        // update active state in list
        document.querySelectorAll('.scene-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.index) === to);
        });
    },
    onTransitionEnd({ current }) {
        updateOverlay(current);

        // fade overlay back in
        setTimeout(() => {
            overlayEl.classList.remove('transitioning');
        }, 80);

        // reset progress bar
        setTimeout(() => {
            progressEl.style.width = '0%';
        }, 300);
    },
});

/* ─── Event: Click on list item ─────────────────────────────────── */
listEl.addEventListener('click', (e) => {
    const item = e.target.closest('.scene-item');
    if (!item) return;
    const idx = parseInt(item.dataset.index);
    if (isNaN(idx)) return;

    const rect = viewportEl.getBoundingClientRect();
    const isMobile = window.innerWidth <= 860;

    let clientX, clientY;
    if (isMobile) {
        // On mobile, originate from center of viewport
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
        // Close the mobile panel
        closeMobilePanel();
    } else {
        // On desktop, originate from left edge near the list item
        const itemRect = item.getBoundingClientRect();
        clientX = rect.left + 60;
        clientY = itemRect.top + itemRect.height / 2;
    }

    photon.transitionTo(idx, clientX, clientY);
});

/* ─── Event: Click/tap on viewport directly ─────────────────────── */
viewportEl.addEventListener('click', (e) => {
    if (photon.isAnimating) return;
    // Don't fire if clicking on the mobile toolbar buttons
    if (e.target.closest('.mobile-toolbar')) return;
    // cycle to next
    const next = (photon.currentIdx + 1) % SCENES.length;
    photon.transitionTo(next, e.clientX, e.clientY);
});

/* ─── Keyboard nav ──────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
    if (photon.isAnimating) return;
    const rect = viewportEl.getBoundingClientRect();
    const cx   = rect.left + rect.width / 2;
    const cy   = rect.top  + rect.height / 2;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        const next = (photon.currentIdx + 1) % SCENES.length;
        photon.transitionTo(next, cx, cy);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        const prev = (photon.currentIdx - 1 + SCENES.length) % SCENES.length;
        photon.transitionTo(prev, cx, cy);
    }
});

/* ─── Settings Panel ────────────────────────────────────────────── */
const settingsPanel   = document.getElementById('settings-panel');
const settingsToggle  = document.getElementById('settings-toggle');
const speedSlider     = document.getElementById('speed-slider');
const speedValueEl    = document.getElementById('speed-value');
const speedPresetsEl  = document.getElementById('speed-presets');
const easingSelect    = document.getElementById('easing-select');

// Toggle open/close
settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
});

// Speed slider – live update
speedSlider.addEventListener('input', () => {
    const ms = parseInt(speedSlider.value);
    photon.setDuration(ms);
    speedValueEl.textContent = ms + 'ms';
    syncSpeedPresetButtons(ms);
});

// Speed preset buttons
speedPresetsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.speed-preset');
    if (!btn) return;
    const preset = btn.dataset.speed;
    photon.setSpeed(preset);
    speedSlider.value = photon.duration;
    speedValueEl.textContent = photon.duration + 'ms';
    syncSpeedPresetButtons(photon.duration);
});

function syncSpeedPresetButtons(ms) {
    const speedMap = PhotonTransition.SPEED_PRESETS;
    document.querySelectorAll('.speed-preset').forEach(btn => {
        const presetMs = speedMap[btn.dataset.speed];
        btn.classList.toggle('active', presetMs === ms);
    });
}

// Easing select
easingSelect.addEventListener('change', () => {
    photon.setEasing(easingSelect.value);
});

/* ─── Mobile Panel Logic ─────────────────────────────────────── */
const sidebarEl      = document.getElementById('sidebar');
const mobileToggle   = document.getElementById('mobile-panel-toggle');
const mobileClose    = document.getElementById('mobile-panel-close');
const mobileBackdrop = document.getElementById('mobile-backdrop');
const mobilePrev     = document.getElementById('mobile-prev');
const mobileNext     = document.getElementById('mobile-next');

function openMobilePanel() {
    sidebarEl.classList.add('mobile-open');
    mobileBackdrop.classList.add('visible');
}

function closeMobilePanel() {
    sidebarEl.classList.remove('mobile-open');
    mobileBackdrop.classList.remove('visible');
}

function toggleMobilePanel() {
    if (sidebarEl.classList.contains('mobile-open')) {
        closeMobilePanel();
    } else {
        openMobilePanel();
    }
}

// Toggle button
mobileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobilePanel();
});

// Close buttons
mobileClose.addEventListener('click', closeMobilePanel);
mobileBackdrop.addEventListener('click', closeMobilePanel);

// Prev/Next buttons
mobilePrev.addEventListener('click', (e) => {
    e.stopPropagation();
    if (photon.isAnimating) return;
    const rect = viewportEl.getBoundingClientRect();
    const prev = (photon.currentIdx - 1 + SCENES.length) % SCENES.length;
    photon.transitionTo(prev, rect.left + rect.width * 0.3, rect.top + rect.height / 2);
});

mobileNext.addEventListener('click', (e) => {
    e.stopPropagation();
    if (photon.isAnimating) return;
    const rect = viewportEl.getBoundingClientRect();
    const next = (photon.currentIdx + 1) % SCENES.length;
    photon.transitionTo(next, rect.left + rect.width * 0.7, rect.top + rect.height / 2);
});

/* ─── Touch: swipe left/right on viewport ────────────────────── */
let touchStartX = 0;
let touchStartY = 0;

viewportEl.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

viewportEl.addEventListener('touchend', (e) => {
    if (photon.isAnimating) return;
    if (e.target.closest('.mobile-toolbar')) return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Only trigger on horizontal swipes > 50px and more horizontal than vertical
    if (absDx > 50 && absDx > absDy * 1.5) {
        const rect = viewportEl.getBoundingClientRect();
        const cy   = rect.top + rect.height / 2;

        if (dx < 0) {
            // Swipe left → next
            const next = (photon.currentIdx + 1) % SCENES.length;
            photon.transitionTo(next, rect.left + rect.width * 0.8, cy);
        } else {
            // Swipe right → prev
            const prev = (photon.currentIdx - 1 + SCENES.length) % SCENES.length;
            photon.transitionTo(prev, rect.left + rect.width * 0.2, cy);
        }
    }
}, { passive: true });
