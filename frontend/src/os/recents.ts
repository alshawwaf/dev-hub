const LS_KEY = 'devhub.recents';

export function addRecent(appId: number) {
  if (appId < 0) return; // skip synthetic system apps
  try {
    const arr: number[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    const next = [appId, ...arr.filter(x => x !== appId)].slice(0, 12);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch { /* storage unavailable */ }
}

export function getRecents(): number[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}
