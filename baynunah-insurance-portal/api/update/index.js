// api/update/index.js
import { app } from '@azure/functions';
import {
  getToken, getSiteId, getListId, patchItemFields, verifyToken,
  EMIRATESID_COLUMN_INTERNAL_NAME,
  PASSPORT_COLUMN_INTERNAL_NAME,
  VISA_COLUMN_INTERNAL_NAME,
  EMP_NOTES_COLUMN_INTERNAL_NAME
} from '../shared/graph.js';

function sanitizeFields(fields) {
  const clean = {};
  if ('emiratesId' in fields) {
    const s = String(fields.emiratesId || '').replace(/\D/g, '');
    if (s && !/^[0-9]{10,18}$/.test(s)) throw new Error('Invalid Emirates ID');
    clean[EMIRATESID_COLUMN_INTERNAL_NAME] = s || null;
  }
  if ('passportNumber' in fields) {
    const s = String(fields.passportNumber || '').trim();
    if (s && !/^[A-Za-z0-9]{5,20}$/.test(s)) throw new Error('Invalid Passport Number');
    clean[PASSPORT_COLUMN_INTERNAL_NAME] = s || null;
  }
  if ('visaUnifiedNumber' in fields) {
    const s = String(fields.visaUnifiedNumber || '').replace(/\D/g, '');
    if (s && !/^[0-9]{6,20}$/.test(s)) throw new Error('Invalid Visa Unified Number');
    clean[VISA_COLUMN_INTERNAL_NAME] = s || null;
  }
  if ('employeeNotes' in fields) {
    const s = String(fields.employeeNotes || '').trim();
    clean[EMP_NOTES_COLUMN_INTERNAL_NAME] = s || null;
  }
  return clean;
}

app.http('update', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req, ctx) => {
    try {
      const tokenHeader = req.headers.get('x-session-token');
      const verified = verifyToken(tokenHeader);
      if (!verified) return { status: 401, body: 'Invalid or expired session' };

      const body = await req.json();
      const updates = body?.updates || [];
      if (!Array.isArray(updates) || updates.length === 0) {
        return { status: 400, body: 'No updates provided' };
      }

      const access = await getToken();
      const siteId = await getSiteId(access);
      const listId = await getListId(access, siteId);

      let updated = 0;
      for (const u of updates) {
        const fieldsClean = sanitizeFields(u.fields || {});
        if (Object.keys(fieldsClean).length === 0) continue;
        await patchItemFields(access, siteId, listId, u.itemId, fieldsClean);
        updated++;
      }

      return { status: 200, jsonBody: { updated } };
    } catch (e) {
      ctx.log('Update error', e?.message, e?.stack);
      const status = /Invalid/.test(e?.message) ? 400 : 500;
      return { status, body: e?.message || 'Server error' };
    }
  }
});
