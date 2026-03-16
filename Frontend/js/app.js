document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('careerInput');
    const btn = document.getElementById('generateBtn');
    const section = document.getElementById('responseSection');
    const emptyEl = document.getElementById('emptyState');
    const loadEl = document.getElementById('loadingState');
    const resultEl = document.getElementById('resultState');
    const bodyEl = document.getElementById('resultBody');
    const metaEl = document.getElementById('resultMeta');
    const copyBtn = document.getElementById('copyBtn');
    const newBtn = document.getElementById('newSearchBtn');
    const navbar = document.getElementById('navbar');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const inputCard = document.getElementById('inputCard');

    if (!input || !btn || !section) return;

    window.addEventListener('scroll', () => {
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });

    if (getStartedBtn && inputCard) {
        getStartedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            inputCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => input.focus(), 500);
        });
    }

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') generate();
    });

    btn.addEventListener('click', generate);
    newBtn.addEventListener('click', reset);
    if (copyBtn) copyBtn.addEventListener('click', copyRoadmap);

    function setState(state) {
        if (emptyEl) emptyEl.hidden = state !== 'empty';
        if (loadEl) loadEl.hidden = state !== 'loading';
        if (resultEl) resultEl.hidden = state !== 'result';
    }

    function reset() {
        setState('empty');
        input.value = '';
        input.focus();
        section.classList.remove('has-result');
    }

    function copyRoadmap() {
        if (!bodyEl || !copyBtn) return;
        navigator.clipboard.writeText(bodyEl.innerText).then(() => {
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const res = await fetch('http://127.0.0.1:5000/generate-roadmap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ career })
            });

            if (!res.ok) throw new Error('API error');

            const data = await res.json();
            const roadmap = data.roadmap || data.response || JSON.stringify(data);

            if (metaEl) metaEl.textContent = `Career: ${career}`;
            if (bodyEl) bodyEl.innerHTML = roadmap;

            localStorage.setItem('dc_career', career);
            localStorage.setItem('dc_roadmap', roadmap);
            localStorage.removeItem('dc_task_state');

            setState('result');
        } catch (err) {
            console.error(err);
            setState('empty');
            alert('Backend server is disconnected. Please connect the backend to generate a roadmap.');
        } finally {
            btn.disabled = false;
        }
    }
});
