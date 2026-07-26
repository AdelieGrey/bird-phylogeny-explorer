const data = window.BIRD_DATA;
const nodes = data.nodes;
const nodeById = new Map(nodes.map((node) => [node.id, node]));
const childrenById = new Map(nodes.map((node) => [node.id, node.childrenIds || []]));

let selectedId = "aves";
let expanded = new Set(["aves", "neornithes"]);
let focusedPathIds = new Set();
let focusedChildByParent = new Map();

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

const stillerCitation =
  "Stiller, J., Feng, S., Chowdhury, AA. et al. Complexity of avian evolution revealed by family-level genomes. Nature 629, 851–860 (2024). https://doi.org/10.1038/s41586-024-07323-1";

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

function referenceLink(node) {
  if (!node.referenceLabel || !node.referenceUrl) return "";
  return `<a href="${node.referenceUrl}" target="_blank" rel="noreferrer">${node.referenceLabel}</a>`;
}

function readableSortBasis(value, node) {
  const nodeReference = referenceLink(node);
  if (nodeReference) return nodeReference;
  if (!value) return "";
  if (value === "Manual prototype clade order") {
    return `参照 <span class="citation-popover" tabindex="0"><a href="https://www.nature.com/articles/s41586-024-07323-1" target="_blank" rel="noreferrer">Stiller et al. (2024)</a><span class="citation-note" role="note">${stillerCitation}</span></span> 中系统发育树排序`;
  }
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
    return "AviList v2025b；中文属名来自本地校订表";
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

function clearFocusedTree() {
  focusedPathIds = new Set();
  focusedChildByParent = new Map();
}

function focusTreeOnLineage(id) {
  const path = lineageOf(id);
  focusedPathIds = new Set(path.map((node) => node.id));
  focusedChildByParent = new Map();
  for (let index = 0; index < path.length - 1; index += 1) {
    focusedChildByParent.set(path[index].id, path[index + 1].id);
  }
}

function showFocusedSiblingsAt(id) {
  focusedChildByParent.delete(id);
}

function selectNode(id, scroll = false, options = {}) {
  selectedId = id;
  expandLineage(id);
  if (options.focusLineage) focusTreeOnLineage(id);
  else clearFocusedTree();
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
        <span class="result-name">${displayNameHtml(node)}</span>
        <span class="result-meta">${rankLabels[node.rank]} · ${subtitle(node)}</span>
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
  twisty.title = hasHiddenFocusedSiblings ? "Show sibling branches" : isOpen ? "Collapse" : "Expand";
  twisty.addEventListener("click", (event) => {
    event.stopPropagation();
    if (hasHiddenFocusedSiblings) {
      showFocusedSiblingsAt(id);
      expanded.add(id);
      renderTree();
      return;
    }
    if (!isFocusedPathNode) clearFocusedTree();
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
    renderTree();
  });

  const main = document.createElement("button");
  main.type = "button";
  main.className = "node-main";
  main.innerHTML = `
    <span class="node-name">${displayNameHtml(node)}</span>
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
    visibleChildIds.forEach((childId) => ul.append(renderTreeNode(childId, lineageIds)));
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
  const path = lineageOf(selectedId);
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

renderQuickList();
selectNode("aves");
