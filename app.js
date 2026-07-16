// ── Page detection ────────────────────────────────────────────────────────────
const PAGE = document.body.dataset.page;

// True when served over HTTPS (GitHub Pages / Vercel) — file:// and localhost links won't open
const IS_DEPLOYED = window.location.protocol === "https:";

function isLocalLink(href) {
  if (!href) return false;
  return href.startsWith("file:///") || href.startsWith("localhost:") || href.startsWith("http://localhost") || href.startsWith("http://127.0.0.1");
}

function safeLink(href, label, className) {
  if (IS_DEPLOYED && isLocalLink(href)) {
    return `<span class="link-button ${className} local-only" title="Local dev link — open on your machine">${label} <small>local</small></span>`;
  }
  return `<a class="link-button ${className}" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}
const LINK_OVERRIDE_STORAGE_KEY = "projectPortfolio.linkOverrides.v1";

function projectKey(project) {
  return project.thread || project.name;
}

function linkObject(label, href) {
  const trimmed = (href || "").trim();
  return trimmed ? { label, href: trimmed } : null;
}

function folderObject(href, path) {
  const folderHref = (href || "").trim();
  const folderPath = (path || "").trim();
  return folderHref || folderPath
    ? { label: "Main Folder", href: folderHref, path: folderPath }
    : null;
}

function loadLinkOverrides() {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LINK_OVERRIDE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLinkOverrides(overrides) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LINK_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides, null, 2));
}

function applyProjectLinkOverrides() {
  const overrides = loadLinkOverrides();
  window.PROJECTS = (window.PROJECTS || []).map((project) => {
    const override = overrides[projectKey(project)];
    if (!override) return project;
    return {
      ...project,
      mainLink: linkObject("Main Page", override.mainHref) || project.mainLink,
      ticketLink: linkObject("Ticketing", override.ticketHref),
      folderLink: folderObject(override.folderHref, override.folderPath) || project.folderLink,
    };
  });
}

applyProjectLinkOverrides();

// ── Auto-date (overview only) ─────────────────────────────────────────────────
const lastUpdatedEl = document.getElementById("last-updated");
if (lastUpdatedEl) {
  const now = new Date();
  const formatted = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  lastUpdatedEl.textContent = `Last updated ${formatted}`;
  lastUpdatedEl.setAttribute("datetime", now.toISOString().slice(0, 10));
}

// ── Tag color map ─────────────────────────────────────────────────────────────
const TAG_HEX = {
  App:            "#265f86",
  Tool:           "#0891b2",
  Game:           "#16a34a",
  Design:         "#8f4a2a",
  React:          "#38bdf8",
  Fitness:        "#1f5d57",
  Capoeira:       "#d5ae5b",
  "E-commerce":   "#7c3aed",
  "Landing Page": "#9a6b14",
};
const TAG_DEFAULT = "#6a7482";

function tagPill(tag) {
  const hex = TAG_HEX[tag] ?? TAG_DEFAULT;
  return `<span class="showcase-tag" style="background:${hex}22;color:${hex};border-color:${hex}44">${tag}</span>`;
}

// ── Showcase card template ─────────────────────────────────────────────────────
function showcaseCardHTML(p) {
  const thumb = p.thumbnail
    ? `<div class="showcase-thumb"><img src="${p.thumbnail}" alt="${p.name}" loading="lazy" /></div>`
    : `<div class="showcase-thumb showcase-thumb--empty"><span>${p.name.slice(0, 2).toUpperCase()}</span></div>`;

  return `
    <a class="showcase-card" href="${p.url}" target="_blank" rel="noopener noreferrer" aria-label="Open ${p.name}">
      ${thumb}
      <div class="showcase-body">
        <div class="showcase-header">
          <strong class="showcase-name">${p.name}</strong>
          <span class="card-year">${p.year}</span>
        </div>
        <p class="showcase-tagline">${p.tagline}</p>
        <p class="showcase-desc">${p.description}</p>
        <div class="showcase-tags">${p.tags.map(tagPill).join("")}</div>
        <span class="showcase-cta">Open live site →</span>
      </div>
    </a>
  `;
}

// ── Tier One helpers ──────────────────────────────────────────────────────────
function slugStatus(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function listItems(items, className) {
  return `<ul class="${className}">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function priorityRank(project) {
  return Number(project.development?.rank || 999);
}

function byDevelopmentPriority(a, b) {
  return priorityRank(a) - priorityRank(b);
}

function developmentCell(project) {
  const development = project.development;
  if (!development) return '<span class="empty-related">Unranked</span>';
  return `
    <div class="development-cell">
      <span class="priority-badge">P${development.rank}</span>
      <strong>${development.stage}</strong>
      <p>${development.tokenUse}</p>
      <small>${development.nextMilestone}</small>
    </div>
  `;
}

function linkCell(project) {
  const main = safeLink(project.mainLink.href, project.mainLink.label, "");
  const ticket = project.ticketLink
    ? safeLink(project.ticketLink.href, project.ticketLink.label, "secondary")
    : `<span class="missing-link">Needs to be built</span>`;
  const folder = project.folderLink?.href
    ? safeLink(project.folderLink.href, project.folderLink.label, "folder")
    : `<span class="missing-link">Main folder needed</span>`;
  const resources = (project.resourceLinks || [])
    .map((link) => safeLink(link.href, link.label, "resource"))
    .join("");
  return `<div class="links">${main}${ticket}${folder}${resources}</div>`;
}

function projectIdentity(project) {
  return `
    <strong class="project-title">${project.name}</strong>
    <span class="project-kind">${project.kind}</span>
    ${project.thread ? `<a class="thread-link" href="${project.thread}">Codex Session</a>` : ""}
  `;
}

function relatedLibraryLinks(project, items = window.PROJECT_LIBRARY) {
  const related = items.filter((item) => item.relatedTierOne === project.name);
  if (!related.length) return '<span class="empty-related">No linked subs yet</span>';
  return `
    <div class="related-links">
      <span>${related.length} linked subproject${related.length === 1 ? "" : "s"}</span>
      <ul>
        ${related.map((item) => `
          <li>
            <a href="${item.href}">${item.name}</a>
            <small>${item.source} / ${subcategoryLabel(item.category)}</small>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function searchableText(project) {
  return [
    project.name, project.kind, project.synopsis, project.status,
    project.spec.join(" "), project.stack.join(" "),
    project.tools.join(" "), project.innovations.join(" "),
    project.development?.stage || "",
    project.development?.tokenUse || "",
    project.development?.nextMilestone || "",
  ].join(" ").toLowerCase();
}

// ── Render: full Tier One table ───────────────────────────────────────────────
function render(projects) {
  const rows = document.getElementById("project-rows");
  if (!rows) return;
  rows.innerHTML = projects.map((project, index) => {
    const detailId = `project-detail-${index}`;
    return `
      <tr class="project-summary-row" data-detail="${detailId}" aria-expanded="false">
        <td class="row-number">${String(index + 1).padStart(2, "0")}</td>
        <td>${projectIdentity(project)}</td>
        <td>${linkCell(project)}</td>
        <td><span class="status ${slugStatus(project.status)}">${project.status}</span></td>
        <td>${developmentCell(project)}</td>
        <td class="toggle-cell"><span class="toggle-icon">▼</span></td>
      </tr>
      <tr class="project-detail-row" id="${detailId}" hidden>
        <td colspan="6">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Synopsis</h4>
              <p>${project.synopsis}</p>
            </div>
            <div class="detail-section">
              <h4>Technical Spec</h4>
              ${listItems(project.spec, "spec-list")}
            </div>
            <div class="detail-section">
              <h4>Full Tech Stack</h4>
              ${listItems(project.stack, "stack-list")}
            </div>
            <div class="detail-section">
              <h4>Tools</h4>
              ${listItems(project.tools, "tool-list")}
            </div>
            <div class="detail-section">
              <h4>Innovations</h4>
              ${listItems(project.innovations, "innovation-list")}
            </div>
            <div class="detail-section">
              <h4>Related Library</h4>
              ${relatedLibraryLinks(project)}
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  rows.querySelectorAll(".project-summary-row").forEach((row) => {
    row.addEventListener("click", () => {
      const detailRow = document.getElementById(row.dataset.detail);
      const expanded = row.getAttribute("aria-expanded") === "true";
      row.setAttribute("aria-expanded", String(!expanded));
      detailRow.hidden = expanded;
      row.querySelector(".toggle-icon").textContent = expanded ? "▼" : "▲";
    });
  });
}

// ── Render: Tier One mini-cards (overview page) ───────────────────────────────
function renderMiniProjects() {
  const grid = document.getElementById("mini-projects");
  if (!grid) return;
  grid.innerHTML = [...window.PROJECTS].sort(byDevelopmentPriority).map((p) => `
    <article class="mini-card">
      <span class="mini-kind">${p.kind}</span>
      <strong class="mini-name">${p.name}</strong>
      <p class="mini-priority">Priority ${priorityRank(p)} / ${p.development?.stage || "Unranked"}</p>
      <p class="mini-synopsis">${p.synopsis}</p>
      <div class="mini-footer">
        <span class="status ${slugStatus(p.status)}">${p.status}</span>
        <a href="${p.mainLink.href}" class="mini-link">Open →</a>
      </div>
    </article>
  `).join("");
}

// ── Render: full showcase grid ────────────────────────────────────────────────
function renderShowcase(projects) {
  const grid = document.getElementById("showcase-grid");
  if (!grid) return;
  if (!projects.length) {
    grid.innerHTML = `<p class="empty-state">No published projects yet.</p>`;
    return;
  }
  grid.innerHTML = projects.map(showcaseCardHTML).join("");
}

// ── Render: showcase preview (overview page — latest 3) ───────────────────────
function renderShowcasePreview() {
  const grid = document.getElementById("showcase-preview");
  if (!grid) return;
  const preview = (window.PUBLISHED_PROJECTS || []).slice(0, 3);
  if (!preview.length) {
    grid.innerHTML = `<p class="empty-state">No published projects yet.</p>`;
    return;
  }
  grid.innerHTML = preview.map(showcaseCardHTML).join("");
}

// ── Showcase page: filter + search ────────────────────────────────────────────
function setupShowcasePage() {
  const published = window.PUBLISHED_PROJECTS || [];
  const countEl = document.getElementById("published-count");
  const resultEl = document.getElementById("showcase-count");
  const searchEl = document.getElementById("showcase-search");
  const filterBar = document.getElementById("tag-filter");
  const grid = document.getElementById("showcase-grid");
  if (!grid) return;

  if (countEl) countEl.textContent = published.length;

  // Build tag list
  const allTags = [...new Set(published.flatMap((p) => p.tags))].sort();
  let activeTag = "All";

  function buildFilterBar() {
    filterBar.innerHTML = ["All", ...allTags].map((tag) => `
      <button
        class="tag-btn${activeTag === tag ? " tag-btn--active" : ""}"
        data-tag="${tag}"
        aria-pressed="${activeTag === tag}"
      >${tag}</button>
    `).join("");
    filterBar.querySelectorAll(".tag-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTag = btn.dataset.tag;
        buildFilterBar();
        applyShowcaseFilters();
      });
    });
  }

  function applyShowcaseFilters() {
    const q = (searchEl?.value || "").trim().toLowerCase();
    const filtered = published.filter((p) => {
      const matchesTag = activeTag === "All" || p.tags.includes(activeTag);
      const matchesQuery = !q || [p.name, p.description, p.tagline, ...p.tags]
        .join(" ").toLowerCase().includes(q);
      return matchesTag && matchesQuery;
    });
    if (resultEl) {
      resultEl.textContent = filtered.length === published.length
        ? `${published.length} projects`
        : `${filtered.length} of ${published.length} projects`;
    }
    grid.innerHTML = filtered.length
      ? filtered.map(showcaseCardHTML).join("")
      : `<p class="empty-state">No projects match your search.</p>`;
  }

  buildFilterBar();
  applyShowcaseFilters();

  searchEl?.addEventListener("input", applyShowcaseFilters);
}

// ── Projects page: filter ─────────────────────────────────────────────────────
function setupProjectsPage() {
  const activeCountEl = document.getElementById("active-count");
  if (activeCountEl) activeCountEl.textContent = window.PROJECTS.length;

  render([...window.PROJECTS].sort(byDevelopmentPriority));

  const search = document.getElementById("search");
  const statusFilter = document.getElementById("status-filter");
  if (!search || !statusFilter) return;

  function applyFilters() {
    const query = search.value.trim().toLowerCase();
    const status = statusFilter.value;
    const filtered = window.PROJECTS.filter((project) => {
      const matchesQuery = !query || searchableText(project).includes(query);
      const matchesStatus = status === "all" || project.status === status;
      return matchesQuery && matchesStatus;
    });
    render(filtered.sort(byDevelopmentPriority));
  }

  search.addEventListener("input", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
}

// ── Library index page: domain cards ─────────────────────────────────────────
const DOMAIN_CONFIG = [
  {
    name:        "Economic Development",
    href:        "library-economic.html",
    description: "Corridor strategy, stakeholder work, local business intelligence, grant pipelines, and operating plans.",
    subcats:     ["Main Street Operations", "BOOMSS And Business Intelligence", "Grants And Funding", "Strategy And Implementation", "Campaigns And Mobilization"],
  },
  {
    name:        "Operating Systems",
    href:        "library-operating.html",
    description: "Commerce and mobility, career applications, and operational workspaces supporting the core build pipeline.",
    subcats:     ["Commerce And Mobility", "Career And Applications", "Operations"],
  },
  {
    name:        "Knowledge, Learning, And Research",
    href:        "library-knowledge.html",
    description: "Knowledge systems, leadership pipeline, and place-based research — the intellectual infrastructure behind the build.",
    subcats:     ["Knowledge Systems", "Learning And Leadership", "Research And Place"],
  },
];

function setupLibraryIndex() {
  const countEl = document.getElementById("library-count");
  if (countEl) countEl.textContent = window.PROJECT_LIBRARY.length;

  const index = document.getElementById("domain-index");
  if (!index) return;

  index.innerHTML = DOMAIN_CONFIG.map((domain, i) => {
    const count = window.PROJECT_LIBRARY.filter(
      (item) => domainLabel(item.category) === domain.name
    ).length;
    return `
      <a href="${domain.href}" class="domain-card">
        <div class="domain-card-header">
          <span class="domain-number">0${i + 1}</span>
          <strong class="domain-count">${count}</strong>
        </div>
        <h2 class="domain-card-name">${domain.name}</h2>
        <p class="domain-card-desc">${domain.description}</p>
        <ul class="domain-subcats">
          ${domain.subcats.map((s) => `<li>${s}</li>`).join("")}
        </ul>
        <span class="domain-cta">View workspaces →</span>
      </a>
    `;
  }).join("");
}

// ── Library domain sub-page ────────────────────────────────────────────────────
function setupLibraryDomain(domainName) {
  const items = window.PROJECT_LIBRARY.filter(
    (item) => domainLabel(item.category) === domainName
  );

  const countEl = document.getElementById("domain-count");
  if (countEl) countEl.textContent = items.length;

  renderDomainPage(items);

  const searchEl = document.getElementById("library-search");
  if (!searchEl) return;

  searchEl.addEventListener("input", () => {
    const q = searchEl.value.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const details = inferLibraryDetails(item);
      const hay = [item.name, item.source, item.category, item.relatedTierOne, item.path,
        details.synopsis, details.spec, details.stack, details.tools, details.innovation]
        .join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
    renderDomainPage(filtered);
  });
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function renderDomainPage(items) {
  const grid = document.getElementById("library-grid");
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = `<p class="empty-state">No workspaces match your search.</p>`;
    return;
  }

  // Group by subcategory
  const grouped = {};
  items.forEach((item) => {
    const sub = subcategoryLabel(item.category);
    grouped[sub] = grouped[sub] || [];
    grouped[sub].push(item);
  });

  grid.innerHTML = Object.entries(grouped).map(([subcat, catItems]) => `
    <section class="library-category" id="${slugify(subcat)}" aria-label="${subcat}">
      <div class="category-heading">
        <h2 class="subcat-h2">${subcat}</h2>
        <span>${catItems.length}</span>
      </div>
      <div class="category-grid">
        ${catItems.map((item) => {
          const d = inferLibraryDetails(item);
          return `
            <article class="library-item">
              <div>
                <span>${item.source}</span>
                <h3>${item.name}</h3>
              </div>
              <p class="library-summary">${d.synopsis}</p>
              <dl>
                <div><dt>Spec</dt><dd>${d.spec}</dd></div>
                <div><dt>Stack</dt><dd>${d.stack}</dd></div>
                <div><dt>Tools</dt><dd>${d.tools}</dd></div>
                <div><dt>Innovation</dt><dd>${d.innovation}</dd></div>
              </dl>
              <p class="folder-path">${item.path}</p>
              <a href="${item.href}">Open folder</a>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `).join("");

  // Activate scroll-spy after sections are in the DOM
  setupSubcatScrollSpy();
}

// ── Scroll-spy: highlight active subcategory in sidebar as user scrolls ───────
function setupSubcatScrollSpy() {
  const links = document.querySelectorAll(".sub-nav-subcat");
  if (!links.length) return;

  const sections = [...document.querySelectorAll(".library-category[id]")];
  if (!sections.length) return;

  // Mark first section active immediately
  if (links[0]) links[0].classList.add("active");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.remove("active"));
          const match = document.querySelector(
            `.sub-nav-subcat[href="#${entry.target.id}"]`
          );
          if (match) match.classList.add("active");
        }
      });
    },
    { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s));
}

// ── Overview stats ────────────────────────────────────────────────────────────
function renderOverviewStats() {
  const el = (id) => document.getElementById(id);
  const projects = window.PROJECTS;
  if (el("published-count")) el("published-count").textContent = (window.PUBLISHED_PROJECTS || []).length;
  if (el("active-count"))    el("active-count").textContent    = projects.length;
  if (el("development-count")) el("development-count").textContent = projects.filter((p) => p.status === "In development").length;
  if (el("ticket-count"))    el("ticket-count").textContent    = projects.filter((p) => p.ticketLink).length;
  if (el("needs-ticket-count")) el("needs-ticket-count").textContent = projects.filter((p) => !p.ticketLink).length;
}

// ── groupLibraryCatalog (used by setupLibraryIndex count) ─────────────────────

function domainLabel(category) {
  if (category.startsWith("Economic Development:")) return "Economic Development";
  if (["Commerce And Mobility", "Career And Applications", "Operations"].includes(category)) return "Operating Systems";
  if (["Knowledge Systems", "Learning And Leadership", "Research And Place"].includes(category)) return "Knowledge, Learning, And Research";
  return category || "Uncategorized";
}

function subcategoryLabel(category) {
  if (!category) return "Uncategorized";
  return category.includes(":") ? category.split(":").slice(1).join(":").trim() : category;
}

function groupLibraryCatalog(items) {
  const domainOrder = ["Economic Development", "Operating Systems", "Knowledge, Learning, And Research"];
  const subcategoryOrder = {
    "Economic Development": [
      "Research Hub",
      "Operations And Governance",
      "Workplans And Deliverables",
      "Main Street Operations",
      "BOOMSS And Business Intelligence",
      "Maps And Spatial Intelligence",
      "Valuation And Investment",
      "Ontology And Ownership",
      "Data Engineering",
      "Grants And Funding",
      "Strategy And Implementation",
      "Campaigns And Mobilization",
    ],
    "Operating Systems": ["Commerce And Mobility", "Career And Applications", "Operations"],
    "Knowledge, Learning, And Research": ["Knowledge Systems", "Learning And Leadership", "Research And Place"],
  };
  const groups = Object.fromEntries(
    domainOrder.map((domain) => [domain, {
      count: 0,
      subcategories: Object.fromEntries(subcategoryOrder[domain].map((s) => [s, []])),
    }])
  );
  items.forEach((item) => {
    const domain = domainLabel(item.category);
    const subcategory = subcategoryLabel(item.category);
    groups[domain] = groups[domain] || { count: 0, subcategories: {} };
    groups[domain].subcategories[subcategory] = groups[domain].subcategories[subcategory] || [];
    groups[domain].subcategories[subcategory].push(item);
    groups[domain].count += 1;
  });
  return groups;
}

function inferLibraryDetails(item) {
  const key = item.name.toLowerCase();
  const base = {
    synopsis: "Supporting workspace for active research, planning, documentation, and project material.",
    spec: "Folder-based project vault",
    stack: "Markdown, local files, workspace assets",
    tools: `${item.source}, file system, documentation workflow`,
    innovation: "Reusable project knowledge base",
  };
  const profiles = [
    { match: ["urban analytics"], synopsis: "Urban analytics atlas for geospatial learning, program research, career resources, data dictionaries, and quality/ticket plans.", spec: "Static atlas plus Vite-backed learning/resource modules", stack: "HTML, JavaScript, Markdown, Vite, local data folders", tools: "Codex, VS Code, Vite, browser QA, geospatial reference sources", innovation: "One navigable atlas for urban analytics learning, research, and project operations" },
    { match: ["task manager analyzer"], synopsis: "Python workflow analyzer that scores task exports, flags stale or blocked work, and generates project health reports.", spec: "CLI/GUI analyzer with CSV, JSON, and HTML outputs", stack: "Python, pandas, Tkinter, CSV, JSON, static HTML", tools: "VS Code, Python, local batch launcher, browser QA", innovation: "Task risk and workload-health scoring for exported task data" },
    { match: ["retrofax", "tree service form"], synopsis: "Local tools workspace for fax workflows, form packages, and small operational utilities.", spec: "Static tool pages and service-form modules", stack: "HTML, CSS, JavaScript, Python, Cloudflare Worker", tools: "VS Code, browser QA, local scripts, Cloudflare Worker", innovation: "Reusable personal operations tools with client-ready form workflows" },
    { match: ["btr static research hub", "btr operations", "btr workplan", "btr permits", "btr valuation", "btr ontology", "btr evidence maps", "btr web deliverables", "college park ed vault", "btr data"], synopsis: "BTR economic-development module supporting College Park research, operations, dashboards, evidence maps, data pipelines, and deliverables.", spec: "Civic research module with static pages, data assets, dashboards, and documentation", stack: "HTML, JavaScript, Python, CSV, JSON, React/Vite modules, local dashboards", tools: "Codex, Airtable planning, OCPA/Census/ArcGIS sources, local data scripts, browser QA", innovation: "Modular economic-development intelligence system tied back to the tier-one platform" },
    { match: ["black river"], synopsis: "Personal command-center workspace for daily decisions, weekly review, wealth planning, AI sync, and long-range operating context.", spec: "Static command center with CRUD-oriented local pages", stack: "HTML, CSS, JavaScript, Node.js, JSON data", tools: "VS Code, Node.js, browser QA, local server", innovation: "Personal strategic operating layer with linked review and decision systems" },
    { match: ["cook book"], synopsis: "Soup Africa webbook workspace for Nigerian soups, swallows, regional food notes, publishing pages, and print-ready manuscript output.", spec: "Static culinary webbook with web-to-print publishing assets", stack: "HTML, CSS, JavaScript, Markdown, print HTML", tools: "VS Code, browser QA, manuscript pipeline", innovation: "Regional Nigerian recipe taxonomy connected to a web and print publishing workflow" },
    { match: ["atlas"], synopsis: "Reference map and navigation layer for cross-project knowledge, notes, and reusable operating context.", spec: "Knowledge atlas and index vault", stack: "Markdown, Obsidian-style folders, local links", tools: "Codex, Obsidian, file explorer", innovation: "Central project memory and retrieval map" },
    { match: ["organize"], synopsis: "Workspace organization project for cleaning, structuring, and maintaining local project folders.", spec: "Desktop organization operating folder", stack: "Markdown, folder taxonomy, local files", tools: "Codex, OneDrive, file explorer", innovation: "Reusable local workspace hygiene system" },
    { match: ["collaboration", "cowork"], synopsis: "Collaboration workspace for shared work, coordination notes, and reusable communication material.", spec: "Collaboration document vault", stack: "Markdown, Python helpers, local assets", tools: `${item.source}, document workflow, local scripts`, innovation: "Cross-workstream coordination layer" },
    { match: ["ev"], synopsis: "Early-stage EV project folder reserved for research, planning, and source collection.", spec: "Research starter workspace", stack: "Local files and project notes", tools: "Codex, file explorer", innovation: "Future mobility project capture area" },
    { match: ["jobs", "resume"], synopsis: "Career and application workspace for job materials, resume variants, role research, and application packages.", spec: "Application document pipeline", stack: "Markdown, DOCX/PDF assets, local folders, Python helpers", tools: `${item.source}, resume workflow, document tools`, innovation: "Role-specific application tailoring system" },
    { match: ["mainstreet", "mstreet", "booms", "opus", "rally"], synopsis: "Main Street and economic-development workspace for corridor strategy, stakeholder work, local business intelligence, and operating plans.", spec: "Civic/economic development project vault", stack: "Markdown, CSV, spreadsheets, local dashboards, Python helpers", tools: `${item.source}, data files, planning docs, dashboard exports`, innovation: "District operating intelligence and stakeholder action system" },
    { match: ["grants"], synopsis: "Grant development workspace for opportunities, narratives, compliance material, and funding packages.", spec: "Grant pipeline document vault", stack: "Markdown, spreadsheets, source files", tools: "Codex, grant research, document workflow", innovation: "Reusable grant response and evidence library" },
    { match: ["kerala"], synopsis: "Kerala-focused research and project workspace for place-based planning, source notes, and strategy material.", spec: "Place-based research vault", stack: "Markdown, local assets, source folders", tools: "Codex, research notes, file explorer", innovation: "Reusable geography-specific project archive" },
    { match: ["leadership pipeline"], synopsis: "Leadership development workspace for training pathways, operating roles, and progression systems.", spec: "Leadership curriculum and pipeline vault", stack: "Markdown, planning docs, local assets", tools: "Codex, curriculum planning, document workflow", innovation: "Structured leadership progression architecture" },
    { match: ["marketplace"], synopsis: "Marketplace concept workspace for product, platform, stakeholder, and go-to-market planning.", spec: "Marketplace product planning vault", stack: "Markdown, planning files, research notes", tools: "Codex, product planning, local workspace", innovation: "Reusable marketplace launch architecture" },
    { match: ["reframing"], synopsis: "Strategic reframing workspace for narrative, positioning, planning, and synthesis work.", spec: "Narrative strategy vault", stack: "Markdown and source notes", tools: "Codex, writing workflow, synthesis notes", innovation: "Reusable perspective-shift and messaging system" },
    { match: ["shoes"], synopsis: "Footwear and commerce workspace for sourcing, market research, product thinking, and related business material.", spec: "Commerce research workspace", stack: "Markdown, local assets, research files", tools: "Codex, product research, file explorer", innovation: "Category-specific sourcing and market memory" },
    { match: ["supply chain"], synopsis: "Supply chain workspace for vendor, logistics, sourcing, and operational planning material.", spec: "Supply chain planning vault", stack: "Markdown, spreadsheets, local source files", tools: "Codex, operations planning, data files", innovation: "Reusable sourcing and operations decision layer" },
    { match: ["magnus"], synopsis: "Claude workspace for Project Magnus research, planning, and implementation material.", spec: "Claude project workspace", stack: "Markdown, Python helpers, local files", tools: "Claude, local scripts, file explorer", innovation: "Separate AI-assisted project lane with reusable outputs" },
  ];
  const profile = profiles.find((c) => c.match.some((term) => key.includes(term)));
  return profile ? { ...base, ...profile } : base;
}

// ── Developer page ────────────────────────────────────────────────────────────
function setupDeveloperPage() {
  const projects = [...window.PROJECTS].sort(byDevelopmentPriority);
  const built   = projects.filter((p) => p.ticketLink);
  const needed  = projects.filter((p) => !p.ticketLink);

  const heroStat = document.getElementById("ticket-built-count");
  if (heroStat) heroStat.textContent = built.length;

  const statsEl = document.getElementById("dev-stats");
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="dev-stat">
        <strong>${projects.length}</strong><span>Active Projects</span>
      </div>
      <div class="dev-stat dev-stat--built">
        <strong>${built.length}</strong><span>Ticketing Built</span>
      </div>
      <div class="dev-stat dev-stat--needed">
        <strong>${needed.length}</strong><span>Need Ticketing</span>
      </div>
    `;
  }

  const grid = document.getElementById("dev-grid");
  if (!grid) return;

  grid.innerHTML = projects.map((p) => {
    const hasTicket = !!p.ticketLink;
    return `
      <article class="dev-card ${hasTicket ? "dev-card--ticketed" : "dev-card--needs"}">
        <div class="dev-card-head">
          <div>
            <span class="dev-card-kind">${p.kind}</span>
            <strong class="dev-card-name">${p.name}</strong>
          </div>
          <div class="dev-card-meta">
            <span class="priority-badge">P${priorityRank(p)}</span>
            <span class="status ${slugStatus(p.status)}">${p.status}</span>
          </div>
        </div>
        <div class="dev-priority">
          <strong>${p.development?.stage || "Unranked"}</strong>
          <p>${p.development?.tokenUse || "Add a development priority in projects.js."}</p>
          <small>${p.development?.nextMilestone || ""}</small>
        </div>
        <div class="dev-ticket-status ${hasTicket ? "ticket-built" : "ticket-missing"}">
          <span class="ticket-indicator">${hasTicket ? "✓" : "○"}</span>
          <span>${hasTicket ? "Ticket board built" : "Needs ticketing"}</span>
        </div>
        <div class="dev-card-links">
          <a class="link-button" href="${p.mainLink.href}">${p.mainLink.label}</a>
          ${hasTicket
            ? `<a class="link-button secondary" href="${p.ticketLink.href}">${p.ticketLink.label}</a>`
            : `<span class="missing-link">No board yet</span>`}
          ${p.folderLink?.href
            ? `<a class="link-button folder" href="${p.folderLink.href}">${p.folderLink.label}</a>`
            : `<span class="missing-link">No folder link</span>`}
          ${(p.resourceLinks || [])
            .map((link) => `<a class="link-button resource" href="${link.href}">${link.label}</a>`)
            .join("")}
        </div>
        <p class="dev-card-stack">${p.stack.slice(0, 4).join(" · ")}</p>
      </article>
    `;
  }).join("");
}

// Admin page
function setupAdminPage() {
  const form = document.getElementById("admin-link-form");
  const grid = document.getElementById("admin-link-grid");
  const status = document.getElementById("admin-save-status");
  const jsonBox = document.getElementById("admin-json");
  const importButton = document.getElementById("admin-import");
  const resetButton = document.getElementById("admin-reset");
  if (!form || !grid) return;

  function currentOverridesFromProjects() {
    return Object.fromEntries(window.PROJECTS.map((project) => [
      projectKey(project),
      {
        name: project.name,
        mainHref: project.mainLink?.href || "",
        ticketHref: project.ticketLink?.href || "",
        folderHref: project.folderLink?.href || "",
        folderPath: project.folderLink?.path || "",
      },
    ]));
  }

  function setStatus(message) {
    if (!status) return;
    status.textContent = message;
    status.hidden = false;
  }

  function renderAdminRows() {
    grid.innerHTML = window.PROJECTS.map((project, index) => {
      const key = projectKey(project);
      return `
        <article class="admin-project" data-project-key="${key}">
          <div class="admin-project-head">
            <div>
              <span>${String(index + 1).padStart(2, "0")}</span>
              <h2>${project.name}</h2>
              <p>${project.kind}</p>
            </div>
            ${project.thread ? `<a href="${project.thread}">Codex Session</a>` : ""}
          </div>
          <div class="admin-fields">
            <label>
              <span>Main page URL</span>
              <input type="text" data-field="mainHref" value="${project.mainLink?.href || ""}" placeholder="https://, http://, file:///" />
            </label>
            <label>
              <span>Ticketing page URL</span>
              <input type="text" data-field="ticketHref" value="${project.ticketLink?.href || ""}" placeholder="https://, http://, file:///" />
            </label>
            <label>
              <span>Main folder link</span>
              <input type="text" data-field="folderHref" value="${project.folderLink?.href || ""}" placeholder="file:///C:/Projects/Example/" />
            </label>
            <label>
              <span>Main folder path</span>
              <input type="text" data-field="folderPath" value="${project.folderLink?.path || ""}" placeholder="C:\\Projects\\Example" />
            </label>
          </div>
        </article>
      `;
    }).join("");

    if (jsonBox) {
      jsonBox.value = JSON.stringify(currentOverridesFromProjects(), null, 2);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const overrides = {};
    grid.querySelectorAll(".admin-project").forEach((card) => {
      const key = card.dataset.projectKey;
      const project = window.PROJECTS.find((item) => projectKey(item) === key);
      overrides[key] = {
        name: project?.name || key,
        mainHref: card.querySelector('[data-field="mainHref"]').value.trim(),
        ticketHref: card.querySelector('[data-field="ticketHref"]').value.trim(),
        folderHref: card.querySelector('[data-field="folderHref"]').value.trim(),
        folderPath: card.querySelector('[data-field="folderPath"]').value.trim(),
        updatedAt: new Date().toISOString(),
      };
    });
    saveLinkOverrides(overrides);
    setStatus("Saved. The portfolio will use these links on this browser.");
    if (jsonBox) jsonBox.value = JSON.stringify(overrides, null, 2);
  });

  importButton?.addEventListener("click", () => {
    if (!jsonBox) return;
    try {
      const parsed = JSON.parse(jsonBox.value);
      saveLinkOverrides(parsed);
      window.location.reload();
    } catch {
      setStatus("That JSON could not be imported. Check the pasted text and try again.");
    }
  });

  resetButton?.addEventListener("click", () => {
    localStorage.removeItem(LINK_OVERRIDE_STORAGE_KEY);
    window.location.reload();
  });

  renderAdminRows();
}

// ── Router ────────────────────────────────────────────────────────────────────
if (PAGE === "overview")          { renderOverviewStats(); renderShowcasePreview(); renderMiniProjects(); }
if (PAGE === "showcase")          { setupShowcasePage(); }
if (PAGE === "projects")          { setupProjectsPage(); }
if (PAGE === "library")           { setupLibraryIndex(); }
if (PAGE === "library-economic")  { setupLibraryDomain("Economic Development"); }
if (PAGE === "library-operating") { setupLibraryDomain("Operating Systems"); }
if (PAGE === "library-knowledge") { setupLibraryDomain("Knowledge, Learning, And Research"); }
if (PAGE === "developer")         { setupDeveloperPage(); }
if (PAGE === "admin")             { setupAdminPage(); }
