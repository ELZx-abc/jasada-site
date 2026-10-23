"use strict";

(() => {
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

  let client;
  let works = [];
  let ownerId = null;
  let currentUser = null;

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function isOwner() {
    return Boolean(currentUser && ownerId && currentUser.id === ownerId);
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

  async function renderWorks() {
    grid.replaceChildren();
    const count = Math.max(6, works.length);

    for (let index = 0; index < count; index += 1) {
      const work = works[index];
      const card = makeElement("article", work ? "work-card" : "work-card empty-work-card");
      const imageFrame = makeElement(work ? "button" : "div", "work-image-frame");
      imageFrame.setAttribute("aria-label", work ? `รูปผลงาน: ${work.title}` : "ช่องว่างสำหรับรูปผลงาน");
      if (work) {
        imageFrame.type = "button";
        imageFrame.addEventListener("click", () => showWorkDetails(work));
      }

      if (work && work.image_path) {
        const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(work.image_path);
        const image = document.createElement("img");
        image.src = data.publicUrl;
        image.alt = `รูปผลงาน: ${work.title}`;
        imageFrame.append(image);
      }

      const body = makeElement("div", "work-card-body");
      if (work) {
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
      } else {
        body.append(makeElement("h2", "work-card-title", ""));
        body.append(makeElement("p", "work-card-description", ""));
        body.append(makeElement("p", "work-card-date", ""));
        card.append(imageFrame, body);
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
      status.textContent = "ต้องเข้าสู่ระบบด้วยบัญชีเจ้าของเว็บไซต์ก่อนจึงจะจัดการผลงานได้";
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
    const path = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
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
      formError.textContent = "เซสชันเจ้าของเว็บไซต์หมดอายุ กรุณาเข้าสู่ระบบใหม่";
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
    ownerPinInput.focus();
  });
  document.getElementById("close-login-dialog").addEventListener("click", () => loginDialog.close());
  document.getElementById("cancel-login").addEventListener("click", () => loginDialog.close());
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const pin = ownerPinInput.value;
    if (!/^(?:[0-9]{4}|[0-9]{10,12})$/.test(pin)) {
      loginError.textContent = "กรุณากรอก PIN 4 หลักสำหรับทดสอบในเครื่อง หรือ 10–12 หลักสำหรับระบบจริง";
      ownerPinInput.focus();
      return;
    }

    try {
      const { data, error } = await client.functions.invoke("owner-pin-login", {
        body: { pin }
      });
      if (error) throw error;
      if (!data || typeof data.token_hash !== "string") {
        throw new Error("เซิร์ฟเวอร์ตอบกลับข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
      }
      const { data: authData, error: authError } = await client.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink"
      });
      if (authError) throw authError;
      if (!authData.user || authData.user.id !== ownerId) {
        await client.auth.signOut();
        throw new Error("PIN นี้ไม่ได้รับสิทธิ์เป็นเจ้าของเว็บไซต์");
      }
      ownerPinInput.value = "";
      loginDialog.close();
      await loadWorks();
      if (!isOwner()) {
        status.textContent = "บัญชีนี้ไม่มีสิทธิ์จัดการผลงาน กรุณาใช้บัญชีเจ้าของเว็บไซต์";
      }
    } catch (error) {
      ownerPinInput.value = "";
      loginError.textContent = error.message.includes("Edge Function returned a non-2xx")
        ? "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบ PIN หรือลองใหม่ภายหลัง"
        : `เข้าสู่ระบบไม่สำเร็จ: ${error.message}`;
    }
  });
  logoutButton.addEventListener("click", async () => {
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      currentUser = null;
      syncControls();
      status.textContent = "ออกจากระบบแล้ว";
    } catch (error) {
      status.textContent = `ออกจากระบบไม่สำเร็จ: ${error.message}`;
    }
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
    if (!window.supabase) {
      loginButton.disabled = true;
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
      loginButton.disabled = true;
      status.textContent = "ยังไม่ได้ตั้งค่า Supabase กรุณากรอก Project URL และ publishable/anon key ใน supabase-config.js";
      await renderWorks();
      return;
    }

    client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    const settingsResult = await client
      .from("site_settings")
      .select("owner_id")
      .eq("id", 1)
      .single();
    if (settingsResult.error) {
      loginButton.disabled = true;
      status.textContent = `โหลดการตั้งค่าสิทธิ์ไม่สำเร็จ: ${settingsResult.error.message}`;
      await renderWorks();
      return;
    }
    ownerId = settingsResult.data.owner_id;

    const sessionResult = await client.auth.getSession();
    if (sessionResult.error) {
      status.textContent = `ตรวจสอบสถานะเข้าสู่ระบบไม่สำเร็จ: ${sessionResult.error.message}`;
    }
    currentUser = sessionResult.data.session?.user || null;
    syncControls();
    if (currentUser && !isOwner()) {
      status.textContent = "บัญชีนี้ไม่มีสิทธิ์จัดการผลงาน กรุณาใช้บัญชีเจ้าของเว็บไซต์";
    }
    await loadWorks();

    client.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      syncControls();
      if (isOwner()) {
        queueMicrotask(() => {
          loadWorks().catch((error) => {
            status.textContent = `โหลดผลงานไม่สำเร็จ: ${error.message}`;
          });
        });
      }
    });
  }

  initialize().catch((error) => {
    status.textContent = `เริ่มต้นระบบผลงานไม่สำเร็จ: ${error.message}`;
  });
})();
