

(function () {
  'use strict';

  /* ── DOM refs ── */
  const bar     = document.getElementById('bar');
  const pct     = document.getElementById('pct');
  const tagEl   = document.getElementById('tagline');
  const frame   = document.getElementById('site-frame');
  const blocked = document.getElementById('blocked');

  /* ─────────────────────────────────────────
     1. TYPEWRITER
  ───────────────────────────────────────── */
  const TAGLINE = "L'art de conduire. Montréal.";
  let charIndex = 0;

  const typeTimer = setInterval(function () {
    tagEl.textContent += TAGLINE[charIndex];
    charIndex++;
    if (charIndex >= TAGLINE.length) clearInterval(typeTimer);
  }, 55);

  /* ─────────────────────────────────────────
     2. ANIMATED PROGRESS BAR
  ───────────────────────────────────────── */
  let progress = 0;
  let progressDone = false;

  const progressTimer = setInterval(function () {
    if (progressDone) return;
    const jump = progress < 65 ? Math.random() * 14 : Math.random() * 3;
    progress = Math.min(progress + jump, 94);
    bar.style.width = progress + '%';
    pct.textContent = Math.floor(progress) + '%';
  }, 110);

  /* ─────────────────────────────────────────
     3. FINISH LOADER — call when ready
  ───────────────────────────────────────── */
  function finishLoader() {
    if (progressDone) return;
    progressDone = true;

    clearInterval(progressTimer);
    clearTimeout(safetyTimer);

    bar.style.transition = 'width 0.45s ease';
    bar.style.width = '100%';
    pct.textContent = '100%';

    setTimeout(function () {
      loader.classList.add('hidden');
      frame.classList.add('visible');
    }, 520);
  }

  /* ─────────────────────────────────────────
     4. SHOW BLOCKED FALLBACK
  ───────────────────────────────────────── */
  function showBlocked() {
    clearInterval(progressTimer);
    clearTimeout(safetyTimer);
    loader.classList.add('hidden');
    blocked.classList.add('show');
  }

  /* ─────────────────────────────────────────
     5. IFRAME EVENTS
  ───────────────────────────────────────── */
  frame.addEventListener('load', function () {
    /*
      We cannot read iframe.contentDocument on a cross-origin page —
      that's expected and fine (CORS ≠ X-Frame block).
      If the load event fires, assume the iframe loaded OK.
      If Webflow blocks with X-Frame-Options the browser will
      either fire an error event or silently show a blank frame.
    */
    setTimeout(finishLoader, 600);
  });

  frame.addEventListener('error', function () {
    showBlocked();
  });

  /* ─────────────────────────────────────────
     6. SAFETY TIMER
     If nothing happens after 14 s, reveal whatever is there.
  ───────────────────────────────────────── */
  var safetyTimer = setTimeout(function () {
    finishLoader();
  }, 14000);

})();
