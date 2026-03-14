document.addEventListener('DOMContentLoaded', () => {
    console.log('DreamChase App Initialized');

    // ── Index Page Logic ──
    const input     = document.getElementById('careerInput');
    const btn       = document.getElementById('generateBtn');
    const section   = document.getElementById('responseSection');
    const emptyEl   = document.getElementById('emptyState');
    const loadEl    = document.getElementById('loadingState');
    const resultEl  = document.getElementById('resultState');
    const bodyEl    = document.getElementById('resultBody');
    const metaEl    = document.getElementById('resultMeta');
    const copyBtn   = document.getElementById('copyBtn');
    const newBtn    = document.getElementById('newSearchBtn');
    const navbar    = document.getElementById('navbar');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const inputCard = document.getElementById('inputCard');

    if (!input || !btn || !section) return; // Exit if not on index page

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
      if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });

    // Smooth scroll for Get Started button
    if (getStartedBtn && inputCard) {
      getStartedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        inputCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => input.focus(), 500);
      });
    }

    // Enter key
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') generate();
    });

    btn.addEventListener('click', generate);
    newBtn.addEventListener('click', reset);
    if(copyBtn) copyBtn.addEventListener('click', copyRoadmap);

    function setState(state) {
      if(emptyEl) emptyEl.hidden  = state !== 'empty';
      if(loadEl) loadEl.hidden   = state !== 'loading';
      if(resultEl) resultEl.hidden = state !== 'result';
    }

    function reset() {
      setState('empty');
      input.value = '';
      input.focus();
      section.classList.remove('has-result');
    }

    function copyRoadmap() {
      if(!bodyEl || !copyBtn) return;
      const text = bodyEl.innerText;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.classList.add('copied');
        setTimeout(() => copyBtn.classList.remove('copied'), 2000);
      });
    }

    async function generate() {
      const career = input.value.trim();
      if (!career) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
        return;
      }

      setState('loading');
      section.classList.add('has-result');
      btn.disabled = true;

      try {
       const res = await fetch('http://127.0.0.1:5000/generate-roadmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ career })
        });
        
        if (!res.ok) throw new Error('API error');
        
        const data = await res.json();
        const roadmap = data.roadmap || data.response || JSON.stringify(data);

        if(metaEl) metaEl.textContent = `Career: ${career}`;
        if(bodyEl) bodyEl.innerHTML = formatRoadmap(roadmap);
        
        setState('result');
      } catch (err) {
        console.error("Backend fetch failed: ", err);
        // Show empty state because backend is disconnected
        setState('empty');
        alert("Backend server is disconnected. Please connect the backend to generate a roadmap.");
      } finally {
        btn.disabled = false;
      }
    }

    function formatRoadmap(text) {
      if(!text) return '';
      // Convert markdown-like text to styled HTML
      return text
        .split('\n')
        .map(line => {
          line = line.trim();
          if (!line) return '<br>';
          if (/^#{1,2}\s/.test(line)) {
            const t = line.replace(/^#+\s/, '');
            return `<h2 class="rm-h2">${t}</h2>`;
          }
          if (/^###/.test(line)) {
            const t = line.replace(/^#+\s/, '');
            return `<h3 class="rm-h3">${t}</h3>`;
          }
          if (/^\d+\./.test(line)) {
            return `<div class="rm-step"><span class="rm-num">${line.match(/^\d+/)[0]}</span><span>${line.replace(/^\d+\.\s*/, '')}</span></div>`;
          }
          if (/^[-•*]/.test(line)) {
            return `<div class="rm-bullet"><span class="rm-dot"></span><span>${line.replace(/^[-•*]\s*/, '')}</span></div>`;
          }
          if (/^\*\*.*\*\*/.test(line)) {
            return `<p class="rm-bold">${line.replace(/\*\*/g, '')}</p>`;
          }
          return `<p class="rm-p">${line}</p>`;
        })
        .join('');
    }
});
