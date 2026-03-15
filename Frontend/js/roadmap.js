document.addEventListener('DOMContentLoaded', () => {
    // 👤 DYNAMIC NAVBAR LOGIC
    const loggedInUser = localStorage.getItem('userName');
    
    if (loggedInUser) {
        // 1. Change the "Login" link to "Hi, [Name]"
        const loginLinks = document.querySelectorAll('a[href="login.html"]');
        loginLinks.forEach(link => {
            // Extract just their first name
            const firstName = loggedInUser.split(' ')[0]; 
            link.innerHTML = `<span style="color: #3ECFCF; font-weight: 600;">Hi, ${firstName} </span>`;
            link.href = "dashboard.html"; // Clicking their name takes them to the dashboard
        });

        // 2. Turn the "Get Started" button into a "Logout" button
        const ctaButtons = document.querySelectorAll('.nav-cta');
        ctaButtons.forEach(btn => {
            // Style it to look like a secondary 'Logout' button
            btn.textContent = "Logout";
            btn.style.background = "rgba(255, 255, 255, 0.1)";
            btn.style.border = "1px solid rgba(255,255,255,0.2)";
            btn.style.color = "#fff";
            
            // Overwrite any previous click actions
            btn.onclick = (e) => {
                e.preventDefault();
                
                // Wipe the memory clean!
                localStorage.clear(); 
                
                // Refresh the page so the navbar goes back to normal
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

    function enforceTaskLocking() {
        const taskElements = document.querySelectorAll('.task-step');
        if (taskElements.length === 0) return;

        let currentUnlocked = parseInt(localStorage.getItem('dc_unlocked_tasks')) || 0;
        let currentWeek = parseInt(localStorage.getItem('dc_current_week')) || 1; // Get current week
        
        if (statCompleted) statCompleted.textContent = currentUnlocked;

        taskElements.forEach((task, index) => {
            task.style.cursor = 'pointer';
            task.style.transition = 'all 0.3s ease';
            const numBox = task.querySelector('.rm-num');

            if (index > currentUnlocked) {
                task.style.opacity = '0.3';
                task.style.pointerEvents = 'none';
                if(numBox) numBox.innerText = '🔒';
            } else if (index < currentUnlocked) {
                task.style.opacity = '1';
                task.style.background = 'rgba(0, 96, 213, 0.1)';
                task.style.borderColor = '#0063d5ff';
                task.style.pointerEvents = 'none'; 
                if(numBox) {
                    numBox.innerText = '✓';
                    numBox.style.background = '#00c7d5ff';
                }
            } else {
                task.style.opacity = '1';
                task.style.pointerEvents = 'auto';
                task.style.background = 'rgba(255, 255, 255, 0.025)'; 
                task.style.borderColor = 'transparent';
                if(numBox) {
                    numBox.innerText = '☐';
                    numBox.style.background = 'var(--gradient)';
                }
            }

            if (!task.dataset.listenerAdded) {
                task.dataset.listenerAdded = 'true';
                
                task.addEventListener('click', () => {
                    let newCount = index + 1;
                    localStorage.setItem('dc_unlocked_tasks', newCount);
                    
                    window.dispatchEvent(new CustomEvent('updateDashboard'));
                    
                    enforceTaskLocking(); 

                    if (newCount === taskElements.length) {
                        var duration = 3 * 1000;
                        var end = Date.now() + duration;
                        (function frame() {
                            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#6C63FF', '#3ECFCF'] });
                            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#6C63FF', '#3ECFCF'] });
                            if (Date.now() < end) requestAnimationFrame(frame);
                        }());

                        setTimeout(() => {
                            if(confirm(`🎉 EXCELLENT! Level ${currentWeek} Complete!\n\nReady to unlock Level ${currentWeek + 1}?`)) {
                                triggerNextWeek(currentWeek + 1);
                            }
                        }, 1500);
                    }
                });
            }
        });

        // The Fallback Button (Appears if they cancel the alert)
        if (currentUnlocked === taskElements.length && !document.getElementById('nextWeekBtn')) {
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
});