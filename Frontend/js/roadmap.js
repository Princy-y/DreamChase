document.addEventListener('DOMContentLoaded', () => {
    const roadmapContainer = document.getElementById('roadmap-container');
    if (!roadmapContainer) return;

    const rawRoadmap = localStorage.getItem('dc_roadmap');
    const career = localStorage.getItem('dc_career') || 'Your Career';

    if (!rawRoadmap) {
        roadmapContainer.innerHTML = '<div style="color:var(--text-secondary); padding: 20px 0; text-align: center;">No roadmap generated yet. <a href="index.html" style="color:var(--grad-start);">Generate one here!</a></div>';
        ['statPhases', 'statTasks', 'statCompleted'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        return;
    }

    const dashSub = document.querySelector('.dash-sub');
    if (dashSub) dashSub.textContent = `Career goal: ${career}`;

    roadmapContainer.innerHTML = rawRoadmap;

    const phases = roadmapContainer.querySelectorAll('.rm-h2').length;
    const tasks = roadmapContainer.querySelectorAll('.rm-step').length;

    const savedState = JSON.parse(localStorage.getItem('dc_task_state') || '{"done":0}');
    const completed = savedState.done || 0;

    const statPhases = document.getElementById('statPhases');
    const statTasks = document.getElementById('statTasks');
    const statCompleted = document.getElementById('statCompleted');
    if (statPhases) statPhases.textContent = phases || '-';
    if (statTasks) statTasks.textContent = tasks || '-';
    if (statCompleted) statCompleted.textContent = completed;

    const tasksContainer = document.getElementById('tasks-container');
    if (tasksContainer) {
        const stepEls = roadmapContainer.querySelectorAll('.rm-step');
        if (stepEls.length === 0) {
            tasksContainer.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:20px 0;">No tasks found.</div>';
        } else {
            const wrap = document.createElement('div');
            wrap.className = 'daily-tasks';
            let shown = 0;
            stepEls.forEach(step => {
                if (shown >= 5) return;
                const text = step.querySelector('.rm-p, span, div:not(.rm-num)')?.textContent?.trim();
                if (!text) return;
                shown++;

                const el = document.createElement('div');
                el.className = 'daily-task';

                const check = document.createElement('div');
                check.className = 'daily-task__check';

                const label = document.createElement('span');
                label.className = 'daily-task__text';
                label.textContent = text;

                el.addEventListener('click', () => {
                    const isDone = el.classList.toggle('done');
                    const state = JSON.parse(localStorage.getItem('dc_task_state') || '{"done":0}');
                    state.done = Math.max(0, (state.done || 0) + (isDone ? 1 : -1));
                    localStorage.setItem('dc_task_state', JSON.stringify(state));
                    if (statCompleted) statCompleted.textContent = state.done;
                });

                el.appendChild(check);
                el.appendChild(label);
                wrap.appendChild(el);
            });
            tasksContainer.innerHTML = '';
            tasksContainer.appendChild(wrap);
        }
    }
});
