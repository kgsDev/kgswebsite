const body = document.querySelector('body');
const menuTrigger = body.querySelector('.nav-menu-trigger');
const subMenuTrigger = body.querySelector('.nav-sub-menu-trigger');

menuTrigger.addEventListener('click', e => {
    const navMenu = body.querySelector('.nav-menu');
    navMenu.classList.toggle('is-open')
});

subMenuTrigger.addEventListener('click', e => {
    const navSubMenu = body.querySelector('.nav-sub-menu');
    navSubMenu.classList.toggle('is-open');
})
