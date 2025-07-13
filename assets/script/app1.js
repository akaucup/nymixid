const App = {
  state: {
    regionMap: {
      id: names_id, // Pastikan names_id, names_us, names_de didefinisikan di tempat lain
      us: names_us,
      de: names_de,
    },
    dataList: [],
  },

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.updateHistory();
  },

  cacheDOM() {
    this.form = document.getElementById("generator-form");
    this.recentOutput = document.getElementById("recent-output");
    this.historyOutput = document.getElementById("history-output");
    this.resetBtn = document.getElementById("reset-data");
    this.searchInput = document.getElementById("history-search");
    this.mobileGenerateBtn = document.getElementById("generate-mobile");
    this.toggleBtn = document.getElementById("toggle-config");
    this.configPanel = document.querySelector(".config-panel");
    this.overlay = document.getElementById("config-overlay");
  },

  bindEvents() {
    this.searchInput.addEventListener("input", () => {
      const query = this.searchInput.value.trim().toLowerCase();
      this.updateHistory(query);
    });

    this.mobileGenerateBtn.addEventListener("click", () => {
      this.form.requestSubmit();
      if (window.innerWidth <= 768) {
        this.configPanel.classList.remove("open");
        this.overlay.classList.remove("show");
      }
    });

    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(this.form);

      const region = formData.get("region");
      const genderRaw = formData.get("gender");
      const count = Math.min(parseInt(formData.get("count")) || 1, 50);
      const minAge = parseInt(formData.get("min-age")) || 0;
      const passLength = Math.max(
        parseInt(formData.get("pass-length")) || 8,
        6
      );
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

      const dataList = [];
      for (let i = 0; i < count; i++) {
        const nameData = this.state.regionMap[region][gender];
        const firstName = this.randomItem(nameData.firstNames);
        const lastName = this.randomItem(nameData.lastNames);
        const fullName = `${firstName} ${lastName}`;
        const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${this.randomAlnum(
          3
        )}`;
        const birthDate = this.generateBirthdate(birthStart, birthEnd, minAge);
        const password = this.generatePassword(passLength, useSymbols);

        dataList.push({
          // Tambahkan ID unik untuk setiap data yang digenerate
          id: this.generateUniqueId(),
          firstName,
          lastName,
          fullName,
          username,
          birthDate,
          password,
        });
      }

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

      // Tidak perlu lagi memanggil saveToLocal di sini
      // this.saveToLocal(dataList, configUsed);
      this.renderNewTable(dataList, configUsed); // Kirim configUsed juga ke renderNewTable
      this.updateHistory();
    });

    this.resetBtn.addEventListener("click", () => {
      localStorage.removeItem("generatedData");
      this.recentOutput.innerHTML = "";
      this.historyOutput.innerHTML = "<p>Riwayat berhasil direset.</p>";
    });

    this.toggleBtn.addEventListener("click", () => {
      this.configPanel.classList.toggle("open");
      this.overlay.classList.toggle("show");
    });

    this.overlay.addEventListener("click", () => {
      this.configPanel.classList.remove("open");
      this.overlay.classList.remove("show");
    });
  },

  // Menerima configUsed sebagai parameter
  renderNewTable(dataList, configUsed) {
    this.recentOutput.innerHTML = "";
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Nama Lengkap</th>
          <th>Username</th>
          <th>Tanggal Lahir</th>
          <th>Password</th>
          <th>Secret Key</th>
          <th>Email</th>
          <th>Note</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");
    dataList.forEach((data, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td class="copyable" data-copy="${data.fullName}">${data.fullName}</td>
        <td class="copyable" data-copy="${data.username}">${data.username}</td>
        <td class="copyable" data-copy="${data.birthDate}">${
        data.birthDate
      }</td>
        <td class="copyable" data-copy="${data.password}">${data.password}</td>
        <td><input type="text" class="extra-input" data-key="secretKey" /></td>
        <td><input type="email" class="extra-input" data-key="email" /></td>
        <td><input type="text" class="extra-input" data-key="note" /></td>
        <td><button class="save-recent-btn">Simpan</button></td>
      `;

      row.querySelector(".save-recent-btn").addEventListener("click", () => {
        const inputs = row.querySelectorAll(".extra-input");
        const extraData = {};
        inputs.forEach((input) => {
          const key = input.dataset.key;
          extraData[key] = input.value;
        });

        const fullData = {
          ...data,
          ...extraData,
          timestamp: new Date().toISOString(),
        };

        const allSaved = App.getSavedData();
        // Cek apakah data dengan ID yang sama sudah ada
        const isExisting = allSaved.some(
          (entry) =>
            entry.data && entry.data[0] && entry.data[0].id === fullData.id
        );

        if (!isExisting) {
          // Gunakan configUsed yang diteruskan dari form submit
          allSaved.push({
            timestamp: fullData.timestamp,
            config: configUsed,
            data: [fullData],
          });
          localStorage.setItem("generatedData", JSON.stringify(allSaved));
          App.updateHistory();
          alert("Data berhasil disimpan.");
        } else {
          alert("Data ini sudah tersimpan.");
        }
      });

      tbody.appendChild(row);
    });

    this.recentOutput.appendChild(table);
    this.enableCopyable();
  },

  updateHistory(query = "") {
    const allData = this.getSavedData().filter(Boolean);
    this.historyOutput.innerHTML = "";

    // Membalik urutan data agar yang terbaru muncul di atas
    allData.reverse().forEach((entry, index) => {
      if (!entry.data || !Array.isArray(entry.data)) return;
      const data = entry.data[0]; // Hanya ambil data pertama dari setiap entri (karena sebelumnya disimpan sebagai array 1 elemen)
      if (
        !data ||
        !data.username ||
        !data.username.toLowerCase().includes(query)
      )
        return;

      const created = new Date(entry.timestamp).toLocaleString("id-ID");
      const wrapper = document.createElement("div");
      wrapper.className = "accordion-item";

      const header = document.createElement("div");
      header.className = "accordion-header";
      header.textContent = `${data.username} (${entry.config?.region || "-"}, ${
        entry.config?.gender || "-"
      })`;

      const body = document.createElement("div");
      body.className = "accordion-body hidden";
      const [year, month, day] = data.birthDate.split("-");
      body.innerHTML = `
        <p><strong>Nama:</strong> ${data.fullName}</p>
        <p><strong>Username:</strong> ${data.username}</p>
        <p><strong>DoB:</strong> ${day}/${month}/${year}</p>
        <p><strong>Password:</strong> ${data.password}</p>
        <p><strong>Secret Key:</strong> ${data.secretKey || "-"}</p>
        <p><strong>Email:</strong> ${data.email || "-"}</p>
        <p><strong>Note:</strong> ${data.note || "-"}</p>
        <p><strong>Dibuat:</strong> ${created}</p>
      `;

      header.addEventListener("click", () => {
        body.classList.toggle("hidden");
      });

      wrapper.appendChild(header);
      wrapper.appendChild(body);
      this.historyOutput.appendChild(wrapper);
    });

    this.enableCopyable();
  },

  getSavedData() {
    return JSON.parse(localStorage.getItem("generatedData") || "[]");
  },

  // Fungsi saveToLocal ini tidak lagi diperlukan dalam alur yang baru
  // Karena penyimpanan dilakukan langsung di event listener tombol "Simpan"
  // agar hanya data yang benar-benar diinginkan pengguna yang disimpan ke histori.
  // saveToLocal(dataList, config) {
  //   this.lastUsedConfig = config;
  //   const saved = this.getSavedData();
  //   const timestamp = new Date().toISOString();
  //   const entry = { timestamp, config, data: dataList };
  //   saved.push(entry);
  //   localStorage.setItem("generatedData", JSON.stringify(saved));
  // },

  enableCopyable() {
    document.querySelectorAll(".copyable").forEach((el) => {
      el.style.cursor = "pointer";
      el.title = "Klik untuk salin";
      el.addEventListener("click", () => {
        navigator.clipboard.writeText(el.dataset.copy);
      });
    });
  },

  randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomAlnum(length = 3) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  generateBirthdate(start, end, minAge) {
    const now = new Date();
    const maxBirthdate = new Date(
      now.getFullYear() - minAge,
      now.getMonth(),
      now.getDate()
    );
    const startDate = new Date(start);
    const endDate = new Date(end);
    const effectiveEnd = minAge > 0 ? maxBirthdate : endDate;
    const finalStart = startDate < effectiveEnd ? startDate : effectiveEnd;
    const time = this.randomInt(finalStart.getTime(), effectiveEnd.getTime());
    return new Date(time).toISOString().split("T")[0];
  },

  generatePassword(length, symbols) {
    const vowels = "aeiou";
    const consonants = "bcdfghjklmnpqrstvwxyz";
    const base =
      "1234567890" +
      consonants +
      vowels +
      consonants.toUpperCase() +
      vowels.toUpperCase();
    const symbolSet = "!@#$%^&*()_-+=<>?";
    const chars = base + (symbols ? symbolSet : "");
    let pass = "";
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  },

  // Fungsi baru untuk menghasilkan ID unik
  generateUniqueId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
