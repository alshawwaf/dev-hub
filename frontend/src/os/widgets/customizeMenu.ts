import type { MenuItem } from '../ContextMenu';
import type { WidgetId } from '../types';
import { WIDGET_ORDER, WIDGET_LABEL } from './registry';

interface CustomizeArgs {
  widgets: WidgetId[];
  toggleWidget: (id: WidgetId) => void;
  railHidden: boolean;
  onOpenLaunchpad: () => void;
}

// One menu reused in three places (menu-bar Customize button, empty-rail CTA,
// desktop right-click): a live widget checklist + a shortcut to the launcher.
export function buildCustomizeItems({ widgets, toggleWidget, railHidden, onOpenLaunchpad }: CustomizeArgs): MenuItem[] {
  const items: MenuItem[] = [{ label: '', heading: 'Desktop widgets' }];
  if (railHidden) {
    items.push({ label: '', note: 'The window is too narrow to show the widget rail.' });
  } else {
    for (const id of WIDGET_ORDER) {
      items.push({
        label: WIDGET_LABEL[id],
        checked: widgets.includes(id),
        keepOpen: true,
        onClick: () => toggleWidget(id),
      });
    }
  }
  items.push(
    { separator: true, label: '' },
    { label: 'Add apps to Dock or Desktop…', onClick: onOpenLaunchpad },
  );
  return items;
}
