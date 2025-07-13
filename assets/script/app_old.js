document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("generator-form");
  const recentOutput = document.getElementById("recent-output");
  const historyOutput = document.getElementById("history-output");
  const resetBtn = document.getElementById("reset-data");
  const searchInput = document.getElementById("history-search");

  const regionMap = {
    id: names_id,
    us: names_us,
    de: names_de,
  };

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    updateHistory(query);
  });
  const mobileGenerateBtn = document.getElementById("generate-mobile");

  mobileGenerateBtn.addEventListener("click", () => {
    form.requestSubmit();

    // Tutup drawer kalau di mobile
    if (window.innerWidth <= 768) {
      configPanel.classList.remove("open");
      overlay.classList.remove("show");
    }
  });

  form.addEventListener("submit", (e) => {
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

    const dataList = [];

    for (let i = 0; i < count; i++) {
      const nameData = regionMap[region][gender];
      const firstName = randomItem(nameData.firstNames);
      const lastName = randomItem(nameData.lastNames);
      const fullName = `${firstName} ${lastName}`;
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomAlnum(
        3
      )}`;
      const birthDate = generateBirthdate(birthStart, birthEnd, minAge);
      const password = generatePassword(passLength, useSymbols);

      dataList.push({
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

    saveToLocal(dataList, configUsed);
    renderNewTable(dataList);
    updateHistory();
  });

  resetBtn.addEventListener("click", () => {
    localStorage.removeItem("generatedData");
    recentOutput.innerHTML = "";
    historyOutput.innerHTML = "<p>Riwayat berhasil direset.</p>";
  });

  updateHistory(); // initial load

  function renderNewTable(dataList) {
    recentOutput.innerHTML = "";

    // Tabel untuk desktop
    const table = document.createElement("table");
    table.classList.add("desktop-only");
    table.innerHTML = `
    <thead>
      <tr>
        <th>Fullname</th>
        <th>Username</th>
        <th>DoB</th>
        <th>Password</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

    const tbody = table.querySelector("tbody");

    dataList.forEach((data) => {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td class="copyable" data-copy="${data.fullName}">${data.fullName}</td>
      <td class="copyable" data-copy="${data.username}">${data.username}</td>
      <td>
  <div class="dob-inline">
    <span class="copyable" data-copy="${data.birthDate}">${
        data.birthDate
      }</span><br/>
    <span class="copyable" data-copy="${data.birthDate.split("-")[2]}">${
        data.birthDate.split("-")[2]
      }</span> /
    <span class="copyable" data-copy="${data.birthDate.split("-")[1]}">${
        data.birthDate.split("-")[1]
      }</span> /
    <span class="copyable" data-copy="${data.birthDate.split("-")[0]}">${
        data.birthDate.split("-")[0]
      }</span>
  </div>
</td>

      <td class="copyable" data-copy="${data.password}">${data.password}</td>
    `;
      tbody.appendChild(row);
    });

    recentOutput.appendChild(table);

    // Kartu untuk mobile
    const cardsContainer = document.createElement("div");
    cardsContainer.classList.add("mobile-only");

    dataList.forEach((data) => {
      const [year, month, day] = data.birthDate.split("-");
      const card = document.createElement("div");
      card.className = "mobile-card";
      card.innerHTML = `
  <div class="info-row">
    <div class="label">Nama:</div>
    <div class="value"><span class="copyable" data-copy="${data.fullName}">${
        data.fullName
      }</span></div>
  </div>
  <div class="info-row">
    <div class="label">Username:</div>
    <div class="value"><span class="copyable" data-copy="${data.username}">${
        data.username
      }</span></div>
  </div>
  <div class="info-row">
    <div class="label">DoB:</div>
    <div class="value">
      <div><span class="copyable" data-copy="${data.birthDate}">${
        data.birthDate
      }</span></div>
      <div class="dob-split">
        <span class="copyable" data-copy="${data.birthDate.split("-")[2]}">${
        data.birthDate.split("-")[2]
      }</span> /
        <span class="copyable" data-copy="${data.birthDate.split("-")[1]}">${
        data.birthDate.split("-")[1]
      }</span> /
        <span class="copyable" data-copy="${data.birthDate.split("-")[0]}">${
        data.birthDate.split("-")[0]
      }</span>
      </div>
    </div>
  </div>
  <div class="info-row">
    <div class="label">Password:</div>
    <div class="value"><span class="copyable" data-copy="${data.password}">${
        data.password
      }</span></div>
  </div>
`;

      cardsContainer.appendChild(card);
    });

    recentOutput.appendChild(cardsContainer);

    enableCopyable();
  }

  function updateHistory(searchQuery = "") {
    const allData = getSavedData().reverse(); // terbaru di atas
    historyOutput.innerHTML = "";

    const filteredData = allData.filter((entry) =>
      entry.data.some((d) =>
        d.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );

    if (filteredData.length === 0) {
      historyOutput.innerHTML = "<p>Tidak ada hasil.</p>";
      return;
    }

    filteredData.forEach((entry, index) => {
      const { timestamp, config, data } = entry;
      const user = data[0];
      const created = new Date(timestamp).toLocaleString("id-ID");

      const wrapper = document.createElement("div");
      wrapper.className = "accordion-item";

      const header = document.createElement("div");
      header.className = "accordion-header";
      header.textContent = `${user.username} (${config.region}, ${config.gender})`;
      header.title = "Klik untuk lihat detail";

      const body = document.createElement("div");
      body.className = "accordion-body hidden";
      const [year, month, day] = user.birthDate.split("-");

      body.innerHTML = `
  <div class="card-line">
    <strong>Nama:</strong>
    <span class="copyable" data-copy="${user.fullName}">${user.fullName}</span>
  </div>
  <div class="card-line">
    <strong>Username:</strong>
    <span class="copyable" data-copy="${user.username}">${user.username}</span>
  </div>

  <div class="card-line">
  <strong>DoB:</strong>
  <div class="dob-combo">
    <span class="copyable" data-copy="${user.birthDate}">${user.birthDate}</span>
    <div class="dob-format">
      <span class="copyable" data-copy="${day}">${day}</span> /
      <span class="copyable" data-copy="${month}">${month}</span> /
      <span class="copyable" data-copy="${year}">${year}</span>
    </div>
  </div>
</div>

  <div class="card-line">
    <strong>Password:</strong>
    <span class="copyable" data-copy="${user.password}">${user.password}</span>
  </div>
  <div class="card-line">
    <strong>Dibuat:</strong>
    <span>${created}</span>
  </div>
  <div class="card-line">
    <strong>Region:</strong>
    <span>${config.region}</span>
  </div>
  <div class="card-line">
    <strong>Gender:</strong>
    <span>${config.gender}</span>
  </div>
`;

      header.addEventListener("click", () => {
        body.classList.toggle("hidden");
      });

      wrapper.appendChild(header);
      wrapper.appendChild(body);
      historyOutput.appendChild(wrapper);
    });

    enableCopyable();
  }

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomAlnum(length = 3) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
    const finalStart = startDate < effectiveEnd ? startDate : effectiveEnd;

    const time = randomInt(finalStart.getTime(), effectiveEnd.getTime());
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
    const symbolSet = "!@#$%^&*()_-+=<>?";
    const chars = base + (symbols ? symbolSet : "");

    let pass = "";
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }
});

// ───── LocalStorage Utils ─────
function getSavedData() {
  return JSON.parse(localStorage.getItem("generatedData") || "[]");
}

function saveToLocal(dataList, config = {}) {
  try {
    const allData = getSavedData();
    const newEntry = {
      timestamp: new Date().toISOString(),
      config,
      data: dataList,
    };
    localStorage.setItem(
      "generatedData",
      JSON.stringify(allData.concat(newEntry))
    );
  } catch (err) {
    console.error("Gagal menyimpan ke localStorage:", err);
  }
}

function enableCopyable() {
  document.querySelectorAll(".copyable").forEach((el) => {
    el.style.cursor = "pointer";
    el.title = "Klik untuk salin";
    el.addEventListener("click", () => {
      navigator.clipboard.writeText(el.dataset.copy);
    });
  });
}
const toggleBtn = document.getElementById("toggle-config");
const configPanel = document.querySelector(".config-panel");
const overlay = document.getElementById("config-overlay");

toggleBtn.addEventListener("click", () => {
  configPanel.classList.toggle("open");
  overlay.classList.toggle("show");
});

overlay.addEventListener("click", () => {
  configPanel.classList.remove("open");
  overlay.classList.remove("show");
});

document.getElementById("export-txt").addEventListener("click", () => {
  const allData = getSavedData().flatMap((entry) => {
    const createdAt = new Date(entry.timestamp)
      .toLocaleString("id-ID")
      .replace(", ", ".");
    return entry.data.map((user) => ({
      ...user,
      createdAt,
    }));
  });

  if (allData.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  let txt = "fullname|username|DoB|password|createdAt\n";
  txt += allData
    .map(
      (u) =>
        `${u.fullName}|${u.username}|${u.birthDate}|${u.password}|${u.createdAt}`
    )
    .join("\n");

  const blob = new Blob([txt], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data-output.txt";
  a.click();
});

document.getElementById("export-json").addEventListener("click", () => {
  const allData = getSavedData().flatMap((entry) => {
    const createdAt = new Date(entry.timestamp)
      .toLocaleString("id-ID")
      .replace(", ", ".");
    return entry.data.map((user) => ({
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      username: user.username,
      birthDate: user.birthDate,
      password: user.password,
      createdAt,
    }));
  });

  if (allData.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const blob = new Blob([JSON.stringify(allData, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data-output.json";
  a.click();
});
