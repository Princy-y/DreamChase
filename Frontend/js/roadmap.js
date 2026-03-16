document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = localStorage.getItem('userName');
    
    if (loggedInUser) {
        const loginLinks = document.querySelectorAll('a[href="login.html"]');
        loginLinks.forEach(link => {
            const firstName = loggedInUser.split(' ')[0]; 
            link.innerHTML = `<span style="color: #3ECFCF; font-weight: 600;">Hi, ${firstName} </span>`;
            link.href = "dashboard.html"; 
        });

        const ctaButtons = document.querySelectorAll('.nav-cta');
        ctaButtons.forEach(btn => {
            btn.textContent = "Logout";
            btn.style.background = "rgba(255, 255, 255, 0.1)";
            btn.style.border = "1px solid rgba(255,255,255,0.2)";
            btn.style.color = "#fff";
            
            btn.onclick = (e) => {
                e.preventDefault();
                localStorage.clear(); 
                window.location.href = "index.html"; 
            };
        });
    }

    const roadmapContainer = document.getElementById('roadmap-container');
    if (!roadmapContainer) return;

    const rawRoadmap = localStorage.getItem('dc_roadmap');
    const career = localStorage.getItem('dc_career') || 'Your Career';

    if (!rawRoadmap) {
        roadmapContainer.innerHTML = '<div style="color:var(--text-secondary); padding: 20px 0; text-align: center;">No roadmap generated yet. <a href="index.html" style="color:var(--grad-start);">Generate one here!</a></div>';
        return;
    }

    const dashSub = document.querySelector('.dash-sub');
    if (dashSub) dashSub.textContent = `Career goal: ${career}`;

    roadmapContainer.innerHTML = rawRoadmap;

    const phases = roadmapContainer.querySelectorAll('.rm-h2').length;
    const tasks = roadmapContainer.querySelectorAll('.rm-step').length;
    let unlockedCount = parseInt(localStorage.getItem('dc_unlocked_tasks')) || 0;

    const statPhases = document.getElementById('statPhases');
    const statTasks = document.getElementById('statTasks');
    const statCompleted = document.getElementById('statCompleted');
    
    if (statPhases) statPhases.textContent = phases || '-';
    if (statTasks) statTasks.textContent = tasks || '-';
    if (statCompleted) statCompleted.textContent = unlockedCount;

    /* ── XP & Stars display ── */
    updateXpDisplay();

    /* ── Daily tasks sidebar ── */
    const tasksContainer = document.getElementById('tasks-container');
    if (tasksContainer) {
        const stepEls = roadmapContainer.querySelectorAll('.rm-step');
        if (stepEls.length > 0) {
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
                el.innerHTML = `<div class="daily-task__check"></div><span class="daily-task__text">${text}</span>`;

                el.addEventListener('click', () => {
                    el.classList.toggle('done');
                });
                wrap.appendChild(el);
            });
            tasksContainer.innerHTML = '';
            tasksContainer.appendChild(wrap);
        }
    }

    setTimeout(enforceTaskLocking, 500);

    /* ══════════════════════════════════════
       XP & STARS SYSTEM
       ══════════════════════════════════════ */

    function getXp()        { return parseInt(localStorage.getItem('dc_xp')) || 0; }
    function getGoldStars() { return parseInt(localStorage.getItem('dc_gold_stars')) || 0; }
    function getVerifiedTasks() {
        try { return JSON.parse(localStorage.getItem('dc_verified_tasks') || '[]'); }
        catch { return []; }
    }

    function addXp(amount) {
        const xp = getXp() + amount;
        localStorage.setItem('dc_xp', xp);
        updateXpDisplay();
        return xp;
    }

    function addGoldStar() {
        const stars = getGoldStars() + 1;
        localStorage.setItem('dc_gold_stars', stars);
        updateXpDisplay();
        return stars;
    }

    function markTaskVerified(taskIndex) {
        const verified = getVerifiedTasks();
        if (!verified.includes(taskIndex)) {
            verified.push(taskIndex);
            localStorage.setItem('dc_verified_tasks', JSON.stringify(verified));
        }
    }

    function updateXpDisplay() {
        const xpEl = document.getElementById('statXp');
        const starsEl = document.getElementById('statStars');
        if (xpEl) xpEl.textContent = getXp();
        if (starsEl) starsEl.textContent = getGoldStars();
    }

    /* ══════════════════════════════════════
       TASK LOCKING WITH DUAL-PATH
       ══════════════════════════════════════ */

    function enforceTaskLocking() {
        const taskElements = document.querySelectorAll('.task-step');
        if (taskElements.length === 0) return;

        let currentUnlocked = parseInt(localStorage.getItem('dc_unlocked_tasks')) || 0;
        let currentWeek = parseInt(localStorage.getItem('dc_current_week')) || 1;
        const verifiedTasks = getVerifiedTasks();
        
        if (statCompleted) statCompleted.textContent = currentUnlocked;

        taskElements.forEach((task, index) => {
            task.style.cursor = 'pointer';
            task.style.transition = 'all 0.3s ease';
            task.style.position = 'relative';
            const numBox = task.querySelector('.rm-num');

            // Remove any old action row / badges
            const oldActions = task.querySelector('.task-actions');
            if (oldActions) oldActions.remove();
            const oldBadge = task.querySelector('.task-badge');
            if (oldBadge) oldBadge.remove();

            if (index > currentUnlocked) {
                // LOCKED
                task.style.opacity = '0.3';
                task.style.pointerEvents = 'none';
                if(numBox) numBox.innerText = '🔒';
            } else if (index < currentUnlocked) {
                // COMPLETED
                task.style.opacity = '1';
                task.style.pointerEvents = 'none';

                const isVerified = verifiedTasks.includes(index);

                if (isVerified) {
                    task.style.background = 'rgba(255,215,0,0.06)';
                    task.style.borderColor = 'rgba(255,215,0,0.25)';
                    if(numBox) {
                        numBox.innerText = '⭐';
                        numBox.style.background = 'linear-gradient(135deg, #ffd700, #f0c040)';
                    }
                    // Add verified badge
                    const badge = document.createElement('div');
                    badge.className = 'task-badge task-badge--verified';
                    badge.innerHTML = '⭐ Verified';
                    task.appendChild(badge);
                } else {
                    task.style.background = 'rgba(0, 96, 213, 0.1)';
                    task.style.borderColor = '#0063d5ff';
                    if(numBox) {
                        numBox.innerText = '✓';
                        numBox.style.background = '#00c7d5ff';
                    }
                    // Add completed badge
                    const badge = document.createElement('div');
                    badge.className = 'task-badge task-badge--done';
                    badge.innerHTML = '✓ Done';
                    task.appendChild(badge);
                }
            } else {
                // CURRENT — show the dual-path action buttons
                task.style.opacity = '1';
                task.style.pointerEvents = 'auto';
                task.style.background = 'rgba(255, 255, 255, 0.025)';
                task.style.borderColor = 'rgba(108,99,255,0.2)';
                if(numBox) {
                    numBox.innerText = '☐';
                    numBox.style.background = 'var(--gradient)';
                }

                // Add action row below the task content
                const actions = document.createElement('div');
                actions.className = 'task-actions';
                actions.innerHTML = `
                    <button class="task-btn task-btn--done" data-index="${index}" title="Standard completion: +25 XP">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Mark as Done
                        <span class="task-btn__xp">+25 XP</span>
                    </button>
                    <button class="task-btn task-btn--verify" data-index="${index}" title="Mentor verification: +100 XP + Gold Star">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        Verify with Mentor
                        <span class="task-btn__xp">+100 XP ⭐</span>
                    </button>
                `;
                task.appendChild(actions);

                // Prevent task-level click from bubbling
                task.style.cursor = 'default';
            }
        });

        // Bind action button events
        document.querySelectorAll('.task-btn--done').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                handleStandardComplete(idx, taskElements);
            });
        });

        document.querySelectorAll('.task-btn--verify').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                handleVerifyWithMentor(idx, taskElements);
            });
        });

        // Fallback button for next week
        let currentCount = parseInt(localStorage.getItem('dc_unlocked_tasks')) || 0;
        if (currentCount === taskElements.length && !document.getElementById('nextWeekBtn')) {
            const btnWrap = document.createElement('div');
            btnWrap.style.textAlign = 'center';
            btnWrap.style.marginTop = '30px';
            btnWrap.style.marginBottom = '20px';
            btnWrap.innerHTML = `<button id="nextWeekBtn" style="padding: 12px 24px; font-size: 16px; background: var(--gradient); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; box-shadow: 0 4px 15px rgba(108, 99, 255, 0.4);"> Unlock Level ${currentWeek + 1}</button>`;
            
            document.getElementById('roadmap-container').appendChild(btnWrap);
            
            document.getElementById('nextWeekBtn').addEventListener('click', () => {
                triggerNextWeek(currentWeek + 1);
            });
        }
    }

    /* ── Standard Path: Mark as Done ── */
    function handleStandardComplete(taskIndex, taskElements) {
        const newCount = taskIndex + 1;
        localStorage.setItem('dc_unlocked_tasks', newCount);
        addXp(25);

        window.dispatchEvent(new CustomEvent('updateDashboard'));
        enforceTaskLocking();

        const currentWeek = parseInt(localStorage.getItem('dc_current_week')) || 1;

        // All tasks done: show confetti + level up modal
        if (newCount === taskElements.length) {
            showLevelComplete(currentWeek);
        }
    }

    /* ── Mentor Path: Verify with Mentor ── */
    function handleVerifyWithMentor(taskIndex, taskElements) {
        const taskEl = taskElements[taskIndex];
        const taskText = taskEl.querySelector('.rm-p')?.textContent?.trim() || `Task ${taskIndex + 1}`;
        const career = localStorage.getItem('dc_career') || 'Your Career';

        // Save task context for the verification page
        localStorage.setItem('dc_verify_task_index', taskIndex);
        localStorage.setItem('dc_verify_task_text', taskText);
        localStorage.setItem('dc_verify_career', career);
        localStorage.setItem('dc_verify_total_tasks', taskElements.length);

        // Navigate to verification page
        window.location.href = 'chat.html';
    }

    /* ── Level Complete ── */
    function showLevelComplete(currentWeek) {
        var duration = 3 * 1000;
        var end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#6C63FF', '#3ECFCF'] });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#6C63FF', '#3ECFCF'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());

        setTimeout(() => {
            const modalOverlay = document.getElementById('levelUpModal');
            const modalText = document.getElementById('modalLevelText');
            const confirmBtn = document.getElementById('modalConfirm');
            const cancelBtn = document.getElementById('modalCancel');

            modalText.innerText = `Level ${currentWeek} Complete!`;
            confirmBtn.innerText = `Unlock Level ${currentWeek + 1} `;

            modalOverlay.style.display = 'flex';
            setTimeout(() => modalOverlay.classList.add('show'), 10);

            confirmBtn.onclick = () => {
                modalOverlay.classList.remove('show');
                setTimeout(() => modalOverlay.style.display = 'none', 300);
                triggerNextWeek(currentWeek + 1);
            };

            cancelBtn.onclick = () => {
                modalOverlay.classList.remove('show');
                setTimeout(() => modalOverlay.style.display = 'none', 300);
            };
        }, 1500);
    }

    // The Generator Engine
    async function triggerNextWeek(nextWeekNumber) {
        const baseCareer = localStorage.getItem('dc_career') || 'Your Career';
        document.getElementById('roadmap-container').innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">Generating Level ${nextWeekNumber}... please wait. </div>`;
        
        try {
            const nextLevelCareer = `Level ${nextWeekNumber} of ${baseCareer}`; 
            const res = await fetch('http://127.0.0.1:5000/generate-roadmap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ career: nextLevelCareer })
            });

            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            
            localStorage.setItem('dc_roadmap', data.roadmap || data.response);
            localStorage.setItem('dc_unlocked_tasks', '0');
            localStorage.setItem('dc_current_week', nextWeekNumber); 
            
            window.location.reload();
        } catch (err) {
            alert('Oops! Make sure your Python server is running.');
            window.location.reload();
        }
    }

    /* ── Listen for verification approval from chat page ── */
    window.addEventListener('storage', (e) => {
        if (e.key === 'dc_verification_approved') {
            const taskIndex = parseInt(localStorage.getItem('dc_verify_task_index'));
            if (!isNaN(taskIndex)) {
                markTaskVerified(taskIndex);
                addXp(100);
                addGoldStar();
                const newCount = taskIndex + 1;
                localStorage.setItem('dc_unlocked_tasks', newCount);
                localStorage.removeItem('dc_verification_approved');
                enforceTaskLocking();
            }
        }
    });
});