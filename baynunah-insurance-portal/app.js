// app.js
const apiBase = '/api';

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginSection = document.getElementById('loginSection');
const recordsSection = document.getElementById('recordsSection');
const recordsBody = document.getElementById('recordsBody');
const saveBtn = document.getElementById('saveBtn');
const logoutBtn = document.getElementById('logoutBtn');
const saveMsg = document.getElementById('saveMsg');

let sessionToken = null;
let employeeId = null;
let items = []; // list items returned from backend

function normalizeDob(d) {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1], mm = m[2], yyyy = m[3];
  return `${dd}/${mm}/${yyyy}`;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  saveMsg.textContent = '';

  const id = document.getElementById('employeeId').value.trim();
  const dobRaw = document.getElementById('dob').value.trim();
  const dob = normalizeDob(dobRaw);
  if (!dob) {
    loginError.textContent = 'Please enter DOB as DD/MM/YYYY.';
    loginError.classList.remove('hidden');
    return;
  }

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
  } catch (err) {
    loginError.textContent = err.message || 'Login failed. Please try again.';
    loginError.classList.remove('hidden');
  }
});

function renderRecords(items) {
  recordsBody.innerHTML = '';
  items.forEach(item => {
    const tr = document.createElement('tr');
    const missing = (v) => !v || v === '' || v === null;

    const emiratesIdMissing = missing(item.emiratesId);
    const passportMissing = missing(item.passportNumber);
    const visaMissing = missing(item.visaUnifiedNumber);

    if (emiratesIdMissing || passportMissing || visaMissing) tr.classList.add('flag-missing');

    tr.innerHTML = `
      <td>${item.relation || ''}</td>
      <td>${[item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ')}</td>
      <td>${item.dob || ''}</td>
      <td>
        <input data-id="${item.itemId}" data-field="emiratesId"
               value="${item.emiratesId || ''}" placeholder="7841xxxxxxxxxxx"
               inputmode="numeric" pattern="^[0-9]{10,18}$" />
      </td>
      <td>
        <input data-id="${item.itemId}" data-field="passportNumber"
               value="${item.passportNumber || ''}" placeholder="Passport No."
               pattern="^[A-Za-z0-9]{5,20}$" />
      </td>
      <td>
        <input data-id="${item.itemId}" data-field="visaUnifiedNumber"
               value="${item.visaUnifiedNumber || ''}" placeholder="UAE Visa Unified No."
               inputmode="numeric" pattern="^[0-9]{6,20}$" />
      </td>
      <td>
        <textarea data-id="${item.itemId}" data-field="employeeNotes"
                  placeholder="Add notes if any">${item.employeeNotes || ''}</textarea>
      </td>
    `;
    recordsBody.appendChild(tr);
  });
}

saveBtn.addEventListener('click', async () => {
  saveMsg.textContent = '';
  const inputs = recordsBody.querySelectorAll('input, textarea');
  const updatesByItem = {};
  inputs.forEach(el => {
    const itemId = el.getAttribute('data-id');
    const field = el.getAttribute('data-field');
    const value = el.value.trim();
    if (!updatesByItem[itemId]) updatesByItem[itemId] = {};
    updatesByItem[itemId][field] = value;
  });

  const payload = Object.entries(updatesByItem).map(([itemId, fields]) => ({ itemId, fields }));

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
    saveMsg.textContent = `Saved ${data.updated} item(s). Thank you!`;
  } catch (err) {
    saveMsg.textContent = `Error: ${err.message}`;
  }
});

logoutBtn.addEventListener('click', () => {
  sessionToken = null;
  employeeId = null;
  items = [];
  recordsBody.innerHTML = '';
  recordsSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
});
