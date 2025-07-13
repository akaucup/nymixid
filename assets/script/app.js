// ───── Main Entry Point ─────
document.addEventListener("DOMContentLoaded", () => {
  setupDarkMode();
  initUI();
  bindEvents();
  updateHistory();
  if (window.location.search && !sessionStorage.getItem("skipAutoSubmit")) {
    applyURLParamsToForm();
    document
      .getElementById("generator-form")
      .dispatchEvent(new Event("submit"));
  }
});

// ───── UI Elements ─────
const form = document.getElementById("generator-form");
const recentOutput = document.getElementById("recent-output");
const historyOutput = document.getElementById("history-output");
const resetBtn = document.getElementById("reset-data");
const searchInput = document.getElementById("history-search");
const mobileGenerateBtn = document.getElementById("generate-mobile");
const toggleBtn = document.getElementById("toggle-config");
const configPanel = document.querySelector(".config-panel");
const overlay = document.getElementById("config-overlay");
const exportTxtBtn = document.getElementById("export-txt");
const exportJsonBtn = document.getElementById("export-json");

const regionMap = { id: names_id, us: names_us, de: names_de };

// ───── UI Initialization ─────
function initUI() {
  enableCopyable();
}

// ───── Event Binding ─────
function bindEvents() {
  searchInput.addEventListener("input", () =>
    updateHistory(searchInput.value.trim().toLowerCase())
  );

  mobileGenerateBtn.addEventListener("click", () => {
    form.requestSubmit(); try {
      form.requestSubmit();
    } catch (e) {
      form.submit(); // fallback untuk Safari
    }
    if (window.innerWidth <= 768) {
      configPanel.classList.remove("open");
      overlay.classList.remove("show");
    }
  });

  resetBtn.addEventListener("click", () => {
    const confirmBox = document.getElementById("confirm-modal");
    const confirmText = document.getElementById("confirm-text");
    const yesBtn = document.getElementById("confirm-yes");
    const noBtn = document.getElementById("confirm-no");

    confirmText.textContent = "Yakin ingin menghapus semua riwayat data?";
    confirmBox.classList.remove("hidden");

    const onConfirm = () => {
      localStorage.removeItem("generatedData");
      sessionStorage.setItem("skipAutoSubmit", "true");

      // Redirect ke halaman bersih tanpa parameter
      const cleanURL = window.location.origin + window.location.pathname;
      window.location.href = cleanURL;
    };

    const onCancel = () => {
      confirmBox.classList.add("hidden");
      yesBtn.removeEventListener("click", onConfirm);
      noBtn.removeEventListener("click", onCancel);
    };

    yesBtn.addEventListener("click", onConfirm);
    noBtn.addEventListener("click", onCancel);
  });

  form.addEventListener("submit", handleFormSubmit);
  // resetBtn.addEventListener("click", resetHistory);
  toggleBtn.addEventListener("click", toggleConfigPanel);
  overlay.addEventListener("click", closeConfigPanel);
  exportTxtBtn.addEventListener("click", exportToTxt);
  exportJsonBtn.addEventListener("click", exportToJson);
}

bindExtraEditor(); // tambahan ini

function bindExtraEditor() {
  const modal = document.getElementById("extra-form-modal");
  const form = document.getElementById("extra-form");
  const cancelBtn = document.getElementById("cancel-extra");

  // Delegasi event: tombol "Tambah Info"
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("edit-extra")) {
      const username = e.target.dataset.username;
      const user = findUserByUsername(username);
      if (!user) return;

      form.username.value = user.username;
      form.email.value = user.extra?.email || "";
      form.totpService.value = user.extra?.totpService || "";
      form.notes.value = user.extra?.notes || "";

      modal.classList.remove("hidden");
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = form.username.value;
    const updated = {
      email: form.email.value,
      totpService: form.totpService.value,
      notes: form.notes.value,
    };
    updateExtraInfo(username, updated);
    modal.classList.add("hidden");
    updateHistory(); // render ulang
  });
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }
}

bindDeleteHandler();

function bindDeleteHandler() {
  const modal = document.getElementById("confirm-modal");
  const confirmYes = document.getElementById("confirm-yes");
  const confirmNo = document.getElementById("confirm-no");

  let targetUsername = null;
  let targetElement = null;

  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-entry")) {
      targetUsername = e.target.dataset.username;
      targetElement = e.target.closest(".accordion-item");
      modal.classList.remove("hidden");
    }
  });

  confirmYes.onclick = () => {
    if (!targetUsername) return;
    const success = deleteEntryByUsername(targetUsername);
    if (success && targetElement) {
      targetElement.classList.add("fade-out");
      setTimeout(() => {
        targetElement.remove();
      }, 500);
    }
    modal.classList.add("hidden");
    targetUsername = null;
  };

  confirmNo.onclick = () => {
    modal.classList.add("hidden");
    targetUsername = null;
  };
}

function deleteEntryByUsername(username) {
  const all = getSavedData();
  let changed = false;
  const updated = all
    .map((entry) => {
      const filtered = entry.data.filter((u) => u.username !== username);
      if (filtered.length !== entry.data.length) {
        changed = true;
        return { ...entry, data: filtered };
      }
      return entry;
    })
    .filter((entry) => entry.data.length > 0);

  if (changed) {
    localStorage.setItem("generatedData", JSON.stringify(updated));
    return true;
  }
  return false;
}

// ───── Form Handling ─────
function handleFormSubmit(e) {
  e.preventDefault();

  const formData = new FormData(form);
  const region = formData.get("region");
  const genderRaw = formData.get("gender");
  const count = Math.min(parseInt(formData.get("count")) || 1, 50);
  const minAge = parseInt(formData.get("min-age")) || 0;
  const passLength = Math.max(parseInt(formData.get("pass-length")) || 8, 6);
  const useSymbols = formData.get("pass-symbol") === "on";

  const gender =
    genderRaw === "random"
      ? Math.random() < 0.5
        ? "male"
        : "female"
      : genderRaw;

  const inputStart = formData.get("birth-start") || "1975-01-01";
  const birthStart =
    new Date(inputStart).getFullYear() < 1975 ? "1975-01-01" : inputStart;

  const now = new Date();
  const defaultEnd = new Date(
    now.getFullYear() - minAge,
    now.getMonth(),
    now.getDate()
  )
    .toISOString()
    .split("T")[0];
  const birthEnd = formData.get("birth-end") || defaultEnd;

  const dataList = Array.from({ length: count }, () => {
    const nameData = regionMap[region][gender];
    const firstName = randomItem(nameData.firstNames);
    const lastName = randomItem(nameData.lastNames);
    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      username: `${normalizeUsername(firstName)}${normalizeUsername(
        lastName
      )}${randomAlnum(3)}`,
      birthDate: generateBirthdate(birthStart, birthEnd, minAge),
      password: generatePassword(passLength, useSymbols),
      extra: {
        email: "",
        totpService: "",
        notes: "",
      },
    };
  });

  const configUsed = {
    region,
    gender,
    count,
    minAge,
    birthStart,
    birthEnd,
    passLength,
    useSymbols,
  };

  saveToLocal(dataList, configUsed);
  renderNewTable(dataList);
  updateHistory();
}
sessionStorage.removeItem("skipAutoSubmit");

// ───── UI Rendering ─────
// function renderNewTable(dataList) {
//   recentOutput.innerHTML = "";

//   renderDesktopTable(dataList);
//   renderMobileCards(dataList);
//   enableCopyable();
// }

// function renderNewTable(dataList) {
//   recentOutput.innerHTML = "";

//   const container = document.createElement("div");
//   container.className = "recent-flat-list";

//   dataList.forEach((user) => {
//     const [y, m, d] = user.birthDate.split("-");

//     const row = document.createElement("div");
//     row.className = "flat-row";
//     row.innerHTML = `
//       <div class="flat-item"><strong>Nama:</strong> <button class="copyable" data-copy="${user.fullName}">Copy Nama</button></div>
//       <div class="flat-item"><strong>Username:</strong> <button class="copyable" data-copy="${user.username}">Copy Username</button></div>
//       <div class="flat-item"><strong>Tanggal Lahir:</strong>
//         <button class="copyable" data-copy="${d}">DD</button>
//         <button class="copyable" data-copy="${m}">MM</button>
//         <button class="copyable" data-copy="${y}">YYYY</button>
//       </div>
//       <div class="flat-item"><strong>Password:</strong> <button class="copyable" data-copy="${user.password}">Copy Password</button></div>
//       <hr/>
//     `;
//     container.appendChild(row);
//   });

//   recentOutput.appendChild(container);
//   enableCopyable();
// }

// ───── Desktop UI Rendering ─────
// function renderDesktopTable(dataList) {
//   const table = document.createElement("table");
//   table.classList.add("desktop-only");
//   table.innerHTML = `
//     <thead>
//       <tr><th>Fullname</th><th>Username</th><th>DoB</th><th>Password</th><th>Action</th></tr>
//     </thead>
//     <tbody></tbody>`;
//   const tbody = table.querySelector("tbody");

//   dataList.forEach(({ fullName, username, birthDate, password }) => {
//     const [y, m, d] = birthDate.split("-");
//     tbody.innerHTML += `
//       <tr>
//         <td class="copyable" data-copy="${fullName}">${fullName}</td>
//         <td class="copyable" data-copy="${username}">${username}</td>
//         <td>
//           <div class="dob-inline">
//             <span class="copyable" data-copy="${birthDate}">${birthDate}</span><br/>
//             <span class="copyable" data-copy="${d}">${d}</span> /
//             <span class="copyable" data-copy="${m}">${m}</span> /
//             <span class="copyable" data-copy="${y}">${y}</span>
//           </div>
//         </td>
//         <td class="copyable" data-copy="${password}">${password}</td>
//         <td><button class="edit-extra" data-username="${username}">Tambah Info</button></td>
//       </tr>`;
//   });

//   recentOutput.appendChild(table);
// }
// // ───── Mobile UI Rendering ─────
// function renderMobileCards(dataList) {
//   const container = document.createElement("div");
//   container.className = "mobile-only";

//   dataList.forEach(({ fullName, username, birthDate, password }) => {
//     const [y, m, d] = birthDate.split("-");
//     container.innerHTML += `
//       <div class="mobile-card">
//         <div class="info-row"><div class="label">Nama:</div><div class="value"><span class="copyable" data-copy="${fullName}">${fullName}</span></div></div>
//         <div class="info-row"><div class="label">Username:</div><div class="value"><span class="copyable" data-copy="${username}">${username}</span></div></div>
//         <div class="info-row"><div class="label">DoB:</div>
//           <div class="value">
//             <div><span class="copyable" data-copy="${birthDate}">${birthDate}</span></div>
//             <div class="dob-split">
//               <span class="copyable" data-copy="${d}">${d}</span> /
//               <span class="copyable" data-copy="${m}">${m}</span> /
//               <span class="copyable" data-copy="${y}">${y}</span>
//             </div>
//           </div>
//         </div>
//         <div class="info-row"><div class="label">Password:</div><div class="value"><span class="copyable" data-copy="${password}">${password}</span></div></div>
//         <button class="edit-extra" data-username="${username}">Tambah Info</button>
//       </div>`;
//   });

//   recentOutput.appendChild(container);
// }

function renderNewTable(dataList) {
  recentOutput.innerHTML = "";

  const container = document.createElement("div");
  container.className = "recent-flat-list";

  dataList.forEach((user) => {
    const [y, m, d] = user.birthDate.split("-");

    const row = document.createElement("div");
    row.className = "flat-row";
    row.innerHTML = `
      <div class="flat-item"><button class="copyable" data-copy="${user.fullName}">Fullname</button><button class="copyable" data-copy="${user.username}">Username</button></div>
      <div class="flat-item">
        <button class="copyable" data-copy="${d}">DD</button>
        <button class="copyable" data-copy="${m}">MM</button>
        <button class="copyable" data-copy="${y}">YYYY</button>
      </div>
      <div class="flat-item"><button class="copyable" data-copy="${user.password}">Password</button></div>
      <div class="flat-item"><button class="edit-extra" data-username="${user.username}">Tambah Info</button></div>
      <hr/>
    `;
    container.appendChild(row);
  });

  recentOutput.appendChild(container);
  enableCopyable();
}

function updateHistory(search = "") {
  const data = getSavedData().reverse();
  historyOutput.innerHTML = "";

  const filteredUsers = data.flatMap((entry) =>
    entry.data
      .filter((d) => d.username.toLowerCase().includes(search.toLowerCase()))
      .map((user) => ({
        ...user,
        createdAt: new Date(entry.timestamp).toLocaleString("id-ID"),
        region: entry.config.region,
        gender: entry.config.gender,
      }))
  );

  if (!filteredUsers.length) {
    historyOutput.innerHTML = "<p>Tidak ada hasil.</p>";
    return;
  }

  filteredUsers.forEach((user) => {
    const [y, m, d] = user.birthDate.split("-");

    const wrapper = document.createElement("div");
    wrapper.className = "accordion-item";

    wrapper.innerHTML = `
      <div class="accordion-header" title="Klik untuk lihat detail">
        ${user.username} (${user.region}, ${user.gender})
      </div>
      <div class="accordion-body hidden">
        <button class="edit-extra" data-username="${
          user.username
        }">Tambah Info</button>
        <button class="delete-entry" data-username="${
          user.username
        }">Hapus</button>

        <div class="card-line"><strong>Nama:</strong> <span class="copyable" data-copy="${
          user.fullName
        }">${user.fullName}</span></div>
        <div class="card-line"><strong>Username:</strong> <span class="copyable" data-copy="${
          user.username
        }">${user.username}</span></div>

        <div class="card-line"><strong>DoB:</strong>
          <div class="dob-combo">
            <span class="copyable" data-copy="${user.birthDate}">${
      user.birthDate
    }</span>
            <!--div class="dob-format">
              <span class="copyable" data-copy="${d}">${d}</span> /
              <span class="copyable" data-copy="${m}">${m}</span> /
              <span class="copyable" data-copy="${y}">${y}</span>
            </div-->
          </div>
        </div>

        <div class="card-line"><strong>Password:</strong> <span class="copyable" data-copy="${
          user.password
        }">${user.password}</span></div>
        <div class="card-line"><strong>Email:</strong> <span class="copyable" data-copy="${
          user.extra?.email || ""
        }">${user.extra?.email || "-"}</span></div>
        <div class="card-line"><strong>TOTP Key:</strong> <span class="copyable" data-copy="${
          user.extra?.totpService || ""
        }">${user.extra?.totpService || "-"}</span></div>
        <div class="card-line"><strong>Catatan:</strong> <span>${(
          user.extra?.notes || "-"
        ).replace(/\n/g, "<br/>")}</span></div>

        <div class="card-line"><strong>Dibuat:</strong> ${user.createdAt}</div>
        <div class="card-line"><strong>Region:</strong> ${user.region}</div>
        <div class="card-line"><strong>Gender:</strong> ${user.gender}</div>
      </div>
    `;

    const header = wrapper.querySelector(".accordion-header");
    const body = wrapper.querySelector(".accordion-body");
    header.addEventListener("click", () => body.classList.toggle("hidden"));

    historyOutput.appendChild(wrapper);
  });

  enableCopyable();
}

// ───── Local Storage Utils ─────
function getSavedData() {
  return JSON.parse(localStorage.getItem("generatedData") || "[]");
}

function saveToLocal(dataList, configUsed) {
  const existing = getSavedData();
  const newEntry = {
    timestamp: Date.now(),
    config: configUsed,
    data: dataList,
  };
  const updated = [...existing, newEntry];
  localStorage.setItem("generatedData", JSON.stringify(updated));
}

// ───── Export Utils ─────
function exportToTxt() {
  const data = flattenData();
  if (!data.length) return alert("Tidak ada data untuk diekspor.");
  const lines = [
    "fullname|username|DoB|password|email|SecretKey|notes|createdAt",
    ...data.map((u) =>
      [
        u.fullName,
        u.username,
        u.birthDate,
        u.password,
        u.extra?.email || "",
        u.extra?.totpService || "",
        (u.extra?.notes || "").replace(/\r?\n|\|/g, " "), // hindari newline atau |
        u.createdAt,
      ].join("|")
    ),
  ];
  downloadFile(lines.join("\n"), "data-output.txt", "text/plain");
}

function exportToJson() {
  const data = flattenData();
  if (!data.length) return alert("Tidak ada data untuk diekspor.");
  downloadFile(
    JSON.stringify(data, null, 2),
    "data-output.json",
    "application/json"
  );
}

function flattenData() {
  return getSavedData().flatMap((entry) => {
    const createdAt = new Date(entry.timestamp)
      .toLocaleString("id-ID")
      .replace(", ", ".");
    return entry.data.map((user) => ({ ...user, createdAt }));
  });
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ───── Helpers ─────
function enableCopyable() {
  document.querySelectorAll(".copyable").forEach((el) => {
    el.style.cursor = "pointer";
    el.title = "Klik untuk salin";
    el.onclick = () => navigator.clipboard.writeText(el.dataset.copy);
  });
}

function toggleConfigPanel() {
  configPanel.classList.toggle("open");
  overlay.classList.toggle("show");
}

function closeConfigPanel() {
  configPanel.classList.remove("open");
  overlay.classList.remove("show");
}

function resetHistory() {
  localStorage.removeItem("generatedData");
  recentOutput.innerHTML = "";
  historyOutput.innerHTML = "<p>Riwayat berhasil direset.</p>";
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAlnum(len = 3) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => randomItem(chars)).join("");
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBirthdate(start, end, minAge) {
  const now = new Date();
  const maxBirthdate = new Date(
    now.getFullYear() - minAge,
    now.getMonth(),
    now.getDate()
  );
  const startDate = new Date(start);
  const endDate = new Date(end);
  const effectiveEnd = minAge > 0 ? maxBirthdate : endDate;
  const actualStart = startDate < effectiveEnd ? startDate : effectiveEnd;
  const time = randomInt(actualStart.getTime(), effectiveEnd.getTime());
  return new Date(time).toISOString().split("T")[0];
}

function generatePassword(length, symbols) {
  const vowels = "aeiou";
  const consonants = "bcdfghjklmnpqrstvwxyz";
  const base =
    "1234567890" +
    consonants +
    vowels +
    consonants.toUpperCase() +
    vowels.toUpperCase();
  const symbolsSet = "!@#$%^&*()_-+=<>?";
  const chars = base + (symbols ? symbolsSet : "");
  return Array.from({ length }, () => randomItem(chars)).join("");
}

function findUserByUsername(username) {
  const all = getSavedData();
  for (const entry of all) {
    for (const user of entry.data) {
      if (user.username === username) return user;
    }
  }
  return null;
}

function updateExtraInfo(username, extraData) {
  const all = getSavedData();
  all.forEach((entry) => {
    entry.data.forEach((user) => {
      if (user.username === username) {
        user.extra = { ...user.extra, ...extraData };
      }
    });
  });
  localStorage.setItem("generatedData", JSON.stringify(all));
}
function normalizeUsername(text) {
  return text
    .normalize("NFD") // Pisahkan diakritik (ex: ü → u + ¨)
    .replace(/[\u0300-\u036f]/g, "") // Hapus diakritik
    .replace(/[^a-z0-9]/gi, "") // Hapus semua selain huruf/angka
    .toLowerCase(); // Lowercase
}

function setupDarkMode() {
  const toggleBtn = document.getElementById("theme-toggle");
  const htmlEl = document.documentElement; // <html>

  // Cek preferensi awal dari localStorage
  if (localStorage.getItem("theme") === "dark") {
    htmlEl.classList.add("dark-mode");
    toggleBtn.textContent = "☀️";
  }

  toggleBtn.addEventListener("click", () => {
    htmlEl.classList.toggle("dark-mode");
    const isDark = htmlEl.classList.contains("dark-mode");
    toggleBtn.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

function applyURLParamsToForm() {
  const params = new URLSearchParams(window.location.search);

  const fields = [
    "region",
    "gender",
    "count",
    "min-age",
    "birth-start",
    "birth-end",
    "pass-length",
    "pass-symbol",
  ];

  fields.forEach((field) => {
    const el = document.querySelector(`[name="${field}"]`);
    if (!el) return;

    const value = params.get(field);
    if (value === null) return;

    if (el.type === "checkbox") {
      el.checked = value === "true" || value === "1";
    } else {
      el.value = value;
    }
  });
}
// document.getElementById("generator-form").dispatchEvent(new Event("submit"));
