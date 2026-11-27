(() => {
  const $ = window.jQuery;
  const carousel = $('.home-slider');
  const slideshow = document.querySelector('#welcome-slideshow');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'btn btn-white btn-sm slideshow-toggle';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let playing = !reducedMotion;

  function sizeSlides() {
    slideshow.querySelectorAll('.js-fullheight, .slider-text').forEach((element) => {
      element.style.height = window.innerHeight + 'px';
    });
    slideshow.style.height = window.innerHeight + 'px';
  }
  sizeSlides();
  window.addEventListener('resize', sizeSlides);

  carousel.owlCarousel({
    items: 1,
    loop: true,
    autoplay: playing,
    autoplayTimeout: 6500,
    autoplayHoverPause: true,
    animateIn: reducedMotion ? false : 'fadeIn',
    animateOut: reducedMotion ? false : 'fadeOut',
    smartSpeed: reducedMotion ? 0 : 400,
    nav: true,
    navText: ['<span aria-hidden="true">‹</span>', '<span aria-hidden="true">›</span>'],
    dots: true
  });
  carousel.find('.owl-prev').attr('aria-label', 'Previous slide');
  carousel.find('.owl-next').attr('aria-label', 'Next slide');
  carousel.find('.owl-dot').each((index, dot) => {
    dot.setAttribute('aria-label', `Show slide ${index + 1}`);
  });
  function updatePlayback() {
    const running = playing && !slideshow.hidden;
    carousel.trigger(running ? 'play.owl.autoplay' : 'stop.owl.autoplay');
    toggle.textContent = playing ? 'Pause slideshow' : 'Play slideshow';
  }
  toggle.addEventListener('click', () => {
    playing = !playing;
    updatePlayback();
  });
  slideshow.append(toggle);
  updatePlayback();
  window.addEventListener('hashchange', () => {
    if (!slideshow.hidden) {
      sizeSlides();
      carousel.trigger('refresh.owl.carousel');
      window.scrollTo(0, 0);
    }
    updatePlayback();
  });
  $('#ftco-nav a').on('click', () => $('#ftco-nav').collapse('hide'));
})();
