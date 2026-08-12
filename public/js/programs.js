const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', function () {
  if (!navbar) return;

  if (window.scrollY > 100) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

const fadeElements = document.querySelectorAll('.fade-in');

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

fadeElements.forEach(el => fadeObserver.observe(el));

const mobileMenu = document.querySelector('.mobile-menu');
const mobileOverlay = document.querySelector('.mobile-overlay');

function toggleMobileMenu() {
  if (!mobileMenu || !mobileOverlay) return;

  mobileMenu.classList.toggle('active');
  mobileOverlay.classList.toggle('active');
  document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
}

function toggleMobileDropdown(element) {
  if (!element || !element.nextElementSibling) return;

  element.nextElementSibling.classList.toggle('active');
  if (event) {
    event.preventDefault();
  }
}

const backToTopBtn = document.querySelector('.back-to-top');

window.addEventListener('scroll', function () {
  if (!backToTopBtn) return;

  if (window.scrollY > 300) {
    backToTopBtn.classList.add('visible');
  } else {
    backToTopBtn.classList.remove('visible');
  }
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
