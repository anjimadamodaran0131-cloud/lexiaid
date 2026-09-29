// ─── CSRF Token (needed for Django POST requests) ─────
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
const csrftoken = getCookie('csrftoken');

// ─── Toast Notification ───────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = '', 3000);
}

// ─── Avatar Dropdown ──────────────────────────────────
function toggleDropdown() {
  const dd = document.getElementById('dropdown');
  if (dd) dd.classList.toggle('open');
}


function toggleSummary() {
  tcState.summarize = !tcState.summarize;
  const t = document.getElementById('summary-toggle');
  if (!t) return;
  t.classList.toggle('on', tcState.summarize);
  t.classList.toggle('off', !tcState.summarize);
}


document.addEventListener('click', function(e) {
  const dd = document.getElementById('dropdown');
  const btn = document.getElementById('avatar-btn');
  if (dd && btn && !dd.contains(e.target) && e.target !== btn) {
    dd.classList.remove('open');
  }
});

// ─── Password Toggle ──────────────────────────────────
function togglePw(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ─── Add Points (API call to Django) ─────────────────
async function addPoints(amount = 5) {
  try {
    const res = await fetch('/api/add-points/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken,
      },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (data.success) {
      // Update navbar badges
      const ptsEl = document.getElementById('navbar-pts');
      const lvlEl = document.getElementById('navbar-level');
      if (ptsEl) ptsEl.textContent = data.points;
      if (lvlEl) lvlEl.textContent = data.level;
    }
  } catch (err) {
    console.error('Failed to add points:', err);
  }
}

// ─── Chip Selector Helper ─────────────────────────────
function selectChip(groupId, value) {
  document.querySelectorAll('#' + groupId + ' .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.val === value);
  });
}

// ─── TEXT CONVERTER ───────────────────────────────────
const FONT_MAP = {
  opendyslexic: "'OpenDyslexic', sans-serif",
  sylexiad: "'Sylexiad', sans-serif",
  courier: "'Courier New', Courier, monospace",
  verdana: "Verdana, Geneva, sans-serif",
};
let tcState = {
  simplify: true,
  summarize: true,
  keywords: [],
  font: 'opendyslexic',
  fontSize: 18,
  lineSpacing: 1.8,
  letterSpacing: 0.05,
  bgColor: 'hsl(40,60%,95%)',
  converted: '',
  sentences: [],
  speaking: false,
  highlightIdx: -1,
};

function tcTab(tab) {
  const uploadArea = document.getElementById('tc-upload-area');
  const typeArea = document.getElementById('tc-type-area');
  const tabUpload = document.getElementById('tc-tab-upload');
  const tabType = document.getElementById('tc-tab-type');
  if (!uploadArea) return;

  if (tab === 'upload') {
    uploadArea.style.display = 'block';
    typeArea.style.display = 'none';
    tabUpload.classList.add('active');
    tabType.classList.remove('active');
  } else {
    uploadArea.style.display = 'none';
    typeArea.style.display = 'block';
    tabUpload.classList.remove('active');
    tabType.classList.add('active');
  }
}

function toggleSimplify() {
  tcState.simplify = !tcState.simplify;
  const t = document.getElementById('simplify-toggle');
  if (!t) return;
  t.classList.toggle('on', tcState.simplify);
  t.classList.toggle('off', !tcState.simplify);
}

function tcSelectFont(chip) {
  document.querySelectorAll('#tc-font-chips .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  tcState.font = chip.dataset.val;
  applyTcPreview();
}

function tcRange(inp, valId, suffix, decimals) {
  const v = Number(inp.value);
  const el = document.getElementById(valId);
  if (el) el.textContent = decimals ? v.toFixed(decimals) + suffix : Math.round(v) + suffix;
  if (valId === 'tc-fs-val') tcState.fontSize = v;
  if (valId === 'tc-ls-val') tcState.lineSpacing = v;
  applyTcPreview();
}

function tcLetRange(inp) {
  const v = Number(inp.value);
  const el = document.getElementById('tc-let-val');
  if (el) el.textContent = Math.round(v * 100) + '%';
  tcState.letterSpacing = v;
  applyTcPreview();
}

function tcSelectBg(swatch) {
  document.querySelectorAll('.color-swatches .swatch').forEach(s => s.classList.remove('active'));
  swatch.classList.add('active');
  tcState.bgColor = swatch.dataset.color;
  applyTcPreview();
}


function applyTcPreview() {
  const box = document.getElementById('tc-preview-box');
  if (!box) return;
  box.style.backgroundColor = tcState.bgColor;
  box.style.fontFamily = FONT_MAP[tcState.font];
  box.style.fontSize = tcState.fontSize + 'px';
  box.style.lineHeight = tcState.lineSpacing;
  box.style.letterSpacing = tcState.letterSpacing + 'em';
}

async function doConvert() {
  const input = document.getElementById('tc-input');
  if (!input || !input.value.trim()) {
    showToast('Please enter some text first.', 'error');
    return;
  }
  const btn = document.getElementById('tc-convert-btn');
  btn.disabled = true;
  btn.textContent = 'Converting...';

  try {
    const res = await fetch('/api/simplify/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
      },
      body: JSON.stringify({
        text: input.value.trim(),
        simplify: tcState.simplify,
      }),
    });
    const data = await res.json();
    tcState.converted = data.simplified || input.value.trim();
    tcState.sentences = tcState.converted.match(/[^.!?]+[.!?]*/g) || [tcState.converted];
    tcState.keywords = data.keywords || [];
    // Hide empty state
    document.getElementById('tc-preview-empty').style.display = 'none';

    // Show preview box
    const box = document.getElementById('tc-preview-box');
    box.style.display = 'block';
    renderTcSentences();
    applyTcPreview();

    // Show action buttons
    document.getElementById('tc-actions').style.display = 'flex';

    // Show AI Summary points
    // Add AI Summary inside preview box
    if (tcState.summarize && data.summary_points && data.summary_points.length > 0) {
       const summaryHtml = `
        <div style="
          all: initial;
          display: block;
          font-family: inherit;
          font-size: inherit;
          color: inherit;
          background: inherit;
          border-top: 2px solid var(--primary);
          margin-top: 1.5rem;
          padding-top: 1rem;
          line-height: 1.4;
        ">
          <div style="
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 0.5rem;
            line-height: 1.4;
          ">📝 AI Summary</div>
          ${data.summary_points.map((point, i) => `
             <div style="
              display: block;
              padding: 0;
              margin: 0 0 0.2rem 0;
              line-height: 1.4 !important;
              letter-spacing: normal;
            ">
              <strong style="color:var(--primary);">${i + 1}.</strong> ${point}
            </div>
          `).join('')}
        </div>`;

    // Append summary directly inside preview box
    if (data.summary_points && data.summary_points.length > 0) {
      const summaryHtml = `
        <div id="tc-summary-inline">
          <hr style="border:none;border-top:2px solid var(--primary);margin:1.5rem 0 1rem 0;">
          <div style="font-weight:700;color:var(--primary);margin-bottom:0.75rem;">
            📝 AI Summary
          </div>
          ${data.summary_points.map((point, i) => `
            <div style="margin-bottom:0.4rem;">
              <strong style="color:var(--primary);">${i + 1}.</strong> ${point}
            </div>
          `).join('')}
        </div>`;
      box.innerHTML += summaryHtml;
    }

    } else if (!data.model_ready) {
      box.innerHTML += `
        <div style="border-top:2px solid var(--primary);margin-top:1.5rem;padding-top:1rem;">
          <p style="color:var(--muted);font-style:italic;">
            ⏳ AI Summary loading... Convert again in a moment!
          </p>
        </div>`;
    }


    addPoints(5);
    showToast('Text converted! +5 points', 'success');

  } catch (err) {
    showToast('Conversion failed. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '✏️ Convert Text';
  }
}


function renderTcSentences() {
  const box = document.getElementById('tc-preview-box');
  if (!box) return;
  box.innerHTML = tcState.sentences.map((s, i) => {
    let content = s;
    // Apply keyword highlights
    if (tcState.keywords && tcState.keywords.length > 0) {
      tcState.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
        content = content.replace(regex, '<mark class="keyword-highlight">$1</mark>');
      });
    }
    return `<span class="highlight-sentence${tcState.highlightIdx === i ? ' active' : ''}" data-i="${i}">${content}</span>`;
  }).join('');
}


function tcReadAloud() {
  if (!tcState.converted) return;
  const btn = document.getElementById('tc-read-btn');
  if (tcState.speaking) {
    speechSynthesis.cancel();
    tcState.speaking = false;
    tcState.highlightIdx = -1;
    renderTcSentences();
    if (btn) { btn.textContent = '🔊 Read Aloud'; btn.className = 'btn btn-primary'; }
    return;
  }

  // Get saved settings
  const settings = JSON.parse(localStorage.getItem('lexiaid_settings') || '{}');
  const preferred = settings.ttsVoice || 'female';
  const speed = settings.voiceSpeed || 0.85;

  // Get voices based on preference
  const allVoices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  const femaleNames = ['zira', 'hazel', 'susan', 'heera', 'natasha', 
                       'annette', 'carly', 'aria', 'jenny', 'michelle', 
                       'monica', 'sara', 'female', 'woman'];
  const maleNames = ['david', 'mark', 'george', 'ravi', 'william', 
                     'darren', 'duncan', 'guy', 'ryan', 'male', 'man'];

  let filtered = allVoices.filter(v => {
    const name = v.name.toLowerCase();
    if (preferred === 'female') {
      return femaleNames.some(f => name.includes(f));
    } else {
      return maleNames.some(m => name.includes(m));
    }
  });

  const selectedVoice = filtered.length > 0 ? filtered[0] : allVoices[0];

  let i = 0;
  const speakNext = () => {
    if (i >= tcState.sentences.length) {
      tcState.speaking = false;
      tcState.highlightIdx = -1;
      renderTcSentences();
      if (btn) { btn.textContent = '🔊 Read Aloud'; btn.className = 'btn btn-primary'; }
      return;
    }
    tcState.highlightIdx = i;
    renderTcSentences();
    const active = document.querySelector('.highlight-sentence.active');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    const utter = new SpeechSynthesisUtterance(tcState.sentences[i]);
    utter.rate = speed;
    if (selectedVoice) utter.voice = selectedVoice;
    utter.onend = () => { i++; speakNext(); };
    speechSynthesis.speak(utter);
  };

  tcState.speaking = true;
  if (btn) { btn.textContent = '⏹ Stop'; btn.className = 'btn btn-danger'; }
  speakNext();
  addPoints(5);
}

// ─── Assessment ───────────────────────────────────────
let assessRec = null, assessListening = false;
let assessTranscript = '', assessStart = 0;
let assessFinalText = '';
let assessTotalTime = 0;
let assessPauseStart = 0;

function startAssessment() {
  if (!tcState.converted) {
    showToast('Please convert some text first!', 'error');
    return;
  }

  // Show assessment panel
  const panel = document.getElementById('tc-assessment');
  if (panel) panel.style.display = 'block';

  document.getElementById('assess-recording').style.display = 'block';
  document.getElementById('assess-analyzing').style.display = 'none';
  document.getElementById('assess-results').style.display = 'none';

  assessTranscript = '';
  assessFinalText = '';
  assessListening = false;

  // Reset mic button to idle state
  updateMicButton('idle');
}

function updateMicButton(state) {
  const micBtn = document.getElementById('assess-mic-btn');
  const status = document.getElementById('assess-status');
  if (!micBtn) return;

  if (state === 'idle') {
    micBtn.style.background = 'hsla(0,65%,55%,0.15)';
    micBtn.innerHTML = '🎤';
    micBtn.title = 'Click to start recording';
    if (status) status.textContent = 'Tap mic to start recording';
  } else if (state === 'recording') {
    micBtn.style.background = 'hsla(0,65%,55%,0.4)';
    micBtn.innerHTML = '⏸';
    micBtn.title = 'Click to pause recording';
    if (status) status.textContent = 'Recording… Read the text aloud!';
  } else if (state === 'paused') {
    micBtn.style.background = 'hsla(40,65%,55%,0.3)';
    micBtn.innerHTML = '▶';
    micBtn.title = 'Click to resume recording';
    if (status) status.textContent = 'Paused. Tap mic to resume.';
  }
}

function toggleMicRecording() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast('Please use Chrome for speech recognition!', 'error');
    return;
  }
if (assessListening) {
    // Pause
    assessListening = false;
    if (assessRec) assessRec.stop();
    assessPauseStart = Date.now();
    updateMicButton('paused');
  } else {
    // Start or Resume
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e) => {
      let fin = '', inter = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (fin += t) : (inter += t);
      }
      assessFinalText += fin;
      assessTranscript = assessFinalText + inter;
      const prev = document.getElementById('assess-preview');
      if (prev) prev.textContent = '"' + assessTranscript.slice(-80) + '…"';
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        assessListening = false;
        updateMicButton('idle');
        showToast('Microphone access denied.', 'error');
      }
    };

    rec.onend = () => {
      if (assessListening) {
        try { rec.start(); } catch {}
      }
    };

    assessRec = rec;
    assessListening = true;
    if (!assessStart || assessStart === 0) assessStart = Date.now();
    // Subtract paused time
    if (assessPauseStart > 0) {
      assessTotalTime += Date.now() - assessPauseStart;
      assessPauseStart = 0;
    }
    rec.start();
    updateMicButton('recording');
  }
}


function finishAssessment() {
 assessListening = false;
  if (assessRec) assessRec.stop();
  updateMicButton('idle');
  const endTime = Date.now();
  // Subtract any paused time
  if (assessPauseStart > 0) {
    assessTotalTime += endTime - assessPauseStart;
    assessPauseStart = 0;
  }
  const dur = Math.max(1, Math.round((endTime - assessStart - assessTotalTime) / 1000));
  assessStart = 0;
  assessTotalTime = 0;
  const text = assessFinalText || assessTranscript;

  if (!text.trim()) {
    showToast('No speech detected. Try again.', 'error');
    return;
  }

  document.getElementById('assess-recording').style.display = 'none';
  document.getElementById('assess-analyzing').style.display = 'flex';
  document.getElementById('assess-results').style.display = 'none';

  setTimeout(() => {
   const spokenWords = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    
    // Find which portion of text was read
    // Split converted text into sentences
    const allSentences = tcState.converted.match(/[^.!?]+[.!?]*/g) || [tcState.converted];
    
    // Find matching sentences based on spoken words
    let matchedText = '';
    let spokenWordSet = new Set(spokenWords);
    
    for (let sentence of allSentences) {
      const sentWords = sentence.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
      // Check if at least 40% of sentence words were spoken
      const sentMatches = sentWords.filter(w => spokenWordSet.has(w)).length;
      const matchRatio = sentMatches / Math.max(sentWords.length, 1);
      if (matchRatio >= 0.4) {
        matchedText += ' ' + sentence;
      }
    }

    // If nothing matched use spoken text length as reference
    const orig = (matchedText.trim() || text).toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    const spoken = spokenWords;
    const matches = spoken.filter(w => orig.includes(w)).length;
    const accuracy = Math.min(100, Math.round((matches / Math.max(orig.length, 1)) * 120));
    const wpm = Math.round((spoken.length / Math.max(dur, 1)) * 60);
    const speed = Math.min(100, Math.round((wpm / 150) * 100));
    const fluency = Math.min(100, Math.round((accuracy * 0.6 + speed * 0.4)));
    const overall = Math.round((fluency + accuracy + speed) / 3);

    const feedback = overall >= 80 ? 'Excellent reading! Keep up the great work.' :
                     overall >= 60 ? 'Good effort! Practice reading aloud daily.' :
                                     'Keep practicing! Try reading slowly and clearly.';

    document.getElementById('assess-analyzing').style.display = 'none';
    document.getElementById('assess-results').style.display = 'block';

    const metrics = [
      { label: 'Fluency', value: fluency, color: 'var(--primary)' },
      { label: 'Accuracy', value: accuracy, color: 'var(--success)' },
      { label: 'Reading Speed', value: speed, color: 'var(--accent)' },
      { label: 'Overall Score', value: overall, color: 'var(--primary)' },
    ];

    document.getElementById('assess-metrics').innerHTML = metrics.map(m => `
      <div style="margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
          <span>${m.label}</span>
          <span style="font-weight:700;">${m.value}%</span>
        </div>
        <div style="background:var(--secondary);border-radius:99px;height:8px;">
          <div style="width:${m.value}%;background:${m.color};height:8px;border-radius:99px;transition:width 0.6s;"></div>
        </div>
      </div>
    `).join('');

    document.getElementById('assess-feedback').textContent = '💡 ' + feedback;
    addPoints(5);

    // Save assessment to database
    fetch('/api/save-assessment/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || csrftoken,
      },
      body: JSON.stringify({
        fluency: fluency,
        accuracy: accuracy,
        speed: speed,
        overall: overall,
        feedback: feedback,
      }),
    }).catch(err => console.error('Failed to save assessment:', err));
  }, 1500);
}


// ─── TEXT TO SPEECH ───────────────────────────────────
const TTS_SAMPLES = [
  "The quick brown fox jumps over the lazy dog.",
  "Reading is a wonderful way to explore new worlds and ideas.",
  "Practice makes progress, not perfection. Keep going!",
];

let ttsPlaying = false;

function populateTtsVoices() {
  // Sync speed slider with saved settings
  const settings = JSON.parse(localStorage.getItem('lexiaid_settings') || '{}');
  const speedRange = document.getElementById('tts-speed-range');
  const speedVal = document.getElementById('tts-speed-val');
  if (speedRange && settings.voiceSpeed) {
    speedRange.value = settings.voiceSpeed;
    if (speedVal) speedVal.textContent = Number(settings.voiceSpeed).toFixed(1) + 'x';
  }

  const sel = document.getElementById('tts-voice-select');
  if (!sel) return;

  const preferred = settings.ttsVoice || 'female';
  const allVoices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));

  const femaleNames = ['female', 'woman', 'girl', 'zira', 'hazel', 'susan',
                       'heera', 'natasha', 'annette', 'carly', 'elsie',
                       'aria', 'jenny', 'michelle', 'monica', 'sara'];
  const maleNames = ['male', 'man', 'david', 'mark', 'george', 'ravi',
                     'william', 'darren', 'duncan', 'guy', 'ryan'];

  let filtered = allVoices.filter(v => {
    const name = v.name.toLowerCase();
    if (preferred === 'female') {
      return femaleNames.some(f => name.includes(f));
    } else {
      return maleNames.some(m => name.includes(m));
    }
  });

  if (filtered.length === 0) filtered = allVoices.slice(0, 5);

  sel.innerHTML = filtered.map(v =>
    `<option value="${v.name}">${v.name}</option>`
  ).join('');
}
function ttsSample(i) {
  const inp = document.getElementById('tts-input');
  if (inp) inp.value = TTS_SAMPLES[i];
}

function ttsRangeUpdate() {
  const speedEl = document.getElementById('tts-speed-val');
  const pitchEl = document.getElementById('tts-pitch-val');
  if (speedEl) speedEl.textContent = Number(document.getElementById('tts-speed-range').value).toFixed(1) + 'x';
  if (pitchEl) pitchEl.textContent = Number(document.getElementById('tts-pitch-range').value).toFixed(1);
}

function ttsPlay() {
  const text = document.getElementById('tts-input')?.value.trim();
  if (!text) { showToast('Please enter some text.', 'error'); return; }
  const btn = document.getElementById('tts-play-btn');
  if (ttsPlaying) {
    speechSynthesis.cancel();
    ttsPlaying = false;
    if (btn) { btn.textContent = '▶ Play'; btn.className = 'btn btn-primary'; }
    return;
  }

  // Get saved settings
  const settings = JSON.parse(localStorage.getItem('lexiaid_settings') || '{}');
  const savedSpeed = settings.voiceSpeed || 1;
  const preferred = settings.ttsVoice || 'female';

  const utter = new SpeechSynthesisUtterance(text);

  // Use TTS page speed slider if manually changed, otherwise use settings speed
  const speedRange = document.getElementById('tts-speed-range');
  utter.rate = speedRange ? Number(speedRange.value) : savedSpeed;
  utter.pitch = Number(document.getElementById('tts-pitch-range')?.value || 1);

  // Get voice based on settings preference
  const allVoices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  const femaleNames = ['zira', 'hazel', 'susan', 'heera', 'natasha',
                       'annette', 'carly', 'aria', 'jenny', 'michelle',
                       'monica', 'sara', 'female', 'woman'];
  const maleNames = ['david', 'mark', 'george', 'ravi', 'william',
                     'darren', 'duncan', 'guy', 'ryan', 'male', 'man'];

  // Check if user manually selected a voice on TTS page
  const manualVoice = document.getElementById('tts-voice-select')?.value;
  let selectedVoice;

  if (manualVoice) {
    selectedVoice = allVoices.find(v => v.name === manualVoice);
  } else {
    let filtered = allVoices.filter(v => {
      const name = v.name.toLowerCase();
      if (preferred === 'female') {
        return femaleNames.some(f => name.includes(f));
      } else {
        return maleNames.some(m => name.includes(m));
      }
    });
    selectedVoice = filtered.length > 0 ? filtered[0] : allVoices[0];
  }

  if (selectedVoice) utter.voice = selectedVoice;

  utter.onend = () => {
    ttsPlaying = false;
    if (btn) { btn.textContent = '▶ Play'; btn.className = 'btn btn-primary'; }
  };

  ttsPlaying = true;
  if (btn) { btn.textContent = '⏹ Stop'; btn.className = 'btn btn-danger'; }
  speechSynthesis.speak(utter);
  addPoints(5);
}

function ttsReset() {
  speechSynthesis.cancel();
  ttsPlaying = false;
  const inp = document.getElementById('tts-input');
  if (inp) inp.value = '';
  const btn = document.getElementById('tts-play-btn');
  if (btn) { btn.textContent = 'Play'; btn.className = 'btn btn-primary'; }
}

// ─── SPEECH TO TEXT ───────────────────────────────────
let sttRec = null, sttListening = false;
let sttTimer = 0, sttTimerInterval = null;
let sttFinalText = '';

function toggleRecording() {
  if (sttListening) stopRecording();
  else startRecording();
}

function startRecording() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Speech recognition requires Chrome browser.'); return; }
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';
  rec.onresult = (e) => {
    let fin = '', inter = '';
    for (let i = 0; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      e.results[i].isFinal ? (fin += t) : (inter += t);
    }
    sttFinalText = fin;
    renderSttTranscript(fin + inter);
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed') {
      sttListening = false;
      stopRecording();
      showToast('Microphone access denied.', 'error');
    }
  };
  rec.onend = () => { if (sttListening) { try { rec.start(); } catch {} } };
  sttRec = rec;
  sttListening = true;
  rec.start();
  sttTimer = 0;
  sttTimerInterval = setInterval(() => {
    sttTimer++;
    const el = document.getElementById('rec-timer');
    if (el) el.textContent = formatTime(sttTimer);
  }, 1000);
  const btn = document.getElementById('rec-btn');
  if (btn) btn.className = 'rec-btn recording';
  const status = document.getElementById('rec-status');
  if (status) status.textContent = 'Recording…';
  addPoints(5);
}

function stopRecording() {
  sttListening = false;
  if (sttRec) sttRec.stop();
  clearInterval(sttTimerInterval);
  const btn = document.getElementById('rec-btn');
  if (btn) btn.className = 'rec-btn idle';
  const status = document.getElementById('rec-status');
  if (status) status.textContent = 'Tap to Start';
}

function resetRecording() {
  stopRecording();
  sttTimer = 0;
  sttFinalText = '';
  const el = document.getElementById('rec-timer');
  if (el) el.textContent = '00:00';
  renderSttTranscript('');
}

function renderSttTranscript(text) {
  const el = document.getElementById('stt-transcript');
  if (!el) return;
  if (!text) {
    el.innerHTML = '<p style="color:var(--muted);text-align:center;padding:2rem;">Start recording to see your transcript here</p>';
  } else {
    el.textContent = text;
  }
}

function sttFont(chip) {
  document.querySelectorAll('#stt-font-chips .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  const el = document.getElementById('stt-transcript');
  if (el) el.style.fontFamily = FONT_MAP[chip.dataset.val];
}

function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return m.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0');
}

// ─── On Page Load ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Apply global font from settings on every page load
  const savedSettings = JSON.parse(localStorage.getItem('lexiaid_settings') || '{}');
 if (savedSettings.fontFamily) applyGlobalFont(savedSettings.fontFamily);
  if (savedSettings.fontSize) applyGlobalSize(savedSettings.fontSize);
  // Populate TTS voices
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = populateTtsVoices;
    setTimeout(populateTtsVoices, 500);
  }
});

// ─── SETTINGS PAGE ────────────────────────────────────
function settingsChip(groupId, chip, type) {
  // Update UI
  document.querySelectorAll('#' + groupId + ' .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');

  // Save to localStorage
  const val = chip.dataset.val;
  const settings = JSON.parse(localStorage.getItem('lexiaid_settings') || '{}');

 if (type === 'font') settings.fontFamily = val;
  if (type === 'size') settings.fontSize = Number(val);
  if (type === 'voice') settings.ttsVoice = val;

  localStorage.setItem('lexiaid_settings', JSON.stringify(settings));
  
  // Apply font to entire app immediately
  if (type === 'font') applyGlobalFont(val);
   if (type === 'size') applyGlobalSize(val);
  
  showToast('Settings saved! ✓', 'success');
}

function settingsSwatch(swatch) {
  // Update UI
  document.querySelectorAll('#settings-bg-swatches .swatch').forEach(s => s.classList.remove('active'));
  swatch.classList.add('active');

  // Save to localStorage
  const settings = JSON.parse(localStorage.getItem('lexiaid_settings') || '{}');
  settings.bgColor = swatch.dataset.val;
  localStorage.setItem('lexiaid_settings', JSON.stringify(settings));
  showToast('Settings saved! ✓', 'success');
}

function settingsSpeed(inp) {
  document.getElementById('settings-speed-val').textContent = Number(inp.value).toFixed(1) + 'x';

  // Save to localStorage
  const settings = JSON.parse(localStorage.getItem('lexiaid_settings') || '{}');
  settings.voiceSpeed = Number(inp.value);
  localStorage.setItem('lexiaid_settings', JSON.stringify(settings));
}

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', function() {
  // Populate TTS voices
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = populateTtsVoices;
    setTimeout(populateTtsVoices, 500);
  }

  // Load saved settings and apply to text converter
  const settings = JSON.parse(localStorage.getItem('lexiaid_settings') || '{}');

  // Apply font to text converter chips
  if (settings.fontFamily) {
    document.querySelectorAll('#tc-font-chips .chip').forEach(c => {
      c.classList.toggle('active', c.dataset.val === settings.fontFamily);
    });
    tcState.font = settings.fontFamily;
  }

  // Apply font size to text converter slider
  if (settings.fontSize) {
    const fsRange = document.querySelector('input[oninput*="tc-fs-val"]');
    const fsVal = document.getElementById('tc-fs-val');
    if (fsRange) fsRange.value = settings.fontSize;
    if (fsVal) fsVal.textContent = settings.fontSize + 'px';
    tcState.fontSize = settings.fontSize;
  }

  // Apply background color to text converter swatches
  if (settings.bgColor) {
    const bgMap = {
      'cream': 'hsl(40,60%,95%)',
      'peach': 'hsl(25,70%,92%)',
      'lightorange': 'hsl(30,75%,90%)',
      'warmyellow': 'hsl(45,80%,90%)',
      'apricot': 'hsl(18,65%,91%)',
    };
    const colorVal = bgMap[settings.bgColor];
    if (colorVal) {
      document.querySelectorAll('.color-swatches .swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.color === colorVal);
      });
      tcState.bgColor = colorVal;
    }
  }

  // Apply preview if already converted
  applyTcPreview();

  // Settings page — restore saved values
  if (settings.fontFamily) {
    document.querySelectorAll('#settings-font-chips .chip').forEach(c => {
      c.classList.toggle('active', c.dataset.val === settings.fontFamily);
    });
  }
  if (settings.fontSize) {
    document.querySelectorAll('#settings-size-chips .chip').forEach(c => {
      c.classList.toggle('active', c.dataset.val === String(settings.fontSize));
    });
  }
  if (settings.bgColor) {
    document.querySelectorAll('#settings-bg-swatches .swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.val === settings.bgColor);
    });
  }
  if (settings.voiceSpeed) {
    const range = document.getElementById('settings-speed-range');
    const val = document.getElementById('settings-speed-val');
    if (range) range.value = settings.voiceSpeed;
    if (val) val.textContent = Number(settings.voiceSpeed).toFixed(1) + 'x';
  }
  if (settings.ttsVoice) {
    document.querySelectorAll('#settings-voice-chips .chip').forEach(c => {
      c.classList.toggle('active', c.dataset.val === settings.ttsVoice);
    });
  }
});


// ─── PDF UPLOAD ───────────────────────────────────────
async function handlePdfUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const label = document.getElementById('drop-label');
  if (label) label.textContent = '⏳ Extracting text...';

  const formData = new FormData();
  formData.append('pdf', file);

  try {
    const res = await fetch('/api/upload-pdf/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
      },
      body: formData,
    });
    const data = await res.json();

    if (data.text) {
      // Switch to type tab and fill in the text
      tcTab('type');
      const input = document.getElementById('tc-input');
      if (input) input.value = data.text;
      if (label) label.textContent = '✅ PDF extracted!';
      showToast('PDF text extracted! Click Convert to continue.', 'success');
    } else {
      if (label) label.textContent = 'Drop your PDF here';
      showToast(data.error || 'Failed to extract PDF', 'error');
    }
  } catch (err) {
    if (label) label.textContent = 'Drop your PDF here';
    showToast('Upload failed. Try again.', 'error');
  }
}


function applyGlobalFont(fontVal) {
  const FONT_MAP_GLOBAL = {
    opendyslexic: "'OpenDyslexic', sans-serif",
    sylexiad: "'Sylexiad', sans-serif",
    courier: "'Courier New', Courier, monospace",
    verdana: "Verdana, Geneva, sans-serif",
  };
  const font = FONT_MAP_GLOBAL[fontVal];
  if (font) document.body.style.fontFamily = font;
}

function applyGlobalSize(sizeVal) {
  const size = Number(sizeVal);
  if (size) document.body.style.fontSize = size + 'px';
}


async function downloadPdf() {
  const { jsPDF } = window.jspdf;
  const btn = document.querySelector('[onclick="downloadPdf()"]');

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Generating PDF...';
  }

  try {
    const previewBox = document.getElementById('tc-preview-box');
    if (!previewBox) return;

    // Save original styles
    const originalHeight = previewBox.style.height;
    const originalMaxHeight = previewBox.style.maxHeight;
    const originalOverflow = previewBox.style.overflow;

    // Expand to full content
    previewBox.style.height = 'auto';
    previewBox.style.maxHeight = 'none';
    previewBox.style.overflow = 'visible';

    await new Promise(r => setTimeout(r, 300));

    const canvas = await html2canvas(previewBox, {
      scale: 2,
      useCORS: true,
      backgroundColor: tcState.bgColor || '#fff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
    });

    // Restore styles
    previewBox.style.height = originalHeight;
    previewBox.style.maxHeight = originalMaxHeight;
    previewBox.style.overflow = originalOverflow;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();  // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // Calculate how many pixels fit per page
    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    // Scale factor: mm per pixel
    const scale = contentWidth / imgWidthPx;
    const imgHeightMm = imgHeightPx * scale;

    // How many pixels fit in one page height
    const pageHeightPx = contentHeight / scale;

    let pageStart = 0; // in pixels

    while (pageStart < imgHeightPx) {
      if (pageStart > 0) pdf.addPage();

      // How many pixels to include in this page
      const sliceHeight = Math.min(pageHeightPx, imgHeightPx - pageStart);

      // Create a temporary canvas for this slice
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = imgWidthPx;
      sliceCanvas.height = sliceHeight;

      const ctx = sliceCanvas.getContext('2d');
      // Fill with background color
      ctx.fillStyle = tcState.bgColor || '#fff8f0';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

      // Draw only the slice portion
      ctx.drawImage(
        canvas,
        0, pageStart,           // source x, y
        imgWidthPx, sliceHeight, // source width, height
        0, 0,                    // dest x, y
        imgWidthPx, sliceHeight  // dest width, height
      );

      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm = sliceHeight * scale;

      pdf.addImage(
        sliceData,
        'PNG',
        margin,
        margin,
        contentWidth,
        sliceHeightMm
      );

      pageStart += sliceHeight;
    }

    pdf.save('LexiAid_converted.pdf');
    showToast('PDF downloaded! ✅', 'success');

  } catch (err) {
    console.error(err);
    showToast('Failed to generate PDF. Try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📥 Download PDF';
    }
  }
}



function highlightKeywords(html, keywords) {
  if (!keywords || keywords.length === 0) return html;
  
  let result = html;
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
    result = result.replace(regex, '<mark class="keyword-highlight">$1</mark>');
  });
  return result;
}