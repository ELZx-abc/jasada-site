"use strict";

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("has-motion");

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
    const tiltTargets = document.querySelectorAll(".hero-image-frame, .home-skill-card, .education-card, .work-card");
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

    window.addEventListener("pointermove", (event) => {
      document.body.style.setProperty("--pointer-x", `${event.clientX}px`);
      document.body.style.setProperty("--pointer-y", `${event.clientY}px`);
    }, { passive: true });
  }

  document.addEventListener("copy", (event) => {
    const target = event.target;
    const isEditable = target instanceof HTMLElement
      && (target.isContentEditable || target.matches("input, textarea"));
    if (!isEditable) event.preventDefault();
  });

  document.addEventListener("dragstart", (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });

  document.addEventListener("contextmenu", (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });

  const nav = document.querySelector(".site-nav");
  const navLinks = nav ? Array.from(nav.querySelectorAll(".nav-link")) : [];
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
      nav.style.setProperty("--nav-indicator-x", `${link.offsetLeft}px`);
      nav.style.setProperty("--nav-indicator-width", `${link.offsetWidth}px`);
    };

    positionIndicator(previousNavLink);
    nav.classList.add("has-active-indicator");

    if (hasPreviousIndex && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(() => requestAnimationFrame(() => positionIndicator(activeNavLink)));
    } else {
      positionIndicator(activeNavLink);
    }

    document.fonts.ready.then(() => positionIndicator(activeNavLink));

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        sessionStorage.setItem(previousNavIndexKey, String(activeIndex));
      });
    });

    window.addEventListener("resize", () => positionIndicator(activeNavLink));
  }

  const revealTargets = document.querySelectorAll(
    ".education-heading, .education-item, .home-skill-card, .page-heading, .profile-photo-column, .profile-item, .works-controls, .works-grid"
  );

  if (revealTargets.length && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("has-scroll-reveal");

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -32px 0px" });

    revealTargets.forEach((target) => {
      target.classList.add("scroll-reveal");
      revealObserver.observe(target);
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
  const workDetailImageFrame = document.getElementById("work-detail-image-frame");
  const workDetailImage = document.getElementById("work-detail-image");
  const form = document.getElementById("work-form");
  const titleInput = document.getElementById("work-title");
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

  const DEFAULT_PIN_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"; // SHA-256 ของ "1234"
  const STORAGE_KEY_AUTH = "jasada_site_is_owner";

  let client;
  let works = [];

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

    if (works.length === 0) {
      const emptyState = makeElement("div", "works-empty-state");
      const icon = makeElement("span", "works-empty-icon", "📁");
      icon.setAttribute("aria-hidden", "true");
      const title = makeElement("h2", "works-empty-title", "ยังไม่มีรายการผลงานในขณะนี้");
      const descText = isOwner()
        ? "กดปุ่ม \"เพิ่มผลงาน\" ด้านบนเพื่อเพิ่มผลงานแรกของคุณได้เลยครับ"
        : "เจ้าของเว็บไซต์ยังไม่ได้เพิ่มรายการผลงาน";
      const desc = makeElement("p", "works-empty-desc", descText);
      emptyState.append(icon, title, desc);
      grid.append(emptyState);
      return;
    }

    for (const work of works) {
      const card = makeElement("article", "work-card");
      const imageFrame = makeElement("button", "work-image-frame");
      imageFrame.type = "button";
      imageFrame.setAttribute("aria-label", `รูปผลงาน: ${work.title}`);
      imageFrame.addEventListener("click", () => showWorkDetails(work));

      if (work.image_path) {
        const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(work.image_path);
        const image = document.createElement("img");
        image.src = data.publicUrl;
        image.alt = `รูปผลงาน: ${work.title}`;
        imageFrame.append(image);
      }

      const body = makeElement("div", "work-card-body");
      const title = makeElement("h2", "work-card-title");
      const titleButton = makeElement("button", "work-card-title-button", work.title);
      titleButton.type = "button";
      titleButton.setAttribute("aria-label", `ดูรายละเอียดผลงาน: ${work.title}`);
      titleButton.addEventListener("click", () => showWorkDetails(work));
      title.append(titleButton);
      body.append(title);
      if (work.description) body.append(makeElement("p", "work-card-description", work.description));
      if (work.work_date) body.append(makeElement("p", "work-card-date", formatDate(work.work_date)));
      card.append(imageFrame, body);

      if (isOwner()) {
        const actions = makeElement("div", "work-card-actions");
        const editButton = makeElement("button", "small-button", "แก้ไข");
        editButton.type = "button";
        editButton.addEventListener("click", () => showEditDialog(work));
        const deleteButton = makeElement("button", "small-button", "ลบ");
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => removeWork(work));
        actions.append(editButton, deleteButton);
        card.append(actions);
      }

      grid.append(card);
    }
  }

  function showWorkDetails(work) {
    workDetailTitle.textContent = work.title;
    workDetailDescription.textContent = work.description || "";
    workDetailDescription.hidden = !work.description;
    workDetailDate.textContent = work.work_date ? `วันที่ส่ง: ${formatDate(work.work_date)}` : "";
    workDetailDate.hidden = !work.work_date;

    if (work.image_path) {
      const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(work.image_path);
      workDetailImage.src = data.publicUrl;
      workDetailImage.alt = `รูปผลงานขนาดเต็ม: ${work.title}`;
      workDetailImageFrame.hidden = false;
    } else {
      workDetailImage.removeAttribute("src");
      workDetailImage.alt = "";
      workDetailImageFrame.hidden = true;
    }

    workDetailDialog.showModal();
    document.getElementById("close-work-detail").focus();
  }

  async function loadWorks() {
    status.textContent = "";
    const { data, error } = await client
      .from("works")
      .select("id, title, description, work_date, image_path, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    works = data || [];
    await renderWorks();
  }

  function resetWorkForm() {
    form.reset();
    document.getElementById("work-id").value = "";
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
    dialog.showModal();
    titleInput.focus();
  }

  function showEditDialog(work) {
    if (!isOwner()) return;
    resetWorkForm();
    document.getElementById("dialog-title").textContent = "แก้ไขผลงาน";
    document.getElementById("work-id").value = work.id;
    titleInput.value = work.title;
    descriptionInput.value = work.description || "";
    dateInput.value = work.work_date || "";
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

    try {
      if (selectedImage) uploadedPath = await uploadImage(selectedImage);
      const imagePath = uploadedPath || (
        existing && existing.image_path && !removeImageInput.checked
          ? existing.image_path
          : null
      );
      const workData = {
        title,
        description: descriptionInput.value.trim(),
        work_date: dateInput.value || null,
        image_path: imagePath
      };

      const result = existing
        ? await client.from("works").update(workData).eq("id", workId).select("id").single()
        : await client.from("works").insert({ id: workId, ...workData }).select("id").single();
      if (result.error) throw result.error;

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
    syncControls();

    if (!window.supabase) {
      status.textContent = "โหลดไลบรารี Supabase ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
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
      await renderWorks();
      return;
    }

    client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    await loadWorks();
  }

  initialize().catch((error) => {
    status.textContent = `โหลดผลงานไม่สำเร็จ: ${error.message}`;
  });
})();
