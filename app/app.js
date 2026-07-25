const data = window.BIRD_DATA;
const nodes = data.nodes;
const nodeById = new Map(nodes.map((node) => [node.id, node]));
const childrenById = new Map(nodes.map((node) => [node.id, node.childrenIds || []]));

let selectedId = "aves";
let expanded = new Set(["aves", "neornithes", "neognathae", "neoaves", "strisores", "telluraves"]);

const els = {
  search: document.querySelector("#searchInput"),
  quickList: document.querySelector("#quickList"),
  resultCount: document.querySelector("#resultCount"),
  clearSearch: document.querySelector("#clearSearch"),
  results: document.querySelector("#results"),
  tree: document.querySelector("#tree"),
  treeTitle: document.querySelector("#treeTitle"),
  detail: document.querySelector("#detail"),
  lineage: document.querySelector("#lineage"),
  comparisonBlock: document.querySelector("#comparisonBlock"),
  comparisons: document.querySelector("#comparisons"),
  sourceNote: document.querySelector("#sourceNote"),
  collapseAll: document.querySelector("#collapseAll"),
  expandPath: document.querySelector("#expandPath"),
};

const rankLabels = {
  class: "class",
  subclass: "subclass",
  clade: "clade",
  order: "order",
  family: "family",
  species: "species",
};

function displayName(node) {
  const zh = node.chineseName ? `${node.chineseName} ` : "";
  return `${zh}${node.scientificName}`;
}

function subtitle(node) {
  if (node.rank === "species") return node.englishName;
  if (node.englishName && node.englishName !== node.scientificName) return node.englishName;
  return node.rank;
}

function searchableText(node) {
  return [
    node.chineseName,
    node.englishName,
    node.scientificName,
    node.pinyin,
    node.initials,
    node.ebirdCode,
    node.avibaseId,
    ...(node.regionTags || []),
    node.rank,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function lineageOf(id) {
  const path = [];
  let cursor = nodeById.get(id);
  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? nodeById.get(cursor.parentId) : null;
  }
  return path;
}

function expandLineage(id) {
  for (const node of lineageOf(id)) expanded.add(node.id);
}

function selectNode(id, scroll = false) {
  selectedId = id;
  expandLineage(id);
  renderAll();
  if (scroll) {
    const row = document.querySelector(`[data-node-id="${id}"]`);
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function rankScore(rank) {
  return { class: 0, clade: 1, order: 2, family: 3, species: 4 }[rank] ?? 9;
}

function searchNodes(query) {
  const q = query.trim().toLowerCase();
  if (!q) return nodes.filter((node) => ["clade", "order"].includes(node.rank)).slice(0, 24);
  const parts = q.split(/\s+/).filter(Boolean);
  return nodes
    .map((node) => {
      const haystack = searchableText(node);
      const matched = parts.every((part) => haystack.includes(part));
      if (!matched) return null;
      const exact =
        [node.chineseName, node.englishName, node.scientificName, node.ebirdCode]
          .filter(Boolean)
          .some((value) => value.toLowerCase() === q);
      return { node, score: (exact ? -10 : 0) + rankScore(node.rank) };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.node.scientificName.localeCompare(b.node.scientificName))
    .slice(0, 60)
    .map((entry) => entry.node);
}

function renderResults() {
  const found = searchNodes(els.search.value);
  els.resultCount.textContent = `${found.length} results`;
  els.results.replaceChildren(
    ...found.map((node) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `result-item ${node.id === selectedId ? "active" : ""}`;
      button.innerHTML = `
        <span class="result-name">${displayName(node)}</span>
        <span class="result-meta">${rankLabels[node.rank]} · ${subtitle(node)}</span>
      `;
      button.addEventListener("click", () => selectNode(node.id, true));
      return button;
    }),
  );
}

function renderTreeNode(id, lineageIds) {
  const node = nodeById.get(id);
  const childIds = childrenById.get(id) || [];
  const hasChildren = childIds.length > 0;
  const isOpen = expanded.has(id);
  const li = document.createElement("li");

  const row = document.createElement("div");
  row.className = [
    "node-row",
    id === selectedId ? "selected" : "",
    lineageIds.has(id) ? "in-lineage" : "",
  ]
    .filter(Boolean)
    .join(" ");
  row.dataset.nodeId = id;

  const twisty = document.createElement("button");
  twisty.type = "button";
  twisty.className = `twisty ${hasChildren ? "" : "empty"}`;
  twisty.textContent = isOpen ? "−" : "+";
  twisty.title = isOpen ? "Collapse" : "Expand";
  twisty.addEventListener("click", (event) => {
    event.stopPropagation();
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
    renderTree();
  });

  const main = document.createElement("button");
  main.type = "button";
  main.className = "node-main";
  main.innerHTML = `
    <span class="node-name">${displayName(node)}</span>
    <span class="node-sub">${subtitle(node)}</span>
  `;
  main.addEventListener("click", () => selectNode(id));

  const rank = document.createElement("span");
  rank.className = "rank-pill";
  rank.textContent = rankLabels[node.rank] || node.rank;

  row.append(twisty, main, rank);
  li.append(row);

  if (hasChildren && isOpen) {
    const ul = document.createElement("ul");
    childIds.forEach((childId) => ul.append(renderTreeNode(childId, lineageIds)));
    li.append(ul);
  }
  return li;
}

function renderTree() {
  const lineageIds = new Set(lineageOf(selectedId).map((node) => node.id));
  const root = document.createElement("ul");
  root.append(renderTreeNode("aves", lineageIds));
  els.tree.replaceChildren(root);
}

function renderDetail() {
  const node = nodeById.get(selectedId);
  els.treeTitle.textContent = displayName(node);
  const traits = node.traits?.length
    ? `<ul class="trait-list">${node.traits.map((trait) => `<li>${trait}</li>`).join("")}</ul>`
    : "";
  const range = node.range
    ? `<div class="fact"><strong>分布</strong><span>${node.range}</span></div>`
    : "";
  const count = node.speciesCountClements
    ? `<div class="fact"><strong>物种数</strong><span>AviList v2025b 中 ${node.speciesCountClements} 种</span></div>`
    : "";
  const code = node.ebirdCode ? `<div class="fact"><strong>eBird code</strong><span>${node.ebirdCode}</span></div>` : "";
  const pinyin = node.pinyin ? `<div class="fact"><strong>拼音</strong><span>${node.pinyin}</span></div>` : "";
  const sortBasis = node.sortBasis ? `<div class="fact"><strong>排序</strong><span>${node.sortBasis}</span></div>` : "";
  const iucn = node.iucn ? `<div class="fact"><strong>IUCN</strong><span>${node.iucn}</span></div>` : "";
  const regionTags = node.regionTags?.length
    ? `<div class="fact"><strong>区域</strong><span>${node.regionTags.join("、")}</span></div>`
    : "";
  const china = node.chinaChecklist;
  const derivedGenus = node.chinaGenusNameCandidate;
  const chinaFacts = china
    ? `
      <div class="fact"><strong>中国名录</strong><span>${china.chineseName} · ${china.englishName}</span></div>
      <div class="fact"><strong>名录学名</strong><span>${china.scientificNameOriginal}${china.scientificNameOriginal !== node.scientificName ? " → AviList: " + node.scientificName : ""}</span></div>
      <div class="fact"><strong>保护等级</strong><span>${china.protection || "n/a"} · IUCN ${china.iucn || "n/a"}</span></div>
    `
    : "";
  const chinaNote = china?.notes
    ? `<p class="summary"><strong>中国名录备注：</strong>${china.notes}</p>`
    : "";
  const names = node.englishNameClements || node.englishNameBirdLife
    ? `<div class="fact"><strong>名称对照</strong><span>Clements: ${node.englishNameClements || "n/a"} · BirdLife: ${node.englishNameBirdLife || "n/a"}</span></div>`
    : "";
  const links = [node.birdsOfTheWorldUrl, node.birdLifeUrl].filter(Boolean);
  const linkFact = links.length
    ? `<div class="fact"><strong>链接</strong><span>${links.map((url) => `<a href="${url}" target="_blank" rel="noreferrer">${new URL(url).hostname}</a>`).join(" · ")}</span></div>`
    : "";
  const decision = node.decisionSummary
    ? `<p class="summary"><strong>分类说明：</strong>${node.decisionSummary}</p>`
    : "";

  els.detail.innerHTML = `
    <div class="detail-title">
      <div>
        <p class="kicker">${rankLabels[node.rank] || node.rank}</p>
        <h2>${node.chineseName || node.englishName || node.scientificName}</h2>
        <div class="latin">${node.scientificName}</div>
      </div>
      <span class="rank-pill">${node.rank}</span>
    </div>
    ${node.summary ? `<p class="summary">${node.summary}</p>` : `<p class="summary summary-empty">这里空空的，搬运工冰鹡鸰还没有跑到这里～</p>`}
    <div class="facts">
      <div class="fact"><strong>英文</strong><span>${node.englishName || "待补"}</span></div>
      <div class="fact"><strong>中文</strong><span>${node.chineseName || "待补 / needs review"}</span></div>
      ${names}
      ${count}
      ${range}
      ${regionTags}
      ${chinaFacts}
      ${iucn}
      ${code}
      ${pinyin}
      ${sortBasis}
      ${linkFact}
      <div class="fact"><strong>来源</strong><span>${node.source || "Prototype data"}</span></div>
    </div>
    ${chinaNote}
    ${decision}
    ${traits}
  `;
}

function renderLineage() {
  const path = lineageOf(selectedId);
  els.lineage.replaceChildren(
    ...path.map((node) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${node.chineseName ? `${node.chineseName} ` : ""}${node.scientificName} · ${node.rank}`;
      button.addEventListener("click", () => selectNode(node.id, true));
      li.append(button);
      return li;
    }),
  );
}

function renderComparisons() {
  const selectedPath = new Set(lineageOf(selectedId).map((node) => node.id));
  const relevant = data.comparisons.filter((card) => {
    const contextIds = card.contextIds || [card.leftId, card.rightId];
    return selectedPath.has(card.leftId) || selectedPath.has(card.rightId) || contextIds.includes(selectedId);
  });
  els.comparisonBlock.hidden = relevant.length === 0;
  els.comparisons.replaceChildren(
    ...relevant.slice(0, 5).map((card) => {
      const div = document.createElement("article");
      div.className = "comparison-card";
      div.innerHTML = `
        <h3>${card.title}</h3>
        <p>${card.summary}</p>
        <p class="mini">相似点：${card.shared.join("、")}</p>
        <p class="mini">关键差别：${card.difference}</p>
      `;
      return div;
    }),
  );
}

function renderQuickList() {
  els.quickList.replaceChildren(
    ...data.quickStarts.map((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => {
        els.search.value = label;
        const first = searchNodes(label)[0];
        if (first) selectNode(first.id, true);
        renderResults();
      });
      return button;
    }),
  );
}

function renderSourceNote() {
  els.sourceNote.textContent = `${data.meta.avilistFile || data.meta.clementsFile}: ${data.meta.includedOrders} 个目、${data.meta.includedFamilies} 个科、${data.meta.includedGenera || 0} 个属、${data.meta.includedSpecies} 个物种。中国观鸟年报名录匹配 ${data.meta.chinaChecklistMatchedSpecies || 0}/${data.meta.chinaChecklistRows || 0} 行，未匹配/歧义 ${data.meta.chinaChecklistUnmatchedRows || 0} 行。${data.meta.warning}`;
}

function renderAll() {
  renderResults();
  renderTree();
  renderDetail();
  renderLineage();
  renderComparisons();
  renderSourceNote();
}

els.search.addEventListener("input", renderResults);
els.clearSearch.addEventListener("click", () => {
  els.search.value = "";
  renderResults();
  els.search.focus();
});
els.collapseAll.addEventListener("click", () => {
  expanded = new Set(["aves"]);
  renderTree();
});
els.expandPath.addEventListener("click", () => {
  expandLineage(selectedId);
  renderTree();
});

renderQuickList();
selectNode("strisores");
