// app.js
const apiBase = '/api';

// Validation patterns - centralized for consistency
const VALIDATION_PATTERNS = {
  emiratesId: /^[0-9]{10,18}$/,
  passportNumber: /^[A-Za-z0-9]{5,20}$/,
  visaUnifiedNumber: /^[0-9]{6,20}$/,
  employeeId: /^[A-Za-z0-9]+$/
};

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginSection = document.getElementById('loginSection');
const recordsSection = document.getElementById('recordsSection');
const recordsBody = document.getElementById('recordsBody');
const saveBtn = document.getElementById('saveBtn');
const logoutBtn = document.getElementById('logoutBtn');
const saveMsg = document.getElementById('saveMsg');
const loginBtn = document.getElementById('loginBtn');

let sessionToken = null;
let employeeId = null;
let items = []; // list items returned from backend

// Input sanitization for security
function sanitizeInput(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[<>&"']/g, (char) => {
    const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;' };
    return entities[char] || char;
  });
}

function normalizeDob(d) {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1], mm = m[2], yyyy = m[3];
  // Basic date validation
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    return null;
  }
  return `${dd}/${mm}/${yyyy}`;
}

function setLoading(button, loading, originalText) {
  if (loading) {
    button.disabled = true;
    button.innerHTML = originalText + '<span class="loading"></span>';
  } else {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
  element.classList.add('error');
  element.classList.remove('success');
}

function showSuccess(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
  element.classList.remove('error');
  element.classList.add('success');
}

// Accessible notification for session timeout
function showSessionWarning() {
  // Create accessible modal dialog
  const existingModal = document.getElementById('sessionWarningModal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.id = 'sessionWarningModal';
  modal.setAttribute('role', 'alertdialog');
  modal.setAttribute('aria-labelledby', 'sessionWarningTitle');
  modal.setAttribute('aria-describedby', 'sessionWarningDesc');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  
  modal.innerHTML = `
    <div style="background:#fff;padding:2rem;border-radius:12px;max-width:400px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
      <h3 id="sessionWarningTitle" style="color:#b00020;margin:0 0 1rem;">Session Expiring Soon</h3>
      <p id="sessionWarningDesc" style="color:#666;margin:0 0 1.5rem;">Your session will expire in 10 minutes. Please save your changes to avoid losing data.</p>
      <button id="dismissSessionWarning" class="btn" style="width:auto;padding:0.75rem 2rem;">OK, Got it</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const dismissBtn = document.getElementById('dismissSessionWarning');
  dismissBtn.focus();
  dismissBtn.addEventListener('click', () => modal.remove());
  
  // Allow ESC key to dismiss
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.remove();
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  saveMsg.textContent = '';

  const id = document.getElementById('employeeId').value.trim();
  const dobRaw = document.getElementById('dob').value.trim();
  
  // Validate employee ID format
  if (!id || !VALIDATION_PATTERNS.employeeId.test(id)) {
    showError(loginError, 'Please enter a valid Employee ID (letters and numbers only).');
    return;
  }
  
  const dob = normalizeDob(dobRaw);
  if (!dob) {
    showError(loginError, 'Please enter a valid DOB in DD/MM/YYYY format.');
    return;
  }

  setLoading(loginBtn, true, 'Continue');

  try {
    const res = await fetch(`${apiBase}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: id, dob })
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Login failed');
    }
    const data = await res.json();
    sessionToken = data.token;
    employeeId = id;
    items = data.items || [];
    renderRecords(items);
    loginSection.classList.add('hidden');
    recordsSection.classList.remove('hidden');
    resetSessionTimeout();
  } catch (err) {
    showError(loginError, err.message || 'Login failed. Please try again.');
  } finally {
    setLoading(loginBtn, false, 'Continue');
  }
});

function renderRecords(items) {
  recordsBody.innerHTML = '';
  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    const missing = (v) => !v || v === '' || v === null;

    const emiratesIdMissing = missing(item.emiratesId);
    const passportMissing = missing(item.passportNumber);
    const visaMissing = missing(item.visaUnifiedNumber);

    if (emiratesIdMissing || passportMissing || visaMissing) tr.classList.add('flag-missing');

    // Sanitize all displayed values
    const relation = sanitizeInput(item.relation || '');
    const fullName = [item.firstName, item.middleName, item.lastName]
      .filter(Boolean)
      .map(n => sanitizeInput(n))
      .join(' ');
    const dob = sanitizeInput(item.dob || '');
    const emiratesId = sanitizeInput(item.emiratesId || '');
    const passportNumber = sanitizeInput(item.passportNumber || '');
    const visaUnifiedNumber = sanitizeInput(item.visaUnifiedNumber || '');
    const employeeNotes = sanitizeInput(item.employeeNotes || '');
    const itemId = sanitizeInput(item.itemId || '');

    tr.innerHTML = `
      <td>${relation}</td>
      <td>${fullName}</td>
      <td>${dob}</td>
      <td>
        <input data-id="${itemId}" data-field="emiratesId"
               value="${emiratesId}" placeholder="784xxxxxxxxxxxx"
               inputmode="numeric" pattern="^[0-9]{10,18}$"
               aria-label="Emirates ID for ${fullName}" />
      </td>
      <td>
        <input data-id="${itemId}" data-field="passportNumber"
               value="${passportNumber}" placeholder="Passport No."
               pattern="^[A-Za-z0-9]{5,20}$"
               aria-label="Passport number for ${fullName}" />
      </td>
      <td>
        <input data-id="${itemId}" data-field="visaUnifiedNumber"
               value="${visaUnifiedNumber}" placeholder="Visa Unified No."
               inputmode="numeric" pattern="^[0-9]{6,20}$"
               aria-label="Visa unified number for ${fullName}" />
      </td>
      <td>
        <textarea data-id="${itemId}" data-field="employeeNotes"
                  placeholder="Add notes if any"
                  aria-label="Notes for ${fullName}">${employeeNotes}</textarea>
      </td>
    `;
    recordsBody.appendChild(tr);
  });
}

saveBtn.addEventListener('click', async () => {
  saveMsg.textContent = '';
  saveMsg.classList.remove('error', 'success');
  
  const inputs = recordsBody.querySelectorAll('input, textarea');
  const updatesByItem = {};
  let hasValidationError = false;
  
  inputs.forEach(el => {
    const itemId = el.getAttribute('data-id');
    const field = el.getAttribute('data-field');
    const value = el.value.trim();
    
    // Validate inputs before sending using centralized patterns
    if (field === 'emiratesId' && value && !VALIDATION_PATTERNS.emiratesId.test(value.replace(/\D/g, ''))) {
      el.setCustomValidity('Emirates ID must be 10-18 digits');
      hasValidationError = true;
    } else if (field === 'passportNumber' && value && !VALIDATION_PATTERNS.passportNumber.test(value)) {
      el.setCustomValidity('Passport number must be 5-20 alphanumeric characters');
      hasValidationError = true;
    } else if (field === 'visaUnifiedNumber' && value && !VALIDATION_PATTERNS.visaUnifiedNumber.test(value.replace(/\D/g, ''))) {
      el.setCustomValidity('Visa Unified Number must be 6-20 digits');
      hasValidationError = true;
    } else {
      el.setCustomValidity('');
    }
    
    if (!updatesByItem[itemId]) updatesByItem[itemId] = {};
    updatesByItem[itemId][field] = value;
  });

  if (hasValidationError) {
    showError(saveMsg, 'Please correct the highlighted fields.');
    return;
  }

  const payload = Object.entries(updatesByItem).map(([itemId, fields]) => ({ itemId, fields }));

  setLoading(saveBtn, true, 'Save Updates');

  try {
    const res = await fetch(`${apiBase}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionToken },
      body: JSON.stringify({ employeeId, updates: payload })
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Save failed');
    }
    const data = await res.json();
    showSuccess(saveMsg, `Successfully saved ${data.updated} item(s). Thank you!`);
  } catch (err) {
    showError(saveMsg, `Error: ${err.message}`);
  } finally {
    setLoading(saveBtn, false, 'Save Updates');
  }
});

logoutBtn.addEventListener('click', () => {
  sessionToken = null;
  employeeId = null;
  items = [];
  recordsBody.innerHTML = '';
  document.getElementById('employeeId').value = '';
  document.getElementById('dob').value = '';
  loginError.classList.add('hidden');
  saveMsg.textContent = '';
  recordsSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  document.getElementById('employeeId').focus();
  if (sessionTimeout) clearTimeout(sessionTimeout);
});

// Session timeout warning
let sessionTimeout;
function resetSessionTimeout() {
  if (sessionTimeout) clearTimeout(sessionTimeout);
  if (sessionToken) {
    // Warn after 50 minutes (token expires after 60 minutes)
    sessionTimeout = setTimeout(() => {
      if (sessionToken) {
        showSessionWarning();
      }
    }, 50 * 60 * 1000);
  }
}

// Reset timeout on user activity
document.addEventListener('click', resetSessionTimeout);
document.addEventListener('keypress', resetSessionTimeout);
