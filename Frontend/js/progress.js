document.addEventListener('DOMContentLoaded', () => {
    const progressContainer = document.getElementById('progress-container');
    if (!progressContainer) return;

    
    const skills = [];

    if (skills.length === 0) {
        progressContainer.innerHTML = '<div style="color:var(--text-secondary); text-align: center; padding: 20px 0;">No progress metrics available. Start learning to see your skills grow!</div>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'progress-grid';

    skills.forEach(skill => {
        const item = document.createElement('div');
        item.className = 'progress-item';

        const header = document.createElement('div');
        header.className = 'progress-item__header';

        const label = document.createElement('span');
        label.className = 'progress-item__label';
        label.textContent = skill.label;

        const value = document.createElement('span');
        value.className = 'progress-item__value';
        value.textContent = `${skill.value}%`;

        header.appendChild(label);
        header.appendChild(value);

        const bar = document.createElement('div');
        bar.className = 'progress-bar';

        const fill = document.createElement('div');
        fill.className = 'progress-bar__fill';
        fill.style.width = '0%';

        bar.appendChild(fill);
        item.appendChild(header);
        item.appendChild(bar);
        grid.appendChild(item);

        // Animate on load
        requestAnimationFrame(() => {
            setTimeout(() => {
                fill.style.width = skill.value + '%';
            }, 100);
        });
    });

    progressContainer.innerHTML = '';
    progressContainer.appendChild(grid);
});
