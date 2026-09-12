
// Footer year, kept up to date automatically
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Give the hero pixels a small burst when the page moves.
(function initPixelScrollMotion() {
  const particles = document.querySelector(".pixel-particles");
  if (!particles || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let resetTimer;
  document.addEventListener("scroll", () => {
    particles.classList.add("is-scrolling");
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => particles.classList.remove("is-scrolling"), 180);
  }, { passive: true });
})();

// Slow the hero video down and let it travel backward before repeating.
(function initHeroVideo() {
  const video = document.querySelector(".hero-video");
  if (!video) return;

  const speed = 0.55;
  let direction = 1;
  let lastFrame = performance.now();
  let reverseFrame;

  const playForward = () => {
    direction = 1;
    video.playbackRate = speed;
    video.play().catch(() => {});
  };

  const playBackward = (now) => {
    if (direction !== -1) return;
    const elapsed = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    video.currentTime = Math.max(0, video.currentTime - elapsed * speed);
    if (video.currentTime <= 0.01) {
      video.currentTime = 0;
      playForward();
      return;
    }
    reverseFrame = requestAnimationFrame(playBackward);
  };

  video.playbackRate = speed;
  video.addEventListener("ended", () => {
    direction = -1;
    video.pause();
    lastFrame = performance.now();
    cancelAnimationFrame(reverseFrame);
    reverseFrame = requestAnimationFrame(playBackward);
  });
  video.addEventListener("pause", () => {
    if (direction === 1 && video.currentTime > 0 && !video.ended) playForward();
  });
})();

// Respect a saved choice first, then follow the device preference.
const themeToggle = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("tejveer-theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const setTheme = (theme) => {
  document.body.dataset.theme = theme;
  if (themeToggle) {
    const nextTheme = theme === "dark" ? "light" : "dark";
    themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
    themeToggle.setAttribute("title", `Switch to ${nextTheme} theme`);
  }
};
setTheme(savedTheme || (prefersDark ? "dark" : "light"));
if (!savedTheme) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    setTheme(event.matches ? "dark" : "light");
  });
}
themeToggle?.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  localStorage.setItem("tejveer-theme", nextTheme);
});

document.querySelectorAll(".timeline-marker").forEach((marker) => {
  marker.addEventListener("click", () => {
    const item = marker.closest(".timeline-item");
    document.querySelectorAll(".timeline-item").forEach((entry) => {
      const active = entry === item;
      entry.classList.toggle("is-active", active);
      entry.querySelector(".timeline-marker")?.setAttribute("aria-expanded", String(active));
    });
  });
});

// Follow the reader through the journey as each milestone reaches the viewport.
(function initJourneyScroll() {
  if (typeof gsap !== "undefined") return;
  const items = Array.from(document.querySelectorAll(".timeline-item"));
  if (!items.length) return;

  const setActiveJourneyItem = (activeItem) => {
    items.forEach((item) => {
      const active = item === activeItem;
      item.classList.toggle("is-active", active);
      item.querySelector(".timeline-marker")?.setAttribute("aria-expanded", String(active));
    });
  };

  const updateJourneyOnScroll = () => {
    const readingLine = window.innerHeight * 0.42;
    const activeItem = items.reduce((closestItem, item) => {
      const bounds = item.getBoundingClientRect();
      const distance = Math.abs(bounds.top + bounds.height / 2 - readingLine);
      if (!closestItem || distance < closestItem.distance) return { item, distance };
      return closestItem;
    }, null);
    if (activeItem) setActiveJourneyItem(activeItem.item);
  };

  document.addEventListener("scroll", updateJourneyOnScroll, { passive: true });
  window.addEventListener("resize", updateJourneyOnScroll);
  window.addEventListener("load", updateJourneyOnScroll);
  updateJourneyOnScroll();
})();

const contactForm = document.getElementById("contact-form");
const formError = document.getElementById("form-error");
const formSuccess = document.getElementById("form-success");
contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name || !emailIsValid || !message) {
    formError.textContent = !name ? "Please add your name." : !emailIsValid ? "Please check your email address." : "Please add a short message.";
    formSuccess.classList.remove("is-visible");
    return;
  }
  formError.textContent = "";
  formSuccess.classList.remove("is-visible");

  const submitButton = contactForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");
  submitButton.firstChild.textContent = "sending... ";

  try {
    const response = await fetch(contactForm.action, {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Message service returned an error.");
    formSuccess.classList.add("is-visible");
    contactForm.reset();
  } catch (error) {
    formError.textContent = "Your message could not be sent. Please email me directly instead.";
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
    submitButton.firstChild.textContent = "send message ";
  }
});

// Celebrate reaching the final contact section without covering the form itself.
(function initAdvancementToast() {
  const contactSection = document.getElementById("contact");
  const toast = document.getElementById("advancement-toast");
  const closeButton = document.getElementById("advancement-toast-close");
  const soundEl = document.getElementById("advancement-sound");
  if (!contactSection || !toast || !closeButton) return;

  let dismissed = false;
  let hasPlayed = false;
  let isPendingPlay = false;
  let synthContext = null;

  // Direct Audio instance for fast, independent playback
  let audioObj = null;
  try {
    audioObj = new Audio("challenge-complete.mp3");
    audioObj.volume = 1.0;
    audioObj.preload = "auto";
  } catch (e) {}

  // Synthesized Minecraft-style fanfare fallback using Web Audio API
  const playSynthesizedChime = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      if (!synthContext) synthContext = new AudioCtx();
      const ctx = synthContext;
      if (ctx.state === "suspended") await ctx.resume();
      if (ctx.state !== "running") return false;
      const startTime = ctx.currentTime;

      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.18 }, // C5
        { freq: 659.25, time: 0.14, dur: 0.18 }, // E5
        { freq: 783.99, time: 0.28, dur: 0.22 }, // G5
        { freq: 1046.50, time: 0.44, dur: 0.55 }, // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime + time);

        gain.gain.setValueAtTime(0, startTime + time);
        gain.gain.linearRampToValueAtTime(0.3, startTime + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime + time);
        osc.stop(startTime + time + dur);
      });
      return true;
    } catch (e) {
      return false;
    }
  };

  const playAdvancementSound = async () => {
    let playPromise = null;

    // 1. Try playing via independent Audio instance
    if (audioObj) {
      try {
        audioObj.currentTime = 0;
        playPromise = audioObj.play();
      } catch (err) {}
    }

    // 2. Try HTMLAudioElement if audioObj didn't start
    if (!playPromise && soundEl && typeof soundEl.play === "function") {
      try {
        soundEl.currentTime = 0;
        playPromise = soundEl.play();
      } catch (err) {}
    }

    if (playPromise && typeof playPromise.then === "function") {
      try {
        await playPromise;
        hasPlayed = true;
        isPendingPlay = false;
      } catch (err) {
        const synthesized = await playSynthesizedChime();
        isPendingPlay = !synthesized;
        hasPlayed = synthesized;
      }
    } else {
      // Direct Web Audio fallback
      const synthesized = await playSynthesizedChime();
      isPendingPlay = !synthesized;
      hasPlayed = synthesized;
    }
  };

  // If autoplay was blocked because user scrolled without a prior click,
  // trigger sound on the first click/tap/keypress anywhere on the page
  const triggerPendingSoundOnGesture = () => {
    if (isPendingPlay && !hasPlayed && toast.classList.contains("is-visible")) {
      playAdvancementSound();
    }
  };

  ["pointerdown", "click", "keydown", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, triggerPendingSoundOnGesture, { passive: true });
  });

  // Clicking on the toast itself will ALWAYS play or replay the sound!
  toast.style.cursor = "pointer";
  toast.setAttribute("title", "Click to replay advancement sound");
  toast.addEventListener("click", (e) => {
    if (e.target === closeButton || closeButton.contains(e.target)) return;
    hasPlayed = false;
    playAdvancementSound();
  });

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !dismissed) {
      toast.classList.add("is-visible");
      toast.setAttribute("aria-hidden", "false");
      playAdvancementSound();
    } else if (!entry.isIntersecting) {
      toast.classList.remove("is-visible");
      toast.setAttribute("aria-hidden", "true");
      dismissed = false;
      hasPlayed = false;
      isPendingPlay = false;
    }
  }, { threshold: 0.35 });

  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    dismissed = true;
    isPendingPlay = false;
    toast.classList.remove("is-visible");
    toast.setAttribute("aria-hidden", "true");
  });

  observer.observe(contactSection);
})();

// Highlight the nav link for the section currently in view
const sections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll(".site-header nav a");

const highlightNav = () => {
  let current = "";
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 120 && rect.bottom >= 120) {
      current = section.getAttribute("id");
    }
  });
  navLinks.forEach((link) => {
    link.style.borderBottom =
      link.getAttribute("href") === `#${current}` ? "2px solid var(--orange)" : "none";
  });
};

document.addEventListener("scroll", highlightNav, { passive: true });
window.addEventListener("load", highlightNav);

// Bring each build-lab step forward as it reaches the reading line.
(function initBuildLabScrollSteps() {
  if (typeof gsap !== "undefined") return;
  const steps = Array.from(document.querySelectorAll(".build-lab-points article"));
  if (!steps.length) return;

  const updateActiveStep = () => {
    const focusLine = window.innerHeight * 0.58;
    let activeIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    steps.forEach((step, index) => {
      const bounds = step.getBoundingClientRect();
      const distance = Math.abs(bounds.top + bounds.height / 2 - focusLine);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });
    steps.forEach((step, index) => step.classList.toggle("is-active", index === activeIndex));
  };

  document.addEventListener("scroll", updateActiveStep, { passive: true });
  window.addEventListener("resize", updateActiveStep);
  window.addEventListener("load", updateActiveStep);
  updateActiveStep();
})();

// Let the build steps and journey milestones subtly follow the cursor and scroll position.
(function initScrollMouseParallax() {
  const elements = Array.from(document.querySelectorAll(".build-lab-points article, .timeline-item"));
  if (!elements.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const state = new Map(elements.map((element) => [element, { mouseX: 0, mouseY: 0, scrollY: 0 }]));
  let frame = 0;

  const render = () => {
    frame = 0;
    elements.forEach((element) => {
      const values = state.get(element);
      element.style.translate = `${values.mouseX}px ${values.mouseY + values.scrollY}px`;
    });
  };

  const scheduleRender = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  elements.forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const bounds = element.getBoundingClientRect();
      const values = state.get(element);
      values.mouseX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8;
      values.mouseY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 5;
      scheduleRender();
    });
    element.addEventListener("pointerleave", () => {
      const values = state.get(element);
      values.mouseX = 0;
      values.mouseY = 0;
      scheduleRender();
    });
  });

  const updateScrollParallax = () => {
    const focusLine = window.innerHeight * 0.52;
    elements.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      const distance = (bounds.top + bounds.height / 2 - focusLine) / window.innerHeight;
      state.get(element).scrollY = Math.max(-7, Math.min(7, -distance * 7));
    });
    scheduleRender();
  };

  document.addEventListener("scroll", updateScrollParallax, { passive: true });
  window.addEventListener("resize", updateScrollParallax);
  updateScrollParallax();
})();

// Activate journey milestones as the cursor travels down or up through the section.
(function initJourneyMouseTracking() {
  const journey = document.querySelector(".journey");
  const items = Array.from(document.querySelectorAll(".timeline-item"));
  if (!journey || !items.length) return;

  let previousPointerY = null;
  let activeItem = items.find((item) => item.classList.contains("is-active")) || items[0];

  const activateFromPointer = (event) => {
    const closest = items.reduce((result, item) => {
      const bounds = item.getBoundingClientRect();
      const distance = Math.abs(event.clientY - (bounds.top + bounds.height / 2));
      return !result || distance < result.distance ? { item, distance } : result;
    }, null);
    if (!closest || closest.item === activeItem) {
      previousPointerY = event.clientY;
      return;
    }

    const direction = previousPointerY === null || event.clientY >= previousPointerY ? 1 : -1;
    activeItem = closest.item;
    items.forEach((item) => {
      const active = item === activeItem;
      item.classList.toggle("is-active", active);
      item.querySelector(".timeline-marker")?.setAttribute("aria-expanded", String(active));
    });

    if (typeof gsap !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(
        activeItem,
        { y: direction * 20, autoAlpha: 0.4 },
        { y: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(1.3)", overwrite: true }
      );
    }
    previousPointerY = event.clientY;
  };

  journey.addEventListener("pointermove", activateFromPointer);
  journey.addEventListener("pointerleave", () => {
    previousPointerY = null;
  });
})();

/* ==========================================================================
   Interactive 3D Hero Scene (Three.js)
   ========================================================================== */
(function init3DHero() {
  const canvas = document.getElementById("hero-3d-canvas");
  const container = document.getElementById("hero-3d-wrap");
  if (!canvas || !container || typeof THREE === "undefined") return;

  // Scene & Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xfffbf0, 0.95);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xff7043, 1.8);
  mainLight.position.set(5, 6, 5);
  scene.add(mainLight);

  const blueRimLight = new THREE.DirectionalLight(0x0f4c81, 1.6);
  blueRimLight.position.set(-6, -3, -4);
  scene.add(blueRimLight);

  const topLight = new THREE.PointLight(0xffffff, 0.8, 15);
  topLight.position.set(0, 5, 2);
  scene.add(topLight);

  // 3D Objects Group
  const cluster = new THREE.Group();
  scene.add(cluster);

  // Materials
  const orangeGloss = new THREE.MeshPhysicalMaterial({
    color: 0xff6b35,
    roughness: 0.14,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9
  });

  const blueGloss = new THREE.MeshPhysicalMaterial({
    color: 0x0f4c81,
    roughness: 0.18,
    metalness: 0.12,
    clearcoat: 0.95,
    clearcoatRoughness: 0.12
  });

  const goldGloss = new THREE.MeshPhysicalMaterial({
    color: 0xffd166,
    roughness: 0.15,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });

  const inkMetal = new THREE.MeshStandardMaterial({
    color: 0x191919,
    metalness: 0.75,
    roughness: 0.25
  });

  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x0f4c81,
    wireframe: true,
    transparent: true,
    opacity: 0.65
  });

  // 1. Main Hero Balloon (Orange)
  const mainBalloonGeo = new THREE.SphereGeometry(1.2, 48, 48);
  const mainBalloon = new THREE.Mesh(mainBalloonGeo, orangeGloss);
  mainBalloon.position.set(0, 0.15, 0);

  // Balloon Knot
  const knotGeo = new THREE.ConeGeometry(0.16, 0.2, 16);
  const knot = new THREE.Mesh(knotGeo, orangeGloss);
  knot.rotation.x = Math.PI;
  knot.position.set(0, -1.25, 0);
  mainBalloon.add(knot);
  cluster.add(mainBalloon);

  // 2. Secondary Floating Balloon (Blue)
  const blueBalloonGeo = new THREE.SphereGeometry(0.72, 36, 36);
  const blueBalloon = new THREE.Mesh(blueBalloonGeo, blueGloss);
  blueBalloon.position.set(-1.45, 0.85, -0.4);
  const blueKnot = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.16, 16), blueGloss);
  blueKnot.rotation.x = Math.PI;
  blueKnot.position.set(0, -0.76, 0);
  blueBalloon.add(blueKnot);
  cluster.add(blueBalloon);

  // 3. Accent Balloon (Golden)
  const goldBalloonGeo = new THREE.SphereGeometry(0.55, 36, 36);
  const goldBalloon = new THREE.Mesh(goldBalloonGeo, goldGloss);
  goldBalloon.position.set(1.35, -0.65, 0.3);
  const goldKnot = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.13, 16), goldGloss);
  goldKnot.rotation.x = Math.PI;
  goldKnot.position.set(0, -0.58, 0);
  goldBalloon.add(goldKnot);
  cluster.add(goldBalloon);

  // 4. Tech Ring Orbit
  const ringGeo = new THREE.TorusGeometry(2.15, 0.032, 16, 80);
  const techRing = new THREE.Mesh(ringGeo, inkMetal);
  techRing.rotation.x = Math.PI * 0.38;
  techRing.rotation.y = Math.PI * 0.15;
  cluster.add(techRing);

  // 5. Code Wireframe Polyhedron
  const polyGeo = new THREE.IcosahedronGeometry(0.42, 0);
  const polyMesh = new THREE.Mesh(polyGeo, wireframeMat);
  polyMesh.position.set(-1.25, -1.15, 0.4);
  cluster.add(polyMesh);

  // 6. Mini Accent Sphere
  const miniGeo = new THREE.SphereGeometry(0.24, 24, 24);
  const miniMesh = new THREE.Mesh(miniGeo, orangeGloss);
  miniMesh.position.set(1.05, 1.45, -0.5);
  cluster.add(miniMesh);

  // Mouse & Drag State
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let targetRotation = { x: 0.15, y: -0.2 };
  let currentRotation = { x: 0.15, y: -0.2 };
  let bounceVelocity = 0;
  let bounceScale = 1;

  // Window mouse move (gentle tilt tracking)
  let windowMouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    windowMouse.x = nx;
    windowMouse.y = ny;
  }, { passive: true });

  // Direct container drag interaction
  container.addEventListener("pointerdown", (e) => {
    isDragging = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
    container.setPointerCapture(e.pointerId);
    bounceVelocity = 0.08; // subtle click bounce impulse
  });

  container.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevMousePos.x;
    const dy = e.clientY - prevMousePos.y;
    targetRotation.y += dx * 0.008;
    targetRotation.x += dy * 0.008;
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  const stopDrag = (e) => {
    if (isDragging) {
      isDragging = false;
      try { container.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };
  container.addEventListener("pointerup", stopDrag);
  container.addEventListener("pointercancel", stopDrag);

  // Responsive Resize
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  // Animation Loop
  let clock = new THREE.Clock();
  const animate = () => {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Natural gentle floating bobbing
    mainBalloon.position.y = 0.15 + Math.sin(time * 1.8) * 0.09;
    blueBalloon.position.y = 0.85 + Math.sin(time * 2.1 + 1.2) * 0.07;
    goldBalloon.position.y = -0.65 + Math.sin(time * 1.6 + 2.5) * 0.08;
    polyMesh.position.y = -1.15 + Math.sin(time * 1.9 + 3.1) * 0.06;
    polyMesh.rotation.x += 0.01;
    polyMesh.rotation.y += 0.015;

    techRing.rotation.z = time * 0.18;

    // Click bounce physics
    if (bounceScale > 1 || bounceVelocity !== 0) {
      bounceScale += bounceVelocity;
      bounceVelocity -= 0.012; // spring recovery
      if (bounceScale < 1) {
        bounceScale = 1;
        bounceVelocity = 0;
      }
    }
    cluster.scale.set(bounceScale, bounceScale, bounceScale);

    // Smooth rotation interpolation (lerp)
    if (!isDragging) {
      targetRotation.y += 0.003; // continuous subtle auto-spin
      const mouseInfluenceX = windowMouse.y * 0.35;
      const mouseInfluenceY = windowMouse.x * 0.45;
      currentRotation.x += (targetRotation.x + mouseInfluenceX - currentRotation.x) * 0.06;
      currentRotation.y += (targetRotation.y + mouseInfluenceY - currentRotation.y) * 0.06;
    } else {
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.15;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.15;
    }

    cluster.rotation.x = currentRotation.x;
    cluster.rotation.y = currentRotation.y;

    renderer.render(scene, camera);
  };
  animate();
})();


/* ==========================================================================
   Project Cards 3D Interactive Tilt & Glare
   ========================================================================== */
(function init3DTiltCards() {
  const cards = document.querySelectorAll("[data-tilt], .skill-group, .note-card, .now-panel");
  if (!cards.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  cards.forEach((card) => {
    let bounds;
    const maxTilt = prefersReducedMotion ? 5 : 12;

    const handlePointerMove = (e) => {
      bounds = card.getBoundingClientRect();
      const pointerX = Math.max(0, Math.min(bounds.width, e.clientX - bounds.left));
      const pointerY = Math.max(0, Math.min(bounds.height, e.clientY - bounds.top));

      const pctX = (pointerX / bounds.width) * 2 - 1;
      const pctY = (pointerY / bounds.height) * 2 - 1;

      const rotateX = (-pctY * maxTilt).toFixed(2);
      const rotateY = (pctX * maxTilt).toFixed(2);

      card.style.transform = `perspective(850px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.025, 1.025, 1.025)`;

      // Dynamic glare position
      const glareX = ((pointerX / bounds.width) * 100).toFixed(1);
      const glareY = ((pointerY / bounds.height) * 100).toFixed(1);
      card.style.setProperty("--glare-x", `${glareX}%`);
      card.style.setProperty("--glare-y", `${glareY}%`);
    };

    const handleMouseLeave = () => {
      card.style.transform = `perspective(850px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    };

    card.addEventListener("pointerenter", () => {
      card.style.transition = "transform 0.1s ease-out, box-shadow 0.2s ease-out";
    });

    card.addEventListener("pointermove", handlePointerMove);

    card.addEventListener("pointerleave", () => {
      card.style.transition = "transform 0.4s ease-out, box-shadow 0.3s ease-out";
      handleMouseLeave();
    });
  });
})();

/* ==========================================================================
   GSAP UI Experience
   ========================================================================== */
(function initGSAPExperience() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  const sections = gsap.utils.toArray("main section");
  const journeyItems = gsap.utils.toArray(".timeline-item");
  const buildSteps = gsap.utils.toArray(".build-lab-points article");
  media.add({ reduceMotion: "(prefers-reduced-motion: reduce)", desktop: "(min-width: 769px)" }, (context) => {
    const { reduceMotion, desktop } = context.conditions;
    const intro = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (reduceMotion) {
      gsap.set("main section, .site-header, .hero-content > *, .hero-3d-wrap", { autoAlpha: 1, clearProps: "transform" });
      gsap.set(buildSteps, { autoAlpha: 1, x: 0 });
      return;
    }

    intro
      .from(".site-header", { y: -35, autoAlpha: 0, duration: 0.65 })
      .from(".hero-content > *", { y: 28, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, "-=0.3")
      .from(".hero-3d-wrap", { x: 42, rotation: desktop ? 3 : 0, autoAlpha: 0, duration: 0.9 }, "-=0.65");

    gsap.utils.toArray("main section:not(.hero)").forEach((section) => {
      const heading = section.querySelector("h2, .section-heading-row");
      if (heading) {
        gsap.from(heading, {
          y: 32,
          autoAlpha: 0,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 78%", toggleActions: "play none none reverse" }
        });
      }
    });

    ScrollTrigger.batch(".project-card, .skill-group, .note-card", {
      start: "top 86%",
      onEnter: (elements) => gsap.fromTo(elements, { y: 42, autoAlpha: 0, rotation: -1.5 }, { y: 0, autoAlpha: 1, rotation: 0, duration: 0.75, stagger: 0.12, ease: "back.out(1.2)", overwrite: true }),
      onLeaveBack: (elements) => gsap.to(elements, { y: 24, autoAlpha: 0, duration: 0.35, stagger: 0.05, overwrite: true })
    });

    gsap.from(".build-lab-points article", {
      x: -24,
      duration: 0.65,
      stagger: 0.14,
      ease: "power2.out",
      scrollTrigger: { trigger: ".build-lab-points", start: "top 78%", toggleActions: "play none none reverse" }
    });

    ScrollTrigger.create({
      trigger: ".build-lab",
      start: "top bottom",
      end: "bottom top",
      onEnter: updateBuildStep,
      onEnterBack: updateBuildStep,
      onUpdate: updateBuildStep
    });

    gsap.from(".now-panel", {
      y: 35,
      autoAlpha: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: { trigger: ".now-panel", start: "top 82%", toggleActions: "play none none reverse" }
    });

    journeyItems.forEach((item) => {
      ScrollTrigger.create({
        trigger: item,
        start: "top 42%",
        end: "bottom 42%",
        onEnter: () => {
          activateJourneyItem(item);
          animateJourneyItem(item, 1);
        },
        onEnterBack: () => {
          activateJourneyItem(item);
          animateJourneyItem(item, -1);
        },
        onLeaveBack: () => {
          gsap.set(item, { y: 18, autoAlpha: 0.58 });
        }
      });
    });

    gsap.utils.toArray(".hero-tags span, .btn-3d, .theme-toggle-btn").forEach((element) => {
      element.addEventListener("mouseenter", () => gsap.to(element, { y: -4, scale: 1.04, duration: 0.2, ease: "power2.out", overwrite: true }));
      element.addEventListener("mouseleave", () => gsap.to(element, { y: 0, scale: 1, duration: 0.35, ease: "elastic.out(1, 0.45)", overwrite: true }));
    });
  });

  function activateJourneyItem(item) {
    journeyItems.forEach((entry) => {
      const active = entry === item;
      entry.classList.toggle("is-active", active);
      entry.querySelector(".timeline-marker")?.setAttribute("aria-expanded", String(active));
      gsap.to(entry, { x: active ? 8 : 0, scale: active ? 1.02 : 1, autoAlpha: active ? 1 : 0.58, duration: 0.45, ease: "power2.out", overwrite: true });
    });
  }

  function animateJourneyItem(item, direction) {
    gsap.fromTo(
      item,
      { y: direction * 22, autoAlpha: 0.35 },
      { y: 0, autoAlpha: 1, duration: 0.65, ease: "back.out(1.35)", overwrite: true }
    );
  }

  function activateBuildStep(step) {
    buildSteps.forEach((entry) => {
      const active = entry === step;
      entry.classList.toggle("is-active", active);
      gsap.to(entry, { x: active ? 8 : 0, autoAlpha: active ? 1 : 0.48, duration: 0.4, ease: "power2.out", overwrite: true });
    });
  }

  function updateBuildStep() {
    if (!buildSteps.length) return;
    const readingLine = window.innerHeight * 0.58;
    const activeStep = buildSteps.reduce((closest, step) => {
      const bounds = step.getBoundingClientRect();
      const distance = Math.abs(bounds.top + bounds.height / 2 - readingLine);
      if (!closest || distance < closest.distance) return { step, distance };
      return closest;
    }, null);
    if (activeStep) activateBuildStep(activeStep.step);
  }

  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
})();
