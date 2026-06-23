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
}

function updateRequirementUI(elementId, state) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const icon = el.querySelector('.material-icons-outlined');
    if (state === true || state === 'success') {
        el.style.color = '#16a34a'; // Green
        if (icon) icon.innerText = 'check_circle';
    } else if (state === 'error') {
        el.style.color = '#ef4444'; // Red
        if (icon) icon.innerText = 'cancel';
    } else if (state === 'pending') {
        el.style.color = '#64748b'; // Checking gray-blue
        if (icon) icon.innerText = 'pending';
    } else {
        el.style.color = '#94a3b8'; // Grey
        if (icon) icon.innerText = 'cancel';
    }
}

function validateEmailLive(email) {
    if (!email) return null;

    const atIndex = email.indexOf('@');
    if (atIndex === -1) {
        return "Email must contain an '@' character.";
    }

    const username = email.substring(0, atIndex);
    const domainPart = email.substring(atIndex + 1);

    if (username.length < 6) {
        return `Username before '@' is too short (currently ${username.length} characters, needs at least 6).`;
    }
    if (username.length > 64) {
        return `Username before '@' is too long (currently ${username.length} characters, maximum 64).`;
    }
    
    const usernameRegex = /^[A-Za-z0-9._%+-]+$/;
    if (!usernameRegex.test(username)) {
        return "Username contains invalid characters (only letters, numbers, and . _ % + - are allowed).";
    }

    if (!domainPart) {
        return "Please enter a domain name after '@' (e.g. gmail.com).";
    }

    if (/[A-Z]/.test(domainPart)) {
        return "Domain name after '@' must be in all lowercase letters (e.g. @gmail.com).";
    }

    const dotIndex = domainPart.indexOf('.');
    const domainName = dotIndex === -1 ? domainPart : domainPart.substring(0, dotIndex);
    
    if (domainName !== 'gmail' && domainName !== 'outlook' && domainName !== 'yahoo') {
        return "Only gmail, outlook, or yahoo domains are allowed.";
    }

    if (dotIndex === -1 || dotIndex === domainPart.length - 1) {
        return "Domain must include a period followed by a top-level domain (e.g. .com).";
    }

    const tld = domainPart.substring(dotIndex);
    const tldRegex = /^\.[a-z]{2,6}(\.[a-z]{2,6})?$/;
    if (!tldRegex.test(tld)) {
        return "Please enter a valid top-level domain (e.g. .com, .co.in).";
    }

    return null; // Valid!
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
            if (user.phone) {
                const phoneField = document.getElementById('reporterPhone');
                phoneField.value = user.phone;
                phoneField.dispatchEvent(new Event('input'));
            }
            if (user.email) {
                const emailField = document.getElementById('reporterEmail');
                emailField.value = user.email;
                emailField.dispatchEvent(new Event('input'));
            }
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

    // Live validation for Phone Sighting
    const phoneInput = document.getElementById('reporterPhone');
    const phoneErrorEl = document.getElementById('phoneError');

    phoneInput.addEventListener('input', () => {
        const phoneVal = phoneInput.value.trim();

        // Clear previous errors when typing
        phoneInput.style.borderColor = '#cbd5e1';
        phoneErrorEl.style.display = 'none';

        const isDigitsMet = phoneVal.length > 0 && /^\d+$/.test(phoneVal);
        const hasNonDigits = phoneVal.length > 0 && !/^\d+$/.test(phoneVal);

        const isStartMet = phoneVal.length > 0 && /^[6-9]/.test(phoneVal);
        const hasBadStart = phoneVal.length > 0 && !/^[6-9]/.test(phoneVal);

        const isLengthMet = phoneVal.length === 10;
        const isTooLong = phoneVal.length > 10;

        updateRequirementUI('reqPhoneDigits', phoneVal.length === 0 ? 'default' : (isDigitsMet ? 'success' : 'error'));
        updateRequirementUI('reqPhoneStart', phoneVal.length === 0 ? 'default' : (isStartMet ? 'success' : (hasBadStart ? 'error' : 'default')));
        updateRequirementUI('reqPhoneLength', phoneVal.length === 0 ? 'default' : (isLengthMet ? 'success' : (isTooLong ? 'error' : 'default')));

        const allMet = isDigitsMet && isStartMet && isLengthMet;
        const anyError = hasNonDigits || hasBadStart || isTooLong;

        if (allMet) {
            phoneInput.style.borderColor = '#16a34a';
        } else if (anyError) {
            phoneInput.style.borderColor = '#ef4444';
        } else {
            phoneInput.style.borderColor = '#cbd5e1';
        }
    });

    // Live validation for Email Sighting
    const emailInput = document.getElementById('reporterEmail');
    const emailErrorEl = document.getElementById('emailError');

    emailInput.addEventListener('input', () => {
        const emailVal = emailInput.value.trim();
        if (emailVal === '') {
            emailInput.style.borderColor = '#cbd5e1';
            emailErrorEl.style.display = 'none';
            return;
        }

        const errorMsg = validateEmailLive(emailVal);
        if (errorMsg) {
            emailInput.style.borderColor = '#ef4444';
            emailErrorEl.innerText = errorMsg;
            emailErrorEl.style.color = '#ef4444';
            emailErrorEl.style.display = 'block';
        } else {
            emailInput.style.borderColor = '#16a34a';
            emailErrorEl.innerText = 'Email is valid.';
            emailErrorEl.style.color = '#16a34a';
            emailErrorEl.style.display = 'block';
        }
    });

    // Handle Form Submit
    const reportForm = document.getElementById('reportForm');

    reportForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let isValid = true;

        const phone = phoneInput.value.trim();
        const email = emailInput.value.trim();

        // Phone submit check
        const isPhoneDigitsMet = phone.length > 0 && /^\d+$/.test(phone);
        const isPhoneStartMet = phone.length > 0 && /^[6-9]/.test(phone);
        const isPhoneLengthMet = phone.length === 10;
        if (!isPhoneDigitsMet || !isPhoneStartMet || !isPhoneLengthMet) {
            phoneInput.style.borderColor = '#ef4444';
            phoneErrorEl.style.display = 'block';

            if (!isPhoneDigitsMet) updateRequirementUI('reqPhoneDigits', 'error');
            if (!isPhoneStartMet) updateRequirementUI('reqPhoneStart', 'error');
            if (!isPhoneLengthMet) updateRequirementUI('reqPhoneLength', 'error');

            isValid = false;
        }

        // Email submit check
        if (email !== "") {
            const emailErrorMsg = validateEmailLive(email);
            if (emailErrorMsg) {
                emailInput.style.borderColor = '#ef4444';
                emailErrorEl.innerText = emailErrorMsg;
                emailErrorEl.style.color = '#ef4444';
                emailErrorEl.style.display = 'block';
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

            // Reset validation UI
            phoneInput.style.borderColor = '#cbd5e1';
            phoneErrorEl.style.display = 'none';
            updateRequirementUI('reqPhoneDigits', 'default');
            updateRequirementUI('reqPhoneStart', 'default');
            updateRequirementUI('reqPhoneLength', 'default');

            emailInput.style.borderColor = '#cbd5e1';
            emailErrorEl.style.display = 'none';

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
