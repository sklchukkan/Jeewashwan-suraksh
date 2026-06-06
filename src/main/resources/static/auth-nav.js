// Dynamic Authentication Navbar & Profile Modal Logic
document.addEventListener('DOMContentLoaded', () => {
    initAuthNav();
});

function initAuthNav() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // 1. Inject Profile CSS dynamically
    injectProfileStyles();

    // 2. Inject Profile Modal HTML at the end of body
    injectProfileModalHtml();

    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            let dashboardUrl = 'dashboard-user.html';
            if (user.role === 'admin') dashboardUrl = 'dashboard-admin.html';
            else if (user.role === 'ngo') dashboardUrl = 'dashboard-ngo.html';

            // Find nav-actions container
            const navActions = document.querySelector('.nav-actions');
            if (navActions) {
                const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || !window.location.pathname.includes('.html');
                const homeBtnHtml = isHomePage ? '' : `
                    <a href="index.html" class="btn btn-outline" style="margin-right: 10px; display: inline-flex; align-items: center; gap: 4px;">
                        <span class="material-icons-outlined" style="font-size: 1.1rem;">home</span> Home
                    </a>
                `;
                navActions.innerHTML = `
                    ${homeBtnHtml}
                    <a href="${dashboardUrl}" class="btn btn-outline" style="margin-right: 10px; display: inline-flex; align-items: center; gap: 4px;">
                        <span class="material-icons-outlined" style="font-size: 1.1rem;">dashboard</span> Dashboard
                    </a>
                    <button id="navProfileBtn" class="btn btn-primary" style="margin-right: 10px; display: inline-flex; align-items: center; gap: 4px;">
                        <span class="material-icons-outlined" style="font-size: 1.1rem;">account_circle</span> Profile
                    </button>
                    <button id="navLogoutBtn" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 4px;">
                        <span class="material-icons-outlined" style="font-size: 1.1rem;">logout</span> Logout
                    </button>
                `;

                // Add event listeners
                document.getElementById('navProfileBtn').addEventListener('click', openProfileModal);
                document.getElementById('navLogoutBtn').addEventListener('click', handleLogout);
            }
        } catch (e) {
            console.error("Error parsing user from localStorage:", e);
        }
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert("You have been logged out successfully.");
    window.location.href = 'index.html';
}

function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    modal.style.display = 'flex';
    modal.classList.add('active');

    // Show loading
    document.getElementById('profileLoader').style.display = 'flex';
    document.getElementById('profileCardBody').style.display = 'none';

    const token = localStorage.getItem('token');
    if (!token) return;

    // Fetch profile and login history concurrently
    Promise.all([
        fetch('/api/users/me', { headers: { 'Authorization': 'Bearer ' + token } }).then(res => res.json()),
        fetch('/api/users/me/logins', { headers: { 'Authorization': 'Bearer ' + token } }).then(res => res.json())
    ])
    .then(([profile, logins]) => {
        // Hide loader
        document.getElementById('profileLoader').style.display = 'none';
        document.getElementById('profileCardBody').style.display = 'block';

        // Fill Profile Info
        document.getElementById('profileName').innerText = profile.name || 'N/A';
        document.getElementById('profileRoleBadge').innerText = formatRole(profile.role);
        document.getElementById('profileRoleBadge').className = 'profile-role-badge ' + (profile.role || 'user');
        
        document.getElementById('infoName').innerText = profile.name || 'N/A';
        document.getElementById('infoUsername').innerText = '@' + (profile.username || 'N/A');
        document.getElementById('infoPhone').innerText = profile.phone || 'N/A';
        document.getElementById('infoEmail').innerText = profile.email || 'Not provided';

        // Render Login History
        const loginsContainer = document.getElementById('recentLoginsList');
        loginsContainer.innerHTML = '';
        if (logins && logins.length > 0) {
            logins.forEach(l => {
                const date = new Date(l.loginTime);
                loginsContainer.innerHTML += `
                    <div class="login-log-item">
                        <div class="login-log-dot"></div>
                        <div class="login-log-details">
                            <span class="login-log-time">${date.toLocaleString()}</span>
                            <span class="login-log-meta">via Web · Name: ${l.name} (${l.phone})</span>
                        </div>
                    </div>
                `;
            });
        } else {
            loginsContainer.innerHTML = '<p class="text-muted" style="text-align: center; padding: 10px;">No recent login logs found.</p>';
        }
    })
    .catch(err => {
        console.error("Error fetching profile details:", err);
        document.getElementById('profileLoader').innerHTML = `
            <div style="color: #ef4444; text-align: center; padding: 20px;">
                <span class="material-icons-outlined" style="font-size: 3rem;">error_outline</span>
                <p style="margin-top: 10px;">Failed to load profile details. Please try again.</p>
            </div>
        `;
    });
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function formatRole(role) {
    if (role === 'admin') return 'Administrator';
    if (role === 'ngo') return 'NGO Partner';
    return 'Normal User';
}

function injectProfileModalHtml() {
    if (document.getElementById('profileModal')) return;

    const modalHtml = `
        <div id="profileModal" class="profile-modal-overlay" style="display: none;">
            <div class="profile-modal-card">
                <div class="profile-modal-header">
                    <div class="profile-header-info">
                        <div class="profile-avatar-circle">
                            <span class="material-icons-outlined" style="font-size: 2.2rem; color: var(--color-primary-dark);">person</span>
                        </div>
                        <div>
                            <h3 id="profileName" style="margin: 0; font-size: 1.25rem;">Loading Name...</h3>
                            <span id="profileRoleBadge" class="profile-role-badge">User</span>
                        </div>
                    </div>
                    <button class="profile-modal-close" onclick="closeProfileModal()">
                        <span class="material-icons-outlined">close</span>
                    </button>
                </div>
                
                <div id="profileLoader" class="profile-loader-box">
                    <span class="material-icons-outlined spin-icon">autorenew</span>
                    <p style="margin-top: 10px; color: #64748b;">Fetching secure profile details...</p>
                </div>

                <div id="profileCardBody" style="display: none; padding: 24px;">
                    <!-- Tabs or grid content -->
                    <h4 class="profile-section-title">Personal Details</h4>
                    <div class="profile-details-grid">
                        <div class="profile-detail-field">
                            <span class="field-label">Full Name</span>
                            <span id="infoName" class="field-value">N/A</span>
                        </div>
                        <div class="profile-detail-field">
                            <span class="field-label">Username</span>
                            <span id="infoUsername" class="field-value">N/A</span>
                        </div>
                        <div class="profile-detail-field">
                            <span class="field-label">Phone Number</span>
                            <span id="infoPhone" class="field-value">N/A</span>
                        </div>
                        <div class="profile-detail-field">
                            <span class="field-label">Email Address</span>
                            <span id="infoEmail" class="field-value">N/A</span>
                        </div>
                    </div>

                    <h4 class="profile-section-title" style="margin-top: 24px;">Recent Login Activity</h4>
                    <div id="recentLoginsList" class="login-logs-timeline">
                        <!-- Login logs go here -->
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Close when clicking outside card
    document.getElementById('profileModal').addEventListener('click', (e) => {
        if (e.target.id === 'profileModal') {
            closeProfileModal();
        }
    });
}

function injectProfileStyles() {
    if (document.getElementById('profileModalStyles')) return;

    const styles = `
        /* Profile Modal CSS */
        .profile-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
            padding: 20px;
        }
        
        .profile-modal-overlay.active {
            opacity: 1;
        }

        .profile-modal-card {
            background: #ffffff;
            border-radius: 16px;
            width: 100%;
            max-width: 520px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border: 1px solid #f1f5f9;
            overflow: hidden;
            transform: scale(0.9);
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .profile-modal-overlay.active .profile-modal-card {
            transform: scale(1);
        }

        .profile-modal-header {
            padding: 20px 24px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .profile-header-info {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .profile-avatar-circle {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #e0f2fe;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #bae6fd;
        }

        .profile-role-badge {
            display: inline-block;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 999px;
            margin-top: 4px;
        }

        .profile-role-badge.user { background: #e0f2fe; color: #0369a1; }
        .profile-role-badge.ngo { background: #fef3c7; color: #b45309; }
        .profile-role-badge.admin { background: #fce7f3; color: #be185d; }

        .profile-modal-close {
            background: transparent;
            border: none;
            cursor: pointer;
            color: #64748b;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
            border-radius: 50%;
            transition: background 0.2s;
        }

        .profile-modal-close:hover {
            background: #e2e8f0;
            color: #334155;
        }

        .profile-loader-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
        }

        .spin-icon {
            font-size: 2.5rem;
            color: #3b82f6;
            animation: spin 1.2s linear infinite;
        }

        @keyframes spin {
            100% { transform: rotate(360deg); }
        }

        .profile-section-title {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
            margin: 0 0 16px 0;
        }

        .profile-details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .profile-detail-field {
            display: flex;
            flex-direction: column;
        }

        .field-label {
            font-size: 0.75rem;
            color: #94a3b8;
            margin-bottom: 4px;
        }

        .field-value {
            font-size: 0.95rem;
            color: #1e293b;
            font-weight: 500;
        }

        /* Timeline style for login logs */
        .login-logs-timeline {
            max-height: 180px;
            overflow-y: auto;
            padding-left: 10px;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .login-log-item {
            display: flex;
            gap: 12px;
            position: relative;
        }

        .login-log-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #3b82f6;
            margin-top: 6px;
            flex-shrink: 0;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .login-log-details {
            display: flex;
            flex-direction: column;
        }

        .login-log-time {
            font-size: 0.85rem;
            color: #334155;
            font-weight: 500;
        }

        .login-log-meta {
            font-size: 0.75rem;
            color: #64748b;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'profileModalStyles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
}
