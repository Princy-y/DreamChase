document.addEventListener('DOMContentLoaded', () => {
    const roadmapContainer = document.getElementById('roadmap-container');
    if (!roadmapContainer) return;

    // Roadmap data will come from the backend. Currently empty.
    const phases = [];

    if (phases.length === 0) {
        roadmapContainer.innerHTML = '<div style="color:var(--text-secondary); padding: 20px 0; text-align: center;">No roadmap generated yet. Generate one to see it here!</div>';
        return;
    }

    function renderRoadmap() {
        const timeline = document.createElement('div');
        timeline.className = 'roadmap-timeline';

        phases.forEach(phase => {
            const phaseEl = document.createElement('div');
            phaseEl.className = 'roadmap-phase';

            const marker = document.createElement('div');
            marker.className = 'roadmap-phase__marker';
            marker.textContent = phase.num;

            const content = document.createElement('div');
            content.className = 'roadmap-phase__content';

            const title = document.createElement('div');
            title.className = 'roadmap-phase__title';
            title.textContent = `Phase ${phase.num} — ${phase.title}`;

            const time = document.createElement('div');
            time.className = 'roadmap-phase__time';
            time.textContent = phase.time;

            const tasksWrap = document.createElement('div');
            tasksWrap.className = 'roadmap-phase__tasks';

            phase.tasks.forEach(task => {
                const taskEl = document.createElement('div');
                taskEl.className = 'roadmap-task' + (task.done ? ' completed' : '');

                const check = document.createElement('div');
                check.className = 'roadmap-task__check';
                check.addEventListener('click', () => {
                    task.done = !task.done;
                    taskEl.classList.toggle('completed', task.done);
                    updateStats();
                });

                const label = document.createElement('span');
                label.textContent = task.text;

                taskEl.appendChild(check);
                taskEl.appendChild(label);
                tasksWrap.appendChild(taskEl);
            });

            content.appendChild(title);
            content.appendChild(time);
            content.appendChild(tasksWrap);
            phaseEl.appendChild(marker);
            phaseEl.appendChild(content);
            timeline.appendChild(phaseEl);
        });

        roadmapContainer.innerHTML = '';
        roadmapContainer.appendChild(timeline);
    }

    function updateStats() {
        const allTasks = phases.flatMap(p => p.tasks);
        const completed = allTasks.filter(t => t.done).length;
        const statCompleted = document.getElementById('statCompleted');
        const statTasks = document.getElementById('statTasks');
        if (statCompleted) statCompleted.textContent = completed;
        if (statTasks) statTasks.textContent = allTasks.length;
    }

    // Also render daily tasks
    const tasksContainer = document.getElementById('tasks-container');
    if (tasksContainer) {
        const dailyTasks = [];

        if (dailyTasks.length === 0) {
            tasksContainer.innerHTML = '<div style="color:var(--text-secondary); text-align: center; padding: 20px 0;">No daily tasks yet.</div>';
        } else {
            const dailyWrap = document.createElement('div');
            dailyWrap.className = 'daily-tasks';

            dailyTasks.forEach(task => {
                const el = document.createElement('div');
                el.className = 'daily-task' + (task.done ? ' done' : '');

                const check = document.createElement('div');
                check.className = 'daily-task__check';

                const text = document.createElement('span');
                text.className = 'daily-task__text';
                text.textContent = task.text;

                const tag = document.createElement('span');
                tag.className = `daily-task__tag daily-task__tag--${task.tag}`;
                tag.textContent = task.tag;

                el.addEventListener('click', () => {
                    task.done = !task.done;
                    el.classList.toggle('done', task.done);
                });

                el.appendChild(check);
                el.appendChild(text);
                el.appendChild(tag);
                dailyWrap.appendChild(el);
            });

            tasksContainer.innerHTML = '';
            tasksContainer.appendChild(dailyWrap);
        }
    }

    renderRoadmap();
    updateStats();
});
