export function labFigure(kind: 'api' | 'ram' | 'db' | 'worker' | 'phone') {
  const paths = {
    phone:
      '<path d="M12 7h7l4 10-5 4c3 6 5 8 11 11l4-5 10 4v7c0 3-3 5-6 4C20 39 9 28 6 11c-1-2 2-4 6-4zM30 7c6 1 10 5 11 11M30 14c2 1 3 2 4 4"/>',
    api: '<path d="M7 9h25v24H7zM12 15h9m-9 6h14m-14 6h8M29 5h9v14m-5-5 5 5 5-5"/>',
    ram: '<rect x="11" y="11" width="26" height="26" rx="3"/><path d="M17 18h14v12H17zM17 6v5m7-5v5m7-5v5M17 37v5m7-5v5m7-5v5M6 17h5m-5 7h5m-5 7h5m26-14h5m-5 7h5m-5 7h5"/>',
    db: '<ellipse cx="24" cy="10" rx="15" ry="6"/><path d="M9 10v26c0 8 30 8 30 0V10M9 22c0 8 30 8 30 0M9 35c0 8 30 8 30 0"/>',
    worker:
      '<rect x="8" y="9" width="32" height="14" rx="3"/><rect x="8" y="26" width="32" height="14" rx="3"/><path d="M14 16h10m-10 17h10"/><circle class="qs-led" cx="33" cy="16" r="1.5"/><circle class="qs-led" cx="33" cy="33" r="1.5"/>',
  };
  return `<svg class="qs-figure qs-figure-${kind}" viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
}
