import React, { useState } from 'react';
import { FOLDER_COLORS, resolveColorHex } from './iconStyle';

// macOS-tag-style color strip for a context menu (rendered as a MenuItem `content`
// row). Shows a "Default" (clear) swatch, the fixed palette, and — when allowCustom
// — a color well for an arbitrary hue. `current` is a palette key or a hex; `onPick`
// receives the same (undefined = clear back to the default/auto tint).
const ColorSwatches: React.FC<{
  current?: string;
  onPick: (c: string | undefined) => void;
  onClose?: () => void;
  allowCustom?: boolean;
}> = ({ current, onPick, onClose, allowCustom }) => {
  // The context menu stores this row as a frozen snapshot (it never re-renders on
  // state change), so track the picked value locally to keep the strip's highlight
  // and the custom well in sync while the native picker is open. Seeded from the
  // value at open time; the menu rebuilds this component on every reopen.
  const [live, setLive] = useState(current);
  // A discrete pick (palette / default) applies and dismisses the menu; the custom
  // well applies live so the user can keep tuning while the native picker is open.
  const pick = (c: string | undefined) => { setLive(c); onPick(c); onClose?.(); };
  const tune = (c: string) => { setLive(c); onPick(c); };
  const currentHex = resolveColorHex(live);
  const isCustom = !!live && !FOLDER_COLORS.some(c => c.key === live || c.hex === live);

  return (
    <div className="os-folder-swatches" role="group" aria-label="Icon color">
      <button
        type="button"
        className={`os-swatch os-swatch-none ${!live ? 'on' : ''}`}
        title="Default"
        aria-label="Default color"
        onClick={() => pick(undefined)}
      />
      {FOLDER_COLORS.map(c => (
        <button
          key={c.key}
          type="button"
          className={`os-swatch ${live === c.key || live === c.hex ? 'on' : ''}`}
          style={{ background: c.hex }}
          title={c.label}
          aria-label={c.label}
          onClick={() => pick(c.key)}
        />
      ))}
      {allowCustom && (
        <label
          className={`os-swatch os-swatch-custom ${isCustom ? 'on' : ''}`}
          title="Custom color"
          style={isCustom && currentHex ? { background: currentHex } : undefined}
        >
          <input
            type="color"
            aria-label="Custom color"
            value={currentHex || '#3b82f6'}
            onChange={e => tune(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
        </label>
      )}
    </div>
  );
};

export default ColorSwatches;
