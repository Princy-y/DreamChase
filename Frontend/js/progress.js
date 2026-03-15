document.addEventListener('DOMContentLoaded', () => {
    
    function updateProgress() {
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
        
        const unlockedCount = parseInt(localStorage.getItem('dc_unlocked_tasks')) || 0;

        const grid = document.createElement('div');
        grid.className = 'progress-grid';

        phaseEls.forEach((el, idx) => {
            const label = el.textContent.trim().slice(0, 36);
            
            const pct = (idx < unlockedCount) ? 100 : 0;

            const item = document.createElement('div');
            item.className = 'progress-item';

            item.innerHTML = `
                <div class="progress-item__header">
                    <span class="progress-item__label">${label}</span>
                    <span class="progress-item__value">${pct}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar__fill" style="width: 0%; transition: width 1s ease;"></div>
                </div>
            `;
            grid.appendChild(item);

            requestAnimationFrame(() => {
                setTimeout(() => { 
                    item.querySelector('.progress-bar__fill').style.width = pct + '%'; 
                }, 100 + idx * 80);
            });
        });

        progressContainer.innerHTML = '';
        progressContainer.appendChild(grid);
    }

    updateProgress();
    
    window.addEventListener('updateDashboard', updateProgress);
});