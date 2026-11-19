// Leonida Ledger — GTA VI trophy guide and tracker.
// A static page: it fetches its own data file, keeps progress in the
// browser, and makes no network request of its own.
import {
  STORE_KEY,
  loadProgress,
  saveProgress,
  exportProgress,
  importProgressFile,
} from "./store.js";

// The six roadmap stages, in the order to play them. Stage numbers are
// stored on each trophy in data/trophies.json.
const STAGES = [
  {
    num: 1,
    title: "Story, start to finish",
    blurb:
      "Play the main missions in order: the opening, Chapters 1 to 4, the named story missions, and the final mission. Every chapter and mission trophy here is unmissable — it lands when the mission ends.",
  },
  {
    num: 2,
    title: "Contacts and strangers",
    blurb:
      "Finish the mission strands for Andy, Kenton, Billy, Randy and Tyrone, plus Bret's hunt, and complete eight stranger strands across Leonida. Take stranger missions when their markers appear; they are easy to walk past.",
  },
  {
    num: 3,
    title: "Activities and skills",
    blurb:
      "Sample all nine activity types, then work the long counts: 250 stunts, gold in all 42 Shooting Range challenges, drone races at all 14 spots, 20 different race wins, and 50 challenges. Meditation's 18 spots live here too.",
  },
  {
    num: 4,
    title: "Collectibles and the map",
    blurb:
      "Three card sets, WAiNK at 100 spots, 100 vehicles discovered, all 52 areas of Leonida, all 8 garages, and 10 vehicles on the Scooter Bros app. Fold these into exploring rather than grinding them in one sitting.",
  },
  {
    num: 5,
    title: "Crime, chaos and money",
    blurb:
      "Robberies with an escape, one illegal operation per gang, Combat Focus, and the money trophies: $250,000 laundered and $100,000 spent. Most of the missables live here, so read that list before each session.",
  },
  {
    num: 6,
    title: "Odd moments and cleanup",
    blurb:
      "The strange one-offs — a cocktail on Ocean Beach, a bowling alley, a second try, a choice count of 500 — then 100% completion, and the platinum last.",
  },
];

// What each source code in trophies.json means, in full words.
const SOURCE_LABELS = {
  exophase:
    "Official list — Exophase: the trophy's name, description and grade",
  psnprofiles: "PSNProfiles: the PSN progress target where the trophy has one",
  own: "Our own advice, from the official description — not yet checked in the game",
};

const KIND_LABELS = {
  story: "Story",
  activities: "Activities",
  collectibles: "Collectibles",
  crime: "Crime & money",
  platinum: "Platinum",
  online: "Online",
};

const $ = (id) => document.getElementById(id);

const state = {
  trophies: [],
  earned: loadProgress(),
  selectedId: 1,
  search: "",
  grade: "all",
  kind: "all",
  hideSpoilers: false,
  earnedOnly: false,
  view: "checklist",
};

function trophyById(id) {
  return state.trophies.find((t) => t.id === id);
}

function isEarned(trophy) {
  return state.earned.has(trophy.name);
}

// Spoiler rule: a hidden story trophy stays hidden until it is earned,
// while the spoiler setting is on. Earned trophies are always shown.
function isSpoilerHidden(trophy) {
  return state.hideSpoilers && trophy.hidden && !isEarned(trophy);
}

function displayName(trophy) {
  return isSpoilerHidden(trophy) ? "Hidden story trophy" : trophy.name;
}

function displayDescription(trophy) {
  return isSpoilerHidden(trophy)
    ? "Earn this trophy to reveal its story."
    : trophy.description;
}

function visibleTrophies() {
  const needle = state.search.trim().toLowerCase();
  return state.trophies.filter((t) => {
    if (state.grade !== "all" && t.grade !== state.grade) return false;
    if (state.kind === "missable" && !t.missable) return false;
    if (state.kind === "online") return false;
    if (state.kind !== "all" && state.kind !== "missable" && t.kind !== state.kind)
      return false;
    if (state.earnedOnly && !isEarned(t)) return false;
    if (needle) {
      const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

// ---- progress header ----
function renderProgress() {
  const total = state.trophies.length;
  const done = state.earned.size;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("progressText").textContent = `${done} of ${total} earned`;
  $("progressPct").textContent = `${pct}%`;
  $("progressFill").style.width = `${pct}%`;
  const counts = {};
  for (const t of state.trophies) {
    if (isEarned(t)) counts[t.grade] = (counts[t.grade] || 0) + 1;
  }
  const totals = {};
  for (const t of state.trophies) totals[t.grade] = (totals[t.grade] || 0) + 1;
  $("gradeCounts").textContent =
    `55 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze · 28 hidden · ` +
    `earned so far — platinum ${counts.platinum || 0}/1, gold ${counts.gold || 0}/2, ` +
    `silver ${counts.silver || 0}/6, bronze ${counts.bronze || 0}/46`;
  $("missableCount").textContent = String(
    state.trophies.filter((t) => t.missable).length,
  );
}

// ---- checklist ----
function gradeBadge(trophy) {
  const span = document.createElement("span");
  span.className = `grade-badge grade-${trophy.grade}`;
  span.textContent = trophy.grade;
  return span;
}

function tagRow(trophy) {
  const row = document.createElement("div");
  row.className = "tag-row";
  const kind = document.createElement("span");
  kind.className = "tag";
  kind.textContent = KIND_LABELS[trophy.kind] || trophy.kind;
  row.append(kind);
  if (trophy.missable) {
    const flag = document.createElement("span");
    flag.className = "tag missable";
    flag.textContent = "Missable";
    row.append(flag);
  }
  if (trophy.hidden) {
    const flag = document.createElement("span");
    flag.className = "tag hidden-flag";
    flag.textContent = "Hidden on PSN";
    row.append(flag);
  }
  if (trophy.target_label) {
    const target = document.createElement("span");
    target.className = "tag";
    target.textContent = `Target: ${trophy.target_label}`;
    row.append(target);
  }
  return row;
}

function renderList() {
  const list = $("trophyList");
  list.replaceChildren();
  const shown = visibleTrophies();
  $("listNote").textContent =
    state.kind === "online"
      ? "No online trophies: the official list holds no trophy that needs online play."
      : `Showing ${shown.length} of ${state.trophies.length} trophies. Tick a trophy when you earn it — it stays ticked in this browser.`;
  for (const trophy of shown) {
    const item = document.createElement("li");
    item.className = "trophy-row" + (isEarned(trophy) ? " earned" : "");
    if (trophy.id === state.selectedId) item.classList.add("selected");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = isEarned(trophy);
    box.setAttribute("aria-label", `Earned: ${displayName(trophy)}`);
    box.addEventListener("change", () => {
      if (box.checked) state.earned.add(trophy.name);
      else state.earned.delete(trophy.name);
      saveProgress(state.earned);
      renderProgress();
      renderList();
      renderRoadmap();
      renderMissables();
    });
    item.addEventListener("click", (event) => {
      if (event.target === box) return;
      state.selectedId = trophy.id;
      renderList();
      renderDetail();
    });
    const name = document.createElement("span");
    name.className = "trophy-name";
    name.textContent = displayName(trophy);
    const desc = document.createElement("span");
    desc.className = "trophy-desc";
    desc.textContent = displayDescription(trophy);
    item.append(box, name, gradeBadge(trophy), desc, tagRow(trophy));
    list.append(item);
  }
}

// ---- detail pane ----
function renderDetail() {
  const pane = $("detailPane");
  pane.replaceChildren();
  const trophy = trophyById(state.selectedId) || state.trophies[0];
  if (!trophy) return;
  const title = document.createElement("h2");
  title.textContent = displayName(trophy);
  const official = document.createElement("p");
  official.className = "official";
  official.textContent = `“${displayDescription(trophy)}” — official description`;
  const meta = document.createElement("p");
  meta.className = "meta-line";
  const stage = STAGES.find((s) => s.num === trophy.stage);
  meta.textContent =
    `${trophy.grade} · ${KIND_LABELS[trophy.kind] || trophy.kind}` +
    (trophy.missable ? " · Missable" : "") +
    (trophy.hidden ? " · Hidden on PSN" : "") +
    (trophy.target_label ? ` · Target: ${trophy.target_label}` : "") +
    (stage ? ` · Roadmap stage ${stage.num}: ${stage.title}` : "");
  const guideHead = document.createElement("h3");
  guideHead.textContent = "How to get it";
  const guide = document.createElement("p");
  guide.textContent = isSpoilerHidden(trophy)
    ? "Earn this trophy to reveal its guide."
    : trophy.guide;
  const srcHead = document.createElement("h3");
  srcHead.textContent = "Sources";
  const srcList = document.createElement("ul");
  srcList.className = "sources";
  for (const code of trophy.sources) {
    const li = document.createElement("li");
    li.textContent = SOURCE_LABELS[code] || code;
    srcList.append(li);
  }
  const earnedLine = document.createElement("p");
  earnedLine.className = "meta-line";
  earnedLine.textContent = isEarned(trophy)
    ? "Earned — ticked in your tracker."
    : "Not earned yet — tick the box in the list when it pops.";
  pane.append(title, official, meta, guideHead, guide, srcHead, srcList, earnedLine);
}

// ---- roadmap ----
function renderRoadmap() {
  const host = $("roadmapStages");
  host.replaceChildren();
  for (const stage of STAGES) {
    const card = document.createElement("section");
    card.className = "stage";
    const head = document.createElement("h2");
    const num = document.createElement("span");
    num.className = "stage-num";
    num.textContent = `Stage ${stage.num} — `;
    head.append(num, document.createTextNode(stage.title));
    const blurb = document.createElement("p");
    blurb.textContent = stage.blurb;
    const chips = document.createElement("ul");
    chips.className = "chips";
    for (const t of state.trophies.filter((x) => x.stage === stage.num)) {
      const li = document.createElement("li");
      if (isEarned(t)) li.className = "done";
      li.textContent =
        displayName(t) + (t.missable ? " · missable" : "");
      chips.append(li);
    }
    card.append(head, blurb, chips);
    host.append(card);
  }
}

// ---- missables ----
function renderMissables() {
  const host = $("missableList");
  host.replaceChildren();
  for (const t of state.trophies.filter((x) => x.missable)) {
    const card = document.createElement("article");
    card.className = "missable-card";
    const head = document.createElement("h2");
    head.textContent = displayName(t);
    const why = document.createElement("p");
    why.className = "why";
    why.textContent =
      `${t.grade} · ${KIND_LABELS[t.kind] || t.kind} · Roadmap stage ${t.stage}` +
      (isEarned(t) ? " · Earned" : " · Not earned yet");
    const guide = document.createElement("p");
    guide.textContent = isSpoilerHidden(t)
      ? "Earn this trophy to reveal its guide."
      : t.guide;
    card.append(head, why, guide);
    host.append(card);
  }
}

// ---- tabs, controls, boot ----
function showView(view) {
  state.view = view;
  for (const btn of document.querySelectorAll("#tabs .tab")) {
    btn.classList.toggle("active", btn.dataset.view === view);
  }
  $("view-checklist").classList.toggle("hidden", view !== "checklist");
  $("view-roadmap").classList.toggle("hidden", view !== "roadmap");
  $("view-missables").classList.toggle("hidden", view !== "missables");
}

function renderAll() {
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

async function boot() {
  const doc = await (await fetch("data/trophies.json")).json();
  state.trophies = doc.trophies;
  for (const btn of document.querySelectorAll("#tabs .tab")) {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  }
  $("search").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderList();
  });
  $("gradeFilter").addEventListener("change", (e) => {
    state.grade = e.target.value;
    renderList();
  });
  $("kindFilter").addEventListener("change", (e) => {
    state.kind = e.target.value;
    renderList();
  });
  $("spoilerToggle").addEventListener("change", (e) => {
    state.hideSpoilers = e.target.checked;
    renderList();
    renderDetail();
    renderRoadmap();
    renderMissables();
  });
  $("earnedOnly").addEventListener("change", (e) => {
    state.earnedOnly = e.target.checked;
    renderList();
  });
  $("exportBtn").addEventListener("click", () => exportProgress(state.earned));
  $("importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      state.earned = await importProgressFile(
        file,
        state.trophies.map((t) => t.name),
      );
      saveProgress(state.earned);
      renderAll();
    } catch {
      // A file that is not valid progress JSON is ignored, not fatal.
    }
    e.target.value = "";
  });
  $("resetBtn").addEventListener("click", () => {
    state.earned = new Set();
    saveProgress(state.earned);
    renderAll();
  });
  renderAll();
}

boot();
