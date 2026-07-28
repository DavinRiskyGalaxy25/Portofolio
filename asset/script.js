(() => {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const smallViewport = window.matchMedia("(max-width: 860px)").matches;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    const lowMemory = !!(navigator.deviceMemory && navigator.deviceMemory <= 4);

    // Master switch for every "heavy" enhancement: WebGL hero scene,
    // Lenis smooth scroll, and 3D scroll-pinned sequences. Everything
    // gated behind this has a lighter fallback elsewhere in the file.
    const heavyFXEnabled = !reduceMotion && !coarsePointer && !smallViewport && !saveData && !lowMemory;

    const gsapReady = typeof window.gsap !== "undefined";
    if (gsapReady && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
    }

    document.documentElement.classList.toggle("fx-heavy", heavyFXEnabled);
    document.documentElement.classList.toggle("fx-reduced", reduceMotion);

    /*=============================
        UTIL — rAF throttle
    =============================*/
    function rafThrottle(fn) {
        let ticking = false;
        return function(e) {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => {
                    fn(e);
                    ticking = false;
                });
            }
        };
    }

    /*=============================
        UTIL — dynamic external <script> loader
        Three.js and Lenis are intentionally NOT hardcoded into
        index.html — they're only worth the download on devices that
        will actually use them (heavyFXEnabled). Each call resolves
        once, is de-duped by src, and resolves gracefully (never
        rejects the whole init chain) if the CDN is unreachable —
        the 3D hero / smooth-scroll simply stay off in that case.
    =============================*/
    const _scriptCache = {};

    function loadExternalScript(src) {
        if (_scriptCache[src]) return _scriptCache[src];
        _scriptCache[src] = new Promise((resolve) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                existing.addEventListener("load", () => resolve(true));
                existing.addEventListener("error", () => resolve(false));
                return;
            }
            const tag = document.createElement("script");
            tag.src = src;
            tag.async = true;
            tag.onload = () => resolve(true);
            tag.onerror = () => resolve(false);
            document.head.appendChild(tag);
        });
        return _scriptCache[src];
    }

    /*=============================
        INTRO SCREEN / FULLSCREEN LOADER
        Builds the new intro overlay entirely from JS so index.html
        never needs manual edits: a blue-gradient backdrop, the big
        "Davin Scientist" title revealed letter-by-letter with a 3D
        scale-up + fade (GSAP when available, CSS fallback
        otherwise), then a smooth slide-up exit that unveils the
        real site underneath.
    =============================*/
    const loader = document.getElementById("loader");
    const INTRO_TEXT = "Davin Scientist";
    let heroStarted = false;

    function buildIntroScreen() {
        if (!loader) return null;

        loader.innerHTML =
            '<div class="intro-bg" aria-hidden="true"></div>' +
            '<div class="intro-inner">' +
            '<p class="intro-eyebrow"><span class="status-dot"></span>welcome to my portfolio</p>' +
            '<h1 class="intro-title" id="introTitle" aria-label="' + INTRO_TEXT + '"></h1>' +
            '<p class="intro-sub">loading experience&hellip;</p>' +
            '<div class="intro-bar-track"><span class="intro-bar-fill" id="introBarFill"></span></div>' +
            '</div>';

        const titleEl = document.getElementById("introTitle");
        const charSpans = [];
        INTRO_TEXT.split("").forEach((ch) => {
            const span = document.createElement("span");
            span.className = "intro-char" + (ch === " " ? " is-space" : "");
            span.textContent = ch === " " ? "\u00A0" : ch;
            titleEl.appendChild(span);
            charSpans.push(span);
        });
        return charSpans;
    }

    function playIntroReveal() {
        const charSpans = buildIntroScreen();
        const barFill = document.getElementById("introBarFill");

        if (reduceMotion || !gsapReady) {
            if (charSpans) charSpans.forEach((s) => {
                s.style.opacity = 1;
                s.style.transform = "none";
            });
            document.querySelectorAll(".intro-eyebrow, .intro-sub, .intro-bar-track").forEach((el) => { el.style.opacity = 1; });
            if (barFill) barFill.style.width = "100%";
            return;
        }

        // 3D scale-up / fade-in reveal, letter by letter.
        gsap.timeline()
            .to(".intro-eyebrow", { opacity: 1, duration: .5, ease: "power2.out" })
            .to(charSpans, {
                opacity: 1,
                y: 0,
                rotateX: 0,
                scale: 1,
                duration: .9,
                stagger: .045,
                ease: "back.out(1.6)"
            }, "-=.2")
            .to(".intro-sub, .intro-bar-track", { opacity: 1, duration: .5, ease: "power2.out" }, "-=.5")
            .to(barFill, { width: "100%", duration: 1.1, ease: "power1.inOut" }, "-=.4");
    }

    function hidePreloader() {
        if (!loader || loader.classList.contains("is-hidden")) return;

        // intro_swoosh SFX: dimainkan tepat saat layar intro mulai
        // slide-up — cocok dengan suara "whoosh" transisi masuk yang
        // singkat dan tegas (lihat SFX_MANIFEST di bawah).
        playSFX("intro_swoosh");

        loader.classList.add("is-hidden");
        startHeroSequence();
    }

    playIntroReveal();

    /*=============================
        HERO — SCRAMBLE TITLE
    =============================*/
    const SCRAMBLE_CHARS = "!<>-_/[]{}—=+*^?#$%";

    function scrambleReveal(el, finalText, opts) {
        opts = opts || {};
        const duration = opts.duration || 1300;
        const onDone = opts.onDone;

        const words = finalText.split(" ");
        el.innerHTML = "";
        const charSpans = [];

        words.forEach((word, wi) => {
            word.split("").forEach((ch) => {
                const span = document.createElement("span");
                span.className = "scramble-char";
                span.textContent = ch;
                el.appendChild(span);
                charSpans.push(span);
            });
            if (wi < words.length - 1) {
                const space = document.createElement("span");
                space.className = "scramble-char is-space";
                space.innerHTML = "&nbsp;";
                el.appendChild(space);
            }
        });

        if (reduceMotion) {
            charSpans.forEach((s) => s.classList.add("is-resolved"));
            if (typeof onDone === "function") onDone();
            return;
        }

        const total = charSpans.length;
        const perCharDelay = duration / (total + 14);
        const maxIterations = 7;

        charSpans.forEach((span, i) => {
            const finalChar = span.textContent;
            let iterations = 0;
            const startAt = i * perCharDelay;

            setTimeout(() => {
                const scrambleTimer = setInterval(() => {
                    span.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                    iterations++;
                    if (iterations >= maxIterations) {
                        clearInterval(scrambleTimer);
                        span.textContent = finalChar;
                        span.classList.add("is-resolved");
                        if (i === total - 1 && typeof onDone === "function") onDone();
                    }
                }, 32);
            }, startAt);
        });
    }

    /*=============================
        HERO — TYPING ROLE
    =============================*/
    function startRoleTyping() {
        const typingEl = document.getElementById("typingRole");
        if (!typingEl) return;

        const roles = ["Web Developer", "Fullstack Developer", "UI Designer", "Cyber Security Enthusiast"];

        if (reduceMotion) {
            typingEl.textContent = roles[0];
            return;
        }

        let word = 0,
            char = 0,
            deleting = false;

        function tick() {
            const current = roles[word];
            if (!deleting) {
                typingEl.textContent = current.substring(0, char++);
                if (char > current.length) {
                    deleting = true;
                    setTimeout(tick, 1500);
                    return;
                }
            } else {
                typingEl.textContent = current.substring(0, char--);
                if (char < 0) {
                    deleting = false;
                    word = (word + 1) % roles.length;
                }
            }
            setTimeout(tick, deleting ? 55 : 95);
        }
        tick();
    }

    /*=============================
        HERO — ORCHESTRATED ENTRANCE
    =============================*/
    function startHeroSequence() {
        if (heroStarted) return;
        heroStarted = true;

        const titleEl = document.getElementById("scrambleTitle");
        if (titleEl) {
            const finalText = titleEl.dataset.text || titleEl.textContent.trim();
            scrambleReveal(titleEl, finalText, {
                duration: 1300,
                onDone: startRoleTyping
            });
        } else {
            startRoleTyping();
        }

        if (gsapReady) {
            gsap.fromTo(".hero-eyebrow", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .6, delay: .1, ease: "power2.out" });
            gsap.fromTo(".hero-desc", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .8, delay: 1.4, ease: "power3.out" });
            gsap.fromTo(".hero-actions", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .8, delay: 1.6, ease: "power3.out" });
            gsap.fromTo(".hero-visual", { opacity: 0, scale: .92, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 1, delay: .9, ease: "power3.out" });
            gsap.fromTo("#heroCanvas", { opacity: 0 }, { opacity: 1, duration: 1.6, delay: .3, ease: "power2.out" });
        }
    }

    // Gives the letter-by-letter intro reveal (~1.6s) room to finish
    // before sliding away, but never blocks longer than 4.5s total
    // even on a slow connection.
    window.addEventListener("load", () => setTimeout(hidePreloader, 1700));
    setTimeout(hidePreloader, 4500);

    /*=============================
        HERO 3D BACKGROUND (Three.js)
        An elegant, subtle floating crystal (layered icosahedron) as
        the focal point, a faint drifting particle haze behind it for
        depth, and colored lights that react to the cursor. The
        <canvas> itself doesn't exist in index.html, so
        ensureHeroCanvas() creates and inserts it — no HTML edit
        required. Skipped entirely when heavyFXEnabled is false; the
        CSS mesh-blob glow behind it carries the background on its
        own, so nothing looks broken without it.
    =============================*/
    function ensureHeroCanvas(heroEl) {
        let canvas = document.getElementById("heroCanvas");
        if (canvas) return canvas;
        const host = heroEl.querySelector(".mesh-bg") || heroEl;
        canvas = document.createElement("canvas");
        canvas.id = "heroCanvas";
        canvas.setAttribute("aria-hidden", "true");
        host.appendChild(canvas);
        return canvas;
    }

    function initHeroScene() {
        const heroEl = document.getElementById("home");
        if (!heroEl || !heavyFXEnabled) return;
        if (typeof window.THREE === "undefined") return; // CDN failed to load — mesh-blob CSS glow carries the background instead

        const canvas = ensureHeroCanvas(heroEl);
        if (!canvas) return;

        let width = heroEl.clientWidth;
        let height = heroEl.clientHeight;

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        } catch (err) {
            return; // WebGL unavailable — canvas simply stays empty
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setSize(width, height);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
        camera.position.set(0, 0, 9);

        // Dynamic lighting — bold, saturated point lights matching the
        // new cyan / violet / magenta palette, drifting with the cursor.
        const ambient = new THREE.AmbientLight(0x2c2440, 1.1);
        scene.add(ambient);
        const pointLight = new THREE.PointLight(0x00e8ff, 3.6, 24);
        pointLight.position.set(2, 2, 4);
        scene.add(pointLight);
        const rimLight = new THREE.PointLight(0xff2d95, 2.0, 24);
        rimLight.position.set(-3, -2, 3);
        scene.add(rimLight);
        const accentLight = new THREE.PointLight(0xa259ff, 1.4, 20);
        accentLight.position.set(0, -3, 5);
        scene.add(accentLight);

        // Focal element: a layered "crystal" — an outer wireframe
        // icosahedron plus a smaller, softly glowing solid core
        // nested inside it, floating and slowly rotating. Kept
        // deliberately subtle/elegant rather than busy.
        const crystalGroup = new THREE.Group();

        const outerGeo = new THREE.IcosahedronGeometry(1.9, 1);
        const outerMat = new THREE.MeshStandardMaterial({
            color: 0xa259ff,
            wireframe: true,
            roughness: 0.3,
            metalness: 0.7,
            transparent: true,
            opacity: 0.5
        });
        const outerShell = new THREE.Mesh(outerGeo, outerMat);
        crystalGroup.add(outerShell);

        const innerGeo = new THREE.IcosahedronGeometry(0.95, 0);
        const innerMat = new THREE.MeshStandardMaterial({
            color: 0x00e8ff,
            roughness: 0.15,
            metalness: 0.85,
            transparent: true,
            opacity: 0.38,
            emissive: 0x1a8fa8,
            emissiveIntensity: 0.5
        });
        const innerCore = new THREE.Mesh(innerGeo, innerMat);
        crystalGroup.add(innerCore);

        scene.add(crystalGroup);

        // Faint drifting particle haze behind the crystal — kept
        // sparse and low-opacity so the crystal stays the focus.
        const PARTICLE_COUNT = 90;
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const colors = new Float32Array(PARTICLE_COUNT * 3);
        const palette = [
            [0.0, 0.91, 1.0],
            [0.64, 0.35, 1.0],
            [1.0, 0.18, 0.58]
        ];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 14;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
            const c = palette[i % palette.length];
            colors[i * 3] = c[0];
            colors[i * 3 + 1] = c[1];
            colors[i * 3 + 2] = c[2];
        }
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const particleMat = new THREE.PointsMaterial({
            size: 0.045,
            vertexColors: true,
            transparent: true,
            opacity: 0.45,
            sizeAttenuation: true
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        let targetRotX = 0,
            targetRotY = 0;
        let mouseNX = 0,
            mouseNY = 0;

        heroEl.addEventListener("mousemove", rafThrottle((e) => {
            const rect = heroEl.getBoundingClientRect();
            mouseNX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouseNY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
            targetRotY = mouseNX * 0.45;
            targetRotX = mouseNY * 0.28;
        }), { passive: true });

        // Pause rendering while the hero is scrolled out of view.
        let isVisible = true;
        if ("IntersectionObserver" in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => { isVisible = entry.isIntersecting; });
            }, { threshold: 0 });
            io.observe(heroEl);
        }

        let floatT = 0;

        function animate() {
            requestAnimationFrame(animate);
            if (!isVisible) return;

            floatT += 0.006;
            crystalGroup.position.y = Math.sin(floatT) * 0.18; // gentle floating bob
            crystalGroup.rotation.y += 0.0022 + (targetRotY - crystalGroup.rotation.y) * 0.02;
            crystalGroup.rotation.x += 0.0009 + (targetRotX - crystalGroup.rotation.x) * 0.02;
            innerCore.rotation.y -= 0.0035;
            particles.rotation.y += 0.0005;

            pointLight.position.x = mouseNX * 3;
            pointLight.position.y = -mouseNY * 3;

            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener("resize", rafThrottle(() => {
            width = heroEl.clientWidth;
            height = heroEl.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }));
    }
    // Three.js is only worth downloading on devices where the 3D

    // scene will actually run (heavyFXEnabled) — see loadExternalScript().
    if (heavyFXEnabled) {
        loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js")
            .then((ok) => { if (ok) initHeroScene(); });
    }

    /*=============================
        CUSTOM CURSOR (fine pointers only)
    =============================*/
    const cursorDot = document.getElementById("cursorDot");
    const cursorRing = document.getElementById("cursorRing");

    if (isFinePointer && cursorDot && cursorRing) {
        document.documentElement.classList.add("has-custom-cursor");

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let ringX = mouseX,
            ringY = mouseY;

        window.addEventListener("mousemove", (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        }, { passive: true });

        (function ringLoop() {
            ringX += (mouseX - ringX) * 0.16;
            ringY += (mouseY - ringY) * 0.16;
            cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
            requestAnimationFrame(ringLoop);
        })();

        document.addEventListener("mousedown", () => cursorDot.classList.add("is-click"));
        document.addEventListener("mouseup", () => cursorDot.classList.remove("is-click"));
        document.addEventListener("mouseleave", () => {
            cursorDot.style.opacity = "0";
            cursorRing.style.opacity = "0";
        });
        document.addEventListener("mouseenter", () => {
            cursorDot.style.opacity = "";
            cursorRing.style.opacity = "";
        });

        window.attachCursorHooks = function attachCursorHooks(root) {
            const scope = root || document;
            scope.querySelectorAll('[data-cursor="hover"]').forEach((el) => {
                el.addEventListener("mouseenter", () => cursorRing.classList.add("is-hover"));
                el.addEventListener("mouseleave", () => cursorRing.classList.remove("is-hover"));
            });
            scope.querySelectorAll('[data-cursor="link"]').forEach((el) => {
                el.addEventListener("mouseenter", () => cursorRing.classList.add("is-link"));
                el.addEventListener("mouseleave", () => cursorRing.classList.remove("is-link"));
            });
        };
        window.attachCursorHooks();
    }

    /*=============================
        MAGNETIC BUTTONS
    =============================*/
    if (isFinePointer) {
        document.querySelectorAll("[data-magnetic]").forEach((btn) => {
            const strength = 20;
            btn.addEventListener("mousemove", rafThrottle((e) => {
                const rect = btn.getBoundingClientRect();
                const relX = e.clientX - rect.left - rect.width / 2;
                const relY = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = `translate(${(relX / rect.width) * strength}px, ${(relY / rect.height) * strength}px)`;
            }));
            btn.addEventListener("mouseleave", () => {
                btn.style.transform = "translate(0, 0)";
            });
        });
    }

    /*=============================
        BUTTON CLICK RIPPLE
    =============================*/
    document.querySelectorAll(".btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const rect = btn.getBoundingClientRect();
            const ripple = document.createElement("span");
            ripple.className = "ripple";
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
            ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 650);
        });
    });

    /*=============================
        SPOTLIGHT GLOW + GLASS SHINE
        Tracks the cursor position into --mx/--my so cards can render
        a soft radial "shine" under the pointer (see .glass-shine in
        the stylesheet). Shared across every glass-style card so the
        3D-glass look reads consistently across the page.
    =============================*/
    if (isFinePointer) {
        document.querySelectorAll(".bento-cell, .contact-card, .project-card, .cert-card").forEach((cell) => {
            cell.addEventListener("mousemove", rafThrottle((e) => {
                const rect = cell.getBoundingClientRect();
                cell.style.setProperty("--mx", `${e.clientX - rect.left}px`);
                cell.style.setProperty("--my", `${e.clientY - rect.top}px`);
            }));
        });
    }

    /*=============================
        DEPTH-OF-FIELD FOCUS GROUPS
        When a card in one of these groups is hovered, its siblings
        blur and dim slightly — a cheap, GPU-friendly depth-of-field
        stand-in that makes the hovered card feel like it's popped
        forward in 3D space.
    =============================*/
    function attachFocusGroup(container, itemSelector) {
        if (!isFinePointer || !container) return;
        const items = Array.from(container.querySelectorAll(itemSelector));
        if (items.length < 2) return;
        items.forEach((item) => {
            item.addEventListener("mouseenter", () => {
                container.classList.add("has-focus");
                item.classList.add("is-focused");
            });
            item.addEventListener("mouseleave", () => {
                container.classList.remove("has-focus");
                item.classList.remove("is-focused");
            });
        });
    }
    attachFocusGroup(document.querySelector(".projects-grid"), ".project-card");
    attachFocusGroup(document.querySelector(".bento-grid"), ".bento-cell");

    /*=============================
        3D TILT EFFECT
        Reusable so it can be re-applied to cards built dynamically
        later (e.g. the certificate carousel).
    =============================*/
    function attachTilt(cards) {
        if (!isFinePointer) return;
        const maxTilt = 9;
        cards.forEach((card) => {
            card.addEventListener("mousemove", rafThrottle((e) => {
                const rect = card.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width - 0.5;
                const py = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `perspective(900px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg) translateY(-6px)`;
            }));
            card.addEventListener("mouseleave", () => {
                card.style.transform = "";
            });
        });
    }
    attachTilt(Array.from(document.querySelectorAll("[data-tilt]")));

    /*=============================
        SKILL PROFICIENCY DOTS
    =============================*/
    document.querySelectorAll(".skill-dots").forEach((dotsEl) => {
        const host = dotsEl.closest("[data-level]");
        const level = host ? parseInt(host.dataset.level, 10) : 0;
        const filled = Math.max(1, Math.round(level / 20));
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement("span");
            if (i < filled) dot.classList.add("is-filled");
            dotsEl.appendChild(dot);
        }
    });

    /*=============================
        JOURNEY TABS
    =============================*/
    const journeyTabs = document.querySelectorAll(".journey-tab");
    const journeyPanels = document.querySelectorAll(".journey-panel");
    const journeyIndicator = document.getElementById("journeyIndicator");

    function moveJourneyIndicator(tabEl) {
        if (!journeyIndicator || !tabEl) return;
        journeyIndicator.style.width = tabEl.offsetWidth + "px";
        journeyIndicator.style.transform = `translateX(${tabEl.offsetLeft - 5}px)`;
    }

    journeyTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            journeyTabs.forEach((t) => {
                t.classList.remove("active");
                t.setAttribute("aria-selected", "false");
            });
            tab.classList.add("active");
            tab.setAttribute("aria-selected", "true");
            moveJourneyIndicator(tab);

            const target = tab.dataset.tab;
            journeyPanels.forEach((panel) => {
                panel.classList.toggle("active", panel.dataset.panel === target);
            });

            if (gsapReady && !reduceMotion) {
                const activePanel = document.querySelector(`.journey-panel[data-panel="${target}"]`);
                if (activePanel) {
                    gsap.fromTo(activePanel.querySelectorAll(".timeline-item"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .5, stagger: .08, ease: "power2.out" });
                }
            }

            // Newly-visible panel needs its geometry re-measured so
            // the scroll-driven timeline fill (below) tracks correctly.
            if (gsapReady && window.ScrollTrigger) {
                requestAnimationFrame(() => ScrollTrigger.refresh());
            }
        });
    });

    /*=============================
        JOURNEY TIMELINE — SCROLL FILL
        Injects a gradient "fill" line that grows from 0% to 100%
        as each timeline block scrolls through view, on top of the
        existing static track line.
    =============================*/
    function initTimelineFill() {
        if (!gsapReady || !window.ScrollTrigger || reduceMotion) return;
        document.querySelectorAll(".timeline").forEach((timelineEl) => {
            const fill = document.createElement("span");
            fill.className = "timeline-fill";
            fill.setAttribute("aria-hidden", "true");
            timelineEl.appendChild(fill);

            gsap.fromTo(fill, { scaleY: 0 }, {
                scaleY: 1,
                ease: "none",
                scrollTrigger: {
                    trigger: timelineEl,
                    start: "top 82%",
                    end: "bottom 55%",
                    scrub: 0.6
                }
            });
        });
    }
    initTimelineFill();

    /*=============================
        SCROLL STATE CONTROL
    =============================*/
    const navbar = document.getElementById("navbar");
    const topButton = document.getElementById("topButton");
    const scrollProgress = document.getElementById("scrollProgress");

    const onScroll = rafThrottle(() => {
        const y = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (y / docHeight) * 100 : 0;

        if (navbar) navbar.classList.toggle("is-scrolled", y > 30);
        if (topButton) topButton.classList.toggle("is-visible", y > 500);
        if (scrollProgress) scrollProgress.style.width = pct + "%";
    });
    window.addEventListener("scroll", onScroll, { passive: true });

    /*=============================
        ULTRA-SMOOTH SCROLL (Lenis)
        Wired straight into GSAP's ticker so ScrollTrigger stays in
        perfect sync with the smoothed scroll position. Skipped on
        touch/low-end/reduced-motion — native scroll is already the
        right choice there.
    =============================*/
    let lenis = null;

    function initSmoothScroll() {
        if (!heavyFXEnabled) return;
        if (typeof window.Lenis === "undefined") return; // CDN failed to load — native scroll is already a fine fallback

        lenis = new window.Lenis({
            duration: 1.05,
            smoothWheel: true,
            smoothTouch: false
        });
        document.documentElement.classList.add("lenis-active");

        if (gsapReady && window.ScrollTrigger) {
            lenis.on("scroll", ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            requestAnimationFrame(function raf(time) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            });
        }

        // Route in-page anchor links through Lenis so the custom
        // easing applies to nav clicks too, not just wheel/trackpad.
        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener("click", (e) => {
                const id = link.getAttribute("href").slice(1);
                const target = document.getElementById(id);
                if (!target) return;
                e.preventDefault();
                const offset = navbar ? -(navbar.offsetHeight + 14) : 0;
                lenis.scrollTo(target, { offset });
            });
        });

        if (topButton) {
            topButton.addEventListener("click", () => lenis.scrollTo(0));
        }
    }
    if (heavyFXEnabled) {
        loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/lenis/1.1.13/lenis.min.js").then((ok) => {
            if (ok) {
                initSmoothScroll();
            } else if (topButton) {
                topButton.addEventListener("click", () => {
                    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
                });
            }
        });
    } else if (topButton) {
        topButton.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
        });
    }

    /*=============================
        SCROLL-SPY NAVIGATION
    =============================*/
    const sections = document.querySelectorAll("main > section[id]");
    const navLinksAll = document.querySelectorAll(".nav-link, .mobile-menu-links a");
    const navIndicator = document.getElementById("navIndicator");

    function setActiveNav(id) {
        if (!id) return;
        navLinksAll.forEach((link) => link.classList.toggle("active", link.dataset.nav === id));
        const activeDesktopLink = document.querySelector(`.nav-link[data-nav="${id}"]`);
        if (navIndicator && activeDesktopLink) {
            navIndicator.style.width = activeDesktopLink.offsetWidth + "px";
            navIndicator.style.transform = `translateX(${activeDesktopLink.offsetLeft}px)`;
        }
    }

    if ("IntersectionObserver" in window && sections.length) {
        const spy = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) setActiveNav(entry.target.id);
            });
        }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });

        sections.forEach((sec) => spy.observe(sec));
    }

    navLinksAll.forEach((link) => {
        link.addEventListener("click", () => setActiveNav(link.dataset.nav));
    });

    /*=============================
        MOBILE MENU
    =============================*/
    const navToggle = document.getElementById("navToggle");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");

    function closeMobileMenu() {
        if (navToggle) {
            navToggle.classList.remove("is-active");
            navToggle.setAttribute("aria-expanded", "false");
        }
        if (mobileMenu) mobileMenu.classList.remove("is-active");
        if (mobileMenuOverlay) mobileMenuOverlay.classList.remove("is-active");
        document.body.style.overflow = "";
    }

    function openMobileMenu() {
        if (navToggle) {
            navToggle.classList.add("is-active");
            navToggle.setAttribute("aria-expanded", "true");
        }
        if (mobileMenu) mobileMenu.classList.add("is-active");
        if (mobileMenuOverlay) mobileMenuOverlay.classList.add("is-active");
        document.body.style.overflow = "hidden";
    }

    if (navToggle) {
        navToggle.addEventListener("click", () => {
            navToggle.classList.contains("is-active") ? closeMobileMenu() : openMobileMenu();
        });
    }
    if (mobileMenuOverlay) mobileMenuOverlay.addEventListener("click", closeMobileMenu);
    document.querySelectorAll(".mobile-menu-links a").forEach((link) => {
        link.addEventListener("click", closeMobileMenu);
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMobileMenu();
    });

    /*=============================
        GSAP SCROLL REVEALS (baseline / fallback)
        Runs for everything EXCEPT groups explicitly claimed by a
        dedicated pinned sequence further down (data-pin-managed) —
        and even those fall back to this baseline reveal whenever
        heavyFXEnabled is false.
    =============================*/
    if (gsapReady && window.ScrollTrigger && !reduceMotion) {
        gsap.utils.toArray(".reveal").forEach((el) => {
            gsap.fromTo(el, { opacity: 0, y: 46, scale: .97 }, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 1,
                ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 85%" }
            });
        });

        document.querySelectorAll(".stagger-group").forEach((group) => {
            const isPinManaged = group.hasAttribute("data-pin-managed") || group.classList.contains("bento-grid");
            if (isPinManaged && heavyFXEnabled) return;
            const items = group.querySelectorAll(".reveal-stagger");
            if (!items.length) return;
            gsap.fromTo(items, { opacity: 0, y: 36, scale: .94 }, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: .7,
                stagger: .08,
                ease: "power3.out",
                scrollTrigger: { trigger: group, start: "top 82%" }
            });
        });

        gsap.to(".blob-cyan", { y: -70, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });
        gsap.to(".blob-violet", { y: 50, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });
        gsap.to(".blob-magenta", { y: -40, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });
    }

    /*=============================
        HERO SCROLL FX — smooth zoom/scale-down
        As the visitor scrolls past the hero, its content scales
        down and fades, and the 3D canvas eases out with it.
    =============================*/
    function initHeroScrollFX() {
        if (!gsapReady || !window.ScrollTrigger || reduceMotion) return;
        const hero = document.getElementById("home");
        if (!hero) return;

        gsap.to(".hero-inner", {
            scale: heavyFXEnabled ? 0.82 : 0.94,
            opacity: 0.12,
            y: -60,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1 }
        });

        if (heavyFXEnabled) {
            gsap.to("#heroCanvas", {
                opacity: 0,
                scale: 1.15,
                ease: "none",
                scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1 }
            });
        }
    }
    initHeroScrollFX();

    /*=============================
        PROJECTS — CLEAN STAGGER REVEAL
        Previously this section used a pinned/scrubbed "stacked deck"
        animation (initProjectsStack). It was removed: pinning a
        variable-height card inside a fixed-height stage caused cards
        to overlap ("numpuk"), the scroll-jack to feel broken, and the
        section to visually collide with #certificates above it. The
        baseline .reveal-stagger handler further up now animates these
        cards in with a simple, reliable fade/slide-up instead — no
        pinning, no fixed heights, no scroll-jacking.
    =============================*/

    /*=============================
        SKILLS / BENTO — PINNED 3D REVEAL
        Section pins briefly while each bento cell flies in from
        depth with a slight rotation, staggered left-to-right.
        Same heavyFXEnabled gate/fallback pattern as the projects
        stack above.
    =============================*/
    function initBentoReveal() {
        if (!gsapReady || !window.ScrollTrigger || reduceMotion || !heavyFXEnabled) return;

        const section = document.getElementById("skills");
        const cells = section ? Array.from(section.querySelectorAll(".bento-cell")) : [];
        if (!section || !cells.length) return;

        gsap.set(cells, {
            opacity: 0,
            z: -160,
            rotateX: -18,
            transformPerspective: 900,
            transformOrigin: "50% 100%"
        });

        const navH = navbar ? navbar.offsetHeight : 0;
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: "top top+=" + navH,
                end: "+=" + Math.min(cells.length * 130, 1300),
                pin: true,
                scrub: 1,
                anticipatePin: 1
            }
        });

        tl.to(cells, {
            opacity: 1,
            z: 0,
            rotateX: 0,
            duration: 1,
            stagger: { each: 0.12, from: "start" },
            ease: "power2.out"
        });
    }
    initBentoReveal();

    /*=============================
        AVATAR PREVIEW
    =============================*/
    const profileInput = document.getElementById("profileInput");
    const profilePreview = document.getElementById("profilePreview");
    const avatarMonogram = document.getElementById("avatarMonogram");
    const deleteProfileBtn = document.getElementById("deleteProfile");
    const PHOTO_KEY = "davin_profile_photo";

    function showAvatarPhoto(src) {
        if (!profilePreview || !avatarMonogram) return;
        profilePreview.src = src;
        profilePreview.hidden = false;
        avatarMonogram.style.display = "none";
        if (deleteProfileBtn) deleteProfileBtn.hidden = false;
    }

    function showAvatarMonogram() {
        if (!profilePreview || !avatarMonogram) return;
        profilePreview.hidden = true;
        profilePreview.removeAttribute("src");
        avatarMonogram.style.display = "";
        if (deleteProfileBtn) deleteProfileBtn.hidden = true;
    }

    try {
        const savedPhoto = localStorage.getItem(PHOTO_KEY);
        if (savedPhoto) showAvatarPhoto(savedPhoto);
    } catch (err) {}

    if (profileInput) {
        profileInput.addEventListener("change", () => {
            const file = profileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                showAvatarPhoto(e.target.result);
                try { localStorage.setItem(PHOTO_KEY, e.target.result); } catch (err) {}
            };
            reader.readAsDataURL(file);
        });
    }
    if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener("click", () => {
            showAvatarMonogram();
            try { localStorage.removeItem(PHOTO_KEY); } catch (err) {}
        });
    }

    /*=============================
        COPY TO CLIPBOARD
    =============================*/
    const copyToast = document.getElementById("copyToast");
    document.querySelectorAll("[data-copy]").forEach((el) => {
        el.addEventListener("click", (e) => {
            const value = el.dataset.copy;
            if (!value || !navigator.clipboard) return;
            e.preventDefault();
            navigator.clipboard.writeText(value).then(() => {
                if (copyToast) {
                    copyToast.textContent = `${value} disalin ke clipboard`;
                    copyToast.classList.add("is-active");
                    setTimeout(() => copyToast.classList.remove("is-active"), 2000);
                }
            }).catch(() => { window.location.href = el.href; });
        });
    });

    /*=============================
        AUDIO FEEDBACK SYSTEM (SFX)
        Lightweight Audio API wrapper for short UI sound effects.
        NOTE: no audio files are bundled with this delivery — each
        entry documents the kind of sound that fits that moment, so
        a short clip can be dropped in later without touching any
        other code. Missing/blocked files fail silently (try/catch +
        .catch on play()) so the UI never breaks if a file isn't
        present yet.
    =============================*/
    const SFX_MANIFEST = {
        // intro_swoosh: dimainkan sekali saat intro screen slide-up
        // membuka halaman utama — cocok dengan "whoosh" transisi
        // singkat & halus (~400-600ms), nada naik di akhir.
        intro_swoosh: { src: "assets/sfx/intro-swoosh.mp3", volume: 0.35 },
        // hover_click: dipakai luas di tombol/link/kartu — sangat
        // tipis & pendek, "soft click" / "subtle pop" (~80-120ms).
        hover_click: { src: "assets/sfx/hover-click.mp3", volume: 0.16 },
        // pin_trigger: dimainkan saat sebuah section terkunci (GSAP
        // ScrollTrigger pin dimulai) — "low-frequency hum / chime"
        // halus, jangan terlalu ramai karena bisa dipicu berulang.
        pin_trigger: { src: "assets/sfx/pin-trigger.mp3", volume: 0.22 },
        // card_open: saat sebuah kartu/modal terbuka (mis. lightbox
        // sertifikat) — "swoosh" pendek / "modern digital click-pop".
        card_open: { src: "assets/sfx/card-open.mp3", volume: 0.3 }
    };

    const sfxCache = {};
    let sfxEnabled = true;

    function playSFX(key) {
        if (!sfxEnabled) return;
        const def = SFX_MANIFEST[key];
        if (!def) return;
        try {
            let audio = sfxCache[key];
            if (!audio) {
                audio = new Audio(def.src);
                audio.volume = def.volume;
                sfxCache[key] = audio;
            }
            audio.currentTime = 0;
            audio.play().catch(() => { /* file belum ada / autoplay diblokir — abaikan */ });
        } catch (err) { /* Audio API tidak tersedia — abaikan */ }
    }

    function initSfxToggle() {
        const btn = document.getElementById("sfxToggle");
        if (!btn) return;
        const icon = btn.querySelector("i");

        function render() {
            btn.setAttribute("aria-pressed", String(sfxEnabled));
            btn.classList.toggle("is-muted", !sfxEnabled);
            if (icon) icon.className = sfxEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
            btn.setAttribute("aria-label", sfxEnabled ? "Matikan efek suara" : "Aktifkan efek suara");
        }
        render();

        btn.addEventListener("click", () => {
            sfxEnabled = !sfxEnabled;
            render();
        });
    }
    initSfxToggle();

    // hover_click SFX: attached broadly to clickable UI — soft/subtle
    // sound suggested in SFX_MANIFEST above.
    document.querySelectorAll(".btn, .nav-link, .project-card, .contact-card, .link-btn, .bento-cell, .cert-card").forEach((el) => {
        el.addEventListener("mouseenter", () => playSFX("hover_click"));
    });

    /*=============================
        CERTIFICATE INFINITE CAROUSEL
        Dynamically builds + clones certificate cards so the loop
        always feels full and seamless — whether there's 1
        certificate or 20. Add/remove entries in CERTIFICATES only;
        everything else (cloning, spacing, speed) adapts on its own.
    =============================*/
    const CERTIFICATES = [{
            title: "Belajar Dasar Pemrograman Web",
            issuer: "Dicoding Indonesia",
            date: "2025",
            img: "asset/img/cert-placeholder-1.jpg",
            desc: "Menyelesaikan kelas dasar HTML, CSS, dan JavaScript untuk membangun halaman web statis."
        },
        {
            title: "Sertifikat Kompetensi RPL",
            issuer: "LSP SMK Krian 1 Sidoarjo",
            date: "2025",
            img: "asset/img/cert-placeholder-2.jpg",
            desc: "Uji kompetensi keahlian Rekayasa Perangkat Lunak jenjang SMK."
        },
        {
            title: "Web Developer Intern",
            issuer: "Universitas Anwar Medika",
            date: "2026",
            img: "asset/img/cert-placeholder-3.jpg",
            desc: "Sertifikat penyelesaian Praktik Kerja Lapangan sebagai Web Developer Intern."
        }
        // Tambahkan objek baru di sini untuk menambah sertifikat —
        // carousel otomatis menyesuaikan jumlah kloningan.
    ];

    let certModalOpener = null;

    function buildCertCard(cert, idx) {
        const card = document.createElement("div");
        card.className = "cert-card";
        card.setAttribute("data-cursor", "hover");
        card.setAttribute("data-tilt", "");
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Lihat sertifikat ${cert.title}`);
        card.dataset.certIndex = String(idx);
        card.innerHTML =
            `<div class="cert-card-inner">` +
            `<div class="cert-thumb"><img src="${cert.img}" alt="Sertifikat ${cert.title}" loading="lazy"></div>` +
            `<div class="cert-meta"><h4>${cert.title}</h4><span>${cert.issuer} &middot; ${cert.date}</span></div>` +
            `</div>`;
        return card;
    }

    function openCertModal(idx, triggerEl) {
        const cert = CERTIFICATES[idx];
        if (!cert) return;
        const modal = document.getElementById("certModal");
        if (!modal) return;

        certModalOpener = triggerEl || null;
        document.getElementById("certModalImg").src = cert.img;
        document.getElementById("certModalImg").alt = "Sertifikat " + cert.title;
        document.getElementById("certModalIssuer").textContent = cert.issuer + " \u00b7 " + cert.date;
        document.getElementById("certModalTitle").textContent = cert.title;
        document.getElementById("certModalDesc").textContent = cert.desc;

        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        const closeBtn = document.getElementById("certModalClose");
        if (closeBtn) closeBtn.focus();

        // card_open SFX: modal terbuka — "swoosh / modern digital click"
        playSFX("card_open");
    }

    function closeCertModal() {
        const modal = document.getElementById("certModal");
        if (!modal || !modal.classList.contains("is-open")) return;
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        if (certModalOpener) certModalOpener.focus();
    }

    function attachCertCardEvents(container) {
        container.querySelectorAll(".cert-card").forEach((card) => {
            card.addEventListener("click", () => openCertModal(parseInt(card.dataset.certIndex, 10), card));
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openCertModal(parseInt(card.dataset.certIndex, 10), card);
                }
            });
        });
    }

    function initCertMarquee() {
        const wrapper = document.getElementById("certMarquee");
        const track = document.getElementById("certTrack");
        if (!wrapper || !track || !CERTIFICATES.length) return;

        const baseCards = CERTIFICATES.map((c, i) => buildCertCard(c, i));

        if (coarsePointer || reduceMotion) {
            // Mobile/touch + reduced-motion fallback: a plain swipeable
            // list instead of an auto-playing loop — lighter, and never
            // fights the page's natural scroll on a touch screen.
            wrapper.classList.add("cert-marquee--touch");
            track.innerHTML = "";
            baseCards.forEach((c) => track.appendChild(c));
            attachCertCardEvents(track);
            if (isFinePointer) attachTilt(Array.from(track.querySelectorAll("[data-tilt]")));
            if (window.attachCursorHooks) window.attachCursorHooks(track);
            return;
        }

        // Desktop: clone the base set enough times to comfortably cover
        // the viewport twice over, so the loop reads as continuous
        // regardless of whether there's 1 certificate or 20.
        const approxCardWidth = 282;
        const targetWidth = Math.max(window.innerWidth, 1400) * 2 + 600;
        const repeats = Math.max(Math.ceil(targetWidth / (baseCards.length * approxCardWidth)), 2);

        track.innerHTML = "";
        for (let half = 0; half < 2; half++) {
            for (let r = 0; r < repeats; r++) {
                baseCards.forEach((c) => track.appendChild(c.cloneNode(true)));
            }
        }

        attachCertCardEvents(track);
        attachTilt(Array.from(track.querySelectorAll("[data-tilt]")));
        if (window.attachCursorHooks) window.attachCursorHooks(track);
        attachFocusGroup(track, ".cert-card");

        let offset = 0;
        let hovering = false;
        let lastTime = null;
        const baseSpeed = 42; // px per second

        function frame(now) {
            if (lastTime === null) lastTime = now;
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            const currentSpeed = hovering ? baseSpeed * 0.25 : baseSpeed; // slow, not full stop, on hover
            offset -= currentSpeed * dt;
            const halfWidth = track.scrollWidth / 2;
            if (halfWidth > 0 && Math.abs(offset) >= halfWidth) offset += halfWidth;
            track.style.transform = `translate3d(${offset}px, 0, 0)`;
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);

        wrapper.addEventListener("mouseenter", () => { hovering = true; });
        wrapper.addEventListener("mouseleave", () => { hovering = false; });
    }
    initCertMarquee();

    const certModalOverlay = document.getElementById("certModalOverlay");
    const certModalCloseBtn = document.getElementById("certModalClose");
    if (certModalOverlay) certModalOverlay.addEventListener("click", closeCertModal);
    if (certModalCloseBtn) certModalCloseBtn.addEventListener("click", closeCertModal);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeCertModal();
    });

    /*=============================
        INITIALIZATION
    =============================*/
    function init() {
        onScroll();
        setActiveNav("home");
        moveJourneyIndicator(document.querySelector(".journey-tab.active"));
        if (gsapReady && window.ScrollTrigger) ScrollTrigger.refresh();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.addEventListener("resize", rafThrottle(() => {
        const activeNavLink = document.querySelector(".nav-link.active");
        if (activeNavLink) setActiveNav(activeNavLink.dataset.nav);
        moveJourneyIndicator(document.querySelector(".journey-tab.active"));
    }));

})();