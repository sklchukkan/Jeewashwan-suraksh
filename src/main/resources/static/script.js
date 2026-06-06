// Document Ready
document.addEventListener('DOMContentLoaded', () => {

    // 1. Sticky Navbar Effect on Scroll
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Statistics Counter Animation
    const counters = document.querySelectorAll('.counter');
    const statsSection = document.getElementById('stats');
    let counted = false;

    const runCounters = () => {
        counters.forEach(counter => {
            counter.innerText = '0';
            const updateCounter = () => {
                const target = +counter.getAttribute('data-target');
                if (target === 0) {
                    counter.innerText = '0';
                    return;
                }
                const count = +counter.innerText.replace(/,/g, '');

                // Divisor determines speed. Smaller = faster
                const increment = Math.max(target / 100, 1);

                if (count < target) {
                    const nextVal = Math.min(Math.ceil(count + increment), target);
                    counter.innerText = nextVal.toLocaleString();
                    setTimeout(updateCounter, 15);
                } else {
                    counter.innerText = target.toLocaleString();
                }
            };
            updateCounter();
        });
    };

    // Fetch real counts from backend
    const fetchStats = async () => {
        try {
            const res = await fetch('/api/public-stats');
            if (res.ok) {
                const data = await res.json();
                document.getElementById('casesReportedCounter').setAttribute('data-target', data.casesReported);
                document.getElementById('casesCompletedCounter').setAttribute('data-target', data.casesCompleted);
                document.getElementById('activeVolunteersCounter').setAttribute('data-target', data.activeVolunteers);
            }
        } catch (err) {
            console.error("Failed to load public stats:", err);
        }
    };

    // Fetch stats immediately
    fetchStats();

    // Use Intersection Observer for stats scroll trigger
    const observerOptions = {
        root: null,
        threshold: 0.5
    };

    const statsObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !counted) {
            runCounters();
            counted = true;
        }
    }, observerOptions);

    if (statsSection) {
        statsObserver.observe(statsSection);
    }

    // 3. Inject Community Alerts dynamically
    const alertsData = [
        {
            type: 'warning',
            icon: 'warning',
            title: 'Aggressive Dog Sighted',
            description: 'Reports of an aggressive dog near Central Park, Area 5. City rescue unit dispatched.',
            time: '2 hours ago',
            location: 'Central Park'
        },
        {
            type: 'info',
            icon: 'vaccines',
            title: 'Vaccination Drive',
            description: 'Free anti-rabies vaccination camp for stray dogs starting this Sunday at the Community Center.',
            time: '5 hours ago',
            location: 'Community Center'
        },
        {
            type: 'success', // maps to default green border
            icon: 'volunteer_activism',
            title: 'Rescue Operation Success',
            description: 'A family of 4 stranded puppies was rescued near Outer Ring Road. They are safe at Hope Shelter.',
            time: '1 day ago',
            location: 'Outer Ring Road'
        }
    ];

    const alertsContainer = document.getElementById('alerts-container');

    if (alertsContainer) {
        alertsData.forEach(alert => {
            const el = document.createElement('div');
            el.className = `alert-card ${alert.type}`;
            el.innerHTML = `
                <div class="alert-icon-wrapper">
                    <span class="material-icons-outlined alert-icon">${alert.icon}</span>
                </div>
                <div class="alert-content">
                    <h4>${alert.title}</h4>
                    <p>${alert.description}</p>
                    <div class="alert-meta">
                        <span>${alert.time}</span>
                        <span><span class="material-icons-outlined" style="font-size: 14px; vertical-align: middle;">location_on</span> ${alert.location}</span>
                    </div>
                </div>
            `;
            alertsContainer.appendChild(el);
        });
    }

    // 4. Smooth scrolling for internal links
    const links = document.querySelectorAll('a[href^="#"]');
    for (const link of links) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);

            // Check if not just an empty "#"
            if (targetId) {
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    const navbarHeight = document.getElementById('navbar').offsetHeight;
                    const offsetTop = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight;

                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });

                    // Update active nav link
                    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
                    this.classList.add('active');
                }
            }
        });
    }
});
