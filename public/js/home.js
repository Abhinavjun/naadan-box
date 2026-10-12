document.addEventListener('DOMContentLoaded', () => {

    // Newsletter Form Handler
    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterEmail = document.getElementById('newsletterEmail');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const emailValue = newsletterEmail?.value.trim();

            if (emailValue) {
                alert(`Thank you for subscribing with ${emailValue}!`);
                newsletterForm.reset();
            }
        });
    }

    // Dynamic Active Nav Link Handler based on URL
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Cart Badge Counter Helper
    window.updateCartBadge = function(count) {
        const cartBadge = document.querySelector('.cart-badge');

        if (cartBadge) {
            cartBadge.textContent = count;
        }
    };

});