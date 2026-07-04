import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function scrollCellIntoView(td, container) {
  if (!td || !container) return;

  // Use getBoundingClientRect for exact viewport pixel math.
  // We DO NOT call td.scrollIntoView() because browsers execute it asynchronously
  // and will overwrite our custom scrollLeft adjustments!
  const cRect = container.getBoundingClientRect();
  const tdRect = td.getBoundingClientRect();

  // 1. VERTICAL SCROLLING (scrollTop)
  const thead = container.querySelector('thead');
  const headerHeight = thead ? thead.getBoundingClientRect().height : 0;
  const visibleTop = cRect.top + headerHeight;
  const visibleBottom = cRect.bottom;

  if (tdRect.top < visibleTop) {
    container.scrollTop = Math.max(0, container.scrollTop - (visibleTop - tdRect.top));
  } else if (tdRect.bottom > visibleBottom) {
    container.scrollTop += (tdRect.bottom - visibleBottom);
  }

  // 2. HORIZONTAL SCROLLING (scrollLeft)
  const row = td.parentElement;
  if (!row || !row.cells) return;

  let lastStickyCell = null;
  let isTargetSticky = false;

  for (let i = 0; i < row.cells.length; i++) {
    const cell = row.cells[i];
    if (cell === td) {
      const st = window.getComputedStyle(cell);
      if (st.position === 'sticky' && st.left !== 'auto') {
        isTargetSticky = true;
      }
      break;
    }
    const st = window.getComputedStyle(cell);
    if (st.position === 'sticky' && st.left !== 'auto') {
      lastStickyCell = cell;
    }
  }

  // If the target cell is sticky, it's always visible on the left.
  if (isTargetSticky) return;

  const stickyRight = lastStickyCell ? lastStickyCell.getBoundingClientRect().right : cRect.left;
  const tdLeft = td.getBoundingClientRect().left;
  const tdRight = td.getBoundingClientRect().right;

  // Check if hidden behind sticky columns on the left
  if (tdLeft < stickyRight - 1) {
    const leftOverlap = stickyRight - tdLeft;
    container.scrollLeft = Math.max(0, container.scrollLeft - leftOverlap);
  } 
  // Check if hidden beyond the right edge of the container
  else if (tdRight > cRect.right + 1) {
    const rightOverlap = tdRight - cRect.right;
    container.scrollLeft += rightOverlap;
  }
}
