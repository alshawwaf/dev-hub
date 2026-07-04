import type { MenuItem } from '../ContextMenu';
import type { WidgetId } from '../types';
import { WIDGET_ORDER, WIDGET_LABEL } from './registry';

interface WidgetArgs {
  widgets: WidgetId[];
  toggleWidget: (id: WidgetId) => void;
  railHidden: boolean;
}

interface CustomizeArgs extends WidgetArgs {
  onOpenLaunchpad: () => void;
}

// Just the live widget checklist (keepOpen toggles). Reused as a right-click
// submenu's children and inside the flat menu-bar popover below.
export function buildWidgetItems({ widgets, toggleWidget, railHidden }: WidgetArgs): MenuItem[] {
  if (railHidden) {
    return [{ label: '', note: 'The window is too narrow to show the widget rail.' }];
  }
  return WIDGET_ORDER.map(id => ({
    label: WIDGET_LABEL[id],
    checked: widgets.includes(id),
    keepOpen: true,
    onClick: () => toggleWidget(id),
  }));
}

// Flat widget menu for the menu-bar Customize button and the empty-rail CTA: a
// heading + the checklist + a shortcut to the launcher. (The desktop right-click
// nests the checklist under a "Desktop Widgets" submenu instead.)
export function buildCustomizeItems({ onOpenLaunchpad, ...widgetArgs }: CustomizeArgs): MenuItem[] {
  return [
    { label: '', heading: 'Desktop widgets' },
    ...buildWidgetItems(widgetArgs),
    { separator: true, label: '' },
    { label: 'Add apps to Dock or Desktop…', onClick: onOpenLaunchpad },
  ];
}
