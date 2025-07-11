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