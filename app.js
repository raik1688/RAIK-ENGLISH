/**
 * RAIK PORTFOLIO PRESENTATION PLAYER LOGIC (LIVE TEXT REVISION)
 * - Auto-scaling PowerPoint stage (16:9 ratio preservation)
 * - Keyboard / Mouse wheel / Touch swipe slider navigation
 * - Autoplay Slideshow & Fullscreen API
 * - Auto-hiding HUD controls on idle
 * - Canvas-based tech particle network animation on Slide 9 (Thank You)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 2. State Variables
    let currentSlide = 0;
    const totalSlides = 9;
    let isTransitioning = false;
    const transitionDuration = 700;
    
    let autoplayActive = false;
    let autoplayInterval = null;
    const autoplayDelay = 5000;

    // 3. DOM Elements
    const slideWrapper = document.getElementById('slideWrapper');
    const slides = document.querySelectorAll('.slide');
    const currentSlideNum = document.getElementById('currentSlideNum');
    const dotBtns = document.querySelectorAll('.dot-btn');
    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const fullscreenIcon = document.getElementById('fullscreenIcon');
    
    const hudHeader = document.querySelector('.hud-header');
    const hudControls = document.getElementById('hudControls');
    const navDots = document.getElementById('navDots');

    // Canvas variables and state (declared at top to avoid Temporal Dead Zone ReferenceError)
    const canvas1 = document.getElementById('slide1Canvas');
    let ctx1 = null;
    let canvasAnimationId1 = null;
    let particles1 = [];
    const maxParticles1 = 30;

    const canvas = document.getElementById('slide9Canvas');
    let ctx = null;
    let canvasAnimationId = null;
    let particles = [];
    const maxParticles = 45;

    // Slide 1 Orbit variables and state (declared at top to avoid Temporal Dead Zone ReferenceError)
    const rx = 270;
    const ry = 120;
    const tiltAngle = -10 * Math.PI / 180; // -10 degrees in radians
    const cosTilt = Math.cos(tiltAngle);
    const sinTilt = Math.sin(tiltAngle);
    let orbitAnimationId = null;
    let orbitAngle = 0;
    const centerX = 330; 
    const centerY = 315;

    // 4. Auto-scaling 16:9 Stage Layout
    function resizeStage() {
        const stages = document.querySelectorAll('.slide-stage');
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const baseWidth = 1280;
        const baseHeight = 714;
        
        // Calculate scale factor to fit either width or height
        const scaleX = windowWidth / baseWidth;
        const scaleY = windowHeight / baseHeight;
        const scale = Math.min(scaleX, scaleY);
        
        stages.forEach(stage => {
            stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
        });
    }

    window.addEventListener('resize', resizeStage);
    resizeStage(); // Run initially

    // Make Slide 1 active initially
    slides[0].classList.add('active');
    initSlide1Canvas(); // Run Slide 1 canvas particles initially
    startOrbitAnimation(); // Run Slide 1 orbits initially!

    // 5. Slide Glide Navigation Function
    function goToSlide(index) {
        if (isTransitioning) return;
        if (index < 0 || index >= totalSlides) return;
        if (index === currentSlide) return;

        isTransitioning = true;
        
        // Remove active class from previous slide
        slides[currentSlide].classList.remove('active');
        
        currentSlide = index;

        // Slide wrapper horizontal translate
        slideWrapper.style.transform = `translateX(-${currentSlide * 100}vw)`;

        // Add active class to new slide
        slides[currentSlide].classList.add('active');

        // Update Slide Count Indicator
        if (currentSlideNum) {
            currentSlideNum.textContent = currentSlide + 1;
        }

        // Update Navigation Dots
        dotBtns.forEach((dot, idx) => {
            if (idx === currentSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Invert HUD Colors for Slide 9 (Deep Blue)
        if (currentSlide === 8) {
            document.body.classList.add('slide-9-active');
            initSlide9Canvas(); // Trigger particle canvas on entering Slide 9
        } else {
            document.body.classList.remove('slide-9-active');
            stopSlide9Canvas();
        }

        // Manage Canvas Particles and Orbits for Slide 1
        if (currentSlide === 0) {
            initSlide1Canvas();
            startOrbitAnimation();
        } else {
            stopSlide1Canvas();
            stopOrbitAnimation();
        }

        // Reset transition lock
        setTimeout(() => {
            isTransitioning = false;
        }, transitionDuration);
    }

    // Prev/Next handlers
    function nextSlide() {
        if (currentSlide < totalSlides - 1) {
            goToSlide(currentSlide + 1);
        } else if (autoplayActive) {
            goToSlide(0); // Autoplay loops back to start
        }
    }

    function prevSlide() {
        if (currentSlide > 0) {
            goToSlide(currentSlide - 1);
        }
    }

    // Button controls
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);

    // Dot indicators clicks
    dotBtns.forEach(dot => {
        dot.addEventListener('click', () => {
            const slideIndex = parseInt(dot.getAttribute('data-go-to')) - 1;
            goToSlide(slideIndex);
            
            // Deactivate autoplay on manual click
            if (autoplayActive) {
                toggleAutoplay();
            }
        });
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        if (['Space', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.code)) {
            e.preventDefault();
        }

        switch (e.code) {
            case 'ArrowRight':
            case 'ArrowDown':
            case 'PageDown':
            case 'Space':
                nextSlide();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'PageUp':
                prevSlide();
                break;
            case 'Home':
                goToSlide(0);
                break;
            case 'End':
                goToSlide(totalSlides - 1);
                break;
        }
    });

    // Mouse Wheel scroll (Debounced fullpage scroll)
    let lastScrollTime = 0;
    const scrollCooldown = 800;

    window.addEventListener('wheel', (e) => {
        const currentTime = new Date().getTime();
        if (currentTime - lastScrollTime < scrollCooldown) return;

        if (e.deltaY > 20) {
            nextSlide();
            lastScrollTime = currentTime;
        } else if (e.deltaY < -20) {
            prevSlide();
            lastScrollTime = currentTime;
        }
    }, { passive: true });

    // Touch Swipe Controls (Mobile)
    let touchStartX = 0;
    let touchStartY = 0;
    const swipeThreshold = 50;

    window.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (diffX < 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    }, { passive: true });

    // 6. Autoplay Slideshow
    function toggleAutoplay() {
        autoplayActive = !autoplayActive;
        
        if (autoplayActive) {
            playBtn.classList.add('autoplay-active');
            playIcon.setAttribute('data-lucide', 'pause');
            autoplayInterval = setInterval(nextSlide, autoplayDelay);
        } else {
            playBtn.classList.remove('autoplay-active');
            playIcon.setAttribute('data-lucide', 'play');
            clearInterval(autoplayInterval);
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    if (playBtn) {
        playBtn.addEventListener('click', toggleAutoplay);
    }

    // 7. Fullscreen API Integration
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                fullscreenIcon.setAttribute('data-lucide', 'minimize');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }).catch(err => {
                console.error(`Error entering fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen().then(() => {
                fullscreenIcon.setAttribute('data-lucide', 'maximize');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            });
        }
    }

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            fullscreenIcon.setAttribute('data-lucide', 'maximize');
            if (typeof lucide !== 'undefined') lucide.createIcons();
            document.body.classList.remove('fullscreen-hide-cursor');
        }
    });

    // 8. Auto-Hiding HUD Overlay on Mouse Idle
    let hudTimeout;
    const idleTime = 3000;

    function showHUD() {
        hudHeader.classList.remove('hud-fade-out');
        hudControls.classList.remove('hud-fade-out');
        navDots.classList.remove('hud-fade-out');
        document.body.classList.remove('fullscreen-hide-cursor');

        clearTimeout(hudTimeout);
        hudTimeout = setTimeout(hideHUD, idleTime);
    }

    function hideHUD() {
        // Do not hide HUD if hover over UI items
        if (document.querySelector('.hud-controls-panel:hover') || document.querySelector('.nav-dots:hover')) {
            return;
        }
        
        hudHeader.classList.add('hud-fade-out');
        hudControls.classList.add('hud-fade-out');
        navDots.classList.add('hud-fade-out');

        if (document.fullscreenElement) {
            document.body.classList.add('fullscreen-hide-cursor');
        }
    }

    window.addEventListener('mousemove', showHUD);
    window.addEventListener('mousedown', showHUD);
    window.addEventListener('keydown', showHUD);
    window.addEventListener('touchstart', showHUD);
    showHUD();

    // 9. Slide 1: Canvas Sci-Fi Particle Network Effect (Soft Blue)
    function initSlide1Canvas() {
        if (!canvas1) return;
        ctx1 = canvas1.getContext('2d');
        
        // Match canvas to slide stage actual dimensions
        const stage = canvas1.closest('.slide-stage');
        canvas1.width = stage.clientWidth;
        canvas1.height = stage.clientHeight;
        
        particles1 = [];
        for (let i = 0; i < maxParticles1; i++) {
            particles1.push({
                x: Math.random() * canvas1.width,
                y: Math.random() * canvas1.height,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.25) * 0.25, // drift upwards slightly
                radius: Math.random() * 2.5 + 1
            });
        }
        
        if (canvasAnimationId1) cancelAnimationFrame(canvasAnimationId1);
        animateParticles1();
    }

    function stopSlide1Canvas() {
        if (canvasAnimationId1) {
            cancelAnimationFrame(canvasAnimationId1);
            canvasAnimationId1 = null;
        }
    }

    function animateParticles1() {
        if (!ctx1) return;
        ctx1.clearRect(0, 0, canvas1.width, canvas1.height);
        
        // Draw particle nodes
        particles1.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            // Bounce off edges
            if (p.x < 0 || p.x > canvas1.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas1.height) p.vy *= -1;
            
            ctx1.beginPath();
            ctx1.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx1.fillStyle = 'rgba(79, 70, 229, 0.25)';
            ctx1.fill();
        });
        
        // Draw connection lines
        ctx1.lineWidth = 0.5;
        for (let i = 0; i < particles1.length; i++) {
            for (let j = i + 1; j < particles1.length; j++) {
                const p1 = particles1[i];
                const p2 = particles1[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 130) {
                    const alpha = (1 - (dist / 130)) * 0.12;
                    ctx1.strokeStyle = `rgba(79, 70, 229, ${alpha})`;
                    ctx1.beginPath();
                    ctx1.moveTo(p1.x, p1.y);
                    ctx1.lineTo(p2.x, p2.y);
                    ctx1.stroke();
                }
            }
        }
        
        canvasAnimationId1 = requestAnimationFrame(animateParticles1);
    }

    // 10. Slide 1 Dynamic Planetary Orbiting Nodes Animation (Single Tilted Orbit Ring)
    function updateOrbits(angle) {
        const orbitNodes = document.querySelectorAll('.slide[data-slide-index="1"] .slide1-orbit-node');
        const numNodes = orbitNodes.length;
        if (numNodes === 0) return;
        
        orbitNodes.forEach((node, idx) => {
            // Space nodes evenly by 360 / numNodes degrees
            const initialAngle = idx * (2 * Math.PI / numNodes);
            const currentAngle = angle + initialAngle;
            
            // Calculate coordinates on the standard ellipse
            const xVal = rx * Math.cos(currentAngle);
            const yVal = ry * Math.sin(currentAngle);
            
            // Rotate the coordinates by tiltAngle
            const dx = xVal * cosTilt - yVal * sinTilt;
            const dy = xVal * sinTilt + yVal * cosTilt;
            
            // 3D scale and opacity based on the sine of the angle (foreground vs background)
            const sinVal = Math.sin(currentAngle);
            const scale = 0.925 + 0.175 * sinVal; // scale between 0.75 and 1.10
            const opacity = 0.75 + 0.25 * sinVal; // opacity between 0.50 and 1.00
            
            // zIndex: 1 for background (behind laptop), 5 for foreground
            const zIndex = sinVal < 0 ? 1 : 5;
            
            // Calculate pixel offsets from center of container (accounting for half-width/height of node)
            const tx = centerX + dx - 34;
            const ty = centerY + dy - 55;
            
            // Apply GPU-accelerated transform: translate3d and scale
            node.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
            node.style.opacity = opacity.toFixed(3);
            node.style.zIndex = zIndex;
        });
    }

    function animateOrbits() {
        orbitAngle += 0.005; // Smooth incremental angle change per frame
        updateOrbits(orbitAngle);
        orbitAnimationId = requestAnimationFrame(animateOrbits);
    }

    function startOrbitAnimation() {
        if (!orbitAnimationId) {
            animateOrbits();
        }
    }

    function stopOrbitAnimation() {
        if (orbitAnimationId) {
            cancelAnimationFrame(orbitAnimationId);
            orbitAnimationId = null;
        }
    }

    // Initialize static positions at startup
    updateOrbits(0);

    // 11. Slide 9: Canvas Sci-Fi Particle Network Effect
    function initSlide9Canvas() {
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        
        // Match canvas to slide stage actual dimensions
        const stage = canvas.closest('.slide-stage');
        canvas.width = stage.clientWidth;
        canvas.height = stage.clientHeight;
        
        particles = [];
        for (let i = 0; i < maxParticles; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                radius: Math.random() * 2 + 1
            });
        }
        
        if (canvasAnimationId) cancelAnimationFrame(canvasAnimationId);
        animateParticles();
    }

    function stopSlide9Canvas() {
        if (canvasAnimationId) {
            cancelAnimationFrame(canvasAnimationId);
            canvasAnimationId = null;
        }
    }

    function animateParticles() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw particle nodes
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            // Bounce off edges
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();
        });
        
        // Draw connection lines
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 120) {
                    const alpha = (1 - (dist / 120)) * 0.15;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
        
        canvasAnimationId = requestAnimationFrame(animateParticles);
    }

    // 11. Visitor Location Tracker (Google Sheets Web App integration)
    // Please replace with your Google Apps Script Web App URL to enable writing to Google Sheet
    const TRACKING_URL = "https://script.google.com/macros/s/AKfycbwd4xjNhwhasku3Y_5IefEQnPZMNCwg5b3R2T-8etiwnciVXIz1THTA6hGvxiKOXXQN/exec"; 

    function trackVisitor() {
        if (!TRACKING_URL) {
            console.log("Visitor tracking is active but TRACKING_URL is empty. Set your Google Apps Script URL in app.js to record visits.");
            return;
        }
        
        try {
            // Fetch public IP and geographic data from freeipapi.com
            fetch("https://freeipapi.com/api/json")
                .then(res => {
                    if (!res.ok) throw new Error("Network response was not ok");
                    return res.json();
                })
                .then(data => {
                    const payload = {
                        ip: data.ipAddress || "Unknown",
                        country: data.countryName || "Unknown",
                        region: data.regionName || "Unknown",
                        city: data.cityName || "Unknown",
                        org: data.asnOrganization || data.isp || "Unknown", // Chunghwa Telecom, etc.
                        latitude: data.latitude || "Unknown",
                        longitude: data.longitude || "Unknown",
                        userAgent: navigator.userAgent,
                        referer: document.referrer || "Direct"
                    };
                    
                    // POST visitor data to the Google Apps Script Web App
                    return fetch(TRACKING_URL, {
                        method: "POST",
                        mode: "no-cors",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                })
                .then(() => {
                    console.log("Visitor information recorded successfully.");
                })
                .catch(err => {
                    console.warn("Visitor tracking failed or API limits exceeded:", err.message);
                });
        } catch (e) {
            console.warn("Visitor tracking failed synchronously:", e.message);
        }
    }

    // Trigger Visitor Tracking at the very end of DOMContentLoaded to prevent any loading blockages
    try {
        trackVisitor();
    } catch (e) {
        console.warn("Failed to initiate visitor tracking:", e.message);
    }
});
