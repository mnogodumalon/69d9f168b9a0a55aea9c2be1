// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS, LOOKUP_OPTIONS, FIELD_TYPES } from '@/types/app';
import type { Benutzerrollen, Wissensobjekte, Wissenslandkarten, FeedbackUndVersionen, ObjektVerlinkungen, KartenKnoten, ObjektFeedbackZuordnung, CreateBenutzerrollen, CreateWissensobjekte, CreateWissenslandkarten, CreateFeedbackUndVersionen, CreateObjektVerlinkungen, CreateKartenKnoten, CreateObjektFeedbackZuordnung } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: unknown): string | null {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) window.dispatchEvent(new Event('auth-error'));
    throw new Error(await response.text());
  }
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

/** Upload a file to LivingApps. Returns the file URL for use in record fields. */
export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename ?? (file instanceof File ? file.name : 'upload'));
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) window.dispatchEvent(new Event('auth-error'));
    throw new Error(`File upload failed: ${res.status}`);
  }
  const data = await res.json();
  return data.url;
}

function enrichLookupFields<T extends { fields: Record<string, unknown> }>(
  records: T[], entityKey: string
): T[] {
  const opts = LOOKUP_OPTIONS[entityKey];
  if (!opts) return records;
  return records.map(r => {
    const fields = { ...r.fields };
    for (const [fieldKey, options] of Object.entries(opts)) {
      const val = fields[fieldKey];
      if (typeof val === 'string') {
        const m = options.find(o => o.key === val);
        fields[fieldKey] = m ?? { key: val, label: val };
      } else if (Array.isArray(val)) {
        fields[fieldKey] = val.map(v => {
          if (typeof v === 'string') {
            const m = options.find(o => o.key === v);
            return m ?? { key: v, label: v };
          }
          return v;
        });
      }
    }
    return { ...r, fields } as T;
  });
}

/** Normalize fields for API writes: strip lookup objects to keys, fix date formats. */
export function cleanFieldsForApi(
  fields: Record<string, unknown>,
  entityKey: string
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...fields };
  for (const [k, v] of Object.entries(clean)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'key' in v) clean[k] = (v as any).key;
    if (Array.isArray(v)) clean[k] = v.map((item: any) => item && typeof item === 'object' && 'key' in item ? item.key : item);
  }
  const types = FIELD_TYPES[entityKey];
  if (types) {
    for (const [k, ft] of Object.entries(types)) {
      if (!(k in clean)) continue;
      const val = clean[k];
      // applookup fields: undefined → null (clear single reference)
      if ((ft === 'applookup/select' || ft === 'applookup/choice') && val === undefined) { clean[k] = null; continue; }
      // multipleapplookup fields: undefined/null → [] (clear multi reference)
      if ((ft === 'multipleapplookup/select' || ft === 'multipleapplookup/choice') && (val === undefined || val === null)) { clean[k] = []; continue; }
      // lookup fields: undefined → null (clear single lookup)
      if ((ft.startsWith('lookup/')) && val === undefined) { clean[k] = null; continue; }
      // multiplelookup fields: undefined/null → [] (clear multi lookup)
      if ((ft.startsWith('multiplelookup/')) && (val === undefined || val === null)) { clean[k] = []; continue; }
      if (typeof val !== 'string' || !val) continue;
      if (ft === 'date/datetimeminute') clean[k] = val.slice(0, 16);
      else if (ft === 'date/date') clean[k] = val.slice(0, 10);
    }
  }
  return clean;
}

let _cachedUserProfile: Record<string, unknown> | null = null;

export async function getUserProfile(): Promise<Record<string, unknown>> {
  if (_cachedUserProfile) return _cachedUserProfile;
  const raw = await callApi('GET', '/user');
  const skip = new Set(['id', 'image', 'lang', 'gender', 'title', 'fax', 'menus', 'initials']);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && !skip.has(k)) data[k] = v;
  }
  _cachedUserProfile = data;
  return data;
}

export interface HeaderProfile {
  firstname: string;
  surname: string;
  email: string;
  image: string | null;
  company: string | null;
}

let _cachedHeaderProfile: HeaderProfile | null = null;

export async function getHeaderProfile(): Promise<HeaderProfile> {
  if (_cachedHeaderProfile) return _cachedHeaderProfile;
  const raw = await callApi('GET', '/user');
  _cachedHeaderProfile = {
    firstname: raw.firstname ?? '',
    surname: raw.surname ?? '',
    email: raw.email ?? '',
    image: raw.image ?? null,
    company: raw.company ?? null,
  };
  return _cachedHeaderProfile;
}

export interface AppGroupInfo {
  id: string;
  name: string;
  image: string | null;
  createdat: string;
  /** Resolved link: /objects/{id}/ if the dashboard exists, otherwise /gateway/apps/{firstAppId}?template=list_page */
  href: string;
}

let _cachedAppGroups: AppGroupInfo[] | null = null;

export async function getAppGroups(): Promise<AppGroupInfo[]> {
  if (_cachedAppGroups) return _cachedAppGroups;
  const raw = await callApi('GET', '/appgroups?with=apps');
  const groups: AppGroupInfo[] = Object.values(raw)
    .map((g: any) => {
      const firstAppId = Object.keys(g.apps ?? {})[0] ?? g.id;
      return {
        id: g.id,
        name: g.name,
        image: g.image ?? null,
        createdat: g.createdat ?? '',
        href: `/gateway/apps/${firstAppId}?template=list_page`,
        _firstAppId: firstAppId,
      };
    })
    .sort((a, b) => b.createdat.localeCompare(a.createdat));

  // Check which appgroups have a deployed dashboard via app params
  const paramChecks = await Promise.allSettled(
    groups.map(g => callApi('GET', `/apps/${(g as any)._firstAppId}/params/la_page_header_additional_url`))
  );
  paramChecks.forEach((result, i) => {
    if (result.status !== 'fulfilled' || !result.value) return;
    const url = result.value.value;
    if (typeof url === 'string' && url.length > 0) {
      try { groups[i].href = new URL(url).pathname; } catch { groups[i].href = url; }
    }
  });

  // Clean up internal helper property
  groups.forEach(g => delete (g as any)._firstAppId);

  _cachedAppGroups = groups;
  return _cachedAppGroups;
}

export class LivingAppsService {
  // --- BENUTZERROLLEN ---
  static async getBenutzerrollen(): Promise<Benutzerrollen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.BENUTZERROLLEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Benutzerrollen[];
    return enrichLookupFields(records, 'benutzerrollen');
  }
  static async getBenutzerrollenEntry(id: string): Promise<Benutzerrollen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.BENUTZERROLLEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Benutzerrollen;
    return enrichLookupFields([record], 'benutzerrollen')[0];
  }
  static async createBenutzerrollenEntry(fields: CreateBenutzerrollen) {
    return callApi('POST', `/apps/${APP_IDS.BENUTZERROLLEN}/records`, { fields: cleanFieldsForApi(fields as any, 'benutzerrollen') });
  }
  static async updateBenutzerrollenEntry(id: string, fields: Partial<CreateBenutzerrollen>) {
    return callApi('PATCH', `/apps/${APP_IDS.BENUTZERROLLEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'benutzerrollen') });
  }
  static async deleteBenutzerrollenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.BENUTZERROLLEN}/records/${id}`);
  }

  // --- WISSENSOBJEKTE ---
  static async getWissensobjekte(): Promise<Wissensobjekte[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.WISSENSOBJEKTE}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Wissensobjekte[];
    return enrichLookupFields(records, 'wissensobjekte');
  }
  static async getWissensobjekteEntry(id: string): Promise<Wissensobjekte | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.WISSENSOBJEKTE}/records/${id}`);
    const record = { record_id: data.id, ...data } as Wissensobjekte;
    return enrichLookupFields([record], 'wissensobjekte')[0];
  }
  static async createWissensobjekteEntry(fields: CreateWissensobjekte) {
    return callApi('POST', `/apps/${APP_IDS.WISSENSOBJEKTE}/records`, { fields: cleanFieldsForApi(fields as any, 'wissensobjekte') });
  }
  static async updateWissensobjekteEntry(id: string, fields: Partial<CreateWissensobjekte>) {
    return callApi('PATCH', `/apps/${APP_IDS.WISSENSOBJEKTE}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'wissensobjekte') });
  }
  static async deleteWissensobjekteEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.WISSENSOBJEKTE}/records/${id}`);
  }

  // --- WISSENSLANDKARTEN ---
  static async getWissenslandkarten(): Promise<Wissenslandkarten[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.WISSENSLANDKARTEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Wissenslandkarten[];
    return enrichLookupFields(records, 'wissenslandkarten');
  }
  static async getWissenslandkartenEntry(id: string): Promise<Wissenslandkarten | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.WISSENSLANDKARTEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Wissenslandkarten;
    return enrichLookupFields([record], 'wissenslandkarten')[0];
  }
  static async createWissenslandkartenEntry(fields: CreateWissenslandkarten) {
    return callApi('POST', `/apps/${APP_IDS.WISSENSLANDKARTEN}/records`, { fields: cleanFieldsForApi(fields as any, 'wissenslandkarten') });
  }
  static async updateWissenslandkartenEntry(id: string, fields: Partial<CreateWissenslandkarten>) {
    return callApi('PATCH', `/apps/${APP_IDS.WISSENSLANDKARTEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'wissenslandkarten') });
  }
  static async deleteWissenslandkartenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.WISSENSLANDKARTEN}/records/${id}`);
  }

  // --- FEEDBACK_UND_VERSIONEN ---
  static async getFeedbackUndVersionen(): Promise<FeedbackUndVersionen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.FEEDBACK_UND_VERSIONEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as FeedbackUndVersionen[];
    return enrichLookupFields(records, 'feedback_und_versionen');
  }
  static async getFeedbackUndVersionenEntry(id: string): Promise<FeedbackUndVersionen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.FEEDBACK_UND_VERSIONEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as FeedbackUndVersionen;
    return enrichLookupFields([record], 'feedback_und_versionen')[0];
  }
  static async createFeedbackUndVersionenEntry(fields: CreateFeedbackUndVersionen) {
    return callApi('POST', `/apps/${APP_IDS.FEEDBACK_UND_VERSIONEN}/records`, { fields: cleanFieldsForApi(fields as any, 'feedback_und_versionen') });
  }
  static async updateFeedbackUndVersionenEntry(id: string, fields: Partial<CreateFeedbackUndVersionen>) {
    return callApi('PATCH', `/apps/${APP_IDS.FEEDBACK_UND_VERSIONEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'feedback_und_versionen') });
  }
  static async deleteFeedbackUndVersionenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.FEEDBACK_UND_VERSIONEN}/records/${id}`);
  }

  // --- OBJEKT_VERLINKUNGEN ---
  static async getObjektVerlinkungen(): Promise<ObjektVerlinkungen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.OBJEKT_VERLINKUNGEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as ObjektVerlinkungen[];
    return enrichLookupFields(records, 'objekt_verlinkungen');
  }
  static async getObjektVerlinkungenEntry(id: string): Promise<ObjektVerlinkungen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.OBJEKT_VERLINKUNGEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as ObjektVerlinkungen;
    return enrichLookupFields([record], 'objekt_verlinkungen')[0];
  }
  static async createObjektVerlinkungenEntry(fields: CreateObjektVerlinkungen) {
    return callApi('POST', `/apps/${APP_IDS.OBJEKT_VERLINKUNGEN}/records`, { fields: cleanFieldsForApi(fields as any, 'objekt_verlinkungen') });
  }
  static async updateObjektVerlinkungenEntry(id: string, fields: Partial<CreateObjektVerlinkungen>) {
    return callApi('PATCH', `/apps/${APP_IDS.OBJEKT_VERLINKUNGEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'objekt_verlinkungen') });
  }
  static async deleteObjektVerlinkungenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.OBJEKT_VERLINKUNGEN}/records/${id}`);
  }

  // --- KARTEN_KNOTEN ---
  static async getKartenKnoten(): Promise<KartenKnoten[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.KARTEN_KNOTEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as KartenKnoten[];
    return enrichLookupFields(records, 'karten_knoten');
  }
  static async getKartenKnotenEntry(id: string): Promise<KartenKnoten | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.KARTEN_KNOTEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as KartenKnoten;
    return enrichLookupFields([record], 'karten_knoten')[0];
  }
  static async createKartenKnotenEntry(fields: CreateKartenKnoten) {
    return callApi('POST', `/apps/${APP_IDS.KARTEN_KNOTEN}/records`, { fields: cleanFieldsForApi(fields as any, 'karten_knoten') });
  }
  static async updateKartenKnotenEntry(id: string, fields: Partial<CreateKartenKnoten>) {
    return callApi('PATCH', `/apps/${APP_IDS.KARTEN_KNOTEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'karten_knoten') });
  }
  static async deleteKartenKnotenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.KARTEN_KNOTEN}/records/${id}`);
  }

  // --- OBJEKT_FEEDBACK_ZUORDNUNG ---
  static async getObjektFeedbackZuordnung(): Promise<ObjektFeedbackZuordnung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.OBJEKT_FEEDBACK_ZUORDNUNG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as ObjektFeedbackZuordnung[];
    return enrichLookupFields(records, 'objekt_feedback_zuordnung');
  }
  static async getObjektFeedbackZuordnungEntry(id: string): Promise<ObjektFeedbackZuordnung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.OBJEKT_FEEDBACK_ZUORDNUNG}/records/${id}`);
    const record = { record_id: data.id, ...data } as ObjektFeedbackZuordnung;
    return enrichLookupFields([record], 'objekt_feedback_zuordnung')[0];
  }
  static async createObjektFeedbackZuordnungEntry(fields: CreateObjektFeedbackZuordnung) {
    return callApi('POST', `/apps/${APP_IDS.OBJEKT_FEEDBACK_ZUORDNUNG}/records`, { fields: cleanFieldsForApi(fields as any, 'objekt_feedback_zuordnung') });
  }
  static async updateObjektFeedbackZuordnungEntry(id: string, fields: Partial<CreateObjektFeedbackZuordnung>) {
    return callApi('PATCH', `/apps/${APP_IDS.OBJEKT_FEEDBACK_ZUORDNUNG}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'objekt_feedback_zuordnung') });
  }
  static async deleteObjektFeedbackZuordnungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.OBJEKT_FEEDBACK_ZUORDNUNG}/records/${id}`);
  }

}