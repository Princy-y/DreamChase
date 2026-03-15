document.addEventListener('DOMContentLoaded', () => {
    const progressContainer = document.getElementById('progress-container');
    if (!progressContainer) return;

    const rawRoadmap = localStorage.getItem('dc_roadmap');

    if (!rawRoadmap) {
        progressContainer.innerHTML = '<div style="color:var(--text-secondary); text-align: center; padding: 20px 0;">No progress metrics available. Start learning to see your skills grow!</div>';
        return;
    }

    const temp = document.createElement('div');
    temp.innerHTML = rawRoadmap;

    const phaseEls = temp.querySelectorAll('.rm-h2');
    if (phaseEls.length === 0) {
        progressContainer.innerHTML = '<div style="color:var(--text-secondary); text-align: center; padding: 20px 0;">Generate a roadmap to track your progress here.</div>';
        return;
    }

    const savedState = JSON.parse(localStorage.getItem('dc_task_state') || '{"done":0}');
    const totalTasks = temp.querySelectorAll('.rm-step').length;
    const completedTotal = savedState.done || 0;

    const grid = document.createElement('div');
    grid.className = 'progress-grid';

    phaseEls.forEach((el, idx) => {
        const label = el.textContent.trim().slice(0, 36);
        const pct = idx === 0 && totalTasks > 0
            ? Math.round((completedTotal / totalTasks) * 100)
            : 0;

        const item = document.createElement('div');
        item.className = 'progress-item';

        const header = document.createElement('div');
        header.className = 'progress-item__header';

        const labelEl = document.createElement('span');
        labelEl.className = 'progress-item__label';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.className = 'progress-item__value';
        valueEl.textContent = `${pct}%`;

        header.appendChild(labelEl);
        header.appendChild(valueEl);

        const bar = document.createElement('div');
        bar.className = 'progress-bar';

        const fill = document.createElement('div');
        fill.className = 'progress-bar__fill';
        fill.style.width = '0%';

        bar.appendChild(fill);
        item.appendChild(header);
        item.appendChild(bar);
        grid.appendChild(item);

        requestAnimationFrame(() => {
            setTimeout(() => { fill.style.width = pct + '%'; }, 100 + idx * 80);
        });
    });

    progressContainer.innerHTML = '';
    progressContainer.appendChild(grid);
});
