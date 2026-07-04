import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function scrollCellIntoView(td, container) {
  if (!td || !container) return;

  // 1. Standard scrollIntoView to handle vertical scrolling and right-edge horizontal scrolling
  td.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });

  // 2. Adjust horizontal scroll if cell is hidden behind sticky columns on the left
  const row = td.parentElement;
  if (!row || !row.cells) return;

  let stickyWidth = 0;
  let isTargetSticky = false;

  for (let i = 0; i < row.cells.length; i++) {
    const cell = row.cells[i];
    if (cell === td) {
      const st = window.getComputedStyle(cell);
      if (st.position === 'sticky' && (st.left !== 'auto' && st.left !== '')) {
        isTargetSticky = true;
      }
      break;
    }
    const st = window.getComputedStyle(cell);
    if (st.position === 'sticky' && (st.left !== 'auto' && st.left !== '')) {
      stickyWidth += cell.offsetWidth;
    }
  }

  // If the cell is not sticky itself, ensure its left edge is not under the sticky columns
  if (!isTargetSticky && stickyWidth > 0) {
    if (td.offsetLeft < container.scrollLeft + stickyWidth) {
      container.scrollLeft = Math.max(0, td.offsetLeft - stickyWidth);
    }
  }
}
