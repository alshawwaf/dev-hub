// Grid math for free-positioned, snap-to-grid desktop icons.
export interface Pos { x: number; y: number; }

export const GRID_X = 100;   // cell width  (icon ~92px + gap)
export const GRID_Y = 116;   // cell height (icon ~108px + gap)
export const ORIGIN_X = 16;
export const ORIGIN_Y = 14;

const key = (col: number, row: number) => `${col},${row}`;

export const cellToXY = (col: number, row: number): Pos => ({ x: ORIGIN_X + col * GRID_X, y: ORIGIN_Y + row * GRID_Y });
export const xyToCell = (x: number, y: number) => ({
  col: Math.max(0, Math.round((x - ORIGIN_X) / GRID_X)),
  row: Math.max(0, Math.round((y - ORIGIN_Y) / GRID_Y)),
});

// How many rows fit above the dock for the given viewport height.
export const rowsPerColumn = (viewportH: number) => Math.max(2, Math.floor((viewportH - 28 - 120) / GRID_Y));

// Effective position for every icon: saved (dragged) positions are kept; the rest
// flow column-major into the next free cells, skipping occupied ones. Deterministic
// per render — no state writes, so no auto-assign loops.
export function flowPositions(ids: number[], saved: Record<number, Pos>, rows: number): Record<number, Pos> {
  const occupied = new Set<string>();
  for (const id of ids) {
    const p = saved[id];
    if (p) { const c = xyToCell(p.x, p.y); occupied.add(key(c.col, c.row)); }
  }
  const out: Record<number, Pos> = {};
  let col = 0, row = 0;
  const advance = () => { row += 1; if (row >= rows) { row = 0; col += 1; } };
  for (const id of ids) {
    if (saved[id]) { out[id] = saved[id]; continue; }
    while (occupied.has(key(col, row))) advance();
    occupied.add(key(col, row));
    out[id] = cellToXY(col, row);
    advance();
  }
  return out;
}

// Snap a dropped point to the nearest free cell. `effective` is the current
// position map for all icons; the dragged icon's own cell is excluded so it can
// stay put. If the target cell is taken, fall back to the next free cell.
export function snapToFreeCell(x: number, y: number, draggedId: number, effective: Record<number, Pos>, rows: number): Pos {
  const occupied = new Set<string>();
  for (const [idStr, p] of Object.entries(effective)) {
    if (Number(idStr) === draggedId) continue;
    const c = xyToCell(p.x, p.y);
    occupied.add(key(c.col, c.row));
  }
  const t = xyToCell(x, y);
  if (!occupied.has(key(t.col, t.row))) return cellToXY(t.col, t.row);
  let col = 0, row = 0;
  const advance = () => { row += 1; if (row >= rows) { row = 0; col += 1; } };
  while (occupied.has(key(col, row))) advance();
  return cellToXY(col, row);
}
