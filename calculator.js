// ─── Google Apps Script URL ────────────────────────────────────────────────
// Füge hier deine Web-App-URL ein, nachdem du das Script deployed hast.
// Beispiel: 'https://script.google.com/macros/s/AKfycb.../exec'
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwtmEOM2kOdjl3Gb-7TCdqxJV48QXs6NwBnzsLBp2VLaxzKtrtzBvIROYeWltQgVCMwJQ/exec";

// Gecachte Live-EXP-Daten vom Google Sheet (überschreiben d2rLevelExpData)
let liveExpData = null;

// Define defaults in one place
const DEFAULT_VALUES = {
  d4: { exp: "15000000", time: "5", cost: "200" },
  d2r: { exp: "25000000", time: "5", cost: "100" },
};

// Store game-specific values
let d4Values = { ...DEFAULT_VALUES.d4 };
let d2rValues = { ...DEFAULT_VALUES.d2r };

// Define default rows for each game type and party size
const D2R_DEFAULT_ROWS = {
  partySize1: ["60-90", "75-90"],
  partySizeGreaterThan1: ["1-60", "1-70", "1-80", "1-90"],
};

// Store rows for each game type
let d4Rows = ["1-60", "1-100", "1-150"];
let d2rRows = D2R_DEFAULT_ROWS.partySizeGreaterThan1;

// Add at the top with other state variables
let previousD2RRows = ["1-60", "1-70", "1-80", "1-99"]; // Store previous D2R rows

function createRowElement(levelRange = "", isFirstRow = false) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td class="center-align">
      <div class="field fill small">
        <input 
          class="powerleveling center-align" 
          type="text" 
          value="${levelRange}" 
          placeholder="${levelRange || "x-y"}" 
          aria-label="Enter level range (D4: 1-300, D2R: 1-99)"
        />
      </div>
    </td>
    <td class="runs" aria-label="Total number of runs required"></td>
    <td class="cost" aria-label="Total cost in forum gold"></td>
    <td class="time" aria-label="Total time to complete"></td>
    <td>
      <nav class="center-align">
        ${
          isFirstRow
            ? '<a class="add" aria-label="Add new level range"><i>add</i></a>'
            : '<a class="delete" aria-label="Delete row"><i>delete</i></a>'
        }
      </nav>
    </td>
  `;

  // Add event listeners directly to the new row
  const input = row.querySelector(".powerleveling");
  const deleteButton = row.querySelector(".delete");
  const addButton = row.querySelector(".add");

  if (input) {
    // Clear error state on input
    input.addEventListener("input", () => {
      input.classList.remove("invalid");
      const errorSpan = input.parentElement.querySelector(".error");
      if (errorSpan) {
        errorSpan.remove();
      }
      clearRowCalculations(row);
    });

    // Calculate on enter
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        calculate();
        saveStateToHash();
      }
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", () => {
      row.remove();
      calculate();
      saveStateToHash();
    });
  }

  if (addButton) {
    addButton.addEventListener("click", () => {
      addRow();
      saveStateToHash();
    });
  }

  return row;
}

function clearRowCalculations(row) {
  const cells = {
    runs: row.querySelector(".runs"),
    cost: row.querySelector(".cost"),
    time: row.querySelector(".time"),
  };

  Object.values(cells).forEach((cell) => {
    if (cell) {
      cell.innerText = "";
    }
  });
}

function addRow() {
  const tbody = document.querySelector("tbody");
  if (!tbody) return;

  // Get current game type and party size
  const isD4 = document.getElementById("d4Radio").checked;
  const partySize = document.getElementById("partySize")?.value || "2";

  // Determine default level range based on game type and party size
  let defaultRange = "";
  if (isD4) {
    defaultRange = "";
  } else {
    // For D2R, use different defaults based on party size
    if (partySize === "1") {
      defaultRange = "";
    } else {
      defaultRange = "";
    }
  }

  // Create new row with appropriate default
  const newRow = createRowElement(defaultRange);

  // Add the new row at the end
  tbody.appendChild(newRow);

  // Focus the new input
  const newInput = newRow.querySelector(".powerleveling");
  if (newInput) {
    newInput.focus();
  }

  // Save state after adding row
  saveStateToHash();
}

function updateLabels(isD4) {
  const location = isD4 ? "Pit 100" : "Chaos";
  const labels = {
    exp: `Experience per ${location}`,
    time: `Duration per ${location} (min)`,
    cost: `Cost per ${location} (fg)`,
  };

  // Update all labels at once
  Object.entries(labels).forEach(([id, text]) => {
    const label = document.getElementById(`${id}Label`);
    if (label) {
      label.textContent = text;
    }
  });

  // Update header title
  const headerTitle = document.querySelector("header h5");
  if (headerTitle) {
    headerTitle.textContent = isD4
      ? "Diablo 4 Powerleveling Calculator"
      : "D2R Powerleveling Calculator";
  }

  // Disable/enable experience input field based on game type
  const expInput = document.getElementById("exp");
  if (expInput) {
    if (isD4) {
      expInput.disabled = false;
      expInput.style.opacity = "1";
      expInput.style.cursor = "text";
    } else {
      expInput.disabled = true;
      expInput.style.opacity = "0.5";
      expInput.style.cursor = "not-allowed";
    }
  }
}

function updatePresetValues(isD4, useDefaults = false) {
  const fields = {
    exp: document.getElementById("exp"),
    time: document.getElementById("time"),
    cost: document.getElementById("cost"),
  };

  // Get the appropriate values
  const values = useDefaults
    ? isD4
      ? DEFAULT_VALUES.d4
      : DEFAULT_VALUES.d2r
    : isD4
      ? d4Values
      : d2rValues;

  // Update all fields at once
  Object.entries(fields).forEach(([key, field]) => {
    if (field && values[key] !== undefined) {
      field.value = values[key];
    }
  });

  // Handle D2R-specific fields
  if (!isD4) {
    const partySize = document.getElementById("partySize");
    if (partySize) {
      partySize.value = "2"; // Default party size for D2R
    }
  }
}

function initializeGameElements(isD4) {
  // Initialize D2R specific elements
  const partySizeContainer = document.getElementById("partySizeContainer");
  const d2rBonusContainer = document.getElementById("d2rBonusContainer");
  const d2rCheckboxContainer = document.getElementById("d2rCheckboxContainer");
  const playerLevelsContainer = document.getElementById(
    "playerLevelsContainer",
  );

  if (!isD4) {
    // Show D2R specific elements
    partySizeContainer.style.display = "inline-block";
    d2rBonusContainer.style.display = "inline-flex";
    d2rCheckboxContainer.style.display = "flex";
    if (playerLevelsContainer) playerLevelsContainer.style.display = "block";

    // Set default D2R values
    document.getElementById("partySize").value = "2";
    document.getElementById("anniBonus").value = "0";
    document.getElementById("ancJewelBonus").value = "0";
    document.getElementById("expShrine").checked = false;
    document.getElementById("ondalsWisdom").checked = false;
  } else {
    // Hide D2R specific elements
    partySizeContainer.style.display = "none";
    d2rBonusContainer.style.display = "none";
    d2rCheckboxContainer.style.display = "none";
    if (playerLevelsContainer) playerLevelsContainer.style.display = "none";
  }
}

function setupListeners() {
  // Set up listeners for game type changes
  setupGameTypeListeners();

  // Set up listeners for input fields
  setupInputListeners();

  // Set up listeners for buttons
  setupButtonListeners();
}

function setupGameTypeListeners() {
  const d4Radio = document.getElementById("d4Radio");
  const d2rRadio = document.getElementById("d2rRadio");

  const handleGameTypeChange = (isD4) => {
    try {
      // Update UI elements
      updateLabels(isD4);
      updatePresetValues(isD4);
      initializeGameElements(isD4);

      // Switch rows and recalculate
      switchRows(isD4);
      calculate();

      // Save state
      saveStateToHash();
    } catch (error) {
      console.error("Error handling game type change:", error);
      alert("Error switching game type. Please try again.");
    }
  };

  d4Radio.addEventListener("change", () => handleGameTypeChange(true));
  d2rRadio.addEventListener("change", () => handleGameTypeChange(false));
}

function setupInputListeners() {
  // Main input fields (exp, cost, time)
  const mainInputs = ["exp", "cost", "time"];
  mainInputs.forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("input", () => {
        const isD4 = document.getElementById("d4Radio").checked;
        const values = isD4 ? d4Values : d2rValues;
        values[id] = input.value;
        calculate();
        saveStateToHash();
      });
    }
  });

  // D2R specific inputs
  const d2rInputs = {
    partySize: () => {
      const partySize = document.getElementById("partySize").value;
      const tbody = document.querySelector("tbody");
      if (!tbody) return;

      // Players in Game muss >= Party Size sein
      enforcePlayers();

      invalidateLiveExp("⚠️ Party Size geändert – bitte Live EXP neu laden.");

      // Clear existing rows
      tbody.innerHTML = "";

      // Use appropriate default rows based on party size
      const defaultRows =
        partySize === "1"
          ? D2R_DEFAULT_ROWS.partySize1
          : D2R_DEFAULT_ROWS.partySizeGreaterThan1;

      // Add the default rows
      defaultRows.forEach((levelRange, index) => {
        const row = createRowElement(levelRange, index === 0);
        tbody.appendChild(row);
      });

      calculate();
      saveStateToHash();
    },
    anniBonus: () => calculate(),
    ancJewelBonus: () => calculate(),
    expShrine: () => calculate(),
    ondalsWisdom: () => calculate(),
    playersInGame: () => {
      enforcePlayers();
      invalidateLiveExp(
        "⚠️ Players in Game geändert – bitte Live EXP neu laden.",
      );
      calculate();
    },
    liveExpLocation: () => {
      invalidateLiveExp("⚠️ Area geändert – bitte Live EXP neu laden.");
      calculate();
    },
  };

  Object.entries(d2rInputs).forEach(([id, handler]) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("change", () => {
        handler();
        saveStateToHash();
      });
    }
  });
}

function setupButtonListeners() {
  // Share button listener
  const copyButton = document.getElementById("copyData");
  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const shareableHash = saveShareableStateToHash();
      const shareableUrl = `${window.location.origin}${window.location.pathname}#share=${shareableHash}`;
      await navigator.clipboard.writeText(shareableUrl);
    });
  }

  // Live EXP fetch button
  const fetchBtn = document.getElementById("fetchLiveExpBtn");
  if (fetchBtn) {
    fetchBtn.addEventListener("click", () => fetchLiveExpFromSheet());
  }
}

/**
 * Live-EXP-Cache leeren und Hinweis anzeigen.
 */
function invalidateLiveExp(message) {
  if (liveExpData === null) return;
  liveExpData = null;
  const statusEl = document.getElementById("liveExpStatus");
  if (statusEl && message) statusEl.textContent = message;
}

/**
 * Erzwingt: Players in Game >= Party Size.
 * Wird bei jeder Änderung von partySize oder playersInGame aufgerufen.
 */
function enforcePlayers() {
  const pigEl = document.getElementById("playersInGame");
  const psEl = document.getElementById("partySize");
  if (!pigEl || !psEl) return;
  const ps = parseInt(psEl.value) || 1;
  const pig = parseInt(pigEl.value) || 8;
  if (pig < ps) pigEl.value = ps;
}

/**
 * Level-Range für Live-EXP: optional EXP Von/Bis, sonst Vereinigung aller Tabellenzeilen.
 */
function getLiveExpFetchRange() {
  const explicitFrom = parseInt(
    document.getElementById("liveExpFromLevel")?.value,
    10,
  );
  const explicitTo = parseInt(
    document.getElementById("liveExpToLevel")?.value,
    10,
  );
  if (
    Number.isFinite(explicitFrom) &&
    Number.isFinite(explicitTo) &&
    explicitFrom >= 1 &&
    explicitTo <= 99 &&
    explicitFrom < explicitTo
  ) {
    return { fromLevel: explicitFrom, toLevel: explicitTo, source: "explicit" };
  }

  let fromLevel = Infinity;
  let toLevel = -Infinity;
  let hasRow = false;

  document.querySelectorAll("tbody tr").forEach((row) => {
    const val = row.querySelector(".powerleveling")?.value?.trim();
    if (!val) return;
    const validation = validateLevelRange(val, false);
    if (!validation.valid) return;
    hasRow = true;
    fromLevel = Math.min(fromLevel, validation.from);
    toLevel = Math.max(toLevel, validation.to);
  });

  if (!hasRow || !Number.isFinite(fromLevel) || fromLevel >= toLevel) {
    throw new Error(
      "Keine gültige Level-Range – Tabelle ausfüllen oder EXP Von/Bis angeben (z. B. 60 und 65).",
    );
  }

  return { fromLevel, toLevel, source: "table" };
}

/**
 * Holt live EXP-Werte aus dem Google Sheet via Apps Script.
 * Fixes:
 *   1. Button wird sofort beim Klick deaktiviert (verhindert Mehrfachklicks)
 *   2. Jeder Request bekommt eine eindeutige ID (verhindert Google-Duplikate)
 *   3. AbortController mit 35s Timeout (verhindert endlose Wartezeit)
 */
async function fetchLiveExpFromSheet() {
  const statusEl = document.getElementById("liveExpStatus");
  const fetchBtn = document.getElementById("fetchLiveExpBtn");

  // ── Fix 1: Button SOFORT sperren, vor allem anderen ──────────────────────
  if (fetchBtn) fetchBtn.disabled = true;

  if (!APPS_SCRIPT_URL) {
    if (statusEl)
      statusEl.textContent =
        "⚠️ Bitte APPS_SCRIPT_URL in calculator.js eintragen!";
    if (fetchBtn) fetchBtn.disabled = false;
    return;
  }

  let fromLevel;
  let toLevel;
  let rangeSource;
  try {
    ({ fromLevel, toLevel, source: rangeSource } = getLiveExpFetchRange());
  } catch (err) {
    if (statusEl) statusEl.textContent = `⚠️ ${err.message}`;
    if (fetchBtn) fetchBtn.disabled = false;
    return;
  }

  const levelCount = toLevel - fromLevel;
  if (levelCount > 15 && rangeSource === "table") {
    const ok = confirm(
      `Es werden Level ${fromLevel}–${toLevel - 1} geladen (${levelCount} Werte, aus allen Tabellenzeilen).\n\n` +
        `Im Sheet wird C4 kurz nacheinander geändert (danach automatisch zurückgesetzt).\n\n` +
        `Nur 60–65 gewünscht? Zeilen anpassen oder „EXP Von/Bis" setzen.\n\nFortfahren?`,
    );
    if (!ok) {
      if (fetchBtn) fetchBtn.disabled = false;
      return;
    }
  }

  if (statusEl)
    statusEl.textContent = `⏳ Lade Level ${fromLevel}–${toLevel - 1} (ca. ${levelCount * 9}s)…`;

  try {
    const partySize =
      parseInt(document.getElementById("partySize")?.value) || 2;
    const playersInGame = Math.max(
      parseInt(document.getElementById("playersInGame")?.value) || 8,
      partySize,
    );
    const location =
      document.getElementById("liveExpLocation")?.value || "chaos";
    const p2 = parseInt(document.getElementById("p2Level")?.value) || 60;
    const p3 = parseInt(document.getElementById("p3Level")?.value) || 60;
    const p4 = parseInt(document.getElementById("p4Level")?.value) || 60;
    const p5 = parseInt(document.getElementById("p5Level")?.value) || 60;
    const p6 = parseInt(document.getElementById("p6Level")?.value) || 60;
    const p7 = parseInt(document.getElementById("p7Level")?.value) || 90;
    const p8 = parseInt(document.getElementById("p8Level")?.value) || 90;

    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set("fromLevel", fromLevel);
    url.searchParams.set("toLevel", toLevel);
    url.searchParams.set("partySize", partySize);
    url.searchParams.set("playersInGame", playersInGame);
    url.searchParams.set("location", location);
    url.searchParams.set("p2", p2);
    url.searchParams.set("p3", p3);
    url.searchParams.set("p4", p4);
    url.searchParams.set("p5", p5);
    url.searchParams.set("p6", p6);
    url.searchParams.set("p7", p7);
    url.searchParams.set("p8", p8);

    // ── Fix 2: Eindeutige Request-ID gegen Google-Duplikate ───────────────
    url.searchParams.set("requestId", crypto.randomUUID());

    // ── Fix 3: AbortController – Timeout = levelCount * 12s + 10s Puffer ──
    const timeoutMs = levelCount * 12000 + 10000;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();

    // Duplikat-Request wurde vom Script abgewiesen – kein Fehler für den User
    if (json.duplicate) {
      if (statusEl)
        statusEl.textContent =
          "⚠️ Duplikat-Request abgewiesen – bitte nochmal versuchen.";
      return;
    }

    if (!json.success) throw new Error(json.error || "Unbekannter Fehler");

    if (!json.data || Object.keys(json.data).length === 0) {
      throw new Error("Keine EXP-Daten vom Sheet erhalten");
    }
    liveExpData = { ...(liveExpData || {}), ...json.data };
    calculate();

    const areaLabel =
      location === "tal" ? "Canyon and Tal Rashas Tombs" : "Chaos Sanctuary";
    if (statusEl)
      statusEl.textContent = `✅ ${areaLabel}, Level ${fromLevel}–${toLevel - 1}, Party ${partySize}, ${playersInGame} Spieler – Boni im Rechner (${new Date().toLocaleTimeString()})`;
  } catch (err) {
    console.error("fetchLiveExpFromSheet:", err);
    if (err.name === "AbortError") {
      if (statusEl)
        statusEl.textContent = `❌ Timeout nach ${Math.round(levelCount * 12 + 10)}s – Range verkleinern oder EXP Von/Bis nutzen.`;
    } else {
      if (statusEl) statusEl.textContent = `❌ Fehler: ${err.message}`;
    }
  } finally {
    if (fetchBtn) fetchBtn.disabled = false;
  }
}

function switchRows(isD4) {
  const tbody = document.querySelector("tbody");
  if (!tbody) return;

  // Clear existing rows
  tbody.innerHTML = "";

  // Get the appropriate row set
  const rowSet = isD4 ? d4Rows : d2rRows;

  // Create rows for each level range
  rowSet.forEach((levelRange, index) => {
    const row = createRowElement(levelRange, index === 0);
    tbody.appendChild(row);
  });

  // If no rows exist, create a default first row
  if (rowSet.length === 0) {
    const defaultRange = isD4 ? "1-60" : "1-99";
    const row = createRowElement(defaultRange, true);
    tbody.appendChild(row);

    // Add to the appropriate array
    if (isD4) {
      d4Rows.push(defaultRange);
    } else {
      d2rRows.push(defaultRange);
    }
  }
}

function validateLevelRange(levelRange, isD4) {
  const [lvlFromString, lvlToString] = levelRange.split("-");
  const lvlFrom = Number(lvlFromString);
  const lvlTo = Number(lvlToString);
  const maxLevel = isD4 ? 300 : 99;

  if (isNaN(lvlFrom) || isNaN(lvlTo)) {
    return {
      valid: false,
      error: "Please enter two numbers separated by a - (e.g., 1-60)",
    };
  }

  if (lvlFrom < 1 || lvlTo > maxLevel) {
    return {
      valid: false,
      error: `Level range must be between 1 and ${maxLevel}`,
    };
  }

  if (lvlFrom > lvlTo) {
    return {
      valid: false,
      error: "End level must be higher than start level",
    };
  }

  // D2R specific validation
  if (!isD4) {
    const partySize = parseInt(document.getElementById("partySize").value) || 1;
    if (partySize === 1 && lvlFrom < 60) {
      return {
        valid: false,
        error: "For party size 1, starting level must be at least 60",
      };
    }
  }

  return {
    valid: true,
    from: lvlFrom,
    to: lvlTo,
  };
}

/**
 * Summe aller EXP-Boni in % (nur UI – Live-Sheet liefert Basis-EXP ohne diese).
 * Shrine: alle Level; Ondal's ab 66; Anni + Anc Jewel ab 70.
 */
function getD2RExpBonusPercent(level) {
  const expShrineBonus = document.getElementById("expShrine")?.checked ? 50 : 0;
  const anniBonus =
    parseInt(document.getElementById("anniBonus")?.value, 10) || 0;
  const ancJewelBonus =
    parseInt(document.getElementById("ancJewelBonus")?.value, 10) || 0;
  const ondalsBonus = document.getElementById("ondalsWisdom")?.checked ? 5 : 0;

  let bonus = expShrineBonus;
  if (level >= 70 && anniBonus > 0) bonus += anniBonus;
  if (level >= 75 && ancJewelBonus > 0) bonus += ancJewelBonus;
  if (level >= 66 && ondalsBonus > 0) bonus += ondalsBonus;
  return bonus;
}

/** Basis-EXP pro Run aus Live- oder Fallback-Daten (ohne Anni/Anc/Shrine/Ondal's). */
function getD2RBaseExpPerRun(expSource, level, partySize) {
  if (!expSource) return 0;
  const levelEntry = expSource[level] ?? expSource[String(level)];
  if (!levelEntry) return 0;
  const raw = levelEntry[partySize] ?? levelEntry[String(partySize)];
  const base = Number(raw);
  return Number.isFinite(base) ? base : 0;
}

/** Wendet UI-Boni auf Sheet-/Fallback-Basis-EXP an (immer, auch bei Live-Daten). */
function applyD2RExpBonuses(baseExpPerRun, level) {
  if (!baseExpPerRun) return 0;
  const bonusPercent = getD2RExpBonusPercent(level);
  if (bonusPercent <= 0) return baseExpPerRun;
  return baseExpPerRun * (1 + bonusPercent / 100);
}

function calculateD2RExperience(from, to, partySize) {
  let totalRuns = 0;
  let currentLevel = from;

  const expSource = liveExpData || d2rLevelExpData;

  while (currentLevel < to) {
    const currentLevelData = D2RlevelData[currentLevel - 1];
    const nextLevelData = D2RlevelData[currentLevel];
    const expNeededForNextLevel = nextLevelData[2] - currentLevelData[2];

    const baseExpPerRun = getD2RBaseExpPerRun(
      expSource,
      currentLevel,
      partySize,
    );
    if (baseExpPerRun === 0) {
      currentLevel++;
      continue;
    }

    const expPerRun = applyD2RExpBonuses(baseExpPerRun, currentLevel);
    totalRuns += expNeededForNextLevel / expPerRun;
    currentLevel++;
  }

  return Math.ceil(totalRuns);
}

function calculateD4Experience(from, to, expPerDungeon) {
  const lvlDataFrom = D4levelData[from - 1];
  const lvlDataTo = D4levelData[to - 1];
  const expNeeded = lvlDataTo[2] - lvlDataFrom[2];
  return Math.ceil(expNeeded / expPerDungeon);
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);
  return (hours > 0 ? `${hours} h ` : "") + `${remainingMinutes} m`;
}

function calculate() {
  const isD4 = document.getElementById("d4Radio").checked;
  const expPerDungeon = parseFloat(document.getElementById("exp").value) || 0;
  const timePerDungeon = parseFloat(document.getElementById("time").value) || 0;
  const costPerDungeon = parseFloat(document.getElementById("cost").value) || 0;

  const rows = document.querySelectorAll("tbody tr");
  for (const row of rows) {
    const input = row.querySelector(".powerleveling");
    if (!input) continue;

    const levelRange = input.value.trim();
    if (!levelRange) {
      clearRowCalculations(row);
      continue;
    }

    // Validate level range
    const validation = validateLevelRange(levelRange, isD4);
    if (!validation.valid) {
      input.classList.add("invalid");
      if (!row.querySelector(".error")) {
        const span = document.createElement("span");
        span.classList.add("error");
        span.setAttribute("role", "alert");
        input.after(span);
      }
      row.querySelector(".error").innerText = validation.error;
      clearRowCalculations(row);
      continue;
    }

    // Clear error state
    input.classList.remove("invalid");
    const errorSpan = row.querySelector(".error");
    if (errorSpan) {
      errorSpan.remove();
    }

    // Calculate runs needed
    let totalRuns;
    if (isD4) {
      totalRuns = calculateD4Experience(
        validation.from,
        validation.to,
        expPerDungeon,
      );
    } else {
      const partySize =
        parseInt(document.getElementById("partySize").value) || 1;
      totalRuns = calculateD2RExperience(
        validation.from,
        validation.to,
        partySize,
      );
    }

    // Calculate time and cost
    const totalTime = totalRuns * timePerDungeon;
    const totalCost = totalRuns * costPerDungeon;

    // Update row
    row.querySelector(".runs").innerText = totalRuns;
    row.querySelector(".cost").innerText = `${totalCost.toFixed(0)} fg`;
    row.querySelector(".time").innerText = formatTime(totalTime);
  }
}

function getCurrentState() {
  const isD4 = document.getElementById("d4Radio").checked;
  const gameValues = isD4 ? d4Values : d2rValues;

  const state = {
    game: isD4 ? "d4" : "d2r",
    values: {
      exp: gameValues.exp,
      time: gameValues.time,
      cost: gameValues.cost,
    },
    powerleveling: [],
    results: [],
    previousD2RRows: previousD2RRows, // Store previous rows in state
  };

  // Add D2R specific values
  if (!isD4) {
    state.d2r = {
      partySize: document.getElementById("partySize").value,
      playersInGame: document.getElementById("playersInGame").value,
      liveExpLocation:
        document.getElementById("liveExpLocation")?.value || "chaos",
      liveExpFromLevel:
        document.getElementById("liveExpFromLevel")?.value || "",
      liveExpToLevel: document.getElementById("liveExpToLevel")?.value || "",
      anniBonus: document.getElementById("anniBonus").value,
      ancJewelBonus: document.getElementById("ancJewelBonus").value,
      expShrine: document.getElementById("expShrine").checked,
      ondalsWisdom: document.getElementById("ondalsWisdom").checked,
    };
  }

  // Add powerleveling values and their results
  document.querySelectorAll("tbody tr").forEach((row) => {
    const input = row.querySelector(".powerleveling");
    const runs = row.querySelector(".runs");
    const cost = row.querySelector(".cost");
    const time = row.querySelector(".time");

    if (input && input.value.trim()) {
      state.powerleveling.push(input.value);

      // Include results even if there are errors
      state.results.push({
        runs: runs ? runs.innerText : "",
        cost: cost ? cost.innerText : "",
        time: time ? time.innerText : "",
        hasError:
          row.querySelector(".error") !== null ||
          input.classList.contains("invalid"),
      });
    }
  });

  return state;
}

function saveStateToHash() {
  const state = getCurrentState();
  const base64 = btoa(JSON.stringify(state));

  // Use history.pushState instead of directly setting window.location.hash
  // This prevents the page from reloading
  const newUrl = window.location.pathname + "#" + base64;
  history.pushState(null, "", newUrl);
}

function restoreStateFromHash() {
  if (!window.location.hash) {
    // Set default values for D4 (since it's checked by default)
    updatePresetValues(true, true);
    initializeGameElements(isD4);
    switchRows(true);
    calculate();
    return;
  }

  try {
    const hash = window.location.hash.substring(1);
    const state = JSON.parse(atob(hash));

    // Set game type
    const isD4 = state.game === "d4";
    document.getElementById("d4Radio").checked = isD4;
    document.getElementById("d2rRadio").checked = !isD4;

    // Update labels and values
    updateLabels(isD4);
    updatePresetValues(isD4);

    // Restore previous D2R rows if they exist
    if (state.previousD2RRows) {
      previousD2RRows = state.previousD2RRows;
    }

    // Restore D2R specific values
    if (!isD4 && state.d2r) {
      const {
        partySize,
        playersInGame,
        liveExpLocation,
        liveExpFromLevel,
        liveExpToLevel,
        anniBonus,
        ancJewelBonus,
        expShrine,
        ondalsWisdom,
      } = state.d2r;
      document.getElementById("partySize").value = partySize;
      if (playersInGame != null) {
        document.getElementById("playersInGame").value = playersInGame;
      }
      if (liveExpLocation != null) {
        document.getElementById("liveExpLocation").value = liveExpLocation;
      }
      if (liveExpFromLevel != null) {
        document.getElementById("liveExpFromLevel").value = liveExpFromLevel;
      }
      if (liveExpToLevel != null) {
        document.getElementById("liveExpToLevel").value = liveExpToLevel;
      }
      document.getElementById("anniBonus").value = anniBonus;
      if (ancJewelBonus != null) {
        document.getElementById("ancJewelBonus").value = ancJewelBonus;
      }
      document.getElementById("expShrine").checked = expShrine;
      document.getElementById("ondalsWisdom").checked = ondalsWisdom;
    }

    // Toggle D2R options visibility
    const partySizeContainer = document.getElementById("partySizeContainer");
    const d2rBonusContainer = document.getElementById("d2rBonusContainer");
    const d2rCheckboxContainer = document.getElementById(
      "d2rCheckboxContainer",
    );

    if (partySizeContainer)
      partySizeContainer.style.display = isD4 ? "none" : "inline-block";
    if (d2rBonusContainer)
      d2rBonusContainer.style.display = isD4 ? "none" : "inline-flex";
    if (d2rCheckboxContainer)
      d2rCheckboxContainer.style.display = isD4 ? "none" : "flex";

    // Update rows based on game type and stored values
    if (isD4) {
      d4Rows = state.powerleveling;
    } else {
      d2rRows = state.powerleveling;
    }

    // Switch rows and calculate
    switchRows(isD4);
    calculate();
  } catch (error) {
    console.error("Error restoring state:", error);
    // Fallback to defaults
    updatePresetValues(true, true);
    switchRows(true);
    calculate();
  }
}

function createShareableTable() {
  const table = document.createElement("table");
  table.className = "border center-align";

  // Add header
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th scope="col">Level Range</th>
      <th scope="col">Required Runs</th>
      <th scope="col">Total Cost</th>
      <th scope="col">Time to Complete</th>
    </tr>
  `;
  table.appendChild(thead);

  // Add body
  const tbody = document.createElement("tbody");
  document.querySelectorAll("tbody tr").forEach((row) => {
    const levelRange = row.querySelector(".powerleveling").value;
    const runs = row.querySelector(".runs").innerText;
    const cost = row.querySelector(".cost").innerText;
    const time = row.querySelector(".time").innerText;
    const hasError =
      row.querySelector(".error") !== null ||
      row.querySelector(".powerleveling").classList.contains("invalid");

    // Only add rows that have input values
    if (levelRange) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${levelRange}</td>
        <td>${runs || (hasError ? "Error" : "")}</td>
        <td>${cost || (hasError ? "Error" : "")}</td>
        <td>${time || (hasError ? "Error" : "")}</td>
      `;
      tbody.appendChild(tr);
    }
  });
  table.appendChild(tbody);

  return table;
}

function saveShareableStateToHash() {
  // Force a calculation to ensure values are up to date
  calculate();

  const state = getCurrentState();
  const timestamp = Date.now();
  const shareableState = {
    ...state,
    timestamp,
    type: "share",
  };
  return btoa(JSON.stringify(shareableState));
}

function createShareableView(hash) {
  try {
    const state = JSON.parse(atob(hash));
    if (state.type !== "share") return null;

    const container = document.createElement("div");
    container.className = "responsive dark";

    // Add header
    const header = document.createElement("header");
    header.className = "secondary-container";
    header.innerHTML = `
      <nav>
        <button class="circle transparent" aria-label="Diablo icon">
          <img class="responsive" src="icon.ico" alt="Diablo game icon" />
        </button>
        <h5 class="max center-align">${
          state.game === "d4" ? "Diablo 4" : "D2R"
        } Powerleveling Calculator</h5>
        <button class="circle transparent" aria-label="Diablo icon">
          <img class="responsive" src="icon.ico" alt="Diablo game icon" />
        </button>
      </nav>
    `;
    container.appendChild(header);

    // Create main content
    const main = document.createElement("main");
    main.className = "responsive";

    // Create article
    const article = document.createElement("article");
    article.className = "fill";

    // Create table
    const table = document.createElement("table");
    table.className = "border center-align";

    // Add header - removed Required Runs column
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th scope="col">Level Range</th>
        <th scope="col">Total Cost</th>
        <th scope="col">Time to Complete</th>
      </tr>
    `;
    table.appendChild(thead);

    // Add body - removed Required Runs column
    const tbody = document.createElement("tbody");
    state.powerleveling.forEach((range, index) => {
      const result = state.results[index];
      if (result) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${range}</td>
          <td>${result.cost}</td>
          <td>${result.time}</td>
        `;
        tbody.appendChild(tr);
      }
    });
    table.appendChild(tbody);

    article.appendChild(table);
    main.appendChild(article);
    container.appendChild(main);

    return container.outerHTML;
  } catch (error) {
    console.error("Error creating share view:", error);
    return null;
  }
}

function initializeCalculator() {
  try {
    // Set up initial state
    const isD4 = document.getElementById("d4Radio").checked;

    // Initialize game-specific elements
    initializeGameElements(isD4);

    // Set up initial values
    updateLabels(isD4);
    updatePresetValues(isD4, true);

    // Set up initial row and listeners
    setupInitialRow();
    setupListeners();

    // Perform initial calculation
    calculate();

    // Restore state from URL if present
    if (window.location.hash && !window.location.hash.includes("#share=")) {
      restoreStateFromHash();
    }
  } catch (error) {
    console.error("Error initializing calculator:", error);
    alert("Error initializing calculator. Please refresh the page.");
  }
}

function setupInitialRow() {
  const tbody = document.querySelector("tbody");
  if (!tbody) return;

  // Clear any existing rows
  tbody.innerHTML = "";

  // Get current game type
  const isD4 = document.getElementById("d4Radio").checked;

  // Get default rows for the current game type
  const defaultRows = isD4 ? d4Rows : d2rRows;

  // Add default rows
  defaultRows.forEach((levelRange, index) => {
    const row = createRowElement(levelRange, index === 0);
    tbody.appendChild(row);
  });
}

// Update the DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
  // Check if this is a share link
  if (window.location.hash.includes("#share=")) {
    const hashParts = window.location.hash.split("&");
    const hash = hashParts[0].substring(7);
    const shareView = createShareableView(hash);
    if (shareView) {
      document.body.innerHTML = shareView;
      return;
    }
  }

  // Initialize calculator
  initializeCalculator();
});

// Update the hashchange listener
window.addEventListener("hashchange", function () {
  if (window.location.hash.includes("#share=")) {
    const hashParts = window.location.hash.split("&");
    const hash = hashParts[0].substring(7);
    const shareView = createShareableView(hash);
    if (shareView) {
      document.body.innerHTML = shareView;
      return;
    }
  }

  // Normal initialization for non-share links
  restoreStateFromHash();
  setupListeners();
});
