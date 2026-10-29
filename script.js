"use strict";

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const themeStorageKey = "jasada_site_theme";
  const savedTheme = localStorage.getItem(themeStorageKey);
  document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";

  const nav = document.querySelector(".site-nav");
  if (nav) {
    const themeToggle = document.createElement("button");
    themeToggle.className = "theme-toggle";
    themeToggle.type = "button";
    themeToggle.innerHTML = '<span class="theme-toggle-icon theme-toggle-sun" aria-hidden="true">☀️</span><span class="theme-toggle-icon theme-toggle-moon" aria-hidden="true">🌙</span>';

    const updateThemeToggle = () => {
      const isDark = document.documentElement.dataset.theme === "dark";
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", isDark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด");
      themeToggle.title = isDark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด";
    };

    updateThemeToggle();
    themeToggle.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem(themeStorageKey, nextTheme);
      updateThemeToggle();
    });
    nav.append(themeToggle);
  }

  if (!reducedMotion) {
    document.body.classList.add("page-entering");
    window.setTimeout(() => document.body.classList.remove("page-entering"), 400);
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a");
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download")) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target && link.target !== "_self") return;

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;

      event.preventDefault();
      document.body.classList.add("page-exiting");
      window.setTimeout(() => window.location.assign(destination.href), 180);
    });
  }

  const scrollToTopButton = document.createElement("button");
  scrollToTopButton.className = "scroll-to-top";
  scrollToTopButton.type = "button";
  scrollToTopButton.setAttribute("aria-label", "กลับขึ้นไปด้านบน");
  scrollToTopButton.setAttribute("aria-hidden", "true");
  scrollToTopButton.disabled = true;
  scrollToTopButton.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.append(scrollToTopButton);

  let scrollToTopFrame = 0;
  const updateScrollToTop = () => {
    if (scrollToTopFrame) return;
    scrollToTopFrame = requestAnimationFrame(() => {
      const isVisible = window.scrollY > 420;
      scrollToTopButton.classList.toggle("is-visible", isVisible);
      scrollToTopButton.setAttribute("aria-hidden", String(!isVisible));
      scrollToTopButton.disabled = !isVisible;
      scrollToTopFrame = 0;
    });
  };
  window.addEventListener("scroll", updateScrollToTop, { passive: true });
  updateScrollToTop();
  scrollToTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });

  const typingText = document.querySelector(".typing-text[data-typing-text]");
  if (typingText instanceof HTMLElement) {
    const fullText = typingText.dataset.typingText;
    if (reducedMotion || !fullText) {
      typingText.textContent = fullText || "";
      typingText.classList.add("typing-complete");
    } else {
      const characters = "Segmenter" in Intl
        ? Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(fullText), (part) => part.segment)
        : Array.from(fullText);
      let characterIndex = 0;
      typingText.textContent = "";
      const typingInterval = window.setInterval(() => {
        typingText.textContent += characters[characterIndex];
        characterIndex += 1;
        if (characterIndex >= characters.length) {
          window.clearInterval(typingInterval);
          typingText.classList.add("typing-complete");
        }
      }, 95);
    }
  }

  const ageCounters = document.querySelectorAll(".age-counter[data-counter]");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    ageCounters.forEach((counter) => {
      counter.textContent = counter.dataset.counter || "0";
    });
  } else {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const counter = entry.target;
        const target = Number(counter.dataset.counter);
        if (!Number.isFinite(target) || target < 0) {
          observer.unobserve(counter);
          return;
        }

        const duration = 900;
        const startTime = performance.now();
        counter.textContent = "0";
        const updateCounter = (currentTime) => {
          const progress = Math.min(1, (currentTime - startTime) / duration);
          counter.textContent = String(Math.round(target * (1 - (1 - progress) ** 3)));
          if (progress < 1) requestAnimationFrame(updateCounter);
        };
        requestAnimationFrame(updateCounter);
        observer.unobserve(counter);
      });
    }, { threshold: 0.2 });
    ageCounters.forEach((counter) => counterObserver.observe(counter));
  }

  document.querySelectorAll(".address-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const isFlipped = chip.classList.toggle("is-flipped");
      chip.setAttribute("aria-pressed", String(isFlipped));
      chip.querySelector(".address-chip-front")?.setAttribute("aria-hidden", String(isFlipped));
      chip.querySelector(".address-chip-back")?.setAttribute("aria-hidden", String(!isFlipped));
    });
  });

  if (!reducedMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    const addReveal = (element, direction) => {
      element.classList.add("scroll-reveal");
      element.dataset.revealDirection = direction;
      revealObserver.observe(element);
    };

    const revealInAlternatingDirections = (selector) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        addReveal(element, index % 2 === 0 ? "left" : "right");
        element.style.setProperty("--reveal-delay", `${(index % 6) * 55}ms`);
        if (element.matches(".home-skill-card")) {
          element.querySelectorAll(".profile-tags li").forEach((tag, tagIndex) => {
            tag.style.setProperty("--skill-delay", `${tagIndex * 75}ms`);
          });
        }
      });
    };

    document.querySelectorAll(".hero-copy, .education-heading, .activity-header, .content-page > .page-heading, .works-heading > .page-heading, .profile-address-section, .address-info-card")
      .forEach((element) => addReveal(element, "left"));
    document.querySelectorAll(".hero-image-frame, .profile-photo-column, .works-controls, .address-map-card")
      .forEach((element) => addReveal(element, "right"));
    revealInAlternatingDirections(".home-skill-card, .profile-item, .activity-card");
    revealInAlternatingDirections(".work-card, .works-empty-state");

    const educationTimeline = document.querySelector(".education-timeline");
    if (educationTimeline) {
      educationTimeline.querySelectorAll(".education-item").forEach((item, index) => {
        item.style.setProperty("--timeline-delay", `${index * 180}ms`);
      });
      const timelineObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.2 });
      timelineObserver.observe(educationTimeline);
    }

    const worksGrid = document.getElementById("works-grid");
    if (worksGrid) {
      const worksObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node.matches(".work-card, .works-empty-state")) {
              const index = Array.from(worksGrid.children).indexOf(node);
              addReveal(node, index % 2 === 0 ? "left" : "right");
              if (node.matches(".work-card")) {
                node.classList.add("has-spotlight");
                node.addEventListener("pointermove", (event) => {
                  const bounds = node.getBoundingClientRect();
                  node.style.setProperty("--card-px", `${event.clientX - bounds.left}px`);
                  node.style.setProperty("--card-py", `${event.clientY - bounds.top}px`);
                });
              }
            }
          });
        });
      });
      worksObserver.observe(worksGrid, { childList: true });
    }

    document.documentElement.classList.add("has-motion");
  }

  const scrollProgress = document.createElement("div");
  scrollProgress.className = "scroll-progress";
  scrollProgress.setAttribute("aria-hidden", "true");
  document.body.append(scrollProgress);

  let progressFrame = 0;
  const updateScrollProgress = () => {
    if (progressFrame) return;
    progressFrame = requestAnimationFrame(() => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
      scrollProgress.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
      progressFrame = 0;
    });
  };
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress);
  updateScrollProgress();

  if (!reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const tiltTargets = document.querySelectorAll(".hero-image-frame, .home-skill-card, .education-card, .work-card, .profile-photo-frame");
    tiltTargets.forEach((target) => {
      target.addEventListener("pointermove", (event) => {
        const bounds = target.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        target.style.setProperty("--tilt-x", `${x * 7}deg`);
        target.style.setProperty("--tilt-y", `${y * -7}deg`);
      });
      target.addEventListener("pointerleave", () => {
        target.style.setProperty("--tilt-x", "0deg");
        target.style.setProperty("--tilt-y", "0deg");
      });
    });

    const spotlightCards = document.querySelectorAll(
      ".home-skill-card, .education-card, .work-card, .profile-item, .address-info-card, .address-map-card, .activity-card"
    );
    spotlightCards.forEach((card) => {
      card.classList.add("has-spotlight");
      card.addEventListener("pointermove", (event) => {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty("--card-px", `${event.clientX - bounds.left}px`);
        card.style.setProperty("--card-py", `${event.clientY - bounds.top}px`);
      });
    });

    window.addEventListener("pointermove", (event) => {
      document.body.style.setProperty("--pointer-x", `${event.clientX}px`);
      document.body.style.setProperty("--pointer-y", `${event.clientY}px`);
    }, { passive: true });
  }

  const activityImageDialog = document.getElementById("activity-image-dialog");
  const activityDialogImage = document.getElementById("activity-dialog-image");
  const activityDialogCaption = document.getElementById("activity-dialog-caption");
  const activityImageClose = document.getElementById("activity-image-close");

  if (
    activityImageDialog instanceof HTMLDialogElement
    && activityDialogImage instanceof HTMLImageElement
    && activityDialogCaption instanceof HTMLElement
  ) {
    const openActivityImage = (photo) => {
      const image = photo.querySelector("img");
      if (!image) return;

      activityDialogImage.src = image.currentSrc || image.src;
      activityDialogImage.alt = image.alt;
      activityDialogCaption.textContent = photo.querySelector("figcaption")?.textContent ?? image.alt;
      activityImageDialog.showModal();
      activityImageClose?.focus();
    };

    document.querySelectorAll(".activity-photo").forEach((photo) => {
      const image = photo.querySelector("img");
      if (!(image instanceof HTMLImageElement)) return;

      photo.setAttribute("role", "button");
      photo.setAttribute("aria-label", `ดูรูปขนาดใหญ่: ${image.alt}`);
      photo.addEventListener("click", () => openActivityImage(photo));
      photo.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openActivityImage(photo);
      });
    });

    activityImageClose?.addEventListener("click", () => activityImageDialog.close());
    activityImageDialog.addEventListener("click", (event) => {
      if (event.target === activityImageDialog) activityImageDialog.close();
    });
    activityImageDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      activityImageDialog.close();
    });
    activityImageDialog.addEventListener("close", () => {
      activityDialogImage.removeAttribute("src");
    });
  }

  document.addEventListener("copy", (event) => {
    const target = event.target;
    const isEditable = target instanceof HTMLElement
      && (target.isContentEditable || target.matches("input, textarea") || Boolean(target.closest(".profile-address-section, .profile-item")));
    if (!isEditable) event.preventDefault();
  });

  document.addEventListener("dragstart", (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });

  document.addEventListener("contextmenu", (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });

  const navLinks = nav ? Array.from(nav.querySelectorAll(".site-nav > .nav-link, .nav-dropdown-link")) : [];
  const activeNavLink = navLinks.find((link) => link.classList.contains("is-active"));
  const previousNavIndexKey = "jasada_site_previous_nav_index";

  if (nav && activeNavLink) {
    const activeIndex = navLinks.indexOf(activeNavLink);
    const storedPreviousIndex = sessionStorage.getItem(previousNavIndexKey);
    const previousIndex = Number(storedPreviousIndex);
    const hasPreviousIndex = storedPreviousIndex !== null
      && Number.isInteger(previousIndex)
      && previousIndex >= 0
      && previousIndex < navLinks.length
      && previousIndex !== activeIndex;
    const previousNavLink = hasPreviousIndex ? navLinks[previousIndex] : activeNavLink;

    sessionStorage.removeItem(previousNavIndexKey);

    const positionIndicator = (link) => {
      if (!link || !nav) return;
      const navRect = nav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      nav.style.setProperty("--nav-indicator-x", `${linkRect.left - navRect.left + nav.scrollLeft}px`);
      nav.style.setProperty("--nav-indicator-width", `${link.offsetWidth}px`);
    };
    const restoreIndicator = () => {
      const focusedLink = nav.querySelector(".nav-link:focus-visible");
      const hoveredLink = window.matchMedia("(hover: hover) and (pointer: fine)").matches
        ? nav.querySelector(".nav-link:hover, .nav-dropdown:hover .nav-dropdown-link")
        : null;
      positionIndicator(focusedLink || hoveredLink || activeNavLink);
    };

    positionIndicator(previousNavLink);
    nav.classList.add("has-active-indicator");

    if (hasPreviousIndex && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(() => requestAnimationFrame(() => positionIndicator(activeNavLink)));
    } else {
      positionIndicator(activeNavLink);
    }

    document.fonts.ready.then(restoreIndicator);

    navLinks.forEach((link) => {
      link.addEventListener("pointerenter", () => positionIndicator(link));
      link.addEventListener("focus", () => positionIndicator(link));
    });
    nav.addEventListener("pointerleave", restoreIndicator);
    nav.addEventListener("focusout", (event) => {
      if (event.relatedTarget instanceof Node && nav.contains(event.relatedTarget)) return;
      restoreIndicator();
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        sessionStorage.setItem(previousNavIndexKey, String(activeIndex));
      });
    });

    window.addEventListener("resize", restoreIndicator);
  }

  const navDropdown = document.querySelector(".nav-dropdown");
  if (navDropdown) {
    const dropdownChevron = navDropdown.querySelector(".dropdown-chevron-icon");
    const dropdownLink = navDropdown.querySelector(".nav-dropdown-link");

    if (dropdownChevron) {
      dropdownChevron.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = navDropdown.classList.toggle("is-open");
        dropdownLink?.setAttribute("aria-expanded", String(isOpen));
      });
    }

    document.addEventListener("click", (event) => {
      if (navDropdown.classList.contains("is-open") && !navDropdown.contains(event.target)) {
        navDropdown.classList.remove("is-open");
        dropdownLink?.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navDropdown.classList.contains("is-open")) {
        navDropdown.classList.remove("is-open");
        dropdownLink?.setAttribute("aria-expanded", "false");
        dropdownLink?.focus();
      }
    });
  }

  const copyAddressBtn = document.getElementById("copy-address-btn");
  if (copyAddressBtn) {
    copyAddressBtn.addEventListener("click", async () => {
      const addressText = "206/1 หมู่4 ตำบล หินตก อำเภอ ร่อนพิบูลย์ จังหวัด นครศรีธรรมราช รหัสไปรษณีย์ 83500";
      const span = copyAddressBtn.querySelector("span");
      const originalText = span ? span.textContent : "คัดลอกที่อยู่";
      try {
        await navigator.clipboard.writeText(addressText);
      } catch (err) {
        const textarea = document.createElement("textarea");
        textarea.value = addressText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          document.execCommand("copy");
        } catch (_) {}
        textarea.remove();
      }
      if (span) span.textContent = "คัดลอกที่อยู่แล้ว! ✓";
      copyAddressBtn.classList.add("is-copied");
      setTimeout(() => {
        if (span) span.textContent = originalText;
        copyAddressBtn.classList.remove("is-copied");
      }, 2000);
    });
  }

  const mapIframe = document.getElementById("address-map-iframe");
  const mapModeRoad = document.getElementById("map-mode-road");
  const mapModeSat = document.getElementById("map-mode-sat");

  if (mapIframe && mapModeRoad && mapModeSat) {
    const basePinUrl = "https://maps.google.com/maps?q=8.231907,99.874652+(%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AD%E0%B8%A2%E0%B8%B9%E0%B9%88%E0%B8%9A%E0%B9%89%E0%B8%B2%E0%B8%99%20206%2F1%20%E0%B8%AB%E0%B8%A1%E0%B8%B9%E0%B9%884%20%E0%B8%95.%E0%B8%AB%E0%B8%B4%E0%B8%99%E0%B8%95%E0%B8%81)&z=16&ie=UTF8&iwloc=B&output=embed";

    mapModeRoad.addEventListener("click", () => {
      mapIframe.src = basePinUrl + "&t=m";
      mapModeRoad.classList.add("is-active");
      mapModeRoad.setAttribute("aria-pressed", "true");
      mapModeSat.classList.remove("is-active");
      mapModeSat.setAttribute("aria-pressed", "false");
    });

    mapModeSat.addEventListener("click", () => {
      mapIframe.src = basePinUrl + "&t=h";
      mapModeSat.classList.add("is-active");
      mapModeSat.setAttribute("aria-pressed", "true");
      mapModeRoad.classList.remove("is-active");
      mapModeRoad.setAttribute("aria-pressed", "false");
    });
  }

  const IMAGE_BUCKET = "work-images";
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const SUPPORTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

  const grid = document.getElementById("works-grid");
  if (!grid) return;

  const status = document.getElementById("page-status");
  const addButton = document.getElementById("add-work-button");
  const loginButton = document.getElementById("owner-login-button");
  const logoutButton = document.getElementById("owner-logout-button");
  const dialog = document.getElementById("work-dialog");
  const workDetailDialog = document.getElementById("work-detail-dialog");
  const workDetailTitle = document.getElementById("work-detail-title");
  const workDetailDescription = document.getElementById("work-detail-description");
  const workDetailDate = document.getElementById("work-detail-date");
  const workDetailWeek = document.getElementById("work-detail-week");
  const workDetailImageFrame = document.getElementById("work-detail-image-frame");
  const workDetailSlidesFrame = document.getElementById("work-detail-slides-frame");
  const workDetailImage = document.getElementById("work-detail-image");
  const form = document.getElementById("work-form");
  const titleInput = document.getElementById("work-title");
  const weekSelect = document.getElementById("work-week");
  const descriptionInput = document.getElementById("work-description");
  const dateInput = document.getElementById("work-date");
  const imageInput = document.getElementById("work-image");
  const removeImageRow = document.getElementById("remove-image-row");
  const removeImageInput = document.getElementById("remove-image");
  const formError = document.getElementById("form-error");
  const loginDialog = document.getElementById("login-dialog");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const ownerPinInput = document.getElementById("owner-pin");
  const worksFilterCurrent = document.getElementById("works-filter-current");
  const weekPills = Array.from(document.querySelectorAll(".week-pill"));
  const dropdownItems = Array.from(document.querySelectorAll(".nav-dropdown .dropdown-item, .nav-dropdown .dropdown-item-all"));

  const DEFAULT_PIN_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"; // SHA-256 ของ "1234"
  const STORAGE_KEY_AUTH = "jasada_site_is_owner";

  let client;
  let works = [];
  let isLoadingWorks = true;

  function getWeekFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const weekParam = params.get("week");
    if (!weekParam || weekParam === "all") return null;
    const num = parseInt(weekParam, 10);
    return (num >= 1 && num <= 15) ? num : null;
  }

  let currentWeek = getWeekFromUrl();

  function getWorkWeek(work) {
    if (!work) return null;
    if (typeof work.week === "number" && work.week >= 1 && work.week <= 15) {
      return work.week;
    }
    if (work.week && !isNaN(Number(work.week))) {
      const num = Number(work.week);
      if (num >= 1 && num <= 15) return num;
    }
    if (typeof work.description === "string") {
      const match = work.description.match(/^\[(?:สัปดาห์ที่|Week)\s*(\d+)\]/i);
      if (match) {
        const num = Number(match[1]);
        if (num >= 1 && num <= 15) return num;
      }
    }
    return null;
  }

  const SEED_WORKS = [
    {
      id: "a1000000-0000-0000-0000-000000000001",
      title: "The Creator's Playbook: ถอดรหัส SDLC",
      description: "สไลด์นำเสนอสรุปเนื้อหาการวิเคราะห์และพัฒนาระบบ SDLC ฉบับคนสร้างระบบ ครอบคลุม 7 ขั้นตอนหลักและ Phase Impact Matrix [Module 01]",
      work_date: "2026-10-29",
      image_path: "imeges/week2/slide-1.jpg",
      week: 2,
      slides: [
        "imeges/week2/slide-1.jpg",
        "imeges/week2/slide-2.jpg",
        "imeges/week2/slide-3.jpg",
        "imeges/week2/slide-4.jpg",
        "imeges/week2/slide-5.jpg",
        "imeges/week2/slide-6.jpg",
        "imeges/week2/slide-7.jpg",
        "imeges/week2/slide-8.jpg",
        "imeges/week2/slide-9.jpg",
        "imeges/week2/slide-10.jpg",
        "imeges/week2/slide-11.jpg",
        "imeges/week2/slide-12.jpg",
        "imeges/week2/slide-13.jpg"
      ]
    },
    {
      id: "b2000000-0000-0000-0000-000000000001",
      title: "ผังสรุปความรู้: การพัฒนาระบบสารสนเทศ (SDLC Mind Map)",
      description: "สรุปสาระสำคัญการพัฒนาระบบสารสนเทศ ครอบคลุมความหมาย ประโยชน์ และ 7 ขั้นตอน SDLC",
      work_date: "2026-10-29",
      image_path: "imeges/week2/work-mindmap.png",
      week: 2
    },
    {
      id: "b2000000-0000-0000-0000-000000000002",
      title: "แบบทดสอบหลังเรียน: หน่วยการเรียนรู้ที่ 1 (10 ข้อ)",
      description: "แบบทดสอบวัดผลการเรียนรู้หลังเรียน หน่วยการเรียนรู้ที่ 1 การพัฒนาระบบสารสนเทศ พร้อมเฉลย 10 ข้อ",
      work_date: "2026-10-29",
      image_path: "imeges/week2/work-quiz.jpg",
      week: 2
    },
    {
      id: "b2000000-0000-0000-0000-000000000003",
      title: "แบบฝึกหัดท้ายบท: สรุปคำตอบหน่วยการเรียนรู้ที่ 1",
      description: "แบบฝึกหัดสรุปคำตอบ หน่วยการเรียนรู้ที่ 1 กระบวนการวิเคราะห์และขั้นตอนการดูแลรักษาระบบ",
      work_date: "2026-10-29",
      image_path: "imeges/week2/work-exercise.jpg",
      week: 2
    }
  ];

  function getWorkSlides(work) {
    if (!work) return null;
    if (Array.isArray(work.slides) && work.slides.length > 0) {
      return work.slides;
    }
    if (work.id === "a1000000-0000-0000-0000-000000000001" || (work.title && work.title.includes("Creator's Playbook"))) {
      return [
        "imeges/week2/slide-1.jpg",
        "imeges/week2/slide-2.jpg",
        "imeges/week2/slide-3.jpg",
        "imeges/week2/slide-4.jpg",
        "imeges/week2/slide-5.jpg",
        "imeges/week2/slide-6.jpg",
        "imeges/week2/slide-7.jpg",
        "imeges/week2/slide-8.jpg",
        "imeges/week2/slide-9.jpg",
        "imeges/week2/slide-10.jpg",
        "imeges/week2/slide-11.jpg",
        "imeges/week2/slide-12.jpg",
        "imeges/week2/slide-13.jpg"
      ];
    }
    if (typeof work.description === "string") {
      const match = work.description.match(/\[slides:\s*([^\]]+)\]/i);
      if (match) {
        const val = match[1].trim();
        if (/^\d+$/.test(val)) {
          const count = parseInt(val, 10);
          return Array.from({ length: count }, (_, i) => `imeges/week2/slide-${i + 1}.jpg`);
        }
        return val.split(",").map((s) => s.trim());
      }
    }
    return null;
  }

  function buildSlideCarousel(slides, work, isModal = false, initialIndex = 0) {
    const container = makeElement("div", isModal ? "slide-carousel-modal" : "slide-carousel-card");
    let currentIndex = Math.max(0, Math.min(slides.length - 1, initialIndex));
    const total = slides.length;

    const viewport = makeElement("div", "slide-viewport");
    const track = makeElement("div", "slide-track");

    slides.forEach((src, idx) => {
      const slide = makeElement("div", `slide-item ${idx === currentIndex ? "is-active" : ""}`);
      const img = document.createElement("img");
      img.src = src;
      img.alt = `${work.title} - สไลด์ที่ ${idx + 1} จาก ${total}`;
      img.loading = idx === 0 ? "eager" : "lazy";
      img.draggable = false;
      slide.append(img);
      track.append(slide);
    });
    viewport.append(track);

    // Slide Counter Badge (1 / 5)
    const counterBadge = makeElement("div", "slide-counter-badge");
    const counterNum = makeElement("span", "slide-counter-num", String(currentIndex + 1));
    counterBadge.append(counterNum, document.createTextNode(` / ${total}`));

    // Left hover click zone (with arrow and hint)
    const leftZone = makeElement("button", "slide-zone slide-zone-left");
    leftZone.type = "button";
    leftZone.setAttribute("aria-label", "สไลด์ก่อนหน้า");
    const leftBtn = makeElement("span", "slide-zone-btn");
    leftBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg>';
    const leftHint = makeElement("span", "slide-zone-hint", "ก่อนหน้า");
    leftZone.append(leftBtn, leftHint);

    // Right hover click zone (with arrow and hint)
    const rightZone = makeElement("button", "slide-zone slide-zone-right");
    rightZone.type = "button";
    rightZone.setAttribute("aria-label", "สไลด์ถัดไป");
    const rightBtn = makeElement("span", "slide-zone-btn");
    rightBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>';
    const rightHint = makeElement("span", "slide-zone-hint", "ถัดไป");
    rightZone.append(rightBtn, rightHint);

    // Pagination Dots
    const pagination = makeElement("div", "slide-pagination");
    const dots = [];
    slides.forEach((_, idx) => {
      const dot = makeElement("button", `slide-dot ${idx === currentIndex ? "is-active" : ""}`);
      dot.type = "button";
      dot.setAttribute("aria-label", `ไปยังสไลด์ที่ ${idx + 1}`);
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        goTo(idx);
      });
      dots.push(dot);
      pagination.append(dot);
    });

    // Expand Button (only on card)
    let expandBtn = null;
    if (!isModal) {
      expandBtn = makeElement("button", "slide-expand-btn");
      expandBtn.type = "button";
      expandBtn.setAttribute("aria-label", "เปิดดูสไลด์ขนาดใหญ่");
      expandBtn.title = "ดูภาพขนาดใหญ่เต็มจอ";
      expandBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>';
      expandBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showWorkDetails(work, currentIndex);
      });
    }

    let onSlideChangeCallback = null;

    function goTo(index) {
      if (index < 0) index = total - 1;
      else if (index >= total) index = 0;
      currentIndex = index;

      track.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;
      counterNum.textContent = String(currentIndex + 1);

      track.querySelectorAll(".slide-item").forEach((item, idx) => {
        item.classList.toggle("is-active", idx === currentIndex);
      });

      dots.forEach((dot, idx) => {
        dot.classList.toggle("is-active", idx === currentIndex);
      });

      if (typeof onSlideChangeCallback === "function") {
        onSlideChangeCallback(currentIndex);
      }
    }

    leftZone.addEventListener("click", (e) => {
      e.stopPropagation();
      goTo(currentIndex - 1);
    });

    rightZone.addEventListener("click", (e) => {
      e.stopPropagation();
      goTo(currentIndex + 1);
    });

    // Touch swipe support
    let touchStartX = 0;
    let touchStartY = 0;
    viewport.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    viewport.addEventListener("touchend", (e) => {
      const diffX = e.changedTouches[0].clientX - touchStartX;
      const diffY = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX > 0) goTo(currentIndex - 1);
        else goTo(currentIndex + 1);
      }
    }, { passive: true });

    container.setAttribute("tabindex", "0");
    container.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(currentIndex + 1);
      }
    });

    container.append(viewport, leftZone, rightZone, counterBadge, pagination);
    if (expandBtn) container.append(expandBtn);

    // Initial position
    if (currentIndex > 0) {
      requestAnimationFrame(() => {
        track.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;
      });
    }

    return {
      container,
      goTo,
      getCurrentIndex: () => currentIndex,
      setOnSlideChange: (cb) => { onSlideChangeCallback = cb; }
    };
  }

  function getCleanDescription(description) {
    if (!description) return "";
    return description
      .replace(/^\[(?:สัปดาห์ที่|Week)\s*(\d+)\]\s*/i, "")
      .replace(/\[slides:\s*[^\]]+\]\s*/i, "")
      .trim();
  }

  function syncFilterUI() {
    if (worksFilterCurrent) {
      worksFilterCurrent.textContent = currentWeek
        ? `สัปดาห์ที่ ${currentWeek}`
        : "ทั้งหมด (สัปดาห์ 1 - 15)";
    }

    weekPills.forEach((pill) => {
      const pillWeek = pill.dataset.week;
      const isActive = (currentWeek === null && pillWeek === "all") || (currentWeek !== null && pillWeek === String(currentWeek));
      pill.classList.toggle("is-active", isActive);
      pill.setAttribute("aria-selected", String(isActive));
    });

    dropdownItems.forEach((item) => {
      const itemWeek = item.dataset.week;
      const isSelected = (currentWeek === null && !itemWeek) || (currentWeek !== null && itemWeek === String(currentWeek));
      item.classList.toggle("is-selected", isSelected);
    });
  }

  function setWeekFilter(week, updateHistory = true) {
    currentWeek = (typeof week === "number" && week >= 1 && week <= 15) ? week : null;
    syncFilterUI();

    if (updateHistory) {
      const url = new URL(window.location.href);
      if (currentWeek) {
        url.searchParams.set("week", String(currentWeek));
      } else {
        url.searchParams.delete("week");
      }
      window.history.pushState({ week: currentWeek }, "", url.toString());
    }

    renderWorks();
  }

  weekPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const weekVal = pill.dataset.week;
      setWeekFilter(weekVal === "all" ? null : Number(weekVal));
    });
  });

  dropdownItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const weekVal = item.dataset.week;
      setWeekFilter(weekVal ? Number(weekVal) : null);
      const navDrop = document.querySelector(".nav-dropdown");
      if (navDrop) {
        navDrop.classList.remove("is-open");
        navDrop.querySelector(".nav-dropdown-link")?.setAttribute("aria-expanded", "false");
      }
    });
  });

  window.addEventListener("popstate", () => {
    currentWeek = getWeekFromUrl();
    syncFilterUI();
    renderWorks();
  });

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function isOwner() {
    return sessionStorage.getItem(STORAGE_KEY_AUTH) === "true";
  }

  function setOwnerState(statusBool) {
    if (statusBool) {
      sessionStorage.setItem(STORAGE_KEY_AUTH, "true");
    } else {
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
    }
    syncControls();
  }

  function syncControls() {
    const owner = isOwner();
    loginButton.hidden = owner;
    addButton.hidden = !owner;
    logoutButton.hidden = !owner;
    renderWorks();
  }

  function formatDate(value) {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length !== 3) return value;
    return `${Number(parts[2])}/${Number(parts[1])}/${parts[0]}`;
  }

  async function sha256(value) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function renderWorks() {
    grid.replaceChildren();
    grid.setAttribute("aria-busy", String(isLoadingWorks));

    if (isLoadingWorks) {
      for (let index = 0; index < 6; index += 1) {
        const skeleton = makeElement("article", "work-skeleton");
        skeleton.setAttribute("aria-hidden", "true");
        skeleton.append(makeElement("span", "work-skeleton-image"));
        const skeletonBody = makeElement("div", "work-skeleton-body");
        skeletonBody.append(
          makeElement("span", "work-skeleton-line work-skeleton-title"),
          makeElement("span", "work-skeleton-line"),
          makeElement("span", "work-skeleton-line work-skeleton-short")
        );
        skeleton.append(skeletonBody);
        grid.append(skeleton);
      }
      return;
    }

    const filteredWorks = currentWeek === null
      ? [...works]
      : works.filter((work) => getWorkWeek(work) === currentWeek);

    // ให้ผลงานสไลด์นำเสนอ (Showcase) ขึ้นก่อนเป็นหัวข้อหลัก
    filteredWorks.sort((a, b) => {
      const aSlides = Boolean(getWorkSlides(a)?.length > 1);
      const bSlides = Boolean(getWorkSlides(b)?.length > 1);
      if (aSlides && !bSlides) return -1;
      if (!aSlides && bSlides) return 1;
      return 0;
    });

    if (filteredWorks.length === 0) {
      const emptyState = makeElement("div", "works-empty-state");
      const icon = makeElement("span", "works-empty-icon", "📁");
      icon.setAttribute("aria-hidden", "true");
      const title = makeElement(
        "h2",
        "works-empty-title",
        currentWeek ? `ยังไม่มีผลงานที่ส่งในสัปดาห์ที่ ${currentWeek}` : "ยังไม่มีรายการผลงานในขณะนี้"
      );
      const descText = isOwner()
        ? (currentWeek
            ? `กดปุ่ม "เพิ่มผลงาน" ด้านบนเพื่อส่งผลงานในสัปดาห์ที่ ${currentWeek} ได้เลยครับ`
            : "กดปุ่ม \"เพิ่มผลงาน\" ด้านบนเพื่อเพิ่มผลงานแรกของคุณได้เลยครับ")
        : (currentWeek
            ? `ยังไม่มีการส่งงานในสัปดาห์ที่ ${currentWeek}`
            : "เจ้าของเว็บไซต์ยังไม่ได้เพิ่มรายการผลงาน");
      const desc = makeElement("p", "works-empty-desc", descText);
      emptyState.append(icon, title, desc);
      grid.append(emptyState);
      return;
    }

    for (const work of filteredWorks) {
      const slides = getWorkSlides(work);
      const isSlideWork = Boolean(slides && slides.length > 1);

      const card = makeElement("article", isSlideWork ? "work-card work-card-slide" : "work-card");
      const body = makeElement("div", "work-card-body");

      // Badges row
      const badgesRow = makeElement("div", "work-card-badges");
      const weekNum = getWorkWeek(work);
      if (weekNum) {
        badgesRow.append(makeElement("span", "work-week-badge", `สัปดาห์ที่ ${weekNum}`));
      }
      if (isSlideWork) {
        const slideBadge = makeElement("span", "work-type-badge");
        slideBadge.innerHTML = '<svg class="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="m9 8 7 4-7 4V8z"></path></svg> สไลด์นำเสนอ (' + slides.length + ' หน้า)';
        badgesRow.append(slideBadge);
      }
      body.append(badgesRow);

      const title = makeElement("h2", "work-card-title");
      const titleButton = makeElement("button", "work-card-title-button", work.title);
      titleButton.type = "button";
      titleButton.setAttribute("aria-label", `ดูรายละเอียดผลงาน: ${work.title}`);
      titleButton.addEventListener("click", () => showWorkDetails(work));
      title.append(titleButton);
      body.append(title);

      const cleanDesc = getCleanDescription(work.description);
      if (cleanDesc) body.append(makeElement("p", "work-card-description", cleanDesc));
      if (work.work_date) body.append(makeElement("p", "work-card-date", formatDate(work.work_date)));

      if (isSlideWork) {
        const carousel = buildSlideCarousel(slides, work, false);
        card.append(carousel.container, body);
      } else {
        const imageFrame = makeElement("button", "work-image-frame");
        imageFrame.type = "button";
        imageFrame.setAttribute("aria-label", `รูปผลงาน: ${work.title}`);
        imageFrame.addEventListener("click", () => showWorkDetails(work));

        if (work.image_path) {
          let imgSrc = work.image_path;
          if (!imgSrc.startsWith("imeges/") && !imgSrc.startsWith("http") && client) {
            const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(work.image_path);
            imgSrc = data.publicUrl;
          }
          const image = document.createElement("img");
          image.src = imgSrc;
          image.alt = `รูปผลงาน: ${work.title}`;
          imageFrame.append(image);
        }
        card.append(imageFrame, body);
      }

      if (isOwner()) {
        const actions = makeElement("div", "work-card-actions");
        const editButton = makeElement("button", "small-button", "แก้ไข");
        editButton.type = "button";
        editButton.addEventListener("click", () => showEditDialog(work));
        const deleteButton = makeElement("button", "small-button", "ลบ");
        deleteButton.type = "button";
        deleteButton.addEventListener("click", async () => {
          deleteButton.disabled = true;
          card.classList.add("delete-confirm-shake");
          if (!reducedMotion) {
            await new Promise((resolve) => window.setTimeout(resolve, 320));
          }
          card.classList.remove("delete-confirm-shake");
          deleteButton.disabled = false;
          await removeWork(work);
        });
        actions.append(editButton, deleteButton);
        card.append(actions);
      }

      grid.append(card);
    }
  }

  function showWorkDetails(work, initialSlideIndex = 0) {
    workDetailTitle.textContent = work.title;
    const cleanDesc = getCleanDescription(work.description);
    workDetailDescription.textContent = cleanDesc || "";
    workDetailDescription.hidden = !cleanDesc;
    workDetailDate.textContent = work.work_date ? `วันที่ส่ง: ${formatDate(work.work_date)}` : "";
    workDetailDate.hidden = !work.work_date;

    const weekNum = getWorkWeek(work);
    if (workDetailWeek) {
      if (weekNum) {
        workDetailWeek.textContent = `สัปดาห์ที่ ${weekNum}`;
        workDetailWeek.hidden = false;
      } else {
        workDetailWeek.hidden = true;
      }
    }

    const slides = getWorkSlides(work);
    if (slides && slides.length > 1 && workDetailSlidesFrame) {
      workDetailImageFrame.hidden = true;
      workDetailSlidesFrame.hidden = false;
      workDetailSlidesFrame.replaceChildren();

      const modalCarousel = buildSlideCarousel(slides, work, true, initialSlideIndex);

      // Thumbnails strip
      const thumbStrip = makeElement("div", "slide-thumbnails-strip");
      const thumbBtns = [];
      slides.forEach((src, idx) => {
        const thumbBtn = makeElement("button", `slide-thumb-btn ${idx === initialSlideIndex ? "is-active" : ""}`);
        thumbBtn.type = "button";
        thumbBtn.setAttribute("aria-label", `ดูสไลด์ที่ ${idx + 1}`);
        const tImg = document.createElement("img");
        tImg.src = src;
        tImg.alt = `ภาพตัวอย่างสไลด์ที่ ${idx + 1}`;
        thumbBtn.append(tImg);
        thumbBtn.addEventListener("click", () => {
          modalCarousel.goTo(idx);
        });
        thumbBtns.push(thumbBtn);
        thumbStrip.append(thumbBtn);
      });

      modalCarousel.setOnSlideChange((newIdx) => {
        thumbBtns.forEach((btn, idx) => {
          btn.classList.toggle("is-active", idx === newIdx);
        });
        const activeBtn = thumbBtns[newIdx];
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      });

      workDetailSlidesFrame.append(modalCarousel.container, thumbStrip);
    } else {
      if (workDetailSlidesFrame) {
        workDetailSlidesFrame.hidden = true;
        workDetailSlidesFrame.replaceChildren();
      }

      if (work.image_path) {
        let imgSrc = work.image_path;
        if (!imgSrc.startsWith("imeges/") && !imgSrc.startsWith("http") && client) {
          const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(work.image_path);
          imgSrc = data.publicUrl;
        }
        workDetailImage.src = imgSrc;
        workDetailImage.alt = `รูปผลงานขนาดเต็ม: ${work.title}`;
        workDetailImageFrame.hidden = false;
      } else {
        workDetailImage.removeAttribute("src");
        workDetailImage.alt = "";
        workDetailImageFrame.hidden = true;
      }
    }

    workDetailDialog.showModal();
    document.getElementById("close-work-detail").focus();
  }

  async function loadWorks() {
    status.textContent = "";
    isLoadingWorks = true;
    await renderWorks();
    try {
      let rawWorks;
      try {
        const { data, error } = await client
          .from("works")
          .select("id, title, description, work_date, image_path, created_at, week")
          .order("created_at", { ascending: false });
        if (error) throw error;
        rawWorks = data;
      } catch (errWithWeek) {
        const { data, error } = await client
          .from("works")
          .select("id, title, description, work_date, image_path, created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        rawWorks = data;
      }

      works = (rawWorks || []).map((item) => {
        const parsedWeek = getWorkWeek(item);
        return {
          ...item,
          week: parsedWeek
        };
      });

      // Ensure Week 2 default works are always present
      SEED_WORKS.forEach((seed) => {
        if (!works.some((w) => w.id === seed.id || w.title === seed.title)) {
          works.push(seed);
        }
      });
    } catch (err) {
      status.textContent = `โหลดผลงานไม่สำเร็จ: ${err.message}`;
    } finally {
      isLoadingWorks = false;
      syncFilterUI();
      await renderWorks();
    }
  }

  function resetWorkForm() {
    form.reset();
    document.getElementById("work-id").value = "";
    if (weekSelect) {
      weekSelect.value = currentWeek ? String(currentWeek) : "1";
    }
    removeImageRow.hidden = true;
    formError.textContent = "";
  }

  function showAddDialog() {
    if (!isOwner()) {
      status.textContent = "ต้องเข้าสู่ระบบด้วยรหัส PIN ก่อนจึงจะจัดการผลงานได้";
      return;
    }
    resetWorkForm();
    document.getElementById("dialog-title").textContent = "เพิ่มผลงาน";
    if (weekSelect) {
      weekSelect.value = currentWeek ? String(currentWeek) : "1";
    }
    dialog.showModal();
    titleInput.focus();
  }

  function showEditDialog(work) {
    if (!isOwner()) return;
    resetWorkForm();
    document.getElementById("dialog-title").textContent = "แก้ไขผลงาน";
    document.getElementById("work-id").value = work.id;
    titleInput.value = work.title;
    descriptionInput.value = getCleanDescription(work.description) || "";
    dateInput.value = work.work_date || "";
    if (weekSelect) {
      const w = getWorkWeek(work);
      weekSelect.value = w ? String(w) : "1";
    }
    removeImageRow.hidden = !work.image_path;
    dialog.showModal();
    titleInput.focus();
  }

  function isSupportedImage(file) {
    const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
    const supportedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    return SUPPORTED_EXTENSIONS.has(extension) && supportedMimeTypes.includes(file.type);
  }

  async function uploadImage(file) {
    const extension = file.name.split(".").pop().toLowerCase();
    const path = `works/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from(IMAGE_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false
    });
    if (error) throw error;
    return path;
  }

  async function removeStoredImage(path) {
    if (!path) return;
    const { error } = await client.storage.from(IMAGE_BUCKET).remove([path]);
    if (error) throw error;
  }

  async function submitWork(event) {
    event.preventDefault();
    formError.textContent = "";
    if (!isOwner()) {
      formError.textContent = "กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อนบันทึกผลงาน";
      return;
    }

    const title = titleInput.value.trim();
    if (!title) {
      formError.textContent = "กรุณากรอกชื่อผลงาน";
      titleInput.focus();
      return;
    }

    const selectedImage = imageInput.files[0];
    if (selectedImage && !isSupportedImage(selectedImage)) {
      formError.textContent = "กรุณาเลือกไฟล์ JPG, JPEG, PNG หรือ WEBP";
      imageInput.focus();
      return;
    }
    if (selectedImage && selectedImage.size > MAX_IMAGE_SIZE) {
      formError.textContent = "รูปภาพต้องมีขนาดไม่เกิน 5 MB";
      imageInput.focus();
      return;
    }

    const id = document.getElementById("work-id").value;
    const existing = works.find((item) => item.id === id);
    const workId = existing ? existing.id : crypto.randomUUID();
    let uploadedPath = null;
    const selectedWeekNum = weekSelect ? Number(weekSelect.value) : 1;
    const cleanDesc = descriptionInput.value.trim();

    try {
      if (selectedImage) uploadedPath = await uploadImage(selectedImage);
      const imagePath = uploadedPath || (
        existing && existing.image_path && !removeImageInput.checked
          ? existing.image_path
          : null
      );

      // 1. Try saving with native week column
      let saved = false;
      try {
        const workData = {
          title,
          description: cleanDesc,
          work_date: dateInput.value || null,
          image_path: imagePath,
          week: selectedWeekNum
        };
        const result = existing
          ? await client.from("works").update(workData).eq("id", workId).select("id").single()
          : await client.from("works").insert({ id: workId, ...workData }).select("id").single();
        if (result.error) throw result.error;
        saved = true;
      } catch (colErr) {
        // 2. Fallback: encode [สัปดาห์ที่ X] into description
        const fallbackDesc = `[สัปดาห์ที่ ${selectedWeekNum}] ${cleanDesc}`.trim();
        const fallbackData = {
          title,
          description: fallbackDesc,
          work_date: dateInput.value || null,
          image_path: imagePath
        };
        const result = existing
          ? await client.from("works").update(fallbackData).eq("id", workId).select("id").single()
          : await client.from("works").insert({ id: workId, ...fallbackData }).select("id").single();
        if (result.error) throw result.error;
        saved = true;
      }

      if (existing && existing.image_path && existing.image_path !== imagePath) {
        try {
          await removeStoredImage(existing.image_path);
        } catch (error) {
          status.textContent = `บันทึกผลงานแล้ว แต่ลบรูปเก่าไม่สำเร็จ: ${error.message}`;
        }
      }

      dialog.close();
      resetWorkForm();
      await loadWorks();
    } catch (error) {
      if (uploadedPath) {
        try {
          await removeStoredImage(uploadedPath);
        } catch (cleanupError) {
          formError.textContent = `บันทึกไม่สำเร็จ: ${error.message} และลบไฟล์รูปที่อัปโหลดค้างไว้ไม่สำเร็จ: ${cleanupError.message}`;
          return;
        }
      }
      formError.textContent = `บันทึกไม่สำเร็จ: ${error.message}`;
    }
  }

  async function removeWork(work) {
    if (!isOwner()) {
      status.textContent = "ไม่มีสิทธิ์ลบผลงานนี้";
      return;
    }
    if (!window.confirm(`ยืนยันการลบผลงาน "${work.title}" หรือไม่?`)) return;

    try {
      const { data, error } = await client
        .from("works")
        .delete()
        .eq("id", work.id)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("ไม่พบผลงานหรือไม่มีสิทธิ์ลบรายการนี้");
    } catch (error) {
      status.textContent = `ลบผลงานไม่สำเร็จ: ${error.message}`;
      return;
    }

    works = works.filter((item) => item.id !== work.id);
    await renderWorks();
    if (work.image_path) {
      try {
        await removeStoredImage(work.image_path);
      } catch (error) {
        status.textContent = `ลบรายการแล้ว แต่ลบไฟล์รูปไม่สำเร็จ: ${error.message}`;
      }
    }
  }

  loginButton.addEventListener("click", () => {
    loginError.textContent = "";
    loginDialog.showModal();
    ownerPinInput.value = "";
    ownerPinInput.focus();
  });
  document.getElementById("close-login-dialog").addEventListener("click", () => loginDialog.close());
  document.getElementById("cancel-login").addEventListener("click", () => loginDialog.close());

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const pin = ownerPinInput.value.trim();
    if (!/^[0-9]{4}$/.test(pin)) {
      loginError.textContent = "กรุณากรอก PIN เป็นตัวเลข 4 หลัก";
      ownerPinInput.focus();
      return;
    }

    const hashedInput = await sha256(pin);
    const configuredHash = window.SITE_OWNER_PIN_HASH || DEFAULT_PIN_HASH;

    if (hashedInput === configuredHash) {
      setOwnerState(true);
      ownerPinInput.value = "";
      loginDialog.close();
      status.textContent = "เข้าสู่ระบบเจ้าของเรียบร้อยแล้ว";
      await loadWorks();
    } else {
      ownerPinInput.value = "";
      ownerPinInput.focus();
      loginError.textContent = "รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
    }
  });

  logoutButton.addEventListener("click", () => {
    setOwnerState(false);
    status.textContent = "ออกจากระบบเรียบร้อยแล้ว";
  });

  document.getElementById("add-work-button").addEventListener("click", showAddDialog);
  document.getElementById("close-dialog").addEventListener("click", () => dialog.close());
  document.getElementById("cancel-dialog").addEventListener("click", () => dialog.close());
  document.getElementById("close-work-detail").addEventListener("click", () => workDetailDialog.close());
  workDetailDialog.addEventListener("click", (event) => {
    if (event.target === workDetailDialog) workDetailDialog.close();
  });
  form.addEventListener("submit", submitWork);

  async function initialize() {
    syncFilterUI();
    syncControls();

    if (!window.supabase) {
      status.textContent = "โหลดไลบรารี Supabase ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
      isLoadingWorks = false;
      await renderWorks();
      return;
    }

    if (
      !window.SUPABASE_URL ||
      !window.SUPABASE_ANON_KEY ||
      window.SUPABASE_URL.includes("your-project.supabase.co") ||
      window.SUPABASE_ANON_KEY.startsWith("sb_publishable_ใส่คีย์ของคุณ")
    ) {
      status.textContent = "ยังไม่ได้ตั้งค่า Supabase กรุณากรอก Project URL และ key ใน supabase-config.js";
      isLoadingWorks = false;
      await renderWorks();
      return;
    }

    client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    await loadWorks();
  }

  initialize().catch((error) => {
    status.textContent = `โหลดผลงานไม่สำเร็จ: ${error.message}`;
  });

  // Interactive Click Ripple Effect
  document.addEventListener("click", (e) => {
    const target = e.target.closest(".button, .small-button, .theme-toggle, .nav-link, .address-copy-btn");
    if (!target) return;
    const ripple = document.createElement("span");
    ripple.className = "click-ripple";
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 600);
  });

})();
