const HISTORY_LIMIT = 3;

export function createLayoutHistory(present) {
  return { past: [], present, future: [], group: null };
}

export function recordLayout(history, layout, group = null) {
  const unchanged = Object.keys(layout).every((key) => (
    layout[key] === history.present[key]
      || JSON.stringify(layout[key]) === JSON.stringify(history.present[key])
  ));
  if (unchanged) return history;

  const past = group && group === history.group
    ? history.past
    : [...history.past, history.present].slice(-HISTORY_LIMIT);
  return { past, present: layout, future: [], group };
}

export function undoLayout(history) {
  if (history.past.length === 0) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1),
    future: [history.present, ...history.future],
    group: null,
  };
}

export function redoLayout(history) {
  if (history.future.length === 0) return history;
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: history.future[0],
    future: history.future.slice(1),
    group: null,
  };
}
