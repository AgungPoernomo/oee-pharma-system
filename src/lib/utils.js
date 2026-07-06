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

    // Use getBoundingClientRect for exact viewport pixel math.
    // We DO NOT call td.scrollIntoView() because browsers execute it asynchronously
    // and will overwrite our custom scrollLeft adjustments!
    const cRect = scrollContainer.getBoundingClientRect();
    const tdRect = td.getBoundingClientRect();

    // 1. VERTICAL SCROLLING (scrollTop)
    const thead = scrollContainer.querySelector('thead');
    const headerHeight = thead ? thead.getBoundingClientRect().height : 0;
    const visibleTop = cRect.top + headerHeight;
    const visibleBottom = cRect.bottom;

    if (tdRect.top < visibleTop) {
      scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - (visibleTop - tdRect.top));
    } else if (tdRect.bottom > visibleBottom) {
      scrollContainer.scrollTop += (tdRect.bottom - visibleBottom);
    }

    // 2. HORIZONTAL SCROLLING (scrollLeft)
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
    const tdLeft = td.getBoundingClientRect().left;
    const tdRight = td.getBoundingClientRect().right;

    // Check if hidden behind sticky columns on the left (with a safety margin of 5px)
    if (tdLeft < stickyRight + 5) {
      const leftOverlap = (stickyRight + 5) - tdLeft;
      scrollContainer.scrollLeft = Math.max(0, scrollContainer.scrollLeft - leftOverlap);
    } 
    // Check if hidden beyond the right edge of the container (with a safety margin of 5px)
    else if (tdRight > cRect.right - 5) {
      const rightOverlap = tdRight - (cRect.right - 5);
      scrollContainer.scrollLeft += rightOverlap;
    }
  });
}
