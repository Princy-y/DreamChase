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

  const app = $('vfApp');
  const statusText = $('statusText');
  const promptText = $('promptText');
  const sessionBtn = $('sessionBtn');
  const sessionLabel = $('sessionLabel');
  const cameraBtn = $('cameraBtn');
  const screenBtn = $('screenBtn');
  const verifyBtn = $('verifyBtn');
  const muteBtn = $('muteBtn');
  const stopProofBtn = $('stopProofBtn');
  const proofVideo = $('proofVideo');
  const proofEmpty = $('proofEmpty');
  const proofBadge = $('proofBadge');
  const mentorBody = $('mentorBody');
  const resultBanner = $('resultBanner');
  const resultIcon = $('resultIcon');
  const resultText = $('resultText');
  const retryBtn = $('retryBtn');
  const rewardOverlay = $('rewardOverlay');
  const vfError = $('vfError');
  const errorText = $('errorText');

  // Checklist items
  const checkProof = $('checkProof');
  const checkQ1 = $('checkQ1');
  const checkQ2 = $('checkQ2');
  const checkResult = $('checkResult');

  // Input Box for answers
  const answerWrap = $('answerWrap');
  const answerInput = $('answerInput');
  const sendAnswerBtn = $('sendAnswerBtn');
  const vfOrb = $('vfOrb');
  const orbGlow = $('orbGlow');

  if (!app || !sessionBtn) return;

  /* ── Task context from dashboard ── */
  let taskIndex = localStorage.getItem('dc_verify_task_index');
  let taskText = localStorage.getItem('dc_verify_task_text');
  let taskCareer = localStorage.getItem('dc_verify_career');
  let hasTaskCtx = taskIndex !== null && taskText;

  if (!hasTaskCtx) {
    const rawRoadmap = localStorage.getItem('dc_roadmap');
    if (rawRoadmap) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawRoadmap;
      const steps = tempDiv.querySelectorAll('.rm-step');
      if (steps.length > 0) {
        let unlocked = parseInt(localStorage.getItem('dc_unlocked_tasks')) || 0;
        if (unlocked >= steps.length) unlocked = steps.length - 1;
        const taskEl = steps[unlocked];

        taskText = (taskEl.querySelector('.rm-p') || taskEl).textContent?.trim() || `Task ${unlocked + 1}`;
        taskIndex = unlocked;
        taskCareer = localStorage.getItem('dc_career') || 'Your Career';
        hasTaskCtx = true;
      }
    }
  }

  // Show task banner if navigated from dashboard or retrieved from memory
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
  } else {
    // Disable start button if NO roadmap exists
    if (sessionBtn) {
      sessionBtn.disabled = true;
      sessionBtn.style.opacity = '0.5';
      promptText.textContent = "No tasks available. Please generate a roadmap in the Dashboard first.";
    }
  }

  /* ══════════════════════════════════════
     3. STATE MANAGEMENT
     ══════════════════════════════════════ */
  const STATES = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    LIVE_READY: 'live_ready',
    CAMERA_ON: 'camera_on',
    SCREEN_SHARING: 'screen_sharing',
    VERIFYING_PROOF: 'verifying_proof',
    QUESTION_1: 'question_1',
    QUESTION_2: 'question_2',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SESSION_ENDED: 'session_ended'
  };

  const STATUS_LABELS = {
    idle: 'Idle',
    connecting: 'Connecting',
    live_ready: 'Live Ready',
    camera_on: 'Camera On',
    screen_sharing: 'Screen Sharing',
    verifying_proof: 'Verifying Proof',
    question_1: 'Question 1',
    question_2: 'Question 2',
    approved: 'Approved ✓',
    rejected: 'Rejected ✗',
    session_ended: 'Session Ended'
  };

  let currentState = STATES.IDLE;
  let proofSource = null; // 'camera' | 'screen' | null
  let mediaStream = null;
  let audioStream = null;
  let isMuted = false;
  let ws = null;
  let currentQuestionIndex = 0;

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
    cameraBtn.disabled = !canCapture;
    screenBtn.disabled = !canCapture;
    verifyBtn.disabled = !(proofSource && canCapture);
    muteBtn.disabled = !sessionActive;

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
    stopStreaming();
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
     5. TEXT-TO-SPEECH (BEAUTIFUL VOICE)
     ══════════════════════════════════════ */
  let currentUtterance = null;

  function speakText(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop current speech

      const utterance = new SpeechSynthesisUtterance(text);

      const voices = window.speechSynthesis.getVoices();

      // Ranking high-quality voices across different browsers (Edge Natural > Google Premium > Apple Premium)
      const voicePreferences = [
        "Microsoft Aria Online",     // Edge Windows (Natural)
        "Microsoft Jenny Online",    // Edge Windows (Natural)
        "Microsoft Sonia Online",    // Edge UK (Natural)
        "Google UK English Female",  // Chrome High Quality
        "Google US English",         // Chrome Standard
        "Samantha",                  // Mac Premium
        "Tessa",                     // Mac Premium
        "Daniel"                     // Mac UK
      ];

      let selectedVoice = null;
      for (const pref of voicePreferences) {
        selectedVoice = voices.find(v => v.name.includes(pref));
        if (selectedVoice) break;
      }

      // Fallback to any english voice if none of the premiums are found
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Female") || v.name.includes("Google")));
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith("en"));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Pulse animation when speaking
      utterance.onstart = () => {
        if (vfOrb) vfOrb.classList.add('pulsing');
        if (orbGlow) orbGlow.classList.add('pulsing');
      };
      utterance.onend = () => {
        if (vfOrb) vfOrb.classList.remove('pulsing');
        if (orbGlow) orbGlow.classList.remove('pulsing');
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }

  // Load voices proactively on startup
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
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
        speakText(msg.text);
        markCheck(checkProof);
        break;

      case 'verification_question':
        if (msg.index === 1) {
          setState(STATES.QUESTION_1);
          currentQuestionIndex = 1;
        } else if (msg.index === 2) {
          setState(STATES.QUESTION_2);
          currentQuestionIndex = 2;
        }

        let fullSpeech = msg.text;

        if (msg.feedback) {
          addTranscript('mentor', msg.feedback);
          fullSpeech = msg.feedback + " " + msg.text;
        }

        addTranscript('question', `Q${msg.index}: ${msg.text}`);
        promptText.textContent = msg.text;
        speakText(fullSpeech);

        // Show answer box!
        if (answerWrap && answerInput) {
          answerWrap.style.display = 'flex';
          answerInput.focus();
        }
        break;

      case 'user_transcript':
        addTranscript('user', msg.text);
        break;

      case 'assistant_transcript':
        addTranscript('mentor', msg.text);
        promptText.textContent = msg.text;
        break;

      case 'verification_result':
        // Instantly shut off any ongoing voice
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        if (vfOrb) vfOrb.classList.remove('pulsing');
        if (orbGlow) orbGlow.classList.remove('pulsing');

        markCheck(checkResult);
        if (answerWrap) answerWrap.style.display = 'none';

        if (msg.status === 'approved') {
          setState(STATES.APPROVED);
          showResultBanner('approved', msg.message || 'Task verified!');

          // Play a brief success message, but don't read long paragraphs
          speakText("Verification complete. Excellent work!");
          triggerRewardAnimation();
        } else {
          setState(STATES.REJECTED);
          showResultBanner('rejected', msg.message || 'Needs retry.');
          speakText(msg.message || 'Please retry');
        }
        break;

      case 'db_update_success':
        addTranscript('system', `Task ${msg.task_id} updated in database.`);
        break;

      case 'error':
        showError(msg.message || 'Server error occurred.');
        addTranscript('system', `Error: ${msg.message}`);
        break;

      case 'assistant_audio':
        playAudioBuffer(msg.data);
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
    if (ws) { try { ws.close(); } catch (e) { } ws = null; }
    stopProof();
    isMuted = false;
    muteBtn.classList.remove('muted');
    muteBtn.querySelector('.icon-mic').style.display = 'block';
    muteBtn.querySelector('.icon-mic-off').style.display = 'none';

    if (answerWrap) answerWrap.style.display = 'none';
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (vfOrb) vfOrb.classList.remove('pulsing');
    if (orbGlow) orbGlow.classList.remove('pulsing');

    setState(STATES.SESSION_ENDED);
    promptText.textContent = 'Session ended. Start a new session to verify again.';
    addTranscript('system', 'Session ended.');
    stopStreaming();
  }

  async function startVerification() {
    // 1. If they didn't pick camera/screen, just grab the microphone!
    if (!mediaStream) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        proofSource = 'audio_only';
        proofBadge.textContent = 'Audio Only Active';
        proofBadge.classList.add('active');
      } catch (e) {
        showError('Microphone access is required to talk to the AI.');
        return;
      }
    }

    setState(STATES.VERIFYING_PROOF);
    promptText.textContent = 'Voice verification started! Listen for the question...';
    addTranscript('system', `Verification started with ${proofSource}.`);

    // Capture a frame immediately to send with the start_verification request
    let frameDataUrl = null;
    if (proofVideo.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx2d = canvas.getContext('2d');
      ctx2d.drawImage(proofVideo, 0, 0, canvas.width, canvas.height);
      frameDataUrl = canvas.toDataURL('image/jpeg', 0.6);
    }

    const wsMsg = { type: 'start_verification', source: proofSource, frame: frameDataUrl };
    if (hasTaskCtx) {
      wsMsg.task_index = parseInt(taskIndex);
      wsMsg.task_text = taskText;
      wsMsg.career = taskCareer;
    }
    sendWsMessage(wsMsg);

    startStreamingToGemini();
  }

  let streamInterval;
  let audioProcessor;
  let audioCtx;

  // This takes the camera/mic and streams it to your Python backend
  function startStreamingToGemini() {
    if (!mediaStream || !ws || ws.readyState !== WebSocket.OPEN) return;

    // 1. Stream Video Frames (1 frame per second)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    streamInterval = setInterval(() => {
      if (proofVideo.videoWidth > 0 && currentState === 'verifying_proof') {
        canvas.width = 640; // Resize to save bandwidth
        canvas.height = 480;
        ctx.drawImage(proofVideo, 0, 0, canvas.width, canvas.height);
        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.5);

        sendWsMessage({
          type: 'proof_frame',
          frame: frameDataUrl
        });
      }
    }, 1000);

    // 2. Stream Audio (Must be 16kHz PCM for Gemini)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const source = audioCtx.createMediaStreamSource(mediaStream);
    audioProcessor = audioCtx.createScriptProcessor(4096, 1, 1);

    audioProcessor.onaudioprocess = (e) => {
      if (isMuted || currentState !== 'verifying_proof') return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      }

      // Convert to Base64
      let binary = '';
      const bytes = new Uint8Array(pcmData.buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      sendWsMessage({
        realtimeInput: {
          mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: btoa(binary) }]
        }
      });
    };

    source.connect(audioProcessor);
    audioProcessor.connect(audioCtx.destination);
  }

  // Clean up when session ends
  function stopStreaming() {
    clearInterval(streamInterval);
    if (audioProcessor) audioProcessor.disconnect();
    if (audioCtx) audioCtx.close();

  }

  /* ══════════════════════════════════════
     10. AUDIO PLAYBACK (Gemini's Voice)
     ══════════════════════════════════════ */
  let playbackCtx;
  let nextStartTime = 0;

  function playAudioBuffer(base64Data) {
    if (!playbackCtx) {
      // Gemini Live outputs at 24kHz
      playbackCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      nextStartTime = playbackCtx.currentTime;
    }

    // Convert Base64 back to raw binary buffer
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    playbackCtx.decodeAudioData(bytes.buffer, (buffer) => {
      const source = playbackCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(playbackCtx.destination);

      // Schedule playback to prevent clicking/gaps
      const startTime = Math.max(nextStartTime, playbackCtx.currentTime);
      source.start(startTime);
      nextStartTime = startTime + buffer.duration;
    }, (err) => {
      console.error("Error decoding audio data", err);
    });
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

  // Send textual answer
  function sendUserAnswer() {
    if (!answerInput) return;
    const text = answerInput.value.trim();
    if (text === '') return;

    // Mark checklist ONLY when answered
    if (currentQuestionIndex === 1) markCheck(checkQ1);
    else if (currentQuestionIndex === 2) markCheck(checkQ2);

    // Hide input box until next prompt
    if (answerWrap) answerWrap.style.display = 'none';
    answerInput.value = '';

    // Stop local TTS
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    // Pulse to show listening
    if (vfOrb) vfOrb.classList.add('pulsing');
    if (orbGlow) orbGlow.classList.add('pulsing');

    sendWsMessage({ type: 'user_reply', text: text });
  }

  if (sendAnswerBtn) {
    sendAnswerBtn.addEventListener('click', sendUserAnswer);
  }
  if (answerInput) {
    answerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendUserAnswer();
    });
  }

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