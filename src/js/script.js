const body = document.querySelector('body');
const menuTrigger = body.querySelector('.nav-menu-trigger');
const heroLinks = body.querySelectorAll('.hero-link');

menuTrigger.addEventListener('click', e => {
    const navMenu = body.querySelector('.nav-menu');
    navMenu.classList.toggle('is-open')
});

heroLinks.forEach(link => {
   const rollover = link.querySelector('.rollover-active');
   link.addEventListener('mouseenter', e => {
        rollover.style.opacity = '1';
        rollover.style.transition = 'opacity 0.25s ease-in allow-discrete';

   });
   
   link.addEventListener('mouseleave', e => {
    rollover.style.opacity = '0';
    rollover.style.transition = 'opacity 0.25s ease-out allow-discrete';
   });
});

document.addEventListener('DOMContentLoaded', function() {
  const menuButton = document.querySelector('.nav-menu-button');
  const navMenu = document.querySelector('.nav-menu');
  const body = document.body;
  
  // Toggle mobile menu
  if (menuButton) {
    menuButton.addEventListener('click', function(e) {
      e.stopPropagation();
      navMenu.classList.toggle('is-open');
    });
  }
  
  // Close menu/dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    const isClickInsideMenu = navMenu && navMenu.contains(e.target);
    const isClickOnButton = menuButton && menuButton.contains(e.target);
    
    if (!isClickInsideMenu && !isClickOnButton) {
      // On mobile (when menu has is-open class), close the entire menu
      if (navMenu && navMenu.classList.contains('is-open')) {
        navMenu.classList.remove('is-open');
        closeAllDetails();
      } else {
        // On desktop (no is-open class), just close the dropdowns
        closeAllDetails();
      }
    }
  });
  
  // Close menu and all details on window resize
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (navMenu && navMenu.classList.contains('is-open')) {
        navMenu.classList.remove('is-open');
      }
      closeAllDetails();
    }, 50);
  });
  
  // Close details when clicking on a link
  const navLinks = document.querySelectorAll('.nav-menu a');
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      // Small delay to allow navigation
      setTimeout(() => {
        closeAllDetails();
        if (navMenu) {
          navMenu.classList.remove('is-open');
        }
      }, 100);
    });
  });
  
  // Helper function to close all open details elements
  function closeAllDetails() {
    const openDetails = document.querySelectorAll('.nav-menu details[open]');
    openDetails.forEach(detail => {
      detail.removeAttribute('open');
    });
  }
  
  // Close details when pressing Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAllDetails();
      if (navMenu && navMenu.classList.contains('is-open')) {
        navMenu.classList.remove('is-open');
      }
    }
  });
});