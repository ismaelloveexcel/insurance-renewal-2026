// api/login/index.js
import { app } from '@azure/functions';
import {
  getToken, getSiteId, getListId, getItemsByEmployeeId,
  normalizeDob, toDto, issueToken
} from '../shared/graph.js';

app.http('login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req, ctx) => {
    try {
      const body = await req.json();
      const employeeId = (body?.employeeId || '').trim();
      const dobInput = normalizeDob(body?.dob || '');
      if (!employeeId || !dobInput) {
        return { status: 400, body: 'Invalid input' };
      }

      const token = await getToken();
      const siteId = await getSiteId(token);
      const listId = await getListId(token, siteId);
      const items = await getItemsByEmployeeId(token, siteId, listId, employeeId);
      if (!items.length) return { status: 404, body: 'No records found for this Employee ID' };

      const principal = items.find(i => (i.fields?.Relation) === 'PRINCIPAL');
      const dobPrincipal = principal?.fields?.Date_x0020_Of_x0020_Birth;
      if (!dobPrincipal || dobPrincipal !== dobInput) {
        return { status: 401, body: 'DOB does not match the PRINCIPAL record' };
      }

      const dtos = items.map(toDto);
      const sessionToken = issueToken(employeeId);
      return { status: 200, jsonBody: { token: sessionToken, items: dtos } };
    } catch (e) {
      ctx.log('Login error', e?.message, e?.stack);
      return { status: 500, body: 'Server error' };
    }
  }
});
