// ========================================
// NAVBAR SCROLL EFFECT
// ========================================
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', function () {
  if (window.scrollY > 100) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// ========================================
// MOBILE MENU
// ========================================
const mobileMenu = document.querySelector('.mobile-menu');
const mobileOverlay = document.querySelector('.mobile-overlay');

function toggleMobileMenu() {
  mobileMenu.classList.toggle('active');
  mobileOverlay.classList.toggle('active');
  document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
}

function toggleMobileDropdown(element) {
  element.nextElementSibling.classList.toggle('active');
  event.preventDefault();
}

// Intersection Observer for fade-in animations
document.addEventListener('DOMContentLoaded', function () {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.2
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all animated elements
  document.querySelectorAll('.info-card, .form-card, .map-container, .social-link').forEach(el => {
    observer.observe(el);
  });
});

// ========================================
// BACK TO TOP BUTTON
// ========================================
const backToTopBtn = document.querySelector('.back-to-top');

window.addEventListener('scroll', function () {
  if (window.scrollY > 300) {
    backToTopBtn.classList.add('visible');
  } else {
    backToTopBtn.classList.remove('visible');
  }
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// CONTACT FORM SUBMISSION
// ========================================
const contactForm = document.getElementById('contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Get form data
    const formData = new FormData(contactForm);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      message: formData.get('message')
    };

    // Get submit button
    const submitBtn = contactForm.querySelector('.submit-btn');
    const originalBtnText = submitBtn.innerHTML;

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
      const response = await fetch('/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        // Show success message
        showAlert('success', result.message);
        // Reset form
        contactForm.reset();
      } else {
        // Show error message
        showAlert('error', result.message);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      showAlert('error', 'Something went wrong. Please try again.');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

// ========================================
// ALERT NOTIFICATION SYSTEM
// ========================================
function showAlert(type, message) {
  // Remove existing alerts
  const existingAlert = document.querySelector('.form-alert');
  if (existingAlert) {
    existingAlert.remove();
  }

  // Create alert element
  const alert = document.createElement('div');
  alert.className = `form-alert alert-${type}`;
  alert.innerHTML = `
    <span>${message}</span>
    <button type="button" class="alert-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  // Insert alert before the form
  const formCard = document.querySelector('.form-card');
  formCard.insertBefore(alert, formCard.firstChild);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (alert.parentElement) {
      alert.remove();
    }
  }, 5000);
}