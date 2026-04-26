const BASE = 'https://bend-production-72e5.up.railway.app';

if(localStorage.getItem("login") == "true"){
  window.location.href = 'index.html';
}

// ── State ─────────────────────────────────────────────────────────────────
let otpCountdownInterval;   // forgot-pw page countdown
let modalCountdownInterval; // modal countdown
let generatedOtp    = '';   // demo fallback OTP (forgot-pw)
let modalOtpContext = null; // 'login' | 'signup' — which flow triggered the modal
let pendingPayload  = null; // stores login/signup data until OTP verified

// ── Page routing ──────────────────────────────────────────────────────────
function switchPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id);
  el.classList.add('active');
  const tabsEl = document.getElementById('mainTabs');
  tabsEl.style.display = (id === 'login' || id === 'signup') ? 'flex' : 'none';
}

function switchTabAndSwitch(id) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.textContent.toLowerCase() === id);
  });
  switchPage(id);
}

// ── Toast ─────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = 'success') {
  const el    = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  el.className = 'toast ' + type;
  msgEl.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ── Password strength ─────────────────────────────────────────────────────
function calcStrength(pw) {
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function applyStrength(score, segIds, labelId) {
  const labels = ['Type a password', 'Weak', 'Fair', 'Good', 'Strong'];
  const cls    = ['', 'weak', 'medium', 'strong', 'strong'];
  segIds.forEach((id, i) => {
    const el = document.getElementById(id);
    el.className = 'strength-seg' + (i < score ? ' ' + cls[score] : '');
  });
  document.getElementById(labelId).textContent = labels[score];
}

function updateStrength(pw)  { applyStrength(calcStrength(pw), ['seg1','seg2','seg3','seg4'], 'strength-label'); }
function updateStrength2(pw) { applyStrength(calcStrength(pw), ['cseg1','cseg2','cseg3','cseg4'], 'cstrength-label'); }

// ── OTP input navigation (shared by page & modal) ─────────────────────────
function otpNext(el, idx, groupId) {
  el.value = el.value.replace(/[^0-9]/g, '');
  const inputs = document.querySelectorAll(`#${groupId} input`);
  if (el.value && idx < inputs.length - 1) inputs[idx + 1].focus();
}

function otpBack(e, idx, groupId) {
  const inputs = document.querySelectorAll(`#${groupId} input`);
  if (e.key === 'Backspace' && !inputs[idx].value && idx > 0) inputs[idx - 1].focus();
}

function handleOtpPaste(e, groupId) {
  e.preventDefault();
  const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
  const inputs = document.querySelectorAll(`#${groupId} input`);
  
  for (let i = 0; i < inputs.length && i < paste.length; i++) {
    inputs[i].value = paste[i];
  }
  
  // Focus the last filled input or the next empty one
  const lastFilledIndex = Math.min(paste.length - 1, inputs.length - 1);
  if (lastFilledIndex >= 0) {
    inputs[lastFilledIndex].focus();
  }
}

// ── Countdown helper ──────────────────────────────────────────────────────
function startCountdown(btnId, cdId, intervalRef) {
  let s = 30;
  const btn = document.getElementById(btnId);
  const cd  = document.getElementById(cdId);
  if (!btn || !cd) return;
  btn.disabled = true;
  clearInterval(intervalRef.current);
  intervalRef.current = setInterval(() => {
    s--;
    cd.textContent = s;
    if (s <= 0) {
      clearInterval(intervalRef.current);
      btn.disabled = false;
      btn.innerHTML = 'Resend code';
    }
  }, 1000);
}

const forgotCdRef = { current: null };
const modalCdRef  = { current: null };

// ════════════════════════════════════════════════════════════════════════════
//  OTP POPUP MODAL
// ════════════════════════════════════════════════════════════════════════════

function openOtpModal(context, email) {
  modalOtpContext = context;
  document.getElementById('modal-email-display').textContent = email;
  document.querySelectorAll('#modalOtpInputs input').forEach(i => i.value = '');
  document.getElementById('modal-backdrop').classList.add('open');
  // focus first input
  setTimeout(() => {
    const first = document.querySelector('#modalOtpInputs input');
    if (first) first.focus();
  }, 350);
  // start countdown
  document.getElementById('modal-resend-btn').disabled = true;
  document.getElementById('modal-resend-btn').innerHTML =
    'Resend in <span id="modal-countdown">60</span>s';
  startCountdown('modal-resend-btn', 'modal-countdown', modalCdRef);
}

function closeOtpModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  modalOtpContext = null;
  pendingPayload  = null;
}

async function modalResendOtp() {
  if (!pendingPayload || !pendingPayload.otpEmail) return;
  
  try {
    const res = await fetch(`${BASE}/base/sendOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingPayload.otpEmail })
    });
    const text = await res.text();
    
    if (text.includes('sent') || text.includes('Sent') || res.ok) {
      toast('OTP resent to ' + pendingPayload.otpEmail);
    } else {
      toast(text || 'Failed to resend OTP', 'error');
    }
  } catch (err) {
    console.error('Resend OTP error:', err);
    toast('Failed to resend OTP', 'error');
  }
  
  document.getElementById('modal-resend-btn').disabled = true;
  document.getElementById('modal-resend-btn').innerHTML =
    'Resend in <span id="modal-countdown">60</span>s';
  startCountdown('modal-resend-btn', 'modal-countdown', modalCdRef);
}

async function verifyModalOtp(btn) {
  // Grab all 6 input digits
  const inputs = document.querySelectorAll('#modalOtpInputs input');
  const code = Array.from(inputs).map(i => i.value).join('');

  // Validate length
  if (code.length < 6) {
    toast('Enter all 6 digits', 'error');
    return;
  }

  // Disable button & show loading
  btn.classList.add('loading');
  btn.textContent = 'VERIFYING...';

  let verified = false;

  try {
    // Send OTP verification request to backend
    const res = await fetch(`${BASE}/base/verifyOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingPayload.otpEmail, otp: code })
    });

    // Parse response as text (or JSON if backend returns JSON)
    const text = await res.text();
    console.log('OTP verification response:', text);

    // ✅ Strict check: Only mark verified if backend says exactly 'OTP valid'
    verified = text.trim() === 'OTP valid';

  } catch (err) {
    console.error('OTP verification error:', err);
    toast('Verification failed - server error', 'error');

    btn.classList.remove('loading');
    btn.textContent = 'VERIFY & CONTINUE →';
    return;
  }

  if (!verified) {
    // Shake input and show error
    btn.classList.remove('loading');
    btn.textContent = 'VERIFY & CONTINUE →';
    const otpInputsEl = document.getElementById('modalOtpInputs');
    otpInputsEl.classList.add('shake');
    setTimeout(() => otpInputsEl.classList.remove('shake'), 500);

    toast('Incorrect code — try again', 'error');
    return;
  }

  // ✅ OTP is valid
  const otpInputsEl = document.getElementById('modalOtpInputs');
  otpInputsEl.classList.add('otp-success');

  btn.textContent = 'VERIFIED ✓';

  // Mark OTP verified in payload (if signup)
  if (modalOtpContext === 'signup' && pendingPayload) {
    pendingPayload.otpVerified = true;
  }

  // Wait a short moment, then proceed
  setTimeout(async () => {
    try {
      if (modalOtpContext === 'signup') {
        await completeSignup();
      } else if (modalOtpContext === 'login') {
        await completeLogin();
      }
    } catch (err) {
      console.error('Error completing flow after OTP:', err);
      toast('Something went wrong', 'error');
    } finally {
      // Close modal in all cases
      closeOtpModal();
    }
  }, 600);
}

// ════════════════════════════════════════════════════════════════════════════
//  LOGIN FLOW  (verify OTP → then authenticate)
// ════════════════════════════════════════════════════════════════════════════

async function doLogin(btn) {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!user || !pass) { toast('Fill in all fields', 'error'); return; }

  btn.classList.add('loading');
  btn.textContent = 'CHECKING...';

  // First: look up the email for this username
  let email = '';
  try {
    const res  = await fetch(`${BASE}/base/getEmail?username=${encodeURIComponent(user)}`);
    const text = await res.text();
    email = text.trim();
    
    if (!email || email === '') {
      toast('Username not found', 'error');
      btn.classList.remove('loading');
      btn.textContent = 'LOGIN →';
      return;
    }
    
    console.log('Email found for user:', email);
  } catch (err) {
    console.error('Email lookup error:', err);
    toast('Failed to lookup email', 'error');
    btn.classList.remove('loading');
    btn.textContent = 'LOGIN →';
    return;
  }
  try {
    const res  = await fetch(`${BASE}/base/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const text = await res.text();
    if (text.includes('Success')) {
      btn.classList.remove('loading');
      btn.textContent = 'LOGIN →';
    }else{
      toast(text || 'Wrong credentials, please', 'error');
      btn.classList.remove('loading');
      btn.textContent = 'LOGIN →';
      return;
    }
  }catch(err){
    
  }
  btn.textContent = 'SENDING OTP...';

  // Store payload for after OTP
  pendingPayload = { username: user, password: pass, otpEmail: email };

  // Send OTP to the email
  try {
    const res = await fetch(`${BASE}/base/sendOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    const text = await res.text();
    console.log('Send OTP response:', text);
    
    if (!text.includes('sent') && !text.includes('Sent') && !text.includes('OTP sent')) {
      toast(text || 'Failed to send OTP', 'error');
      btn.classList.remove('loading');
      btn.textContent = 'LOGIN →';
      return;
    }
  } catch (err) {
    console.error('Send OTP error:', err);
    toast('Failed to send OTP', 'error');
    btn.classList.remove('loading');
    btn.textContent = 'LOGIN →';
    return;
  }

  btn.classList.remove('loading');
  btn.textContent = 'LOGIN →';

  openOtpModal('login', email);
}

async function completeLogin() {
  if (!pendingPayload) return;
  try {
    const res  = await fetch(`${BASE}/base/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: pendingPayload.username, password: pendingPayload.password })
    });

    const text = await res.text();

    if (text.includes('Success')) {
      localStorage.setItem("username", pendingPayload.username);
      localStorage.setItem("login",true);
      toast('Login successful! Welcome back, ' + pendingPayload.username);
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    } else {
      toast(text || 'Wrong credentials, please', 'error');
      setTimeout(() => { window.location.href = 'Login.html'; }, 1500);
    }
  } catch (err) {
    console.error('Login error:', err);
    toast('Cannot reach server', 'error');
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  SIGNUP FLOW  (verify OTP → then register)
// ════════════════════════════════════════════════════════════════════════════

async function doSignup(btn) {
  const user  = document.getElementById('su-user').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pass  = document.getElementById('su-pass').value;

  if (!user || !email || !pass) { toast('Fill in all fields', 'error'); return; }
  if (pass.length < 6)          { toast('Password too short (min 6)', 'error'); return; }
  
  // Check if username already exists (optional but recommended)
  try {
    const checkUser = await fetch(`${BASE}/base/getEmail?username=${encodeURIComponent(user)}`);
    const existingEmail = await checkUser.text();
    if (existingEmail && existingEmail.trim()) {
      toast('Username already exists. Please choose another.', 'error');
      return;
    }
  } catch (err) {
    // Continue anyway - the server will handle duplicate checks
    console.log('Username check error:', err);
  }

  btn.classList.add('loading');
  btn.textContent = 'SENDING OTP...';

  pendingPayload = { username: user, email: email, password: pass, otpEmail: email };

  try {
    const res = await fetch(`${BASE}/base/sendOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    const text = await res.text();
    console.log('Signup OTP response:', text);
    
    if (text.toLowerCase().includes('sent') || text.toLowerCase().includes('success')) {
      toast('OTP sent to ' + email);
    } else {
      // Even if OTP sending fails, we can still proceed with the modal
      // The user can try resending from the modal
      toast('OTP request sent. Check your email.', 'info');
    }
    
    btn.classList.remove('loading');
    btn.textContent = 'CREATE ACCOUNT →';
    openOtpModal('signup', email);
    
  } catch (err) {
    console.error('Send OTP error:', err);
    toast('Failed to send OTP. Please try again.', 'error');
    btn.classList.remove('loading');
    btn.textContent = 'CREATE ACCOUNT →';
  }
}

async function completeSignup() {
  if (!pendingPayload) return;
  
  try {
    console.log('Completing signup for:', pendingPayload.username);
    
    const res = await fetch(`${BASE}/base/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: pendingPayload.username,
        email: pendingPayload.email,
        password: pendingPayload.password
      })
    });
    
    const text = await res.text();
    console.log('Registration response:', text);
    
    // Check for various success indicators
    if (text.toLowerCase().includes('success') || 
        text.toLowerCase().includes('created') ||
        res.status === 200) {
      localStorage.setItem("username", pendingPayload.username);
      localStorage.setItem("login",true);
      toast('Account created successfully! Logging in...');
      
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
      }
  } catch (err) {
    console.error('Registration error:', err);
    toast('Cannot reach server. Please check your connection.', 'error');
  }
}
// ════════════════════════════════════════════════════════════════════════════
//  FORGOT PASSWORD FLOW
// ════════════════════════════════════════════════════════════════════════════

async function sendOtp(btn) {
  const email = document.getElementById('otp-email').value.trim();
  if (!email) { toast('Enter your email first', 'error'); return; }

  btn.classList.add('loading');
  btn.textContent = 'SENDING...';

  try {
    const res  = await fetch(`${BASE}/base/sendOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const text = await res.text();
    console.log('Forgot password OTP response:', text);
    
    if (text.includes('sent') || text.includes('Sent') || text.includes('OTP sent')) {
      toast('OTP sent to ' + email);
    } else if (text.includes('not found') || text.includes('Not found')) {
      toast('Email not found', 'error');
      btn.classList.remove('loading');
      btn.textContent = 'SEND OTP →';
      return;
    } else {
      toast(text || 'Failed to send OTP', 'error');
      btn.classList.remove('loading');
      btn.textContent = 'SEND OTP →';
      return;
    }
  } catch (err) {
    console.error('Send OTP error:', err);
    toast('Cannot reach server', 'error');
    btn.classList.remove('loading');
    btn.textContent = 'SEND OTP →';
    return;
  }

  btn.classList.remove('loading');
  btn.textContent = 'SEND OTP →';

  document.getElementById('forgotResendBtn').disabled = true;
  document.getElementById('forgotResendBtn').innerHTML =
    'Resend in <span id="countdown">60</span>s';
  startCountdown('forgotResendBtn', 'countdown', forgotCdRef);
}

function resendForgotOtp() {
  sendOtp(document.querySelector('#page-otp .btn-ghost'));
}

async function verifyOtp(btn) {
  const inputs = document.querySelectorAll('#otpInputs input');
  const code   = Array.from(inputs).map(i => i.value).join('');
  if (code.length < 6) { toast('Enter all 6 digits', 'error'); return; }

  btn.classList.add('loading');
  btn.textContent = 'VERIFYING...';

  try {
    const res  = await fetch(`${BASE}/base/verifyOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('otp-email').value.trim(), otp: code })
    });
    const text = await res.text();
    console.log('Verify OTP response:', text);
    
    if (text.includes('valid') || text.includes('Valid') || text.includes('OTP valid')) {
      toast('OTP verified!');
      btn.classList.remove('loading');
      btn.textContent = 'VERIFY CODE →';
      switchPage('changepass');
    } else {
      toast('Invalid code', 'error');
      btn.classList.remove('loading');
      btn.textContent = 'VERIFY CODE →';
    }
  } catch (err) {
    console.error('Verify OTP error:', err);
    toast('Verification failed', 'error');
    btn.classList.remove('loading');
    btn.textContent = 'VERIFY CODE →';
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  CHANGE PASSWORD
// ════════════════════════════════════════════════════════════════════════════

async function doChangePass(btn) {
  const np = document.getElementById('cp-new').value;
  const cp = document.getElementById('cp-confirm').value;
  if (!np || !cp)    { toast('Fill in both fields', 'error'); return; }
  if (np !== cp)     { toast('Passwords do not match', 'error'); return; }
  if (np.length < 6) { toast('Password too short (min 6)', 'error'); return; }

  btn.classList.add('loading');
  btn.textContent = 'UPDATING...';

  try {
    const res  = await fetch(`${BASE}/base/changePassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:    document.getElementById('otp-email').value.trim(),
        password: np
      })
    });
    const text = await res.text();
    if (text.includes('Success') || text.includes('updated')) {
      toast('Password updated! Please log in.');
      switchTabAndSwitch('login');
    } else {
      toast(text || 'Update failed', 'error');
    }
  } catch (err) {
    console.error('Change password error:', err);
    toast('Cannot reach server', 'error');
  }

  btn.classList.remove('loading');
  btn.textContent = 'UPDATE PASSWORD →';
}

// ── Close modal on backdrop click ─────────────────────────────────────────
document.getElementById('modal-backdrop').addEventListener('click', function(e) {
  if (e.target === this) closeOtpModal();
});

// ── Close modal on ESC ────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeOtpModal();
});