function escHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function popup(title, lines, url) {
  const clean = [`<strong>${escHtml(title)}</strong>`];
  for (const line of lines || []) if (line) clean.push(escHtml(line));
  if (url) clean.push(`<a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer">Open property listing</a>`);
  return clean.join('<br>');
}
function makeMarker(map, layerGroups, category, lat, lon, colour, html, radius = 7) {
  if (!layerGroups[category]) layerGroups[category] = L.layerGroup().addTo(map);
  const marker = L.circleMarker([lat, lon], { radius, color: colour, weight: 2, opacity: 0.9, fillColor: colour, fillOpacity: 0.76 });
  marker.bindPopup(html);
  marker.addTo(layerGroups[category]);
  return marker;
}
function initMap(el) {
  const data = JSON.parse(el.dataset.map || '{}');
  const map = L.map(el.id, { scrollWheelZoom: false }).setView(data.defaultCentre, data.defaultZoom);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(map);
  const layerGroups = {};
  const bounds = [];

  for (const item of data.transport || []) {
    if (!layerGroups[item.category]) layerGroups[item.category] = L.layerGroup().addTo(map);
    const circle = L.circle([item.lat, item.lon], { radius: item.radius, color: item.colour, weight: 1, opacity: 0.22, fillColor: item.colour, fillOpacity: 0.08, interactive: false });
    circle.addTo(layerGroups[item.category]);
    makeMarker(map, layerGroups, item.category, item.lat, item.lon, item.colour, popup(item.name || 'Transport', [item.type, item.address, `${item.radius}m radius`], null));
    bounds.push([item.lat, item.lon]);
  }

  for (const item of data.benefits || []) {
    makeMarker(map, layerGroups, item.category, item.lat, item.lon, item.colour, popup(item.name || 'Benefit', [item.type, [item.address, item.suburb].filter(Boolean).join(', ')], null));
    bounds.push([item.lat, item.lon]);
  }

  for (const item of data.properties || []) {
    makeMarker(map, layerGroups, item.category, item.lat, item.lon, item.colour, popup(item.address || 'Property', [item.suburb, item.price, item.features, item.status], item.url));
    bounds.push([item.lat, item.lon]);
  }

  if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: data.defaultZoom });
  if (bounds.length === 1) map.setView(bounds[0], data.defaultZoom);

  const controls = document.querySelector(`[data-map-controls="${el.id}"]`);
  if (controls) {
    const applyLayerState = (input) => {
      const group = layerGroups[input.dataset.layer];
      if (!group) return;
      if (input.checked) group.addTo(map); else map.removeLayer(group);
    };

    controls.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => applyLayerState(input));
      applyLayerState(input);
    });
  }
}
document.querySelectorAll('.map[data-map]').forEach(initMap);

function ensureBackToTop() {
  if (document.querySelector('.back-to-top')) return;
  const btn = document.createElement('a');
  btn.href = '#top';
  btn.className = 'back-to-top';
  btn.textContent = 'Top';
  btn.setAttribute('aria-label', 'Back to top');
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => {
    btn.classList.toggle('is-visible', window.scrollY > 500);
  }, { passive: true });
}

function combineMobilePriceStatus() {
  if (!window.matchMedia('(max-width: 760px)').matches) return;

  document.querySelectorAll('table.listing-table tbody tr, table.mobile-card-table tbody tr').forEach(row => {
    const price = row.querySelector('td[data-label="Price"]');
    const status = row.querySelector('td[data-label="Status"]');
    if (!price || !status || price.classList.contains('price-status-mobile')) return;

    const statusContent = status.innerHTML.trim();
    if (!statusContent) {
      status.remove();
      return;
    }

    const priceContent = price.innerHTML.trim();
    price.innerHTML = `<span class="price-value-mobile">${priceContent}</span><span class="mobile-inline-status">${statusContent}</span>`;
    price.classList.add('price-status-mobile');
    status.remove();
  });
}

function combineMobileFeatures() {
  if (!window.matchMedia('(max-width: 760px)').matches) return;

  document.querySelectorAll('table.listing-table tbody tr, table.mobile-card-table tbody tr').forEach(row => {
    if (row.querySelector('.feature-grid-mobile')) return;

    const beds = row.querySelector('td[data-label="Beds"]');
    const baths = row.querySelector('td[data-label="Baths"]');
    const car = row.querySelector('td[data-label="Car"]');

    if (!beds || !baths || !car) return;

    const grid = document.createElement('td');
    grid.className = 'feature-grid-mobile';
    grid.setAttribute('data-label', 'Features');
    grid.innerHTML =
    '<div class="feature-row">' +
        '<span class="feature-mini"><strong>Beds</strong>' + beds.textContent.trim() + '</span>' +
        '<span class="feature-mini"><strong>Baths</strong>' + baths.textContent.trim() + '</span>' +
        '<span class="feature-mini"><strong>Car</strong>' + car.textContent.trim() + '</span>' +
    '</div>';

    beds.parentNode.insertBefore(grid, beds);
    beds.remove();
    baths.remove();
    car.remove();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  ensureBackToTop();
  combineMobilePriceStatus();
  combineMobileFeatures();
});