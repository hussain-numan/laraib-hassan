(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- page loader ---------- */
  var siteLoader = document.getElementById('siteLoader');
  if (siteLoader) {
    var loaderStart = Date.now();
    var loaderMinShow = reduced ? 0 : 550;
    var loaderHidden = false;
    var hideSiteLoader = function () {
      if (loaderHidden) return;
      loaderHidden = true;
      var wait = Math.max(0, loaderMinShow - (Date.now() - loaderStart));
      setTimeout(function () {
        siteLoader.classList.add('loader-hidden');
        setTimeout(function () { siteLoader.remove(); }, 650);
      }, wait);
    };
    if (document.readyState === 'complete') {
      hideSiteLoader();
    } else {
      window.addEventListener('load', hideSiteLoader);
    }
    setTimeout(hideSiteLoader, 3500);
  }

  /* ---------- theme toggle ---------- */
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  var saved = localStorage.getItem('hustlestack-theme');
  if (saved) root.setAttribute('data-theme', saved);
  function currentTheme() {
    if (root.getAttribute('data-theme')) return root.getAttribute('data-theme');
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      localStorage.setItem('hustlestack-theme', next);
    });
  }

  /* ---------- scroll progress bar ---------- */
  var progress = document.getElementById('scrollProgress');
  function updateProgress() {
    if (!progress) return;
    var h = document.documentElement;
    var scrolled = h.scrollTop || document.body.scrollTop;
    var height = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
    var pct = height > 0 ? (scrolled / height) * 100 : 0;
    progress.style.width = pct + '%';
  }

  /* ---------- navbar state (sticky, scroll-direction hide/reveal, load-in) ---------- */
  var nav = document.getElementById('navbar');
  var navLastY = window.scrollY;
  var navHideAt = 140;
  function onScroll() {
    if (!nav) { updateProgress(); return; }
    nav.classList.toggle('scrolled', window.scrollY > 10);
    var mobilePanelOpen = document.getElementById('mobilePanel');
    var menuOpen = mobilePanelOpen && mobilePanelOpen.classList.contains('open');
    if (!menuOpen) {
      var y = window.scrollY;
      if (y < navHideAt) {
        nav.classList.remove('nav-hidden');
      } else if (y > navLastY + 4) {
        nav.classList.add('nav-hidden');
      } else if (y < navLastY - 4) {
        nav.classList.remove('nav-hidden');
      }
      navLastY = y;
    }
    updateProgress();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var burger = document.getElementById('burger');
  var panel = document.getElementById('mobilePanel');
  if (burger && panel) {
    burger.addEventListener('click', function () {
      var open = panel.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('menu-open', open);
    });
    panel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        panel.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
      });
    });
  }

  /* ---------- active nav link ---------- */
  var rawPath = location.pathname.split('/').pop() || 'index.html';
  var normPath = rawPath.replace(/\.html$/, '') || 'index';
  document.querySelectorAll('.nav-links a, .mobile-panel a:not(.btn)').forEach(function (a) {
    var rawHref = (a.getAttribute('href') || '').split('#')[0];
    var normHref = rawHref.replace(/\.html$/, '') || 'index';
    if (normHref === normPath) a.classList.add('active');
  });

  /* ---------- testimonial carousel (continuous loop + arrow tween, pauses on hover) ---------- */
  var testimonialCarousel = document.getElementById('testimonialCarousel');
  if (testimonialCarousel) {
    var testimonialTrack = document.getElementById('testimonialTrack');
    var testimonialOriginals = Array.prototype.slice.call(testimonialTrack.children);
    testimonialOriginals.forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      testimonialTrack.appendChild(clone);
    });

    var testiOffset = 0;
    var testiSetWidth = 0;
    var testiHovered = false;
    var testiInView = false;
    var testiLastTs = null;
    var testiPxPerMs = 0.13;
    var testiAnim = null;

    function testiComputeSetWidth() {
      var gap = parseFloat(getComputedStyle(testimonialTrack).columnGap || '0');
      var first = testimonialOriginals[0].getBoundingClientRect();
      var lastOfSet = testimonialOriginals[testimonialOriginals.length - 1].getBoundingClientRect();
      testiSetWidth = (lastOfSet.right - first.left) + gap;
    }
    function testiWrap(x) {
      var w = testiSetWidth;
      if (w <= 0) return 0;
      var r = x % w;
      if (r < 0) r += w;
      return r;
    }
    function testiApply() {
      testimonialTrack.style.transform = 'translateX(-' + testiOffset + 'px)';
    }
    function testiEaseOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function testiNudge(dir) {
      var gap = parseFloat(getComputedStyle(testimonialTrack).columnGap || '0');
      var cardWidth = testimonialOriginals[0].getBoundingClientRect().width;
      var pendingTarget = testiAnim ? testiAnim.to : testiOffset;
      testiAnim = { from: testiOffset, to: pendingTarget + dir * (cardWidth + gap), startTs: null, duration: 420 };
    }
    function testiTick(ts) {
      requestAnimationFrame(testiTick);
      if (testiLastTs === null) testiLastTs = ts;
      var dt = ts - testiLastTs;
      testiLastTs = ts;

      if (testiAnim) {
        if (testiAnim.startTs === null) testiAnim.startTs = ts;
        var t = Math.min((ts - testiAnim.startTs) / testiAnim.duration, 1);
        var eased = testiEaseOutCubic(t);
        testiOffset = testiWrap(testiAnim.from + (testiAnim.to - testiAnim.from) * eased);
        testiApply();
        if (t >= 1) testiAnim = null;
        return;
      }

      if (reduced || testiHovered || !testiInView || testiSetWidth <= 0) return;
      testiOffset = testiWrap(testiOffset + testiPxPerMs * dt);
      testiApply();
    }

    var testiPrevBtn = document.getElementById('testiPrev');
    var testiNextBtn = document.getElementById('testiNext');
    if (testiPrevBtn) testiPrevBtn.addEventListener('click', function () { testiNudge(-1); });
    if (testiNextBtn) testiNextBtn.addEventListener('click', function () { testiNudge(1); });

    testimonialCarousel.addEventListener('mouseenter', function () { testiHovered = true; });
    testimonialCarousel.addEventListener('mouseleave', function () { testiHovered = false; testiLastTs = null; });
    testimonialCarousel.addEventListener('touchstart', function () { testiHovered = true; }, { passive: true });
    testimonialCarousel.addEventListener('touchend', function () { testiHovered = false; testiLastTs = null; });
    testimonialCarousel.addEventListener('focusin', function () { testiHovered = true; });
    testimonialCarousel.addEventListener('focusout', function () { testiHovered = false; testiLastTs = null; });

    window.addEventListener('resize', testiComputeSetWidth);

    if ('IntersectionObserver' in window) {
      var testiIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { testiInView = entry.isIntersecting; });
      }, { threshold: 0.15 });
      testiIo.observe(testimonialCarousel);
    } else {
      testiInView = true;
    }

    testiComputeSetWidth();
    requestAnimationFrame(testiTick);
  }

  /* ---------- career timeline: scroll-driven progress line ---------- */
  var careerTimeline = document.getElementById('careerTimeline');
  var careerProgress = document.getElementById('careerProgress');
  if (careerTimeline && careerProgress) {
    var updateCareerProgress = function () {
      var rect = careerTimeline.getBoundingClientRect();
      var vh = window.innerHeight;
      var startLine = vh * 0.85;
      var endLine = vh * 0.35;
      var span = rect.height + startLine - endLine;
      var scrolled = startLine - rect.top;
      var pct = span > 0 ? Math.max(0, Math.min(1, scrolled / span)) : 0;
      careerProgress.style.height = (pct * 100) + '%';
    };
    window.addEventListener('scroll', updateCareerProgress, { passive: true });
    window.addEventListener('resize', updateCareerProgress);
    updateCareerProgress();
  }

  /* ---------- core stack marquee (continuous loop, pauses on hover/touch) ---------- */
  var stackMarquee = document.getElementById('stackMarquee');
  if (stackMarquee) {
    var stackOriginals = Array.prototype.slice.call(stackMarquee.children);
    stackOriginals.forEach(function (tag) {
      var clone = tag.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      stackMarquee.appendChild(clone);
    });

    var stackOffset = 0;
    var stackSetWidth = 0;
    var stackHovered = false;
    var stackLastTs = null;
    var stackPxPerMs = 0.035;

    function stackComputeSetWidth() {
      var gap = parseFloat(getComputedStyle(stackMarquee).columnGap || '0');
      var first = stackOriginals[0].getBoundingClientRect();
      var lastOfSet = stackOriginals[stackOriginals.length - 1].getBoundingClientRect();
      stackSetWidth = (lastOfSet.right - first.left) + gap;
    }
    function stackApply() {
      stackMarquee.style.transform = 'translateX(-' + stackOffset + 'px)';
    }
    function stackTick(ts) {
      requestAnimationFrame(stackTick);
      if (stackLastTs === null) stackLastTs = ts;
      var dt = ts - stackLastTs;
      stackLastTs = ts;
      if (reduced || stackHovered || stackSetWidth <= 0) return;
      stackOffset += stackPxPerMs * dt;
      if (stackOffset >= stackSetWidth) stackOffset -= stackSetWidth;
      stackApply();
    }

    var stackWrap = stackMarquee.parentElement;
    stackWrap.addEventListener('mouseenter', function () { stackHovered = true; });
    stackWrap.addEventListener('mouseleave', function () { stackHovered = false; stackLastTs = null; });
    stackWrap.addEventListener('touchstart', function () { stackHovered = true; }, { passive: true });
    stackWrap.addEventListener('touchend', function () { stackHovered = false; stackLastTs = null; });

    window.addEventListener('resize', stackComputeSetWidth);
    stackComputeSetWidth();
    requestAnimationFrame(stackTick);
  }

  /* ---------- reveal on scroll ---------- */
  var items = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- hero card fan mouse-tilt parallax ---------- */
  var heroStack = document.getElementById('heroStack');
  if (heroStack && !reduced) {
    var heroCards = heroStack.querySelectorAll('.mini-card');
    function applyTilt(nx, ny) {
      heroCards.forEach(function (card) {
        var depth = card.classList.contains('back') ? 12 :
                    card.classList.contains('middle') ? 22 : 34;
        var tx = nx * depth;
        var ty = ny * (depth * 0.7);
        card.style.setProperty('--px', tx.toFixed(1) + 'px');
        card.style.setProperty('--py', ty.toFixed(1) + 'px');
      });
    }
    heroStack.addEventListener('mousemove', function (e) {
      var r = heroStack.getBoundingClientRect();
      var nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      var ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      applyTilt(nx, ny);
    });
    heroStack.addEventListener('mouseleave', function () {
      heroCards.forEach(function (card) {
        card.style.setProperty('--px', '0px');
        card.style.setProperty('--py', '0px');
      });
    });
  }
  /* ---------- count-up stats ---------- */
  var stats = document.querySelectorAll('.num[data-count]');
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var start = null, duration = 1100;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    if (reduced) { el.textContent = target + suffix; } else { requestAnimationFrame(step); }
  }
  if (stats.length && 'IntersectionObserver' in window) {
    var statIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); statIo.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    stats.forEach(function (el) { statIo.observe(el); });
  }

  /* ---------- project filter + detail modal ---------- */
  var projGrid = document.querySelector('.proj-grid');
  if (projGrid) {
    var projCards = Array.prototype.slice.call(document.querySelectorAll('.proj-card'));
    var filterBtns = Array.prototype.slice.call(document.querySelectorAll('.proj-filter-btn'));

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var f = btn.getAttribute('data-filter');
        projCards.forEach(function (card) {
          var match = f === 'all' || card.getAttribute('data-category') === f;
          if (match) {
            card.style.display = '';
            requestAnimationFrame(function () { card.classList.remove('proj-hide'); });
          } else {
            card.classList.add('proj-hide');
            setTimeout(function () {
              if (card.classList.contains('proj-hide')) card.style.display = 'none';
            }, 220);
          }
        });
      });
    });

    var projModal = document.getElementById('projModal');
    var projModalContent = document.getElementById('projModalContent');
    var lastFocused = null;

    function openProjModal(targetId) {
      var tpl = document.getElementById(targetId);
      if (!tpl || !projModal || !projModalContent) return;
      projModalContent.innerHTML = '';
      projModalContent.appendChild(tpl.content.cloneNode(true));
      lastFocused = document.activeElement;
      projModal.classList.add('open');
      projModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      var closeBtn = projModal.querySelector('.proj-modal-close');
      if (closeBtn) closeBtn.focus();
    }
    function closeProjModal() {
      projModal.classList.remove('open');
      projModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    projCards.forEach(function (card) {
      card.addEventListener('click', function () { openProjModal(card.getAttribute('data-target')); });
    });
    if (projModal) {
      projModal.querySelectorAll('[data-modal-close]').forEach(function (el) {
        el.addEventListener('click', closeProjModal);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && projModal.classList.contains('open')) closeProjModal();
      });
    }
  }

  /* ---------- service carousel (square cards, continuous marquee loop) ---------- */
  var serviceCarousel = document.getElementById('serviceCarousel');
  if (serviceCarousel) {
    var serviceTrack = document.getElementById('serviceTrack');
    var serviceOriginals = Array.prototype.slice.call(serviceTrack.children);
    serviceOriginals.forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      serviceTrack.appendChild(clone);
    });

    var serviceOffset = 0;
    var serviceSetWidth = 0;
    var serviceHovered = false;
    var serviceInView = false;
    var serviceLastTs = null;
    var servicePxPerMs = 0.08;
    var serviceAnim = null;

    function serviceComputeSetWidth() {
      var gap = parseFloat(getComputedStyle(serviceTrack).columnGap || '0');
      var first = serviceOriginals[0].getBoundingClientRect();
      var lastOfSet = serviceOriginals[serviceOriginals.length - 1].getBoundingClientRect();
      serviceSetWidth = (lastOfSet.right - first.left) + gap;
    }
    function serviceWrap(x) {
      var w = serviceSetWidth;
      if (w <= 0) return 0;
      var r = x % w;
      if (r < 0) r += w;
      return r;
    }
    function serviceApply() {
      serviceTrack.style.transform = 'translateX(-' + serviceOffset + 'px)';
    }
    function serviceEaseOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function serviceNudge(dir) {
      var gap = parseFloat(getComputedStyle(serviceTrack).columnGap || '0');
      var cardWidth = serviceOriginals[0].getBoundingClientRect().width;
      var pendingTarget = serviceAnim ? serviceAnim.to : serviceOffset;
      serviceAnim = { from: serviceOffset, to: pendingTarget + dir * (cardWidth + gap), startTs: null, duration: 420 };
    }
    function serviceTick(ts) {
      requestAnimationFrame(serviceTick);
      if (serviceLastTs === null) serviceLastTs = ts;
      var dt = ts - serviceLastTs;
      serviceLastTs = ts;

      if (serviceAnim) {
        if (serviceAnim.startTs === null) serviceAnim.startTs = ts;
        var t = Math.min((ts - serviceAnim.startTs) / serviceAnim.duration, 1);
        var eased = serviceEaseOutCubic(t);
        serviceOffset = serviceWrap(serviceAnim.from + (serviceAnim.to - serviceAnim.from) * eased);
        serviceApply();
        if (t >= 1) serviceAnim = null;
        return;
      }

      if (reduced || serviceHovered || !serviceInView || serviceSetWidth <= 0) return;
      serviceOffset = serviceWrap(serviceOffset + servicePxPerMs * dt);
      serviceApply();
    }

    var servicePrevBtn = document.getElementById('servicePrev');
    var serviceNextBtn = document.getElementById('serviceNext');
    if (servicePrevBtn) servicePrevBtn.addEventListener('click', function () { serviceNudge(-1); });
    if (serviceNextBtn) serviceNextBtn.addEventListener('click', function () { serviceNudge(1); });

    serviceCarousel.addEventListener('mouseenter', function () { serviceHovered = true; });
    serviceCarousel.addEventListener('mouseleave', function () { serviceHovered = false; serviceLastTs = null; });
    serviceCarousel.addEventListener('touchstart', function () { serviceHovered = true; }, { passive: true });
    serviceCarousel.addEventListener('touchend', function () { serviceHovered = false; serviceLastTs = null; });
    serviceCarousel.addEventListener('focusin', function () { serviceHovered = true; });
    serviceCarousel.addEventListener('focusout', function () { serviceHovered = false; serviceLastTs = null; });

    window.addEventListener('resize', serviceComputeSetWidth);

    if ('IntersectionObserver' in window) {
      var serviceIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { serviceInView = entry.isIntersecting; });
      }, { threshold: 0.15 });
      serviceIo.observe(serviceCarousel);
    } else {
      serviceInView = true;
    }

    serviceComputeSetWidth();
    requestAnimationFrame(serviceTick);
  }

  /* ---------- contact form -> mailto ---------- */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var field = function (id) { var el = form.querySelector(id); return el ? el.value.trim() : ''; };
      var name = field('#cf-name');
      var email = field('#cf-email');
      var type = field('#cf-type');
      var message = field('#cf-message');
      var budget = field('#cf-budget');
      var timeline = field('#cf-timeline');
      var subject = encodeURIComponent('New project inquiry from ' + (name || 'website visitor'));
      var lines = [];
      if (type) lines.push('Project type: ' + type);
      lines.push('', message, '');
      if (budget) lines.push('Estimated budget: ' + budget);
      if (timeline) lines.push('Expected timeline: ' + timeline);
      lines.push('', 'â€” ' + name + ' (' + email + ')');
      var body = encodeURIComponent(lines.join('\n'));
      window.location.href = 'mailto:laraibhassan61@gmail.com?subject=' + subject + '&body=' + body;
    });
  }
})();
