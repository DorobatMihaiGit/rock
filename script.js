// Smooth scroll function
function smoothScroll(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Add animation to elements when they appear on screen
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe gallery items
document.querySelectorAll('.gallery-item').forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transition = 'all 0.6s ease-out';
    observer.observe(item);
});

// Observe quote cards
document.querySelectorAll('.quote-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.6s ease-out';
    observer.observe(card);
});

// Click on nav links to close menu on mobile
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        // Smooth scroll is handled by default anchor behavior
    });
});

// Add click animation to buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.7)';
        ripple.style.width = '20px';
        ripple.style.height = '20px';
        ripple.style.pointerEvents = 'none';
        
        const rect = this.getBoundingClientRect();
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        
        ripple.animate([
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'scale(4)', opacity: 0 }
        ], {
            duration: 600,
            easing: 'ease-out'
        });
        
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

// Parallax effect for background
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const floatingHearts = document.querySelectorAll('.floating-heart');
    
    floatingHearts.forEach((heart, index) => {
        heart.style.transform = `translateY(${scrolled * (0.1 + index * 0.05)}px)`;
    });
});

// Add animation class when page loads
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// Easter egg: Double click on heart
document.querySelectorAll('.floating-heart').forEach(heart => {
    heart.addEventListener('dblclick', function() {
        this.style.animation = 'none';
        setTimeout(() => {
            this.style.animation = 'float 8s ease-in-out infinite';
        }, 10);
    });
});

// Console message
console.log('%c✨ Făcut cu iubire... ❤️', 'font-size: 20px; color: #ff1493; font-weight: bold;');
