/**
 * Jeevashwan Surakhsh - Leaflet Map Monitoring Logic
 * This script loads the actual ward boundaries of Kottayam Municipality,
 * maps reports to these wards, and styles them by accepted report count density.
 * Exclusively uses Leaflet (OpenStreetMap) with a vector SVG fallback.
 */

let leafletMap;
let leafletLayer;
let wards = []; // Array of { id, name, feature, reportCount, dogCount, complaints, center }
const KOTTAYAM_CENTER = { lat: 9.5916, lng: 76.5222 };

// Helper point-in-polygon raycasting algorithm in pure JS
function isPointInPolygon(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// 1. Initialize Map
function initMap() {
    window.mapInitialized = true;
    
    // Check if Leaflet is loaded
    if (typeof L !== 'undefined') {
        console.log("Initializing Leaflet Map...");
        try {
            document.getElementById('google-map').innerHTML = '';
            leafletMap = L.map('google-map').setView([KOTTAYAM_CENTER.lat, KOTTAYAM_CENTER.lng], 12);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(leafletMap);
        } catch (err) {
            console.error("Leaflet initialization failed:", err);
        }
    } else {
        console.log("Leaflet is not loaded. Utilizing SVG fallback map...");
    }
    
    fetchMapData();
}

// 2. Load Municipality GeoJSON boundary and parse actual wards
async function loadWardsData() {
    try {
        const response = await fetch('/untitled.geojson');
        if (!response.ok) throw new Error('Failed to fetch ward boundaries GeoJSON');
        const geojson = await response.json();
        
        // Find all polygon/multipolygon features representing wards
        const wardFeatures = geojson.features.filter(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
        
        if (wardFeatures.length === 0) {
            throw new Error('No ward polygon features found in GeoJSON');
        }
        
        const hasTurf = typeof turf !== 'undefined';
        
        wards = wardFeatures.map(f => {
            const wardNum = parseInt(f.properties.ward) || 0;
            const wardName = f.properties.name || `Ward ${wardNum}`;
            
            // Calculate a centroid for snapping reports (fallback center point)
            let center = KOTTAYAM_CENTER;
            try {
                if (hasTurf) {
                    center = turf.centroid(f).geometry.coordinates;
                } else {
                    // Manual centroid approximation by bounding box center
                    let minLat = Infinity, maxLat = -Infinity;
                    let minLng = Infinity, maxLng = -Infinity;
                    
                    const geom = f.geometry;
                    let rings = [];
                    if (geom.type === 'Polygon') {
                        rings = [geom.coordinates[0]];
                    } else if (geom.type === 'MultiPolygon') {
                        rings = geom.coordinates.map(poly => poly[0]);
                    }
                    
                    rings.forEach(ring => {
                        ring.forEach(p => {
                            const lng = p[0], lat = p[1];
                            if (lat < minLat) minLat = lat;
                            if (lat > maxLat) maxLat = lat;
                            if (lng < minLng) minLng = lng;
                            if (lng > maxLng) maxLng = lng;
                        });
                    });
                    
                    center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
                }
            } catch (err) {
                console.error("Centroid calculation error:", err);
            }
            
            // Set properties inside the feature for Leaflet access
            f.properties = {
                wardNum: wardNum,
                wardName: `${wardName} (Ward ${wardNum})`,
                reportCount: 0,
                dogCount: 0,
                complaints: []
            };
            
            return {
                id: wardNum,
                name: `${wardName} (Ward ${wardNum})`,
                feature: f,
                reportCount: 0,
                dogCount: 0,
                complaints: [],
                center: center
            };
        });
        
        // Sort wards by ward number ascending
        wards.sort((a, b) => a.id - b.id);
        
        console.log(`Successfully loaded ${wards.length} actual wards from Kottayam Municipality.`);
    } catch (e) {
        console.error('Error loading actual ward boundaries:', e);
        // Fallback to circular/mock wards
        createMockWards();
    }
}

// Fallback in case GeoJSON is missing or Turf fails
function createMockWards() {
    wards = [];
    const hasTurf = typeof turf !== 'undefined';
    for (let i = 1; i <= 52; i++) {
        const angle = (i * 2 * Math.PI) / 52;
        const radius = 0.02 + Math.random() * 0.015;
        const centerLat = KOTTAYAM_CENTER.lat + 0.04 * Math.sin(angle) * Math.random();
        const centerLng = KOTTAYAM_CENTER.lng + 0.04 * Math.cos(angle) * Math.random();
        
        let feature;
        if (hasTurf) {
            feature = turf.circle([centerLng, centerLat], radius * 100, { steps: 10, units: 'kilometers' });
        } else {
            // Simple rectangle as fallback
            const size = 0.01;
            feature = {
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [centerLng - size, centerLat - size],
                        [centerLng + size, centerLat - size],
                        [centerLng + size, centerLat + size],
                        [centerLng - size, centerLat + size],
                        [centerLng - size, centerLat - size]
                    ]]
                }
            };
        }
        
        feature.properties = {
            wardNum: i,
            wardName: `Ward ${i}`,
            reportCount: 0,
            dogCount: 0,
            complaints: []
        };
        
        wards.push({
            id: i,
            name: `Ward ${i}`,
            feature: feature,
            reportCount: 0,
            dogCount: 0,
            complaints: [],
            center: [centerLng, centerLat]
        });
    }
}

// 4. Fetch Map Data from Backend
function fetchMapData() {
    document.getElementById('map-loader').classList.remove('hidden');
    
    const loadPromise = (wards.length === 0) ? loadWardsData() : Promise.resolve();
    
    loadPromise.then(() => {
        return fetch('/api/public-map-data');
    })
    .then(res => {
        if (!res.ok) throw new Error('API failed');
        return res.json();
    })
    .then(data => {
        processMapData(data);
        document.getElementById('map-loader').classList.add('hidden');
    })
    .catch(err => {
        console.warn('Could not fetch public map data. Displaying fallback mock data.', err);
        const fallbackMock = [
            { id: 101, location_lat: 9.5916, location_lng: 76.5222, dog_count: 12, created_at: new Date().toISOString(), area_name: 'Kottayam Town Center', behavior: 'Aggressive' },
            { id: 102, location_lat: 9.5910, location_lng: 76.5210, dog_count: 3, created_at: new Date().toISOString(), area_name: 'Baker Junction', behavior: 'Aggressive' },
            { id: 103, location_lat: 9.6738, location_lng: 76.5592, dog_count: 6, created_at: new Date().toISOString(), area_name: 'Ettumanoor Temple Road', behavior: 'Normal' },
            { id: 104, location_lat: 9.6740, location_lng: 76.5580, dog_count: 2, created_at: new Date().toISOString(), area_name: 'Ettumanoor Stand', behavior: 'Normal' },
            { id: 105, location_lat: 9.5513, location_lng: 76.5513, dog_count: 2, created_at: new Date().toISOString(), area_name: 'Puthuppally Junction', behavior: 'Normal' }
        ];
        processMapData(fallbackMock);
        document.getElementById('map-loader').classList.add('hidden');
    });
}

// 5. Map complaints to Wards
function processMapData(complaints) {
    // Filter complaints to keep only Assigned cases
    const assignedComplaints = complaints.filter(c => c.status === 'Assigned');

    wards.forEach(w => {
        w.reportCount = 0;
        w.dogCount = 0;
        w.complaints = [];
        w.feature.properties.reportCount = 0;
        w.feature.properties.dogCount = 0;
        w.feature.properties.complaints = [];
    });
    
    let mappedCount = 0;
    const hasTurf = typeof turf !== 'undefined';
    
    // First Pass: point-in-polygon matching (or area_name pattern matching)
    assignedComplaints.forEach(c => {
        // Try parsing ward number from area_name first (e.g. "Ward 11 - MALLUSSERRY")
        if (c.area_name) {
            const match = c.area_name.match(/Ward\s+(\d+)/i);
            if (match) {
                const wardNum = parseInt(match[1]);
                const targetWard = wards.find(w => w.id === wardNum);
                if (targetWard) {
                    targetWard.reportCount += 1;
                    targetWard.dogCount += (c.dog_count || 1);
                    targetWard.complaints.push(c);
                    
                    targetWard.feature.properties.reportCount = targetWard.reportCount;
                    targetWard.feature.properties.dogCount = targetWard.dogCount;
                    targetWard.feature.properties.complaints.push(c);
                    
                    mappedCount++;
                    return; // Successfully mapped by name, skip coordinate check
                }
            }
        }

        const lat = c.location_lat;
        const lng = c.location_lng;
        if (!lat || !lng) return;
        
        for (let i = 0; i < wards.length; i++) {
            const ward = wards[i];
            let inside = false;
            
            if (hasTurf) {
                try {
                    inside = turf.booleanPointInPolygon(turf.point([lng, lat]), ward.feature);
                } catch(e) {
                    // fallback
                }
            }
            
            if (!inside) {
                const geom = ward.feature.geometry;
                if (geom.type === 'Polygon') {
                    inside = isPointInPolygon([lng, lat], geom.coordinates[0]);
                } else if (geom.type === 'MultiPolygon') {
                    for (let k = 0; k < geom.coordinates.length; k++) {
                        if (isPointInPolygon([lng, lat], geom.coordinates[k][0])) {
                            inside = true;
                            break;
                        }
                    }
                }
            }
            
            if (inside) {
                ward.reportCount += 1;
                ward.dogCount += (c.dog_count || 1);
                ward.complaints.push(c);
                
                ward.feature.properties.reportCount = ward.reportCount;
                ward.feature.properties.dogCount = ward.dogCount;
                ward.feature.properties.complaints.push(c);
                
                mappedCount++;
                break;
            }
        }
    });
    
    // Second Pass: map residual points to closest ward centroid
    assignedComplaints.forEach(c => {
        const lat = c.location_lat;
        const lng = c.location_lng;
        if (!lat || !lng) return;
        
        let alreadyMapped = false;
        for (let i = 0; i < wards.length; i++) {
            if (wards[i].complaints.some(wc => wc.id === c.id)) {
                alreadyMapped = true;
                break;
            }
        }
        
        if (!alreadyMapped) {
            let minDistance = Infinity;
            let closestWard = null;
            
            for (let i = 0; i < wards.length; i++) {
                const ward = wards[i];
                const dx = lng - ward.center[0];
                const dy = lat - ward.center[1];
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestWard = ward;
                }
            }
            
            if (closestWard) {
                closestWard.reportCount += 1;
                closestWard.dogCount += (c.dog_count || 1);
                closestWard.complaints.push(c);
                
                closestWard.feature.properties.reportCount = closestWard.reportCount;
                closestWard.feature.properties.dogCount = closestWard.dogCount;
                closestWard.feature.properties.complaints.push(c);
                
                mappedCount++;
            }
        }
    });
    
    console.log(`Mapped ${mappedCount} complaints to wards.`);
    
    // Calculate stats
    let totalReportsCount = 0;
    let activeRedWardsCount = 0;
    
    wards.forEach(w => {
        totalReportsCount += w.complaints.length;
        if (w.reportCount > 6) activeRedWardsCount++;
    });
    
    document.getElementById('total-reports').innerText = totalReportsCount;
    document.getElementById('active-red-zones').innerText = activeRedWardsCount;
    
    // Update sidebar list of wards
    updateWardListUI();
    
    // Render Map
    if (typeof L !== 'undefined' && leafletMap) {
        renderLeafletMap();
    } else {
        renderSvgMap();
    }
}

// 6. Leaflet styling & rendering
function getLeafletStyle(feature) {
    const reportCount = feature.properties.reportCount || 0;
    const showRed = document.getElementById('filter-red').checked;
    const showOrange = document.getElementById('filter-orange').checked;
    const showYellow = document.getElementById('filter-yellow').checked;
    
    let color = 'transparent';
    let fillOpacity = 0.0;
    
    if (reportCount > 6) {
        if (showRed) { color = '#D32F2F'; fillOpacity = 0.55; }
    } else if (reportCount >= 3) {
        if (showOrange) { color = '#E65100'; fillOpacity = 0.50; }
    } else if (reportCount >= 1) {
        if (showYellow) { color = '#EAB308'; fillOpacity = 0.40; }
    }
    
    return {
        fillColor: color,
        fillOpacity: fillOpacity,
        color: '#2C3E35',
        weight: 1.5,
        opacity: 0.7
    };
}

function renderLeafletMap() {
    if (window.leafletLayer) {
        window.leafletLayer.clearLayers();
        window.leafletLayer.addData({
            type: "FeatureCollection",
            features: wards.map(w => w.feature)
        });
        window.leafletLayer.setStyle(getLeafletStyle);
    } else {
        const llayer = L.geoJSON({
            type: "FeatureCollection",
            features: wards.map(w => w.feature)
        }, {
            style: getLeafletStyle,
            onEachFeature: function(feature, layer) {
                layer.bindPopup(() => generatePopupContent(feature.properties), {
                    maxWidth: 290
                });
                layer.bindTooltip(`${feature.properties.wardNum}`, {
                    permanent: true,
                    direction: 'center',
                    className: 'ward-label'
                });
            }
        }).addTo(leafletMap);
        
        window.leafletLayer = llayer;
        leafletMap.fitBounds(llayer.getBounds());
    }
}

// 7. SVG Fallback Map (Fully client-side, runs anywhere offline)
function renderSvgMap() {
    console.log("Leaflet library not loaded. Generating interactive SVG map fallback...");
    const container = document.getElementById('google-map');
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    wards.forEach(w => {
        const geom = w.feature.geometry;
        let rings = [];
        if (geom.type === 'Polygon') {
            rings = [geom.coordinates[0]];
        } else if (geom.type === 'MultiPolygon') {
            rings = geom.coordinates.map(p => p[0]);
        }
        
        rings.forEach(coords => {
            coords.forEach(p => {
                const lng = p[0], lat = p[1];
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
            });
        });
    });
    
    const padding = 0.005;
    const xMin = minLng - padding;
    const yMax = maxLat + padding;
    const xMax = maxLng + padding;
    const yMin = minLat - padding;
    
    const width = xMax - xMin;
    const height = yMax - yMin;
    
    let svgHtml = `<svg viewBox="${xMin} ${-yMax} ${width} ${height}" style="width:100%; height:100%; background:#f8fafc; padding:10px;" xmlns="http://www.w3.org/2000/svg">`;
    
    const showRed = document.getElementById('filter-red').checked;
    const showOrange = document.getElementById('filter-orange').checked;
    const showYellow = document.getElementById('filter-yellow').checked;
    
    wards.forEach(w => {
        const geom = w.feature.geometry;
        let rings = [];
        if (geom.type === 'Polygon') {
            rings = [geom.coordinates[0]];
        } else if (geom.type === 'MultiPolygon') {
            rings = geom.coordinates.map(p => p[0]);
        }
        
        rings.forEach(coords => {
            const points = coords.map(p => `${p[0]},${-p[1]}`).join(' ');
            const reportCount = w.reportCount || 0;
            
            let fillColor = 'rgba(255,255,255,0.35)';
            if (reportCount > 6) {
                if (showRed) fillColor = 'rgba(211, 47, 47, 0.6)';
            } else if (reportCount >= 3) {
                if (showOrange) fillColor = 'rgba(230, 81, 0, 0.65)';
            } else if (reportCount >= 1) {
                if (showYellow) fillColor = 'rgba(234, 179, 8, 0.55)';
            }
            
            svgHtml += `
                <polygon points="${points}" 
                         fill="${fillColor}" 
                         stroke="#2C3E35" 
                         stroke-width="0.0003" 
                         style="cursor:pointer; transition: fill 0.2s;" 
                         onclick="showSvgWardDetails(${w.id})"
                         onmouseover="this.setAttribute('stroke-width', '0.0007')"
                         onmouseout="this.setAttribute('stroke-width', '0.0003')" />
            `;
        });
    });
    
    // Add text labels for wards in SVG on top of polygons
    wards.forEach(w => {
        svgHtml += `
            <text x="${w.center[0]}" y="${-w.center[1]}" 
                  font-size="0.0012" 
                  font-weight="bold" 
                  fill="#1E293B" 
                  text-anchor="middle" 
                  dominant-baseline="central" 
                  style="pointer-events:none; font-family:var(--font-body); text-shadow: -0.00015px -0.00015px 0 #fff, 0.00015px -0.00015px 0 #fff, -0.00015px 0.00015px 0 #fff, 0.00015px 0.00015px 0 #fff;">
                ${w.id}
            </text>
        `;
    });
    
    svgHtml += `</svg>`;
    
    container.innerHTML = `
        <div style="position:relative; width:100%; height:100%;">
            ${svgHtml}
            <div id="svg-popup" style="position:absolute; top:20px; right:20px; background:white; padding:15px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.15); border:1px solid #cbd5e1; display:none; width: 280px; z-index:1000;"></div>
            <div style="position:absolute; bottom:10px; left:10px; background:rgba(255,255,255,0.85); padding:6px 12px; border-radius:6px; font-size:0.75rem; color:var(--color-text-muted); border:1px solid var(--color-border); font-weight:500;">
                Offline Vector Mode (CDNs unavailable)
            </div>
        </div>
    `;
}

window.showSvgWardDetails = function(wardId) {
    const ward = wards.find(w => w.id === wardId);
    if (!ward) return;
    
    const popup = document.getElementById('svg-popup');
    const content = generatePopupContent({
        wardName: ward.name,
        reportCount: ward.reportCount,
        dogCount: ward.dogCount,
        complaints: ward.complaints
    });
    
    popup.innerHTML = `
        <div style="display:flex; justify-content:flex-end; margin-bottom: 2px;">
            <span style="cursor:pointer; font-weight:bold; color:var(--color-text-muted); font-size:1.2rem; line-height:1;" onclick="document.getElementById('svg-popup').style.display='none'">&times;</span>
        </div>
        ${content}
    `;
    popup.style.display = 'block';
};

// 8. Info Window popup content generator
function generatePopupContent(props) {
    const wardName = props.wardName || 'Ward';
    const reportCount = props.reportCount || 0;
    const dogCount = props.dogCount || 0;
    const complaints = props.complaints || [];
    
    let colorClass = 'safe';
    let riskLabel = 'No Reports';
    if (reportCount > 6) {
        colorClass = 'red';
        riskLabel = 'High Risk';
    } else if (reportCount >= 3) {
        colorClass = 'orange';
        riskLabel = 'Moderate';
    } else if (reportCount >= 1) {
        colorClass = 'yellow';
        riskLabel = 'Low Risk';
    }
    
    let content = `
        <div class="info-window">
            <div class="info-header ${colorClass}">
                ${wardName} (${riskLabel})
            </div>
            <div class="info-body">
                <div class="info-row">
                    <span>Assigned Reports:</span>
                    <span>${reportCount}</span>
                </div>
                <div class="info-row">
                    <span>Total Dogs Sighted:</span>
                    <span>${dogCount}</span>
                </div>
    `;
    
    if (complaints.length > 0) {
        content += `<div style="margin-top: 12px; font-weight: 600; font-size: 0.85rem; color: var(--color-text-main); border-bottom: 1px solid var(--color-border); padding-bottom: 4px; margin-bottom: 4px;">Recent Sightings:</div>
                    <div style="max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">`;
        
        const sortedComplaints = [...complaints].sort((a,b) => new Date(b.created_at || b.reportDate) - new Date(a.created_at || a.reportDate));
        sortedComplaints.forEach(c => {
            content += `
                <div style="font-size: 0.8rem; padding: 6px; background: var(--color-bg-main); border-radius: 6px; border-left: 3px solid ${c.behavior === 'Aggressive' ? 'var(--color-red-zone)' : 'var(--color-orange-zone)'};">
                    <strong>${c.area_name || 'Area'}</strong> (${c.dog_count} ${c.dog_count > 1 ? 'dogs' : 'dog'})<br>
                    <span style="color: var(--color-text-muted); font-size: 0.75rem;">Behavior: ${c.behavior || 'Normal'}</span><br>
                    <span style="color: #94A3B8; font-size: 0.7rem;">${formatDate(c.created_at || c.reportDate)}</span>
                </div>
            `;
        });
        content += `</div>`;
    } else {
        content += `<div style="margin-top: 12px; font-size: 0.85rem; color: var(--color-text-muted); text-align: center; font-style: italic;">No active reports in this ward.</div>`;
    }
    
    content += `
            </div>
        </div>
    `;
    return content;
}

// 9. Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'Unknown Date';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// 10. Checkbox Filtering Logic
document.addEventListener('DOMContentLoaded', () => {
    const toggleActiveState = (labelElement, isChecked) => {
        if (isChecked) labelElement.classList.add('active');
        else labelElement.classList.remove('active');
    };

    ['red', 'orange', 'yellow'].forEach(type => {
        const checkboxId = `filter-${type}`;
        const cb = document.getElementById(checkboxId);

        if (cb) {
            toggleActiveState(cb.closest('.filter-option'), cb.checked);

            cb.addEventListener('change', (e) => {
                toggleActiveState(cb.closest('.filter-option'), e.target.checked);

                // Leaflet Map Refresh
                if (window.leafletLayer) {
                    window.leafletLayer.setStyle(getLeafletStyle);
                    if (window.leafletMap) window.leafletMap.closePopup();
                }
                
                // SVG Map Refresh (if Leaflet is not running)
                if (typeof L === 'undefined' || !leafletMap) {
                    renderSvgMap();
                }
            });
        }
    });
});

// 11. Ward List UI & Search
function updateWardListUI() {
    const listContainer = document.getElementById('ward-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    wards.forEach(w => {
        let badgeClass = 'safe';
        let badgeText = '0 Reports';
        if (w.reportCount > 6) {
            badgeClass = 'red';
            badgeText = `${w.reportCount} Reports`;
        } else if (w.reportCount >= 3) {
            badgeClass = 'orange';
            badgeText = `${w.reportCount} Reports`;
        } else if (w.reportCount >= 1) {
            badgeClass = 'yellow';
            badgeText = `${w.reportCount} Reports`;
        }
        
        // Extract plain name without the (Ward X) suffix if it exists
        const displayName = w.name.split(' (Ward ')[0];
        
        const item = document.createElement('div');
        item.className = 'ward-list-item';
        item.setAttribute('data-ward-id', w.id);
        item.setAttribute('data-ward-name', w.name.toLowerCase());
        item.onclick = () => selectWardFromList(w.id);
        
        item.innerHTML = `
            <div class="ward-list-info">
                <div class="ward-list-number">${w.id}</div>
                <div class="ward-list-name">${displayName}</div>
            </div>
            <div class="ward-list-badge ${badgeClass}">${badgeText}</div>
        `;
        
        listContainer.appendChild(item);
    });
}

function filterWardList() {
    const query = document.getElementById('ward-search-input').value.toLowerCase().trim();
    const items = document.querySelectorAll('.ward-list-item');
    
    items.forEach(item => {
        const wardId = item.getAttribute('data-ward-id');
        const wardName = item.getAttribute('data-ward-name');
        
        if (wardId.includes(query) || wardName.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function selectWardFromList(wardId) {
    // If Leaflet is loaded and initialized
    if (typeof L !== 'undefined' && leafletMap && window.leafletLayer) {
        let foundLayer = null;
        window.leafletLayer.eachLayer(layer => {
            if (layer.feature && layer.feature.properties && layer.feature.properties.wardNum === wardId) {
                foundLayer = layer;
            }
        });
        
        if (foundLayer) {
            // Pan/zoom to the layer's bounds
            if (foundLayer.getBounds) {
                leafletMap.fitBounds(foundLayer.getBounds(), { maxZoom: 15 });
            } else if (foundLayer.getLatLng) {
                leafletMap.setView(foundLayer.getLatLng(), 15);
            }
            // Open the popup
            foundLayer.openPopup();
        }
    } else {
        // SVG Fallback Mode
        showSvgWardDetails(wardId);
    }
}

// Expose functions globally for inline HTML event handlers
window.filterWardList = filterWardList;
window.selectWardFromList = selectWardFromList;
