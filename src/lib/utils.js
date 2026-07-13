import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function scrollCellIntoView(td, container) {
  if (!td || !container) return;

  requestAnimationFrame(() => {
    if (!td.isConnected || !container.isConnected) return;

    // Find the actual scrollable container (in case container is an outer wrapper without overflow)
    const scrollContainer = td.closest('.overflow-x-auto, .overflow-auto, [style*="overflow"]') || container;

    // --- PHASE 1: BATCH ALL GEOMETRY READS FIRST ---
    // Read all getBoundingClientRect properties before modifying any scroll positions
    // to prevent browser forced reflow / synchronous layout recalculation.
    const cRect = scrollContainer.getBoundingClientRect();
    const tdRect = td.getBoundingClientRect();
    const thead = scrollContainer.getElementsByTagName('thead')[0];
    const headerHeight = thead ? thead.getBoundingClientRect().height : 0;

    const row = td.parentElement;
    if (!row || !row.cells) return;

    let lastStickyCell = null;
    let isTargetSticky = false;

    for (let i = 0; i < row.cells.length; i++) {
      const cell = row.cells[i];
      const isSticky = cell.style.position === 'sticky' || cell.classList.contains('sticky') || (cell.style.left && cell.style.left !== 'auto');
      if (cell === td) {
        if (isSticky) {
          isTargetSticky = true;
        }
        break;
      }
      if (isSticky) {
        lastStickyCell = cell;
      }
    }

    // If the target cell is sticky, it's always visible on the left.
    if (isTargetSticky) return;

    const stickyRight = lastStickyCell ? lastStickyCell.getBoundingClientRect().right : cRect.left;

    // --- PHASE 2: CALCULATE TARGET SCROLL POSITIONS IN MEMORY ---
    let targetScrollTop = scrollContainer.scrollTop;
    const visibleTop = cRect.top + headerHeight;
    const visibleBottom = cRect.bottom;

    if (tdRect.top < visibleTop) {
      targetScrollTop = Math.max(0, targetScrollTop - (visibleTop - tdRect.top));
    } else if (tdRect.bottom > visibleBottom) {
      targetScrollTop += (tdRect.bottom - visibleBottom);
    }

    let targetScrollLeft = scrollContainer.scrollLeft;
    if (tdRect.left < stickyRight + 5) {
      const leftOverlap = (stickyRight + 5) - tdRect.left;
      targetScrollLeft = Math.max(0, targetScrollLeft - leftOverlap);
    } else if (tdRect.right > cRect.right - 200) {
      const rightOverlap = tdRect.right - (cRect.right - 200);
      targetScrollLeft += rightOverlap;
    }

    // --- PHASE 3: BATCH ALL WRITES AT THE END ---
    // Apply scroll modifications only once at the end.
    if (targetScrollTop !== scrollContainer.scrollTop) {
      scrollContainer.scrollTop = targetScrollTop;
    }
    if (targetScrollLeft !== scrollContainer.scrollLeft) {
      scrollContainer.scrollLeft = targetScrollLeft;
    }
  });
}
