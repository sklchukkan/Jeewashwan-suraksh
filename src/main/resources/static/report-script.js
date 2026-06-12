// Report Form Logic Configuration

let pickerMap;
let marker;
const KOTTAYAM_CENTER = { lat: 9.5916, lng: 76.5222 };

// 1. Initialize Map Picker
function initPickerMap() {
    const mapDiv = document.getElementById("picker-map");
    if (!mapDiv) return;

    // Check if Leaflet is loaded
    if (typeof L !== 'undefined') {
        console.log("Initializing Leaflet Map Picker...");
        try {
            mapDiv.innerHTML = '';
            pickerMap = L.map('picker-map').setView([KOTTAYAM_CENTER.lat, KOTTAYAM_CENTER.lng], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(pickerMap);

            // Listen for clicks to add/move marker
            pickerMap.on('click', function(e) {
                placeMarkerAndPanTo(e.latlng, pickerMap);
            });
        } catch (err) {
            console.error("Leaflet initialization failed:", err);
            setupFallbackPicker(mapDiv);
        }
    } else {
        console.warn("Leaflet not loaded. Using fallback location picker.");
        setupFallbackPicker(mapDiv);
    }
}

function setupFallbackPicker(mapDiv) {
    const mockLat = (KOTTAYAM_CENTER.lat + (Math.random() * 0.05)).toFixed(4);
    const mockLng = (KOTTAYAM_CENTER.lng + (Math.random() * 0.05)).toFixed(4);

    mapDiv.innerHTML = `
        <div class="mock-map">
            <span class="material-icons-outlined" style="font-size:3rem; color:var(--color-primary); margin-bottom:16px;">map</span>
            <div>Interactive Location Picker Ready</div>
            <div style="font-size:0.8rem; margin-top:8px;">(Click anywhere on this grey area to select a coordinate)</div>
        </div>
    `;

    mapDiv.addEventListener('click', () => {
        updateCoordinates(mockLat, mockLng);

        // Add a visual mock pin
        mapDiv.innerHTML = `
            <div class="mock-map">
                <span class="material-icons-outlined" style="font-size:3rem; color:var(--color-primary); margin-bottom:16px;">place</span>
                <div>Location Pinned!</div>
                <div style="font-size:0.8rem; margin-top:8px;">Lat: ${mockLat}, Lng: ${mockLng}</div>
            </div>
        `;
    });
}

function placeMarkerAndPanTo(latLng, map) {
    const lat = latLng.lat.toFixed(6);
    const lng = latLng.lng.toFixed(6);

    if (marker) {
        marker.setLatLng(latLng);
    } else {
        marker = L.marker(latLng, { draggable: true }).addTo(map);
        
        // Listen for drag end to update coordinates
        marker.on('dragend', function() {
            const position = marker.getLatLng();
            updateCoordinates(position.lat.toFixed(6), position.lng.toFixed(6));
        });
    }
    map.panTo(latLng);

    // Update hidden form fields and UI
    updateCoordinates(lat, lng);
}

function updateCoordinates(lat, lng) {
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lng;
    document.getElementById('coordDisplay').innerText = `Lat: ${lat}, Lng: ${lng}`;
    document.getElementById('coordDisplay').style.color = 'var(--color-primary-dark)';
}


// 2. Form Submission and Validation
document.addEventListener('DOMContentLoaded', () => {

    // Autofill reporter details if logged in
    const token = localStorage.getItem('token');
    if (token) {
        console.log("Logged in user detected. Fetching profile details for autofill...");
        fetch('/api/users/me', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(res => {
            if (!res.ok) throw new Error("Could not fetch user profile");
            return res.json();
        })
        .then(user => {
            console.log("Profile details fetched:", user);
            if (user.name) document.getElementById('reporterName').value = user.name;
            if (user.phone) document.getElementById('reporterPhone').value = user.phone;
            if (user.email) document.getElementById('reporterEmail').value = user.email;
        })
        .catch(err => {
            console.error("Autofill error:", err);
        });
    }

    // Style the file upload name change and preview
    const fileInput = document.getElementById('dogPhoto');
    const fileNameDisplay = document.getElementById('file-name');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImage = document.getElementById('imagePreview');
    const removePhotoBtn = document.getElementById('btnRemovePhoto');

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            fileNameDisplay.innerText = file.name;
            fileNameDisplay.style.color = 'var(--color-primary-dark)';
            fileNameDisplay.style.fontWeight = '600';

            const reader = new FileReader();
            reader.onload = (event) => {
                previewImage.src = event.target.result;
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            fileNameDisplay.innerText = "Click or drag an image here (JPG, PNG)";
            previewContainer.style.display = 'none';
            previewImage.src = '';
        }
    });

    removePhotoBtn.addEventListener('click', () => {
        fileInput.value = '';
        fileNameDisplay.innerText = "Click or drag an image here (JPG, PNG)";
        fileNameDisplay.style.fontWeight = 'normal';
        fileNameDisplay.style.color = 'inherit';
        previewContainer.style.display = 'none';
        previewImage.src = '';
    });

    // Clear validation errors on input
    document.getElementById('reporterPhone').addEventListener('input', () => {
        document.getElementById('reporterPhone').classList.remove('invalid');
        document.getElementById('phoneError').style.display = 'none';
    });
    document.getElementById('reporterEmail').addEventListener('input', () => {
        document.getElementById('reporterEmail').classList.remove('invalid');
        document.getElementById('emailError').style.display = 'none';
    });

    // Handle Form Submit
    const reportForm = document.getElementById('reportForm');

    reportForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Clear previous error styles
        document.getElementById('reporterPhone').classList.remove('invalid');
        document.getElementById('phoneError').style.display = 'none';
        document.getElementById('reporterEmail').classList.remove('invalid');
        document.getElementById('emailError').style.display = 'none';

        let isValid = true;

        // Validate Phone (digits only, exactly 10 digits)
        const phoneInput = document.getElementById('reporterPhone');
        const phone = phoneInput.value.trim();
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            phoneInput.classList.add('invalid');
            document.getElementById('phoneError').style.display = 'block';
            isValid = false;
        }

        // Validate Email
        const emailInput = document.getElementById('reporterEmail');
        const email = emailInput.value.trim();
        if (email !== "") {
            const emailRegex = /^[A-Za-z0-9._%+-]{6,64}@(gmail|outlook|yahoo)\.[A-Za-z]{2,6}(\.[A-Za-z]{2,6})?$/;
            if (!emailRegex.test(email)) {
                emailInput.classList.add('invalid');
                document.getElementById('emailError').style.display = 'block';
                isValid = false;
            }
        }

        if (!isValid) {
            return;
        }

        // Validate Map Selection
        const lat = document.getElementById('latitude').value;
        if (!lat) {
            alert("Please select the location of the sighting on the map.");
            return;
        }

        // Show loading state
        document.getElementById('submitLoader').classList.add('active');
        document.getElementById('submitAlert').classList.remove('active');

        const submitBtn = reportForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';

        // Gather Payload as multipart form data (includes photo)
        const formData = new FormData(reportForm);

        fetch('/api/reports', {
            method: 'POST',
            headers: {
                ...(localStorage.getItem('token') && { 'Authorization': 'Bearer ' + localStorage.getItem('token') })
            },
            body: formData
        })
        .then(async (res) => {
            const data = await res.json();
            // Hide Loader
            document.getElementById('submitLoader').classList.remove('active');

            if (!res.ok) {
                alert('Error: ' + (data.error || 'Unknown error'));
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                return;
            }

            // Show Success Notification
            document.getElementById('submitAlert').classList.add('active');

            // Reset Form styling
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';

            // Clear contents
            reportForm.reset();
            fileNameDisplay.innerText = "Click or drag an image here (JPG, PNG)";
            fileNameDisplay.style.fontWeight = 'normal';
            fileNameDisplay.style.color = 'inherit';
            if (previewContainer) previewContainer.style.display = 'none';
            if (previewImage) previewImage.src = '';
            document.getElementById('coordDisplay').innerText = "None selected. Please click on the map.";
            document.getElementById('coordDisplay').style.color = 'inherit';

            // Reset Map
            if (marker && pickerMap) {
                pickerMap.removeLayer(marker);
                marker = null;
            }
            if (pickerMap) {
                pickerMap.setView([KOTTAYAM_CENTER.lat, KOTTAYAM_CENTER.lng], 13);
            }

            // Scroll to alert
            document.getElementById('submitAlert').scrollIntoView({ behavior: "smooth", block: "center" });

        })
        .catch(err => {
            document.getElementById('submitLoader').classList.remove('active');
            alert('Failed to submit report. Server error.');
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        });
    });
});
