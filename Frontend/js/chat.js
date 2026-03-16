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
            
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.clear(); // Wipe memory
                window.location.href = "index.html"; // Reload to logged-out state
            });
        });
    }
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');
    const chatWelcome = document.getElementById('chatWelcome');
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatForm || !chatInput || !chatHistory) return;

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        if (chatWelcome && !chatWelcome.hidden) {
            chatWelcome.style.display = 'none';
        }

        addMessage(message, 'user');
        chatInput.value = '';

        const typingEl = showTyping();

        try {
           const res = await fetch('http://127.0.0.1:5000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            typingEl.remove();

            if (!res.ok) throw new Error('API error');

            const data = await res.json();
            addMessage(data.response || data.message || 'No response received.', 'ai');
        } catch (err) {
            typingEl.remove();
            addMessage('Backend server is offline. Please connect the backend to chat.', 'ai');
        }
    });

    function addMessage(text, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg chat-msg--${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'chat-msg__avatar';
        avatar.textContent = type === 'user' ? 'Y' : 'AI';

        const bubble = document.createElement('div');
        bubble.className = 'chat-msg__bubble';

        const content = document.createElement('div');
        content.textContent = text;

        const time = document.createElement('div');
        time.className = 'chat-msg__time';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        bubble.appendChild(content);
        bubble.appendChild(time);
        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        chatHistory.appendChild(msgDiv);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-typing';

        const avatar = document.createElement('div');
        avatar.className = 'chat-msg__avatar';
        avatar.style.background = 'linear-gradient(135deg, #6C63FF, #3ECFCF)';
        avatar.style.color = '#fff';
        avatar.textContent = 'AI';

        const dots = document.createElement('div');
        dots.className = 'chat-typing__dots';
        dots.innerHTML = '<span></span><span></span><span></span>';

        typingDiv.appendChild(avatar);
        typingDiv.appendChild(dots);
        chatHistory.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return typingDiv;
    }
});