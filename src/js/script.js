
const body = document.querySelector('body');
const menuTrigger = body.querySelector('.nav-menu-trigger');
const heroLinks = body.querySelectorAll('.hero-link');

class KGSExternalLinkWarning {
    constructor(options = {}) {
      this.options = {
        // Define different types of external sites
        siteTypes: {
          dataMapsPubs: {
            domains: ['kgs.uky.edu', 'kgsrspace.uky.edu', 'www.uky.edu', 'uky.edu'],
            pathPattern: /\/(kgsweb|kgsmap|kygeode)/i,
            storageKey: 'kgs_data_site_warning_disabled',
            title: 'You\'re going to our data & publications site',
            message: 'You\'re about to visit the KGS data, maps, and publications portal (KyGeode and related pages). This site hosts our interactive maps, databases, and digital collections.',
            buttonText: 'Continue to data site',
            icon: `<i class="fas fa-database modal-icon" aria-hidden="true"></i>`
          },
          oldSite: {
            domains: ['www.uky.edu', 'uky.edu'],
            pathPattern: /^\/KGS(\/|$)/i,  // Must start with /KGS followed by / or end of path
            storageKey: 'kgs_old_site_warning_disabled',
            title: 'You\'re leaving the new KGS site',
            message: 'You\'re about to visit a page on our previous website. We\'re actively working to migrate all content to this new site, so some information and features may differ.',
            buttonText: 'Continue to old site',
            icon: `<i class="fas fa-history modal-icon" aria-hidden="true"></i>`
          },
          kgsDataDomainOnly: {
            domains: ['kgs.uky.edu', 'kgsrspace.uky.edu'],
            pathPattern: null,
            storageKey: 'kgs_data_site_warning_disabled',
            title: 'You\'re going to our data & publications site',
            message: 'You\'re about to visit the KGS data, maps, and publications portal (KyGeode and related pages). This site hosts our interactive maps, databases, and digital collections.',
            buttonText: 'Continue to data site',
            icon: `<i class="fas fa-database modal-icon" aria-hidden="true"></i>`
          },
          otherSite: {
            domains: [],
            pathPattern: null,
            storageKey: 'kgs_external_warning_disabled',
            title: 'You\'re leaving the KGS website',
            message: 'You\'re about to visit an external website. Please note that we are not responsible for the content or privacy practices of external sites.',
            buttonText: 'Continue to external site',
            icon: `<i class="fas fa-external-link-alt modal-icon" aria-hidden="true"></i>`
          }
        },
        currentDomain: window.location.hostname,
        linkSelector: 'a[href^="http"]',
        ...options
      };

      this.init();
    }

    init() {
      this.setupEventListeners();
    }

    setupEventListeners() {
      document.addEventListener('click', (e) => {
        const link = e.target.closest(this.options.linkSelector);
        if (link) {
          const warningInfo = this.shouldShowWarning(link.href);
          if (warningInfo) {
            e.preventDefault();
            this.showWarning(link.href, warningInfo);
          }
        }
      });

      document.addEventListener('click', (e) => {
        if (e.target.id === 'linkWarningOverlay') {
          this.closeModal();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeModal();
        }
      });

      // Set up proceed button
      const proceedButton = document.getElementById('proceedLink');
      if (proceedButton) {
        proceedButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.proceedToSite();
        });
      }
    }

    shouldShowWarning(url) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();
        const path = urlObj.pathname;

        // Don't warn for current domain
        if (domain === this.options.currentDomain.toLowerCase()) {
          return false;
        }

        // Check each site type in priority order
        for (const [siteType, config] of Object.entries(this.options.siteTypes)) {
          // Skip "otherSite" for now - we'll handle it last
          if (siteType === 'otherSite') continue;

          // Check if domain matches
          const domainMatches = config.domains.some(targetDomain => {
            // For oldSite, we want exact matches only (not subdomains)
            if (siteType === 'oldSite') {
              return domain === targetDomain.toLowerCase();
            }
            return domain === targetDomain.toLowerCase() || 
                  domain.endsWith('.' + targetDomain.toLowerCase());
          });

          if (domainMatches) {
            // If there's a path pattern, check if it matches
            if (config.pathPattern && !config.pathPattern.test(path)) {
              continue;
            }
            
            // Check if warnings are disabled for this specific site type
            if (localStorage.getItem(config.storageKey) === 'true') {
              return false; // Don't show any warning if this specific type is disabled
            }
            
            // Return the site type configuration
            return { siteType, config };
          }
        }

        // If no specific domain matched, check if we should show general external warning
        const otherSiteConfig = this.options.siteTypes.otherSite;
        if (localStorage.getItem(otherSiteConfig.storageKey) !== 'true') {
          return { siteType: 'otherSite', config: otherSiteConfig };
        }

        return false;
      } catch (error) {
        console.error('Error parsing URL:', error);
        return false;
      }
    }

    showWarning(url, warningInfo) {
      const modal = document.getElementById('linkWarningOverlay');
      const modalHeader = modal.querySelector('.modal-header');
      const modalTitle = modal.querySelector('.modal-alert-title');
      const modalMessage = modal.querySelector('.modal-message');
      const destinationUrl = document.getElementById('destinationUrl');
      const proceedLink = document.getElementById('proceedLink');
      const dontShowAgain = document.getElementById('dontShowAgain');
      const dontShowLabel = modal.querySelector('.dont-show-again label');

      if (!modal) return;

      // Update modal content based on site type
      const { config } = warningInfo;
      
      // Update icon and title
      modalHeader.innerHTML = `
        ${config.icon}
        <span>${config.title}</span>
      `;
      
      modalMessage.textContent = config.message;
      proceedLink.innerHTML = `
        ${config.buttonText}
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
        </svg>
      `;

      // Update checkbox label based on site type
      let checkboxText = 'Don\'t show this warning again';
      switch (warningInfo.siteType) {
        case 'oldSite':
          checkboxText = 'Don\'t warn me about old KGS site links';
          break;
        case 'dataMapsPubs':
          checkboxText = 'Don\'t warn me about data site links';
          break;
        case 'otherSite':
          checkboxText = 'Don\'t warn me about external links';
          break;
      }
      dontShowLabel.textContent = checkboxText;

      // Store current warning info for later use
      this.currentWarning = warningInfo;

      dontShowAgain.checked = false;
      destinationUrl.textContent = url;
      proceedLink.href = url;
      modal.classList.add('show');
      
      setTimeout(() => proceedLink.focus(), 100);
    }

    closeModal() {
      const modal = document.getElementById('linkWarningOverlay');
      if (modal) {
        modal.classList.remove('show');
      }
    }

    proceedToSite() {
      const dontShowAgain = document.getElementById('dontShowAgain');
      const proceedLink = document.getElementById('proceedLink');
      const url = proceedLink.href;
      
      if (dontShowAgain && dontShowAgain.checked && this.currentWarning) {
        localStorage.setItem(this.currentWarning.config.storageKey, 'true');
      }

      this.closeModal();
      
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, 150);
    }

    resetPreference(siteType = 'all') {
      if (siteType === 'all') {
        // Reset all preferences
        Object.values(this.options.siteTypes).forEach(config => {
          localStorage.removeItem(config.storageKey);
        });
      } else if (this.options.siteTypes[siteType]) {
        localStorage.removeItem(this.options.siteTypes[siteType].storageKey);
      }
    }

    // Helper method to check current preferences
    getPreferences() {
      const preferences = {};
      Object.entries(this.options.siteTypes).forEach(([siteType, config]) => {
        preferences[siteType] = localStorage.getItem(config.storageKey) === 'true';
      });
      return preferences;
    }
  }

  // Global functions for the modal buttons
  window.closeExternalWarning = function() {
    if (window.kgsLinkWarning) {
      window.kgsLinkWarning.closeModal();
    }
  };

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    window.kgsLinkWarning = new KGSExternalLinkWarning();
  });


// Hero links rollover effect
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
  
  if (!menuButton || !navMenu) return;
  
  // Helper function to check if we're in mobile view
  function isMobileView() {
    return window.innerWidth < 740;
  }
  
  // Toggle mobile menu - ONLY close via button click on mobile
  menuButton.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const isOpen = navMenu.classList.contains('is-open');
    
    if (isOpen) {
      navMenu.classList.remove('is-open');
      body.classList.remove('menu-open');
    } else {
      navMenu.classList.add('is-open');
      body.classList.add('menu-open');
    }
  });
  
  // Handle clicks outside menu - ONLY for desktop dropdowns
  document.addEventListener('click', function(e) {
    // Don't do anything if we're in mobile view and menu is open
    if (isMobileView() && navMenu.classList.contains('is-open')) {
      return; // Let mobile users scroll and interact without closing
    }
    
    const isClickInsideMenu = navMenu && navMenu.contains(e.target);
    const isClickOnButton = menuButton && menuButton.contains(e.target);
    
    // On desktop, close dropdowns when clicking outside
    if (!isClickInsideMenu && !isClickOnButton && !isMobileView()) {
      closeAllDetails();
    }
  });
  
  // Prevent menu from closing on touch/scroll events in mobile
  if (navMenu) {
    navMenu.addEventListener('touchstart', function(e) {
      e.stopPropagation();
    });
    
    navMenu.addEventListener('touchmove', function(e) {
      e.stopPropagation();
    });
  }
  
  // Close menu on window resize if switching from mobile to desktop
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      // Close mobile menu if resizing to desktop
      if (!isMobileView() && navMenu.classList.contains('is-open')) {
        navMenu.classList.remove('is-open');
        body.classList.remove('menu-open');
      }
      // Close all dropdowns on resize
      closeAllDetails();
    }, 250);
  });
  
  // Close menu when clicking on a link (not a dropdown summary)
  const navLinks = document.querySelectorAll('.nav-menu a:not(summary a)');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Don't close if clicking a summary
      if (e.target.closest('summary')) return;
      
      // Close menu on mobile
      if (isMobileView()) {
        setTimeout(() => {
          navMenu.classList.remove('is-open');
          body.classList.remove('menu-open');
          closeAllDetails();
        }, 100);
      } else {
        // Just close dropdowns on desktop
        closeAllDetails();
      }
    });
  });
  
  // Helper function to close all open details elements
  function closeAllDetails() {
    const openDetails = document.querySelectorAll('.nav-menu details[open]');
    openDetails.forEach(detail => {
      detail.removeAttribute('open');
    });
  }
  
  // Close everything when pressing Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAllDetails();
      if (navMenu && navMenu.classList.contains('is-open')) {
        navMenu.classList.remove('is-open');
        body.classList.remove('menu-open');
      }
    }
  });
});