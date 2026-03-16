/**
 * DreamChase — Live Mentor Verification
 * Frontend-only: state machine, media capture, WebSocket, reward animation
 */
document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════
     1. AUTH / NAV (preserved)
     ══════════════════════════════════════ */
  const loggedInUser = localStorage.getItem('userName');
  if (loggedInUser) {
    document.querySelectorAll('a[href="login.html"]').forEach(link => {
      const firstName = loggedInUser.split(' ')[0];
      link.innerHTML = `<span style="color:#3ECFCF;font-weight:600">Hi, ${firstName}</span>`;
      link.href = 'dashboard.html';
    });
    document.querySelectorAll('.nav-cta').forEach(btn => {
      btn.textContent = 'Logout';
      btn.style.background = 'rgba(255,255,255,0.1)';
      btn.style.border = '1px solid rgba(255,255,255,0.2)';
      btn.style.color = '#fff';
      const nb = btn.cloneNode(true);
      btn.parentNode.replaceChild(nb, btn);
      nb.addEventListener('click', e => { e.preventDefault(); localStorage.clear(); location.href = 'index.html'; });
    });
  }

  /* ══════════════════════════════════════
     2. DOM REFERENCES
     ══════════════════════════════════════ */
  const $ = id => document.getElementById(id);

  const app          = $('vfApp');
  const statusText   = $('statusText');
  const promptText   = $('promptText');
  const sessionBtn   = $('sessionBtn');
  const sessionLabel = $('sessionLabel');
  const cameraBtn    = $('cameraBtn');
  const screenBtn    = $('screenBtn');
  const verifyBtn    = $('verifyBtn');
  const muteBtn      = $('muteBtn');
  const stopProofBtn = $('stopProofBtn');
  const proofVideo   = $('proofVideo');
  const proofEmpty   = $('proofEmpty');
  const proofBadge   = $('proofBadge');
  const mentorBody   = $('mentorBody');
  const resultBanner = $('resultBanner');
  const resultIcon   = $('resultIcon');
  const resultText   = $('resultText');
  const retryBtn     = $('retryBtn');
  const rewardOverlay= $('rewardOverlay');
  const vfError      = $('vfError');
  const errorText    = $('errorText');

  // Checklist items
  const checkProof  = $('checkProof');
  const checkQ1     = $('checkQ1');
  const checkQ2     = $('checkQ2');
  const checkResult = $('checkResult');

  if (!app || !sessionBtn) return;

  /* ── Task context from dashboard ── */
  const taskIndex    = localStorage.getItem('dc_verify_task_index');
  const taskText     = localStorage.getItem('dc_verify_task_text');
  const taskCareer   = localStorage.getItem('dc_verify_career');
  const hasTaskCtx   = taskIndex !== null && taskText;

  // Show task banner if navigated from dashboard
  if (hasTaskCtx) {
    promptText.textContent = `Verify: ${taskText}`;
    const taskBanner = document.createElement('div');
    taskBanner.className = 'vf-task-banner';
    taskBanner.innerHTML = `
      <span class="vf-task-banner__label">Verifying Task ${parseInt(taskIndex) + 1}</span>
      <span class="vf-task-banner__text">${taskText}</span>
      <a href="dashboard.html" class="vf-task-banner__back">← Back to Dashboard</a>
    `;
    app.querySelector('.vf-col--left')?.prepend(taskBanner);
  }

  /* ══════════════════════════════════════
     3. STATE MANAGEMENT
     ══════════════════════════════════════ */
  const STATES = {
    IDLE:            'idle',
    CONNECTING:      'connecting',
    LIVE_READY:      'live_ready',
    CAMERA_ON:       'camera_on',
    SCREEN_SHARING:  'screen_sharing',
    VERIFYING_PROOF: 'verifying_proof',
    QUESTION_1:      'question_1',
    QUESTION_2:      'question_2',
    APPROVED:        'approved',
    REJECTED:        'rejected',
    SESSION_ENDED:   'session_ended'
  };

  const STATUS_LABELS = {
    idle:            'Idle',
    connecting:      'Connecting',
    live_ready:      'Live Ready',
    camera_on:       'Camera On',
    screen_sharing:  'Screen Sharing',
    verifying_proof: 'Verifying Proof',
    question_1:      'Question 1',
    question_2:      'Question 2',
    approved:        'Approved ✓',
    rejected:        'Rejected ✗',
    session_ended:   'Session Ended'
  };

  let currentState   = STATES.IDLE;
  let proofSource    = null; // 'camera' | 'screen' | null
  let mediaStream    = null;
  let audioStream    = null;
  let isMuted        = false;
  let ws             = null;

  function setState(state) {
    currentState = state;
    app.setAttribute('data-state', state);
    statusText.textContent = STATUS_LABELS[state] || state;
    updateControlStates();
  }

  function updateControlStates() {
    const s = currentState;
    const sessionActive = ![STATES.IDLE, STATES.SESSION_ENDED].includes(s);

    // Session button
    if (sessionActive) {
      sessionLabel.textContent = 'End Session';
      sessionBtn.querySelector('.icon-play').style.display = 'none';
      sessionBtn.querySelector('.icon-stop').style.display = 'block';
    } else {
      sessionLabel.textContent = 'Start Session';
      sessionBtn.querySelector('.icon-play').style.display = 'block';
      sessionBtn.querySelector('.icon-stop').style.display = 'none';
    }

    // Camera / Screen / Verify / Mute enabled when live
    const canCapture = [STATES.LIVE_READY, STATES.CAMERA_ON, STATES.SCREEN_SHARING].includes(s);
    cameraBtn.disabled  = !canCapture;
    screenBtn.disabled  = !canCapture;
    verifyBtn.disabled  = !(proofSource && canCapture);
    muteBtn.disabled    = !sessionActive;

    // Active states for camera/screen buttons
    cameraBtn.classList.toggle('active', proofSource === 'camera');
    screenBtn.classList.toggle('active', proofSource === 'screen');
  }

  /* ══════════════════════════════════════
     4. MEDIA CAPTURE HELPERS
     ══════════════════════════════════════ */

  async function startCamera() {
    await stopProof();
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      proofVideo.srcObject = mediaStream;
      proofVideo.classList.add('visible');
      proofEmpty.classList.add('hidden');
      stopProofBtn.style.display = 'flex';
      proofSource = 'camera';
      proofBadge.textContent = 'Camera Active';
      proofBadge.classList.add('active');
      setState(STATES.CAMERA_ON);
    } catch (e) {
      showError('Camera access denied. Please allow camera permission.');
      console.error('Camera error:', e);
    }
  }

  async function startScreenShare() {
    await stopProof();
    try {
      mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      proofVideo.srcObject = mediaStream;
      proofVideo.classList.add('visible');
      proofEmpty.classList.add('hidden');
      stopProofBtn.style.display = 'flex';
      proofSource = 'screen';
      proofBadge.textContent = 'Screen Share Active';
      proofBadge.classList.add('active');
      setState(STATES.SCREEN_SHARING);

      // Handle user clicking browser's "Stop sharing"
      mediaStream.getVideoTracks()[0].onended = () => {
        stopProof();
        if (currentState !== STATES.IDLE && currentState !== STATES.SESSION_ENDED) {
          setState(STATES.LIVE_READY);
        }
      };
    } catch (e) {
      if (e.name !== 'AbortError') {
        showError('Screen share cancelled or denied.');
      }
      console.error('Screen share error:', e);
    }
  }

  async function stopProof() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    proofVideo.srcObject = null;
    proofVideo.classList.remove('visible');
    proofEmpty.classList.remove('hidden');
    stopProofBtn.style.display = 'none';
    proofSource = null;
    proofBadge.textContent = 'No Source';
    proofBadge.classList.remove('active');
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    }
    muteBtn.classList.toggle('muted', isMuted);
    muteBtn.querySelector('.icon-mic').style.display = isMuted ? 'none' : 'block';
    muteBtn.querySelector('.icon-mic-off').style.display = isMuted ? 'block' : 'none';
  }

  /* ══════════════════════════════════════
     5. WEBSOCKET HANDLERS
     ══════════════════════════════════════ */

  function connectWebSocket() {
    setState(STATES.CONNECTING);
    try {
      ws = new WebSocket('ws://127.0.0.1:5000/ws/verify');

      ws.onopen = () => {
        setState(STATES.LIVE_READY);
        addTranscript('system', 'Connected to live session.');
        promptText.textContent = 'Session live. Start camera or share screen to show your work.';
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WS error:', e);
        showError('Connection error. Check if backend is running.');
      };

      ws.onclose = () => {
        if (currentState !== STATES.SESSION_ENDED && currentState !== STATES.IDLE) {
          addTranscript('system', 'Connection lost.');
          showError('WebSocket disconnected.');
        }
      };
    } catch (e) {
      showError('Could not connect to WebSocket server.');
      setState(STATES.IDLE);
    }
  }

  function handleServerMessage(msg) {
    switch (msg.type) {

      case 'session_state':
        if (msg.value === 'connecting') setState(STATES.CONNECTING);
        else if (msg.value === 'verifying') setState(STATES.VERIFYING_PROOF);
        else if (msg.value === 'live_ready') setState(STATES.LIVE_READY);
        break;

      case 'mentor_prompt':
        promptText.textContent = msg.text;
        addTranscript('mentor', msg.text);
        markCheck(checkProof);
        break;

      case 'verification_question':
        if (msg.index === 1) {
          setState(STATES.QUESTION_1);
          markCheck(checkQ1);
        } else if (msg.index === 2) {
          setState(STATES.QUESTION_2);
          markCheck(checkQ2);
        }
        promptText.textContent = msg.text;
        addTranscript('question', `Q${msg.index}: ${msg.text}`);
        break;

      case 'user_transcript':
        addTranscript('user', msg.text);
        break;

      case 'assistant_transcript':
        addTranscript('mentor', msg.text);
        promptText.textContent = msg.text;
        break;

      case 'verification_result':
        markCheck(checkResult);
        if (msg.status === 'approved') {
          setState(STATES.APPROVED);
          showResultBanner('approved', msg.message || 'Task verified!');
          triggerRewardAnimation();
        } else {
          setState(STATES.REJECTED);
          showResultBanner('rejected', msg.message || 'Needs retry.');
        }
        break;

      case 'db_update_success':
        addTranscript('system', `Task ${msg.task_id} updated in database.`);
        break;

      case 'error':
        showError(msg.message || 'Server error occurred.');
        addTranscript('system', `Error: ${msg.message}`);
        break;

      default:
        console.log('Unknown message type:', msg.type);
    }
  }

  function sendWsMessage(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      showError('Not connected to server.');
    }
  }

  /* ══════════════════════════════════════
     6. UI RENDERING HELPERS
     ══════════════════════════════════════ */

  function addTranscript(type, text) {
    // Remove placeholder
    const placeholder = $('transcriptPlaceholder');
    if (placeholder) placeholder.remove();

    const entry = document.createElement('div');
    entry.className = `vf-transcript vf-transcript--${type}`;

    const labels = { system: 'System', mentor: 'AI Mentor', user: 'You', question: 'Question' };

    entry.innerHTML = `
      <span class="vf-transcript__label">${labels[type] || type}</span>
      <span class="vf-transcript__text">${escapeHtml(text)}</span>
    `;
    mentorBody.appendChild(entry);
    mentorBody.scrollTop = mentorBody.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function markCheck(el) {
    if (el) {
      el.setAttribute('data-done', 'true');
      el.querySelector('.vf-checklist__icon').textContent = '✓';
    }
  }

  function resetChecklist() {
    [checkProof, checkQ1, checkQ2, checkResult].forEach(el => {
      if (el) {
        el.setAttribute('data-done', 'false');
        el.querySelector('.vf-checklist__icon').textContent = '○';
      }
    });
  }

  function showResultBanner(status, message) {
    resultBanner.style.display = 'flex';
    resultBanner.className = `vf-result-banner vf-result-banner--${status}`;
    resultIcon.textContent = status === 'approved' ? '⭐' : '⚠️';
    resultText.textContent = message;
    retryBtn.style.display = status === 'rejected' ? 'inline-block' : 'none';
  }

  function hideResultBanner() {
    resultBanner.style.display = 'none';
  }

  function showError(msg) {
    errorText.textContent = msg;
    vfError.classList.add('show');
    setTimeout(() => vfError.classList.remove('show'), 4000);
  }

  /* ══════════════════════════════════════
     7. REWARD ANIMATION
     ══════════════════════════════════════ */

  function triggerRewardAnimation() {
    rewardOverlay.classList.add('show');

    // Signal dashboard: task approved
    if (hasTaskCtx) {
      // Store verification + update tasks
      const verified = JSON.parse(localStorage.getItem('dc_verified_tasks') || '[]');
      const idx = parseInt(taskIndex);
      if (!verified.includes(idx)) verified.push(idx);
      localStorage.setItem('dc_verified_tasks', JSON.stringify(verified));
      // Add XP + Gold Star
      const xp = (parseInt(localStorage.getItem('dc_xp')) || 0) + 100;
      const stars = (parseInt(localStorage.getItem('dc_gold_stars')) || 0) + 1;
      localStorage.setItem('dc_xp', xp);
      localStorage.setItem('dc_gold_stars', stars);
      // Unlock next task
      const newCount = idx + 1;
      const current = parseInt(localStorage.getItem('dc_unlocked_tasks')) || 0;
      if (newCount > current) localStorage.setItem('dc_unlocked_tasks', newCount);
      // Signal cross-tab
      localStorage.setItem('dc_verification_approved', Date.now());
      // Clean up task context
      localStorage.removeItem('dc_verify_task_index');
      localStorage.removeItem('dc_verify_task_text');
      localStorage.removeItem('dc_verify_career');
      localStorage.removeItem('dc_verify_total_tasks');
    }

    // Spawn floating stars
    const starCount = 20;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('span');
      star.className = 'vf-reward-star';
      star.textContent = ['⭐', '✨', '🌟', '💫'][Math.floor(Math.random() * 4)];
      star.style.left = Math.random() * 100 + '%';
      star.style.top = (40 + Math.random() * 40) + '%';
      star.style.animationDelay = (Math.random() * 1.5) + 's';
      star.style.fontSize = (14 + Math.random() * 16) + 'px';
      rewardOverlay.appendChild(star);
    }

    // Auto-dismiss after 4s then redirect if task context
    setTimeout(() => {
      rewardOverlay.classList.remove('show');
      setTimeout(() => {
        rewardOverlay.querySelectorAll('.vf-reward-star').forEach(s => s.remove());
        if (hasTaskCtx) {
          // Redirect back to dashboard after a beat
          setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
        }
      }, 600);
    }, 4000);
  }

  /* ══════════════════════════════════════
     8. SESSION CONTROLS
     ══════════════════════════════════════ */

  function startSession() {
    resetChecklist();
    hideResultBanner();
    mentorBody.innerHTML = '';
    connectWebSocket();
  }

  function endSession() {
    if (ws) { try { ws.close(); } catch(e) {} ws = null; }
    stopProof();
    isMuted = false;
    muteBtn.classList.remove('muted');
    muteBtn.querySelector('.icon-mic').style.display = 'block';
    muteBtn.querySelector('.icon-mic-off').style.display = 'none';
    setState(STATES.SESSION_ENDED);
    promptText.textContent = 'Session ended. Start a new session to verify again.';
    addTranscript('system', 'Session ended.');
  }

  function startVerification() {
    if (!proofSource) {
      showError('Please start camera or share screen first.');
      return;
    }
    setState(STATES.VERIFYING_PROOF);
    promptText.textContent = 'Analyzing your proof…';
    addTranscript('system', `Verification started with ${proofSource === 'camera' ? 'Camera' : 'Screen Share'}.`);
    const wsMsg = { type: 'start_verification', source: proofSource };
    if (hasTaskCtx) {
      wsMsg.task_index = parseInt(taskIndex);
      wsMsg.task_text = taskText;
      wsMsg.career = taskCareer;
    }
    sendWsMessage(wsMsg);
  }

  /* ══════════════════════════════════════
     9. EVENT LISTENERS
     ══════════════════════════════════════ */

  sessionBtn.addEventListener('click', () => {
    if (currentState === STATES.IDLE || currentState === STATES.SESSION_ENDED) {
      startSession();
    } else {
      endSession();
    }
  });

  cameraBtn.addEventListener('click', () => {
    if (proofSource === 'camera') {
      stopProof();
      setState(STATES.LIVE_READY);
    } else {
      startCamera();
    }
  });

  screenBtn.addEventListener('click', () => {
    if (proofSource === 'screen') {
      stopProof();
      setState(STATES.LIVE_READY);
    } else {
      startScreenShare();
    }
  });

  verifyBtn.addEventListener('click', startVerification);

  muteBtn.addEventListener('click', toggleMute);

  stopProofBtn.addEventListener('click', () => {
    stopProof();
    if (currentState !== STATES.IDLE && currentState !== STATES.SESSION_ENDED) {
      setState(STATES.LIVE_READY);
    }
  });

  retryBtn.addEventListener('click', () => {
    hideResultBanner();
    resetChecklist();
    if (proofSource) {
      startVerification();
    } else {
      setState(STATES.LIVE_READY);
      promptText.textContent = 'Start camera or share screen to retry.';
    }
  });

  // Clicking reward overlay dismisses it
  rewardOverlay.addEventListener('click', () => {
    rewardOverlay.classList.remove('show');
    setTimeout(() => {
      rewardOverlay.querySelectorAll('.vf-reward-star').forEach(s => s.remove());
    }, 400);
  });

});