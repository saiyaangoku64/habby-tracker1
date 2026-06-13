// ============================================================
// HABBBY landing — carousel + cards rail + scroll motion
// (no backend; static "coming soon to App Store" page)
// ============================================================

// ---- screen carousel ----
const SCREENS = [
  { src: 'assets/screen-home.png',     label: 'Home · your daily streak' },
  { src: 'assets/screen-jars.png',     label: "Jars · today's habits" },
  { src: 'assets/screen-cards.png',    label: 'Cards · your collection' },
  { src: 'assets/screen-stats.png',    label: 'Stats · your progress' },
  { src: 'assets/screen-ranks.png',    label: 'Ranks · weekly podium' },
  { src: 'assets/screen-addhabit.png', label: 'New habit · pick a jar' },
  { src: 'assets/screen-detail.png',   label: "Habit detail · today's log" },
];
let carIndex = 0;
const carImg   = document.getElementById('car-img');
const carLabel = document.getElementById('car-label');
const carDots  = document.getElementById('car-dots');

function paintCarousel(){
  const s = SCREENS[carIndex];
  carImg.classList.add('fading');
  setTimeout(() => {
    carImg.src = s.src;
    carImg.alt = s.label;
    carLabel.textContent = s.label;
    carImg.classList.remove('fading');
  }, 180);
  [...carDots.children].forEach((d, i) => {
    d.classList.toggle('is-active', i === carIndex);
    d.setAttribute('aria-selected', i === carIndex);
  });
}
function carNext(){ carIndex = (carIndex + 1) % SCREENS.length; paintCarousel(); }
function carPrev(){ carIndex = (carIndex - 1 + SCREENS.length) % SCREENS.length; paintCarousel(); }
function carJump(i){ carIndex = i; paintCarousel(); }

SCREENS.forEach((_, i) => {
  const b = document.createElement('button');
  b.className = 'car-dot';
  b.setAttribute('role','tab');
  b.setAttribute('aria-label', `Show screen ${i+1}`);
  b.addEventListener('click', () => carJump(i));
  carDots.appendChild(b);
});
paintCarousel();

document.getElementById('car-next').addEventListener('click', carNext);
document.getElementById('car-prev').addEventListener('click', carPrev);

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight') carNext();
  if (e.key === 'ArrowLeft')  carPrev();
});

let carTimer = setInterval(carNext, 6500);
document.querySelector('.carousel').addEventListener('mouseenter', () => clearInterval(carTimer));

// ---- cards rail (back-by-default, flip on hover / tap) ----
const CARDS = [
  { front: 'assets/card-spark.png',         hint: 'Spark · 3-day streak',           rarity: 'common'    },
  { front: 'assets/card-earlybird.png',     hint: 'Early Bird · log before 8am',    rarity: 'uncommon'  },
  { front: 'assets/card-ten.png',           hint: 'Ten · 10 total logs',            rarity: 'common'    },
  { front: 'assets/card-trio.png',          hint: 'Trio · 3 habits at once',        rarity: 'rare'      },
  { front: 'assets/card-fifty.png',         hint: 'Fifty · 50 total logs',          rarity: 'uncommon'  },
  { front: 'assets/card-farmhand.png',      hint: 'Farmhand · weekly grind',        rarity: 'rare'      },
  { front: 'assets/card-nightowl.png',      hint: 'Night Owl · log after 10pm',     rarity: 'uncommon'  },
  { front: 'assets/card-weekone.png',       hint: 'Week One · 7-day streak',        rarity: 'rare'      },
  { front: 'assets/card-studytime.png',     hint: 'Study Time · 30 reading logs',   rarity: 'epic'      },
  { front: 'assets/card-kindle.png',        hint: 'Kindle · finish a book',         rarity: 'epic'      },
  { front: 'assets/card-shelfbuilder.png',  hint: 'Shelf Builder · 5 books',        rarity: 'legendary' },
  { front: null,                            hint: 'Legendary · coming soon',        locked: true        },
];
const rail = document.getElementById('cards-rail');
CARDS.forEach((c, i) => {
  const flip = document.createElement('button');
  flip.type = 'button';
  flip.className = 'card-flip' + (c.locked ? ' is-locked' : '') + (c.rarity ? ' rarity-' + c.rarity : '');
  flip.style.transitionDelay = (i * 70) + 'ms';
  flip.setAttribute('aria-label', c.hint);

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  const back  = document.createElement('div');
  back.className = 'card-face card-back';
  back.innerHTML = `<img src="assets/card-back.png" alt="" loading="lazy">`;

  const front = document.createElement('div');
  front.className = 'card-face card-front';
  front.innerHTML = c.front
    ? `<img src="${c.front}" alt="${c.hint}" loading="lazy">`
    : `<img src="assets/card-back.png" alt="" loading="lazy">`;

  const hint = document.createElement('span');
  hint.className = 'card-hint';
  hint.textContent = c.hint;

  inner.appendChild(back);
  inner.appendChild(front);

  flip.addEventListener('click', () => flip.classList.toggle('is-flipped'));

  flip.appendChild(inner);
  flip.appendChild(hint);
  rail.appendChild(flip);
});

// ============================================================
// MOTION: scroll-reveal · stat counter · phone tilt
// ============================================================
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReduced){
  document.querySelectorAll('.card-flip').forEach((el) => el.classList.add('is-revealed'));
}

if (!prefersReduced) {
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting){
        e.target.classList.add('in');
        revealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => revealIO.observe(el));

  const cardRevealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting){
        e.target.classList.add('is-revealed');
        cardRevealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.card-flip').forEach((el) => cardRevealIO.observe(el));

  // ---- stat counter ----
  const animateNumber = (el) => {
    const target = parseFloat(el.dataset.num);
    const suffix = el.dataset.suffix || '';
    if (Number.isNaN(target)) return;
    const dur = 1400;
    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const v = Math.round(easeOut(p) * target);
      el.textContent = v.toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const statIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting){
        animateNumber(e.target);
        statIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num[data-num]').forEach((el) => {
    el.textContent = '0' + (el.dataset.suffix || '');
    statIO.observe(el);
  });

  // ---- phone tilt ----
  const heroPhone = document.querySelector('.hero-phone');
  const hero = document.querySelector('.hero');
  if (heroPhone && hero){
    let rafId = 0;
    let targetRX = 0, targetRY = 0;
    let curRX = 0,    curRY = 0;
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      curRX = lerp(curRX, targetRX, 0.08);
      curRY = lerp(curRY, targetRY, 0.08);
      heroPhone.style.transform = `perspective(1200px) rotateX(${curRX.toFixed(2)}deg) rotateY(${curRY.toFixed(2)}deg) translateZ(0)`;
      if (Math.abs(curRX - targetRX) > 0.02 || Math.abs(curRY - targetRY) > 0.02){
        rafId = requestAnimationFrame(tick);
      } else { rafId = 0; }
    };
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width  - 0.5;
      const dy = (e.clientY - r.top)  / r.height - 0.5;
      targetRY = dx * 8;
      targetRX = -dy * 5;
      if (!rafId) rafId = requestAnimationFrame(tick);
    });
    hero.addEventListener('mouseleave', () => {
      targetRX = 0; targetRY = 0;
      if (!rafId) rafId = requestAnimationFrame(tick);
    });
  }
}
