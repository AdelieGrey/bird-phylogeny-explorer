const data = window.BIRD_DATA;
const nodes = data.nodes;
const nodeById = new Map(nodes.map((node) => [node.id, node]));
const childrenById = new Map(nodes.map((node) => [node.id, node.childrenIds || []]));

function isConnectorNode(node) {
  if (!node || node.displayMode === "card") return false;
  return node.displayMode === "connector" || (node.rank === "clade" && node.scientificName?.includes(" + "));
}

let selectedId = "aves";
let expanded = new Set(["aves", "neornithes"]);
let focusedPathIds = new Set();
let focusedChildByParent = new Map();
let pathOnlyRevealedIds = new Set();
let treeFeatherIndex = 0;
let pathOnly = false;

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
  relatedBlock: document.querySelector("#relatedBlock"),
  relatedContent: document.querySelector("#relatedContent"),
  sourceNote: document.querySelector("#sourceNote"),
  collapseAll: document.querySelector("#collapseAll"),
  expandPath: document.querySelector("#expandPath"),
  pathOnly: document.querySelector("#pathOnly"),
};

const rankLabels = {
  class: "class",
  subclass: "subclass",
  clade: "clade",
  order: "order",
  family: "family",
  subfamily: "subfamily",
  tribe: "tribe",
  genus: "genus",
  species: "species",
};

const stillerCitation =
  "Stiller, J., Feng, S., Chowdhury, AA. et al. Complexity of avian evolution revealed by family-level genomes. Nature 629, 851–860 (2024). https://doi.org/10.1038/s41586-024-07323-1";

const ostrowCitation =
  'Ostrow, E. N., Catanach, T. A., Bates, J. M., Aleixo, A., & Weckstein, J. D. (2023). Phylogenomic analysis confirms the relationships among toucans, toucan-barbets, and New World barbets but reveals paraphyly of Selenidera toucanets and evidence for mitonuclear discordance. Ornithology, 140(3), 1–13. DOI: <a href="https://doi.org/10.1093/ornithology/ukad022" target="_blank" rel="noreferrer">10.1093/ornithology/ukad022</a>';

const fuchsCitation =
  'Fuchs, J., Pons, J.-M., & Bowie, R. C. K. (2017). Biogeography and diversification dynamics of the African woodpeckers. Molecular Phylogenetics and Evolution, 108, 88–100. DOI: <a href="https://doi.org/10.1016/j.ympev.2017.01.007" target="_blank" rel="noreferrer">10.1016/j.ympev.2017.01.007</a>';

const shortCitation =
  'Short, L. L. (1971). The evolution of terrestrial woodpeckers. American Museum of Natural History. <a href="https://www.biodiversitylibrary.org/bibliography/207351" target="_blank" rel="noreferrer">Biodiversity Heritage Library</a>';

const b10kNote =
  "万种鸟类基因组计划（Bird 10,000 Genomes Project，简称 B10K）是一个由全球研究机构和博物馆共同参与的鸟类研究大型国际合作项目。该项目于2015年正式启动，计划通过收集鸟类样本、测序并组装基因组，逐步建立覆盖鸟类各目、科、属乃至所有物种的基因组数据库。截至目前，B10K 已发布数百种鸟类的基因组数据，覆盖绝大多数现生鸟类科，并利用这些数据构建了当前最全面的鸟类科级系统发育树。基于该项目的研究重新梳理了多个长期存在争议的类群关系，为后续的鸟类分类和比较基因组研究提供了基础，补充了鸟类早期快速辐射和主要演化分支的认识。";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function scientificNameHtml(node, value = node.scientificName) {
  const safeValue = escapeHtml(value);
  return node.rank === "species" ? `<em>${safeValue}</em>` : safeValue;
}

function displayName(node) {
  const zh = node.chineseName ? `${node.chineseName} ` : "";
  return `${zh}${node.scientificName}`;
}

function displayNameHtml(node) {
  const zh = node.chineseName ? `${escapeHtml(node.chineseName)} ` : "";
  return `${zh}${scientificNameHtml(node)}`;
}

function subtitle(node) {
  if (node.rank === "species") return node.englishName;
  if (node.englishName && node.englishName !== node.scientificName) return node.englishName;
  return node.rank;
}

function englishMetaName(node) {
  const value = node.englishName?.trim();
  if (!value || value === node.scientificName) return "";
  const normalized = value.toLowerCase();
  const rank = node.rank?.toLowerCase();
  const rankLabel = (rankLabels[node.rank] || node.rank || "").toLowerCase();
  if (normalized === rank || normalized === rankLabel) return "";
  return value;
}

function taxonMeta(node) {
  return [rankLabels[node.rank] || node.rank, englishMetaName(node)].filter(Boolean).join(" · ");
}

function referenceLink(node) {
  if (!node.referenceLabel || !node.referenceUrl) return "";
  const label = escapeHtml(node.referenceLabel.replace(",", ""));
  const doi = node.referenceUrl.replace(/^https:\/\/doi\.org\//, "");
  const citation = node.referenceCitation ? `${escapeHtml(node.referenceCitation)} DOI: ` : "";
  const note = `${citation}<a href="${node.referenceUrl}" target="_blank" rel="noreferrer">${escapeHtml(doi)}</a>`;
  return `<span class="citation-popover" tabindex="0"><a href="${node.referenceUrl}" target="_blank" rel="noreferrer">${label}</a><span class="citation-note citation-note-wide" role="note">${note}</span></span>`;
}

function ostrowCitationLink() {
  return `<span class="citation-popover" tabindex="0"><a href="https://doi.org/10.1093/ornithology/ukad022" target="_blank" rel="noreferrer">Ostrow et al. 2023</a><span class="citation-note citation-note-wide" role="note">${ostrowCitation}</span></span>`;
}

function fuchsCitationLink() {
  return `<span class="citation-popover" tabindex="0"><a href="https://doi.org/10.1016/j.ympev.2017.01.007" target="_blank" rel="noreferrer">Fuchs et al. 2017</a><span class="citation-note citation-note-wide" role="note">${fuchsCitation}</span></span>`;
}

function shortCitationText(label) {
  return `<span class="citation-popover" tabindex="0"><a href="https://www.biodiversitylibrary.org/bibliography/207351" target="_blank" rel="noreferrer">${label}</a><span class="citation-note citation-note-wide" role="note">${shortCitation}</span></span>`;
}

function keepCitationInsidePanel(popover) {
  const note = popover.querySelector(":scope > .citation-note");
  if (!note) return;
  note.style.setProperty("--citation-shift", "0px");

  const previousDisplay = note.style.display;
  note.style.display = "block";
  const noteRect = note.getBoundingClientRect();
  const boundaryRect = popover.closest(".detail-block, .detail-panel")?.getBoundingClientRect() || {
    left: 16,
    right: window.innerWidth - 16,
  };
  const inset = 12;
  let shift = 0;
  const minLeft = boundaryRect.left + inset;
  const maxRight = boundaryRect.right - inset;
  if (noteRect.left < minLeft) shift += minLeft - noteRect.left;
  if (noteRect.right + shift > maxRight) shift -= noteRect.right + shift - maxRight;
  note.style.setProperty("--citation-shift", `${shift}px`);
  note.style.display = previousDisplay;
}

function readableSortBasis(value, node) {
  const nodeReference = referenceLink(node);
  if (nodeReference) return nodeReference;
  if (!value) return "";
  if (value === "Manual prototype clade order") {
    return `参照 <span class="citation-popover" tabindex="0"><a href="https://www.nature.com/articles/s41586-024-07323-1" target="_blank" rel="noreferrer">Stiller et al. (2024)</a><span class="citation-note" role="note">${stillerCitation}</span></span> 中系统发育树排序`;
  }
  if (value === "Ostrow et al. 2023") return ostrowCitationLink();
  if (value === "Fuchs et al. 2017") return fuchsCitationLink();
  if (value === "AviList Sequence") return "按 AviList 目级顺序排列";
  if (value === "AviList Sequence family row") return "按 AviList 科级顺序排列";
  if (value === "AviList Sequence genus row") return "按 AviList 属级顺序排列";
  if (value === "AviList Sequence species row") return "按 AviList 物种顺序排列";
  return value;
}

function readableSource(value, node = {}) {
  const nodeReference = referenceLink(node);
  if (nodeReference) return nodeReference;
  if (!value || value === "Prototype data") return "本地整理资料";
  if (value === "Ostrow et al. 2023") return ostrowCitationLink();
  if (value === "Fuchs et al. 2017") return fuchsCitationLink();
  if (value === "Manual prototype phylogeny layer") {
    return `万种鸟类基因组计划 Bird 10,000 Genomes Project - <span class="citation-popover" tabindex="0"><a href="https://b10k.genomics.cn" target="_blank" rel="noreferrer">B10K</a><span class="citation-note citation-note-wide" role="note">${b10kNote}</span></span>`;
  }
  if (value === "AviList v2025b; Chinese order names manually seeded") {
    return "AviList v2025b；中文名称对照懂鸟小程序";
  }
  if (value === "AviList v2025b family record; Chinese family name from CBR v12.0 when matched") {
    return "AviList v2025b；中文科名优先参考中国观鸟年报名录";
  }
  if (value === "AviList v2025b genus record; Chinese genus name from local override when matched") {
    return node.chineseName ? "AviList v2025b；中文属名来自本地校订表" : "AviList v2025b";
  }
  if (value === "AviList v2025b species record; Chinese name from birdMapV2.js when matched") {
    return "AviList v2025b；中文种名参照郑光美《中国鸟类分类与物种名录》第四版";
  }
  return value;
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

function expandLineageParents(id) {
  const path = lineageOf(id);
  expanded = new Set(path.slice(0, -1).map((node) => node.id));
}

function clearFocusedTree() {
  focusedPathIds = new Set();
  focusedChildByParent = new Map();
  pathOnlyRevealedIds = new Set();
}

function focusTreeOnLineage(id) {
  const path = lineageOf(id);
  focusedPathIds = new Set(path.map((node) => node.id));
  focusedChildByParent = new Map();
  for (let index = 0; index < path.length - 1; index += 1) {
    focusedChildByParent.set(path[index].id, path[index + 1].id);
  }
}

function applyPathOnlyFocus(id) {
  focusTreeOnLineage(id);
  for (const revealedId of pathOnlyRevealedIds) {
    if (focusedPathIds.has(revealedId)) focusedChildByParent.delete(revealedId);
  }
}

function showFocusedSiblingsAt(id) {
  if (pathOnly) pathOnlyRevealedIds.add(id);
  focusedChildByParent.delete(id);
}

function selectNode(id, scroll = false, options = {}) {
  if (id !== selectedId) pathOnlyRevealedIds = new Set();
  selectedId = id;
  if (pathOnly) {
    expandLineageParents(id);
    applyPathOnlyFocus(id);
  } else {
    expandLineage(id);
    if (options.focusLineage) focusTreeOnLineage(id);
    else clearFocusedTree();
  }
  renderAll();
  if (scroll) {
    const row = document.querySelector(`[data-node-id="${id}"]`);
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function rankScore(rank) {
  return { class: 0, subclass: 1, clade: 2, order: 3, family: 4, subfamily: 5, tribe: 6, genus: 7, species: 8 }[rank] ?? 9;
}

function searchNodes(query) {
  const q = query.trim().toLowerCase();
  const searchableNodes = nodes.filter((node) => !isConnectorNode(node));
  if (!q) return searchableNodes.filter((node) => ["clade", "order"].includes(node.rank)).slice(0, 24);
  const parts = q.split(/\s+/).filter(Boolean);
  return searchableNodes
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
        <span class="result-name">${displayNameHtml(node)}</span>
        <span class="result-meta">${taxonMeta(node)}</span>
      `;
      button.addEventListener("click", () => selectNode(node.id, true, { focusLineage: node.rank === "species" }));
      return button;
    }),
  );
}

function renderTreeNode(id, lineageIds) {
  const node = nodeById.get(id);
  const childIds = childrenById.get(id) || [];
  const focusedChildId = focusedChildByParent.get(id);
  const visibleChildIds = focusedChildId ? childIds.filter((childId) => childId === focusedChildId) : childIds;
  const hasHiddenFocusedSiblings = Boolean(focusedChildId && visibleChildIds.length < childIds.length);
  const isFocusedPathNode = focusedPathIds.has(id);
  const hasChildren = childIds.length > 0;
  const isOpen = expanded.has(id);
  const li = document.createElement("li");
  li.className = [
    lineageIds.has(id) ? "lineage-branch" : "",
    isConnectorNode(node) ? "connector-node" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (isConnectorNode(node)) {
    if (hasChildren) {
      const ul = document.createElement("ul");
      visibleChildIds.forEach((childId) => ul.append(renderTreeNode(childId, lineageIds)));
      li.append(ul);
    }
    return li;
  }

  const row = document.createElement("div");
  const featherColors = ["green", "yellow", "red", "brown"];
  row.className = [
    "node-row",
    `feather-${featherColors[treeFeatherIndex % featherColors.length]}`,
    id === selectedId ? "selected" : "",
    lineageIds.has(id) ? "in-lineage" : "",
  ]
    .filter(Boolean)
    .join(" ");
  treeFeatherIndex += 1;
  row.dataset.nodeId = id;

  const twisty = document.createElement("button");
  twisty.type = "button";
  twisty.className = `twisty ${hasChildren ? "" : "empty"}`;
  twisty.textContent = isOpen ? "−" : "+";
  twisty.title = hasHiddenFocusedSiblings ? "显示该分类单元下的分支" : isOpen ? "收起" : "展开";
  twisty.addEventListener("click", (event) => {
    event.stopPropagation();
    if (hasHiddenFocusedSiblings) {
      showFocusedSiblingsAt(id);
      expanded.add(id);
      renderTree();
      return;
    }
    if (!pathOnly && !isFocusedPathNode) clearFocusedTree();
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
    renderTree();
  });

  const main = document.createElement("button");
  main.type = "button";
  main.className = "node-main";
  main.innerHTML = `
    <span class="node-name">${displayNameHtml(node)}</span>
    <span class="node-sub">${taxonMeta(node)}</span>
  `;
  main.addEventListener("click", () => selectNode(id));

  const rank = document.createElement("span");
  rank.className = "rank-pill";
  rank.textContent = rankLabels[node.rank] || node.rank;

  const featherShadow = document.createElement("span");
  featherShadow.className = "feather-shadow";
  featherShadow.setAttribute("aria-hidden", "true");

  const featherFill = document.createElement("span");
  featherFill.className = "feather-fill";
  featherFill.setAttribute("aria-hidden", "true");

  row.append(featherShadow, featherFill, twisty, main, rank);
  li.append(row);

  if (hasChildren && isOpen) {
    const ul = document.createElement("ul");
    visibleChildIds.forEach((childId) => ul.append(renderTreeNode(childId, lineageIds)));
    li.append(ul);
  }
  return li;
}

function renderTree() {
  const lineageIds = new Set(lineageOf(selectedId).map((node) => node.id));
  const root = document.createElement("ul");
  const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  lines.classList.add("tree-lines-svg");
  lines.setAttribute("aria-hidden", "true");
  treeFeatherIndex = 0;
  if (pathOnly) applyPathOnlyFocus(selectedId);
  root.append(renderTreeNode("aves", lineageIds));
  els.tree.classList.add("svg-tree-lines");
  els.tree.replaceChildren(lines, root);
  drawTreeBranches(lines);
  els.pathOnly.classList.toggle("active", pathOnly);
  els.pathOnly.setAttribute("aria-pressed", String(pathOnly));
  els.pathOnly.textContent = pathOnly ? "显示全部" : "仅路径";
}

function makeTreeLine(svg, x1, y1, x2, y2, className = "") {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1.toFixed(1));
  line.setAttribute("y1", y1.toFixed(1));
  line.setAttribute("x2", x2.toFixed(1));
  line.setAttribute("y2", y2.toFixed(1));
  if (className) line.classList.add(className);
  svg.append(line);
}

function drawTreeBranches(svg) {
  const treeRect = els.tree.getBoundingClientRect();
  const connectorYCache = new Map();

  function branchY(li) {
    if (li.classList.contains("connector-node")) return connectorY(li);
    return li.getBoundingClientRect().top - treeRect.top + 18;
  }

  function connectorY(li) {
    if (connectorYCache.has(li)) return connectorYCache.get(li);
    const ul = li.querySelector(":scope > ul");
    if (!ul || ul.children.length === 0) {
      const rect = li.getBoundingClientRect();
      const fallback = rect.top - treeRect.top + rect.height / 2;
      connectorYCache.set(li, fallback);
      return fallback;
    }
    const children = Array.from(ul.children);
    const firstY = branchY(children[0]);
    const lastY = branchY(children[children.length - 1]);
    const midpoint = (firstY + lastY) / 2;
    li.style.setProperty("--connector-midpoint", `${midpoint - (li.getBoundingClientRect().top - treeRect.top)}px`);
    connectorYCache.set(li, midpoint);
    return midpoint;
  }

  function listBranchX(ul) {
    return ul.getBoundingClientRect().left - treeRect.left + 11;
  }

  function childTargetX(li) {
    if (li.classList.contains("connector-node")) {
      const ul = li.querySelector(":scope > ul");
      if (ul) return listBranchX(ul);
    }
    return li.getBoundingClientRect().left - treeRect.left - 1;
  }

  const lists = Array.from(els.tree.querySelectorAll("ul"));
  const rootList = els.tree.querySelector(":scope > ul");
  lists.forEach((ul) => {
    if (!ul || ul === rootList || ul.children.length === 0) return;

    const children = Array.from(ul.children);
    const x = listBranchX(ul);
    const yValues = children.map(branchY);
    const parentLi = ul.parentElement?.tagName === "LI" ? ul.parentElement : null;
    if (parentLi) yValues.push(parentLi.classList.contains("connector-node") ? connectorY(parentLi) : branchY(parentLi) + 22);
    const y1 = Math.min(...yValues);
    const y2 = Math.max(...yValues);
    if (Math.abs(y2 - y1) > 0.5) makeTreeLine(svg, x, y1, x, y2);

    children.forEach((li) => {
      const y = branchY(li);
      const targetX = childTargetX(li);
      if (Math.abs(targetX - x) > 0.5) {
        makeTreeLine(svg, x, y, targetX, y, li.classList.contains("lineage-branch") ? "lineage-line" : "");
      }
    });
  });
  const height = els.tree.scrollHeight;
  const width = els.tree.scrollWidth;
  svg.setAttribute("viewBox", `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`);
  svg.setAttribute("width", Math.ceil(width));
  svg.setAttribute("height", Math.ceil(height));
}

function renderDetail() {
  const node = nodeById.get(selectedId);
  els.treeTitle.innerHTML = displayNameHtml(node);
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
  const sortBasis = node.sortBasis ? `<div class="fact"><strong>排序</strong><span>${readableSortBasis(node.sortBasis, node)}</span></div>` : "";
  const iucn = node.iucn ? `<div class="fact"><strong>IUCN</strong><span>${node.iucn}</span></div>` : "";
  const regionTags = node.regionTags?.length
    ? `<div class="fact"><strong>区域</strong><span>${node.regionTags.join("、")}</span></div>`
    : "";
  const china = node.chinaChecklist;
  const derivedGenus = node.chinaGenusNameCandidate;
  const chinaFacts = china
    ? `
      <div class="fact"><strong>中国观鸟名录</strong><span>${china.chineseName} · ${china.englishName}</span></div>
      <div class="fact"><strong>保护等级</strong><span>${china.protection || "暂待补充"} · IUCN ${china.iucn || "暂待补充"}</span></div>
    `
    : "";
  const chinaNote = china?.notes
    ? `<p class="summary"><strong>中国名录备注：</strong>${china.notes}</p>`
    : "";
  const names = node.englishNameClements || node.englishNameBirdLife
    ? `<div class="fact"><strong>名称对照</strong><span>Clements: ${node.englishNameClements || "暂待补充"} · BirdLife: ${node.englishNameBirdLife || "暂待补充"}</span></div>`
    : "";
  const links = [node.birdsOfTheWorldUrl, node.birdLifeUrl].filter(Boolean);
  const linkFact = links.length
    ? `<div class="fact"><strong>链接</strong><span>${links.map((url) => `<a href="${url}" target="_blank" rel="noreferrer">${new URL(url).hostname}</a>`).join(" · ")}</span></div>`
    : "";
  const decision = node.decisionSummary
    ? `<p class="summary"><strong>分类说明：</strong>${node.decisionSummary}</p>`
    : "";
  const primaryTitle = node.chineseName ? escapeHtml(node.chineseName) : scientificNameHtml(node);
  const latinLine = node.chineseName ? `<div class="latin">${scientificNameHtml(node)}</div>` : "";

  els.detail.innerHTML = `
    <div class="detail-title">
      <div>
        <p class="kicker">${rankLabels[node.rank] || node.rank}</p>
        <h2>${primaryTitle}</h2>
        ${latinLine}
      </div>
      <span class="rank-pill">${node.rank}</span>
    </div>
    ${node.summary ? `<p class="summary">${node.summary}</p>` : `<p class="summary summary-empty">这里空空的，搬运工冰鹡鸰还没有跑到这里～</p>`}
    <div class="facts">
      <div class="fact"><strong>英文</strong><span>${node.englishName || "暂待补充"}</span></div>
      <div class="fact"><strong>中文正式名</strong><span>${node.chineseName || "暂待补充"}</span></div>
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
      <div class="fact"><strong>资料来源</strong><span>${readableSource(node.source, node)}</span></div>
    </div>
    ${chinaNote}
    ${decision}
    ${traits}
  `;
}

function renderLineage() {
  const path = lineageOf(selectedId).filter((node) => !isConnectorNode(node));
  els.lineage.replaceChildren(
    ...path.map((node) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = `${displayNameHtml(node)} · ${rankLabels[node.rank] || node.rank}`;
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

function renderRelatedSummary(card) {
  let summary = escapeHtml(card.summary || "");
  if (card.citation === "Short 1971") {
    summary = summary.replace("地栖化", shortCitationText("地栖化"));
  }
  for (const link of card.links || []) {
    if (!nodeById.has(link.targetId)) continue;
    const label = escapeHtml(link.label);
    const target = escapeHtml(link.targetId);
    const button = `<button class="inline-taxon-link" type="button" data-related-target="${target}">${label}</button>`;
    const noteHtml = link.noteSpecies
      ? link.noteSpecies
          .map((species) => `<span><em>${escapeHtml(species.scientificName)}</em> ${escapeHtml(species.chineseName)}</span>`)
          .join("")
      : escapeHtml(link.note || "");
    const internalLink = noteHtml
      ? `<span class="citation-popover" tabindex="0">${button}<span class="citation-note citation-note-wide related-species-note" role="note">${noteHtml}</span></span>`
      : button;
    summary = summary.replaceAll(label, internalLink);
  }
  return summary;
}

function renderRelatedContent() {
  const selectedPath = new Set(lineageOf(selectedId).map((node) => node.id));
  const relevant = (data.relatedContent || []).filter((card) => {
    const contextIds = card.contextIds || [];
    return contextIds.includes(selectedId) || contextIds.some((id) => selectedPath.has(id));
  });
  els.relatedBlock.hidden = relevant.length === 0;
  els.relatedContent.replaceChildren(
    ...relevant.map((card) => {
      const div = document.createElement("article");
      div.className = "comparison-card";
      div.innerHTML = `
        <h3>${escapeHtml(card.title)}</h3>
        <p>${renderRelatedSummary(card)}</p>
      `;
      return div;
    }),
  );
  els.relatedContent.querySelectorAll("[data-related-target]").forEach((button) => {
    button.addEventListener("click", () => selectNode(button.dataset.relatedTarget, true));
  });
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
  els.sourceNote.innerHTML = `
    <span class="source-list">
      <span><strong><a href="https://www.avilist.org" target="_blank" rel="noreferrer">AviList v2025b</a></strong>：分类主干与目、科、属、种层级。</span>
      <span><strong>中国观鸟年报名录 v12.0</strong>：文件源自 <a href="http://www.birdreport.cn" target="_blank" rel="noreferrer">中国观鸟记录中心</a>，用于中国鸟种名录、中文科名与中国分布优先对照。</span>
      <span><strong>郑光美《中国鸟类分类与物种名录》第四版</strong>：中文鸟种名参照。</span>
      <span><strong>高层系统发育</strong>：万种鸟类基因组计划 Bird 10,000 Genomes Project - <span class="citation-popover" tabindex="0"><a href="https://b10k.genomics.cn" target="_blank" rel="noreferrer">B10K</a><span class="citation-note citation-note-wide" role="note">${b10kNote}</span></span>；排序参照 <span class="citation-popover" tabindex="0"><a href="https://www.nature.com/articles/s41586-024-07323-1" target="_blank" rel="noreferrer">Stiller et al. (2024)</a><span class="citation-note" role="note">${stillerCitation}</span></span>。</span>
    </span>
    <span class="source-status">当前版本包含 ${data.meta.includedOrders} 个目、${data.meta.includedFamilies} 个科、${data.meta.includedGenera || 0} 个属、${data.meta.includedSpecies} 个物种。部分非林奈分类单元及部分条目中文名称、资料有待补充。</span>
  `;
}

function renderAll() {
  renderResults();
  renderTree();
  renderDetail();
  renderLineage();
  renderComparisons();
  renderRelatedContent();
  renderSourceNote();
}

els.search.addEventListener("input", renderResults);
els.clearSearch.addEventListener("click", () => {
  els.search.value = "";
  clearFocusedTree();
  renderResults();
  renderTree();
  els.search.focus();
});
els.collapseAll.addEventListener("click", () => {
  clearFocusedTree();
  expanded = new Set(["aves"]);
  renderTree();
});
els.expandPath.addEventListener("click", () => {
  clearFocusedTree();
  expandLineage(selectedId);
  renderTree();
});
els.pathOnly.addEventListener("click", () => {
  pathOnly = !pathOnly;
  if (pathOnly) {
    expandLineageParents(selectedId);
    focusTreeOnLineage(selectedId);
  } else {
    clearFocusedTree();
  }
  renderTree();
});

document.addEventListener("pointerover", (event) => {
  const popover = event.target.closest?.(".citation-popover");
  if (!popover || popover.contains(event.relatedTarget)) return;
  keepCitationInsidePanel(popover);
});

document.addEventListener("focusin", (event) => {
  const popover = event.target.closest?.(".citation-popover");
  if (popover) keepCitationInsidePanel(popover);
});

renderQuickList();
selectNode("aves");
