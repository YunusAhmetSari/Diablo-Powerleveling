/**
 * D2R Powerleveling – Apps Script API
 *
 * Liest EXP pro Run aus dem Sheet (Chaos Sanctuary: Spalte G → I,
 * Canyon and Tal Rashas Tombs: Spalte L → N). Basis-EXP ohne Anni/Anc Jewel/
 * Exp Shrine/Ondal's – diese Boni werden nur im Frontend berechnet.
 *
 * Pro Level: Character Level (C4) setzen, Sheet neu berechnen, EXP-Zelle lesen.
 *
 * ZELL-ADRESSEN (in deiner Sheet-Kopie prüfen):
 *   C4  = Character Level
 *   C5  = Players in Game
 *   C6  = Party Size
 *   C16–C22 = Player 2–8 Level
 */

const CHAR_LEVEL_CELL = "C4";
const PLAYERS_GAME_CELL = "C5";
const PARTY_SIZE_CELL = "C6";
const PLAYER_CELLS = ["C16", "C17", "C18", "C19", "C20", "C21", "C22"];

const EXP_LOCATIONS = {
  chaos: { labelCol: 7, expCol: 9, label: "Chaos Sanctuary" },
  tal: { labelCol: 12, expCol: 14, label: "Canyon and Tal Rashas Tombs" },
};

function findExpCell(sheet, locationKey) {
  const loc = EXP_LOCATIONS[locationKey] || EXP_LOCATIONS.chaos;
  const colData = sheet.getRange(1, loc.labelCol, 40, 1).getValues();
  for (let i = 0; i < colData.length; i++) {
    if (String(colData[i][0]).trim() === loc.label) {
      return sheet.getRange(i + 1, loc.expCol);
    }
  }
  throw new Error(
    loc.label + " nicht in Spalte " + loc.labelCol + " gefunden!",
  );
}

function doGet(e) {
  try {
    const p = e.parameter || {};

    // ── Duplikat-Schutz via CacheService ─────────────────────────────────
    const requestId = p.requestId || "";
    if (requestId) {
      const cache = CacheService.getScriptCache();
      if (cache.get(requestId)) {
        // Dieser Request wurde bereits bearbeitet – sofort abweisen
        return jsonResponse_({
          success: false,
          error: "Duplicate request ignored",
          duplicate: true,
        });
      }
      // Request als "in Bearbeitung" markieren (10 Minuten TTL)
      cache.put(requestId, "1", 600);
    }

    // ── Parameter einlesen ────────────────────────────────────────────────
    const fromLevel = intOrNull(p.fromLevel) ?? 1;
    const toLevel = intOrNull(p.toLevel) ?? 99;
    const partySize = intOrNull(p.partySize) ?? 2;
    const playersInGame = intOrNull(p.playersInGame) ?? 8;
    const location = p.location === "tal" ? "tal" : "chaos";
    const playerLevels = [
      intOrNull(p.p2) ?? 60,
      intOrNull(p.p3) ?? 60,
      intOrNull(p.p4) ?? 60,
      intOrNull(p.p5) ?? 60,
      intOrNull(p.p6) ?? 60,
      intOrNull(p.p7) ?? 90,
      intOrNull(p.p8) ?? 99,
    ];

    // Validierung: Players in Game muss >= Party Size sein
    const effectivePlayers = Math.max(playersInGame, partySize);

    if (fromLevel < 1 || toLevel > 99 || fromLevel >= toLevel) {
      throw new Error(
        "Ungültige Level-Range: fromLevel=" +
          fromLevel +
          ", toLevel=" +
          toLevel,
      );
    }
    const levelCount = toLevel - fromLevel;
    if (levelCount > 99) {
      throw new Error("Maximal 99 Level pro Anfrage erlaubt.");
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    const charLevelRange = sheet.getRange(CHAR_LEVEL_CELL);
    const originalCharLevel = charLevelRange.getValue();

    // ── Feste Einstellungen setzen (einmalig) ─────────────────────────────
    sheet.getRange(PLAYERS_GAME_CELL).setValue(effectivePlayers);
    sheet.getRange(PARTY_SIZE_CELL).setValue(partySize);
    PLAYER_CELLS.forEach((cell, i) => {
      sheet.getRange(cell).setValue(playerLevels[i]);
    });
    SpreadsheetApp.flush();

    // ── Pro Level: C4 setzen → EXP-Zelle auslesen ────────────────────────────
    const result = {};
    try {
      for (let lvl = fromLevel; lvl < toLevel; lvl++) {
        charLevelRange.setValue(lvl);
        SpreadsheetApp.flush();

        const expCell = findExpCell(sheet, location);
        const expVal = expCell.getValue();
        result[lvl] = {};
        result[lvl][partySize] =
          typeof expVal === "number" ? Math.round(expVal) : 0;
      }
    } finally {
      charLevelRange.setValue(originalCharLevel);
      SpreadsheetApp.flush();
    }

    return jsonResponse_({
      success: true,
      fetchedLevels: `${fromLevel}–${toLevel - 1}`,
      partySize,
      playersInGame: effectivePlayers,
      location,
      data: result,
    });
  } catch (err) {
    return jsonError_(err.toString());
  }
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function intOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function jsonError_(msg) {
  return ContentService.createTextOutput(
    JSON.stringify({ success: false, error: msg }),
  ).setMimeType(ContentService.MimeType.JSON);
}

// ── Test (ohne Deployment im Editor ausführen) ───────────────────────────────
function testScript() {
  const r = doGet({
    parameter: {
      fromLevel: "1",
      toLevel: "5",
      partySize: "2",
      playersInGame: "8",
      location: "chaos",
      p2: "60",
      p3: "60",
      p4: "60",
      p5: "60",
      p6: "60",
      p7: "90",
      p8: "90",
    },
  });
  const json = JSON.parse(r.getContent());
  Logger.log("Erfolg: " + json.success);
  Logger.log("Level 1 Party 2: " + JSON.stringify(json.data[1]));
  Logger.log("Level 4 Party 2: " + JSON.stringify(json.data[4]));
}
