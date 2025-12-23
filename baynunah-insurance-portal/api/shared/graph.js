// api/shared/graph.js
import axios from 'axios';
import crypto from 'crypto';
import { ConfidentialClientApplication } from 'msal-node';

const {
  TENANT_ID, CLIENT_ID, CLIENT_SECRET,
  SITE_HOSTNAME, SITE_PATH, LIST_TITLE,
  STAFF_COLUMN_INTERNAL_NAME = 'Staff_x0020_Number',
  RELATION_COLUMN_INTERNAL_NAME = 'Relation',
  DOB_COLUMN_INTERNAL_NAME = 'Date_x0020_Of_x0020_Birth',
  EMIRATESID_COLUMN_INTERNAL_NAME = 'National_x0020_Identity',
  PASSPORT_COLUMN_INTERNAL_NAME = 'Passport_x0020_number',
  VISA_COLUMN_INTERNAL_NAME = 'Visa_x0020_Unified_x0020_Number',
  EMP_NOTES_COLUMN_INTERNAL_NAME = 'Employee_x0020_Notes',
  TOKEN_SECRET = 'change_me'
} = process.env;

const msalConfig = {
  auth: { clientId: CLIENT_ID, authority: `https://login.microsoftonline.com/${TENANT_ID}`, clientSecret: CLIENT_SECRET }
};
const cca = new ConfidentialClientApplication(msalConfig);

async function getToken() {
  const result = await cca.acquireTokenByClientCredential({ scopes: ['https://graph.microsoft.com/.default'] });
  return result.accessToken;
}

async function getSiteId(accessToken) {
  const url = `https://graph.microsoft.com/v1.0/sites/${SITE_HOSTNAME}:${SITE_PATH}`;
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  return data.id;
}

async function getListId(accessToken, siteId) {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`;
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const match = (data.value || []).find(l => l.displayName === LIST_TITLE);
  if (!match) throw new Error(`List '${LIST_TITLE}' not found`);
  return match.id;
}

async function getItemsByEmployeeId(accessToken, siteId, listId, employeeId) {
  const filter = `fields/${STAFF_COLUMN_INTERNAL_NAME} eq '${employeeId}'`;
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$filter=${encodeURIComponent(filter)}&$top=500`;
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  return data.value || [];
}

function normalizeDob(d) {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

function pickField(fields, name) {
  return fields?.[name];
}

function toDto(item) {
  const f = item.fields || {};
  return {
    itemId: item.id,
    relation: pickField(f, RELATION_COLUMN_INTERNAL_NAME),
    firstName: pickField(f, 'Member_x0020_First_x0020_Name'),
    middleName: pickField(f, 'Member_x0020_Middle_x0020_Name'),
    lastName: pickField(f, 'Member_x0020_Last_x0020_Name'),
    dob: pickField(f, DOB_COLUMN_INTERNAL_NAME),
    emiratesId: pickField(f, EMIRATESID_COLUMN_INTERNAL_NAME),
    passportNumber: pickField(f, PASSPORT_COLUMN_INTERNAL_NAME),
    visaUnifiedNumber: pickField(f, VISA_COLUMN_INTERNAL_NAME),
    employeeNotes: pickField(f, EMP_NOTES_COLUMN_INTERNAL_NAME)
  };
}

function issueToken(employeeId) {
  const ts = Math.floor(Date.now() / 1000);
  const payload = `${employeeId}|${ts}`;
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}
function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [employeeId, tsStr, sig] = decoded.split('|');
    const now = Math.floor(Date.now() / 1000);
    if (now - Number(tsStr) > 3600) return null;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${employeeId}|${tsStr}`).digest('hex');
    if (expected !== sig) return null;
    return { employeeId };
  } catch {
    return null;
  }
}

async function patchItemFields(accessToken, siteId, listId, itemId, fields) {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/fields`;
  const { data } = await axios.patch(url, fields, { headers: { Authorization: `Bearer ${accessToken}` } });
  return data;
}

export {
  getToken, getSiteId, getListId, getItemsByEmployeeId,
  normalizeDob, toDto, issueToken, verifyToken, patchItemFields,
  EMIRATESID_COLUMN_INTERNAL_NAME, PASSPORT_COLUMN_INTERNAL_NAME,
  VISA_COLUMN_INTERNAL_NAME, EMP_NOTES_COLUMN_INTERNAL_NAME
};
