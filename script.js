document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================================
    // SELECTIONS & STATE CONSTANTS
    // ==========================================================================
    const slides = document.querySelectorAll(".slide");
    const totalSlides = slides.length;
    let currentSlideIndex = 1;

    // HUD Elements
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const slideCounter = document.querySelector(".slide-counter");
    const slideDotsContainer = document.getElementById("slide-dots");
    const notesBtn = document.getElementById("notes-btn");
    const themeBtn = document.getElementById("theme-btn");
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    const helpBtn = document.getElementById("help-btn");
    const progressBar = document.getElementById("progress-bar");

    // Speaker Notes Drawer Elements
    const notesDrawer = document.getElementById("speaker-notes-drawer");
    const closeNotesBtn = document.getElementById("close-notes-btn");
    const notesSlideNum = document.getElementById("notes-slide-num");
    const notesText = document.getElementById("notes-text");
    const speakerNotesText = document.getElementById("speaker-notes-text");
    const notesZoomIn = document.getElementById("notes-zoom-in");
    const notesZoomOut = document.getElementById("notes-zoom-out");
    let notesFontSize = 0.95; // rem

    // Lightbox Elements
    const lightbox = document.getElementById("image-lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");
    const lightboxClose = document.getElementById("lightbox-close");

    // Help Modal Elements
    const helpModal = document.getElementById("help-modal");
    const closeHelpBtn = document.getElementById("close-help-btn");
    const closeHelpOk = document.getElementById("close-help-ok");

    // Slider Elements (Slide 8)
    const sliderContainer = document.getElementById("suitability-comparison");
    const sliderOverlay = document.getElementById("slider-overlay");
    const sliderHandle = document.getElementById("slider-handle");
    const overlayImg = sliderOverlay ? sliderOverlay.querySelector(".overlay-img") : null;
    let isDraggingSlider = false;

    // Touch Swipe State
    let touchStartX = 0;
    let touchEndX = 0;

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    
    // Create navigation dots dynamically
    function initDots() {
        slideDotsContainer.innerHTML = "";
        for (let i = 1; i <= totalSlides; i++) {
            const dot = document.createElement("button");
            dot.classList.add("slide-dot");
            if (i === 1) dot.classList.add("active");
            dot.setAttribute("data-slide", i);
            dot.setAttribute("title", `Go to Slide ${i}`);
            dot.addEventListener("click", () => goToSlide(i));
            slideDotsContainer.appendChild(dot);
        }
    }

    // Set Theme on load
    function initTheme() {
        const savedTheme = localStorage.getItem("presentation-theme") || "dark";
        document.documentElement.setAttribute("data-theme", savedTheme);
    }

    // ==========================================================================
    // CORE SLIDE NAVIGATION NAVIGATION
    // ==========================================================================
    function goToSlide(index) {
        // Clamp bounds
        if (index < 1) index = 1;
        if (index > totalSlides) index = totalSlides;

        // Transition slide active classes
        slides.forEach((slide, i) => {
            const slideNum = i + 1;
            slide.classList.remove("active", "previous");
            
            if (slideNum === index) {
                slide.classList.add("active");
            } else if (slideNum < index) {
                slide.classList.add("previous");
            }
        });

        currentSlideIndex = index;

        // Update HUD
        slideCounter.textContent = `Slide ${currentSlideIndex} of ${totalSlides}`;
        
        // Update Dots
        const dots = document.querySelectorAll(".slide-dot");
        dots.forEach((dot, i) => {
            if (i + 1 === currentSlideIndex) {
                dot.classList.add("active");
            } else {
                dot.classList.remove("active");
            }
        });

        // Update Progress Bar
        const progressPercent = totalSlides > 1 ? ((currentSlideIndex - 1) / (totalSlides - 1)) * 100 : 0;
        progressBar.style.width = `${progressPercent}%`;

        // Update Speaker Notes Drawer Content
        updateSpeakerNotes();

        // Update Nav button states
        prevBtn.disabled = currentSlideIndex === 1;
        nextBtn.disabled = currentSlideIndex === totalSlides;

        // Special handling for Slide 8 comparison slider sizing
        if (currentSlideIndex === 8) {
            // Tiny delay to allow slide to become visible and layouts to evaluate
            setTimeout(resizeSliderOverlayImage, 100);
        }
    }

    function nextSlide() {
        if (currentSlideIndex < totalSlides) {
            goToSlide(currentSlideIndex + 1);
        }
    }

    function prevSlide() {
        if (currentSlideIndex > 1) {
            goToSlide(currentSlideIndex - 1);
        }
    }

    // ==========================================================================
    // SPEAKER NOTES SYSTEM
    // ==========================================================================
    function updateSpeakerNotes() {
        const activeSlide = document.querySelector(`.slide[data-slide-index="${currentSlideIndex}"]`);
        if (activeSlide) {
            const notesSource = activeSlide.querySelector(".speaker-notes-content");
            notesSlideNum.textContent = currentSlideIndex;
            if (notesSource) {
                speakerNotesText.innerHTML = notesSource.innerHTML.trim();
            } else {
                speakerNotesText.textContent = "No speaker notes available for this slide.";
            }
        }
    }

    function toggleSpeakerNotes() {
        notesDrawer.classList.toggle("hidden");
        // Store user preference
        const isVisible = !notesDrawer.classList.contains("hidden");
        localStorage.setItem("presentation-notes-visible", isVisible);
    }

    // Font resizing for speaker notes
    notesZoomIn.addEventListener("click", () => {
        if (notesFontSize < 1.8) {
            notesFontSize += 0.1;
            speakerNotesText.style.fontSize = `${notesFontSize}rem`;
        }
    });

    notesZoomOut.addEventListener("click", () => {
        if (notesFontSize > 0.7) {
            notesFontSize -= 0.1;
            speakerNotesText.style.fontSize = `${notesFontSize}rem`;
        }
    });

    // Load speaker notes visibility preference
    function initNotesVisibility() {
        const isVisible = localStorage.getItem("presentation-notes-visible") === "true";
        if (isVisible) {
            notesDrawer.classList.remove("hidden");
        } else {
            notesDrawer.classList.add("hidden");
        }
    }

    // ==========================================================================
    // INTERACTIVE IMAGE COMPARISON SLIDER (SLIDE 8)
    // ==========================================================================
    
    // Ensure overlay image width perfectly matches the container width even when resized
    function resizeSliderOverlayImage() {
        if (sliderContainer && overlayImg) {
            const containerWidth = sliderContainer.offsetWidth;
            overlayImg.style.width = `${containerWidth}px`;
        }
    }

    // Calculate slider position based on cursor/touch events
    function updateSliderPosition(clientX) {
        if (!sliderContainer || !sliderOverlay || !sliderHandle) return;
        
        const rect = sliderContainer.getBoundingClientRect();
        let posX = clientX - rect.left;
        
        // Clamp position within container bounds
        if (posX < 0) posX = 0;
        if (posX > rect.width) posX = rect.width;
        
        const percentage = (posX / rect.width) * 100;
        
        sliderOverlay.style.width = `${percentage}%`;
        sliderHandle.style.left = `${percentage}%`;
    }

    function setupComparisonSlider() {
        if (!sliderContainer || !sliderHandle) return;

        // Mouse Down
        sliderHandle.addEventListener("mousedown", (e) => {
            isDraggingSlider = true;
            e.preventDefault();
        });

        // Touch Start
        sliderHandle.addEventListener("touchstart", (e) => {
            isDraggingSlider = true;
        }, { passive: true });

        // Global Mouse Move / Up (to handle dragging outside slider container)
        window.addEventListener("mousemove", (e) => {
            if (!isDraggingSlider) return;
            updateSliderPosition(e.clientX);
        });

        window.addEventListener("mouseup", () => {
            isDraggingSlider = false;
        });

        // Global Touch Move / End
        window.addEventListener("touchmove", (e) => {
            if (!isDraggingSlider) return;
            if (e.touches && e.touches[0]) {
                updateSliderPosition(e.touches[0].clientX);
            }
        }, { passive: false });

        window.addEventListener("touchend", () => {
            isDraggingSlider = false;
        });

        // Click anywhere on container to move slider directly
        sliderContainer.addEventListener("click", (e) => {
            if (e.target !== sliderHandle && !sliderHandle.contains(e.target)) {
                updateSliderPosition(e.clientX);
            }
        });

        // Resize observer to keep slider overlay image aligned during browser scaling
        window.addEventListener("resize", resizeSliderOverlayImage);
    }

    // ==========================================================================
    // LIGHTBOX SYSTEM (IMAGE ZOOM)
    // ==========================================================================
    function setupLightbox() {
        const triggers = document.querySelectorAll(".lightbox-trigger");
        
        triggers.forEach(trigger => {
            trigger.addEventListener("click", () => {
                const wrapper = trigger.closest(".image-container-wrapper");
                const caption = wrapper ? wrapper.getAttribute("data-caption") : "";
                
                lightboxImg.src = trigger.src;
                lightboxCaption.textContent = caption || trigger.alt;
                lightbox.classList.remove("hidden");
            });
        });

        // Close functions
        const closeLightbox = () => {
            lightbox.classList.add("hidden");
            lightboxImg.src = "";
        };

        lightboxClose.addEventListener("click", closeLightbox);
        lightbox.addEventListener("click", (e) => {
            if (e.target === lightbox || e.target.classList.contains("lightbox-content-wrapper")) {
                closeLightbox();
            }
        });
    }

    // ==========================================================================
    // KEYBOARD NAVIGATION & SHORTCUTS HELP MODAL
    // ==========================================================================
    
    // Toggle theme function
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", nextTheme);
        localStorage.setItem("presentation-theme", nextTheme);
    }

    // Toggle fullscreen mode
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    // Toggle Keyboard Guide
    function toggleHelpModal() {
        helpModal.classList.toggle("hidden");
    }

    // Global Keydown Handler
    function handleKeyDown(e) {
        // Ignore key presses when typing in input fields (if any exist)
        if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
            return;
        }

        switch (e.key) {
            // Next Slide
            case "ArrowRight":
            case "ArrowDown":
            case "PageDown":
                nextSlide();
                break;
            case " ": // Space
                if (e.shiftKey) {
                    prevSlide();
                } else {
                    nextSlide();
                }
                e.preventDefault(); // Prevent page scroll
                break;

            // Previous Slide
            case "ArrowLeft":
            case "ArrowUp":
            case "PageUp":
                prevSlide();
                break;

            // Jump Boundaries
            case "Home":
                goToSlide(1);
                break;
            case "End":
                goToSlide(totalSlides);
                break;

            // Utilities
            case "n":
            case "N":
                toggleSpeakerNotes();
                break;
            case "t":
            case "T":
                toggleTheme();
                break;
            case "f":
            case "F":
                toggleFullscreen();
                break;
            case "?":
                toggleHelpModal();
                break;

            // Escape
            case "Escape":
                if (!lightbox.classList.contains("hidden")) {
                    lightbox.classList.add("hidden");
                    lightboxImg.src = "";
                } else if (!helpModal.classList.contains("hidden")) {
                    helpModal.classList.add("hidden");
                }
                break;
        }
    }

    // ==========================================================================
    // TOUCH GESTURE NAVIGATION (SWIPES)
    // ==========================================================================
    function setupTouchSwipe() {
        const container = document.getElementById("presentation-container");
        if (!container) return;

        container.addEventListener("touchstart", (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        container.addEventListener("touchend", (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }

    function handleSwipe() {
        const swipeThreshold = 50; // pixels
        const diff = touchEndX - touchStartX;

        // Skip swipes if we are dragging the image slider on Slide 8
        if (currentSlideIndex === 8 && isDraggingSlider) return;

        if (diff < -swipeThreshold) {
            // Swipe Left -> Next Slide
            nextSlide();
        } else if (diff > swipeThreshold) {
            // Swipe Right -> Prev Slide
            prevSlide();
        }
    }

    // ==========================================================================
    // EVENT BINDINGS
    // ==========================================================================
    
    // Bottom HUD controls
    prevBtn.addEventListener("click", prevSlide);
    nextBtn.addEventListener("click", nextSlide);
    notesBtn.addEventListener("click", toggleSpeakerNotes);
    themeBtn.addEventListener("click", toggleTheme);
    fullscreenBtn.addEventListener("click", toggleFullscreen);
    helpBtn.addEventListener("click", toggleHelpModal);
    
    // Notes drawer controls
    closeNotesBtn.addEventListener("click", () => notesDrawer.classList.add("hidden"));
    
    // Help Modal controls
    closeHelpBtn.addEventListener("click", () => helpModal.classList.add("hidden"));
    closeHelpOk.addEventListener("click", () => helpModal.classList.add("hidden"));
    helpModal.addEventListener("click", (e) => {
        if (e.target === helpModal) {
            helpModal.classList.add("hidden");
        }
    });

    // Keyboard & Swipes
    window.addEventListener("keydown", handleKeyDown);
    setupTouchSwipe();

    // Setup Modals and Slider
    setupLightbox();
    setupComparisonSlider();

    // ==========================================================================
    // CORE RUN & STARTUP
    // ==========================================================================
    initDots();
    initTheme();
    initNotesVisibility();
    goToSlide(1);
});
