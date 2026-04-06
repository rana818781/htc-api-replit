// FlowAccess — Project Filter v1.0
// Hides existing projects on labs.google/fx/tools/flow.
// Only the "New Project" button remains visible.

(function () {
  "use strict";

  // ── Inject hide CSS immediately (before DOM renders) ─────────────────────
  // These selectors target the project grid and individual project cards.
  // We keep anything that contains "new" / "create" text visible.
  const HIDE_CSS = `
    /* ── Hide the entire project list / history grid ── */
    [data-testid*="project-list"],
    [data-testid*="projects-grid"],
    [data-testid*="project-grid"],
    [class*="projectList"],
    [class*="ProjectList"],
    [class*="projects-list"],
    [class*="projectsGrid"],
    [class*="ProjectsGrid"],
    [class*="gallery"],
    [class*="Gallery"] {
      display: none !important;
    }

    /* ── Hide individual project cards / thumbnails ── */
    [data-testid*="project-card"],
    [data-testid*="projectCard"],
    [class*="projectCard"],
    [class*="ProjectCard"],
    [class*="project-card"],
    [class*="project-item"],
    [class*="ProjectItem"],
    [class*="videoCard"],
    [class*="VideoCard"],
    [class*="video-card"] {
      display: none !important;
    }
  `;

  const styleEl = document.createElement("style");
  styleEl.id = "fa-project-filter";
  styleEl.textContent = HIDE_CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  // ── DOM-based filter: runs after page settles ─────────────────────────────
  // Walks the DOM and hides any element that looks like a project card
  // while keeping "New Project" buttons untouched.

  function isNewProjectElement(el) {
    const text = (el.textContent || "").toLowerCase();
    return (
      text.includes("new project") ||
      text.includes("create project") ||
      text.includes("new video") ||
      text.includes("create new") ||
      el.querySelector('[class*="add"], [class*="Add"], [class*="create"], [class*="Create"]') !== null
    );
  }

  function looksLikeProjectCard(el) {
    // Must be a reasonably sized block element
    if (el.offsetWidth < 80 || el.offsetHeight < 80) return false;

    const cls = (el.className || "").toLowerCase();
    const testId = (el.getAttribute("data-testid") || "").toLowerCase();
    const role = (el.getAttribute("role") || "").toLowerCase();

    // Positive signals: matches known project-card patterns
    const classMatch =
      cls.includes("card") ||
      cls.includes("thumb") ||
      cls.includes("tile") ||
      cls.includes("project") ||
      cls.includes("video") ||
      cls.includes("item");

    const testIdMatch =
      testId.includes("card") ||
      testId.includes("project") ||
      testId.includes("video");

    const isGridItem = role === "gridcell" || role === "listitem";

    if (!classMatch && !testIdMatch && !isGridItem) return false;

    // Negative signal: this is the "new project" button
    if (isNewProjectElement(el)) return false;

    // Positive signal: has a thumbnail image inside
    const hasImage =
      el.querySelector("img") !== null ||
      el.querySelector("video") !== null ||
      el.querySelector("canvas") !== null;

    return hasImage;
  }

  function hideExistingProjects() {
    // Strategy 1: hide known container patterns
    const containers = document.querySelectorAll(
      '[role="grid"], [role="list"], ' +
      '[class*="grid"], [class*="Grid"], ' +
      '[class*="list"], [class*="List"]'
    );

    for (const container of containers) {
      // Skip if this is a navigation or toolbar element
      const tag = container.tagName.toLowerCase();
      if (tag === "nav" || tag === "header" || tag === "footer") continue;

      // Check if children look like project cards
      const children = Array.from(container.children);
      let cardCount = 0;
      const candidateCards = [];

      for (const child of children) {
        if (isNewProjectElement(child)) continue;
        if (looksLikeProjectCard(child)) {
          cardCount++;
          candidateCards.push(child);
        }
      }

      // If 2+ children look like cards, hide them all (it's a project list)
      if (cardCount >= 1) {
        for (const card of candidateCards) {
          card.style.setProperty("display", "none", "important");
          card.setAttribute("data-fa-hidden", "1");
        }
      }
    }

    // Strategy 2: find any element with a timestamp inside a card-like wrapper
    const timeEls = document.querySelectorAll("time, [class*='date'], [class*='Date'], [class*='timestamp']");
    for (const timeEl of timeEls) {
      let parent = timeEl.parentElement;
      let depth = 0;
      while (parent && depth < 6) {
        if (looksLikeProjectCard(parent)) {
          parent.style.setProperty("display", "none", "important");
          parent.setAttribute("data-fa-hidden", "1");
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }
  }

  // ── MutationObserver: handle dynamically loaded content ───────────────────
  let hideTimer = null;

  function scheduleHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hideExistingProjects, 400);
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        scheduleHide();
        break;
      }
    }
  });

  function start() {
    hideExistingProjects();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      start();
      // Run again after JS frameworks finish rendering
      setTimeout(hideExistingProjects, 1000);
      setTimeout(hideExistingProjects, 2500);
      setTimeout(hideExistingProjects, 5000);
    });
  } else {
    start();
    setTimeout(hideExistingProjects, 500);
    setTimeout(hideExistingProjects, 2000);
    setTimeout(hideExistingProjects, 5000);
  }
})();
