/*=========================================================================
    DAVIN.SCI — PORTFOLIO SCRIPT
    Vanilla JS + GSAP / ScrollTrigger. Every effect below degrades safely:
    if GSAP fails to load or the user prefers reduced motion, content
    still renders and stays fully usable — only the motion is skipped.
=========================================================================*/
(() => {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    const gsapReady = typeof window.gsap !== "undefined";

    if (gsapReady && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
    }

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
        PRELOADER
    =============================*/
    const loader = document.getElementById("loader");
    const loaderProgress = document.getElementById("loaderProgress");
    const loaderLine = document.getElementById("loaderLine");

    function runLoaderCosmetics() {
        const messages = ["booting_system", "compiling_ui", "davin.sci ready"];
        let step = 0;
        if (loaderLine) {
            const msgTimer = setInterval(() => {
                step++;
                if (step < messages.length) loaderLine.textContent = messages[step];
                if (step >= messages.length - 1) clearInterval(msgTimer);
            }, 420);
        }
        if (loaderProgress) {
            requestAnimationFrame(() => { loaderProgress.style.width = "100%"; });
        }
    }
    runLoaderCosmetics();

    let heroStarted = false;

    function hidePreloader() {
        if (loader && !loader.classList.contains("is-hidden")) {
            loader.classList.add("is-hidden");
        }
        startHeroSequence();
    }

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
        }
    }

    // Failsafe: never let the preloader block the site for more than 4.5s
    window.addEventListener("load", () => setTimeout(hidePreloader, 700));
    setTimeout(hidePreloader, 4500);

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

        document.querySelectorAll('[data-cursor="hover"]').forEach((el) => {
            el.addEventListener("mouseenter", () => cursorRing.classList.add("is-hover"));
            el.addEventListener("mouseleave", () => cursorRing.classList.remove("is-hover"));
        });
        document.querySelectorAll('[data-cursor="link"]').forEach((el) => {
            el.addEventListener("mouseenter", () => cursorRing.classList.add("is-link"));
            el.addEventListener("mouseleave", () => cursorRing.classList.remove("is-link"));
        });
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
        SPOTLIGHT GLOW (bento cells + contact cards)
    =============================*/
    if (isFinePointer) {
        document.querySelectorAll(".bento-cell, .contact-card").forEach((cell) => {
            cell.addEventListener("mousemove", rafThrottle((e) => {
                const rect = cell.getBoundingClientRect();
                cell.style.setProperty("--mx", `${e.clientX - rect.left}px`);
                cell.style.setProperty("--my", `${e.clientY - rect.top}px`);
            }));
        });
    }

    /*=============================
        3D TILT (project cards)
    =============================*/
    if (isFinePointer) {
        document.querySelectorAll("[data-tilt]").forEach((card) => {
            const maxTilt = 9;
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
        });
    });

    /*=============================
        SCROLL STATE — navbar / back-to-top / progress bar
        (kept independent of GSAP so core chrome always works)
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

    if (topButton) {
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
        SCROLL REVEALS (GSAP ScrollTrigger)
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
        AVATAR (optional local preview — personal to each visitor's browser)
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
    } catch (err) { /* localStorage unavailable — ignore */ }

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
        COPY-TO-CLIPBOARD (email contact card)
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
        INIT — runs once DOM is ready
    =============================*/
    function init() {
        onScroll();
        setActiveNav("home");
        moveJourneyIndicator(document.querySelector(".journey-tab.active"));
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