import { request, type APIRequestContext } from '@playwright/test';
import { AUTH_FILE, env } from './env';
import { TEST_PREFIX } from './testData';

/**
 * Small SharePoint REST client that reuses the signed-in browser session
 * (FedAuth cookies saved by auth.setup.ts), so no app registration is needed.
 */
export class SharePointList {
  private constructor(private readonly api: APIRequestContext) {}

  static async open(): Promise<SharePointList> {
    const api = await request.newContext({
      storageState: AUTH_FILE,
      extraHTTPHeaders: { Accept: 'application/json;odata=nometadata' },
    });
    return new SharePointList(api);
  }

  async dispose() {
    await this.api.dispose();
  }

  private get listUrl() {
    return `${env.spSiteUrl}/_api/web/lists/getbytitle('${odata(env.spListTitle)}')`;
  }

  private async getJson(url: string) {
    const res = await this.api.get(url);
    if (!res.ok()) throw new Error(`GET ${url} → ${res.status()} ${await res.text()}`);
    return res.json();
  }

  /** Display name → internal name, e.g. "Registration Number" → "Registration_x0020_Number". */
  private async columnMap(): Promise<Map<string, string>> {
    const data = await this.getJson(`${this.listUrl}/fields?$filter=Hidden eq false and ReadOnlyField eq false&$select=Title,InternalName`);
    return new Map(data.value.map((f: { Title: string; InternalName: string }) => [f.Title, f.InternalName]));
  }

  /** Items whose Company Name (Title) matches, with values keyed by column display name. */
  async findByCompanyName(companyName: string): Promise<Record<string, unknown>[]> {
    return this.findBy('Company Name', companyName);
  }

  /** Like findByCompanyName, but waits until the item exists (SharePoint can lag a few seconds). */
  async waitForCompany(companyName: string, timeoutMs = 20_000): Promise<Record<string, unknown>[]> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const items = await this.findByCompanyName(companyName);
      if (items.length > 0 || Date.now() > deadline) return items;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  /** Items where the column (by display name, e.g. "Registration Number") equals the value. */
  async findBy(column: string, value: string): Promise<Record<string, unknown>[]> {
    const columns = await this.columnMap();
    // The Title column's display name depends on renames and site language ("Title", "Titel", ...).
    const internal = column === 'Company Name' ? 'Title' : columns.get(column);
    if (!internal) throw new Error(`Column "${column}" not found in list "${env.spListTitle}"`);

    const data = await this.getJson(`${this.listUrl}/items?$filter=${internal} eq '${odata(value)}'`);
    return data.value.map((item: Record<string, unknown>) => {
      const byDisplayName: Record<string, unknown> = { Id: item.Id };
      for (const [display, internal] of columns) byDisplayName[display] = item[internal];
      byDisplayName['Company Name'] = item.Title;
      return byDisplayName;
    });
  }

  /** Deletes every item created by the tests (Company Name starts with TEST_PREFIX). */
  async deleteTestItems(): Promise<number> {
    const data = await this.getJson(
      `${this.listUrl}/items?$select=Id&$top=500&$filter=startswith(Title,'${odata(TEST_PREFIX)}')`,
    );
    if (data.value.length === 0) return 0;

    const digest = await this.formDigest();
    for (const { Id } of data.value as { Id: number }[]) {
      const res = await this.api.post(`${this.listUrl}/items(${Id})`, {
        headers: { 'X-RequestDigest': digest, 'IF-MATCH': '*', 'X-HTTP-Method': 'DELETE' },
      });
      if (!res.ok()) throw new Error(`DELETE item ${Id} → ${res.status()} ${await res.text()}`);
    }
    return data.value.length;
  }

  private async formDigest(): Promise<string> {
    const res = await this.api.post(`${env.spSiteUrl}/_api/contextinfo`);
    if (!res.ok()) throw new Error(`contextinfo → ${res.status()} ${await res.text()}`);
    return (await res.json()).FormDigestValue;
  }
}

/** Escapes a value for use inside an OData string literal. */
function odata(value: string) {
  return value.replace(/'/g, "''");
}
