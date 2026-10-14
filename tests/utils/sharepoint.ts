import { expect, request, type APIRequestContext } from '@playwright/test';
import { AUTH_FILE, env } from './env';
import { TEST_PREFIX } from './testData';

/** A list item keyed by column display name, plus its `Id`. */
export type ListItem = { Id: number } & Record<string, unknown>;

const POLL_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 1_000;

function odataString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Minimal SharePoint REST client for the app's list.
 * Reuses the signed-in browser cookies from AUTH_FILE, so no app registration is needed.
 */
export class SharePointList {
  private constructor(
    private readonly api: APIRequestContext,
    private readonly listUrl: string,
    /** display name → internal name */
    private readonly fields: Map<string, string>,
  ) {}

  static async open(): Promise<SharePointList> {
    const api = await request.newContext({
      storageState: AUTH_FILE,
      extraHTTPHeaders: { Accept: 'application/json;odata=nometadata' },
    });
    const listUrl = `${env.spSiteUrl}/_api/web/lists/getbytitle(${odataString(env.spListTitle)})`;
    const response = await api.get(`${listUrl}/fields?$filter=Hidden eq false and ReadOnlyField eq false&$select=Title,InternalName`);
    if (!response.ok()) {
      throw new Error(`Cannot read list "${env.spListTitle}" (${response.status()}). Run "npm run login" again. ${await response.text()}`);
    }
    const { value } = (await response.json()) as { value: { Title: string; InternalName: string }[] };
    const fields = new Map(value.map((field) => [field.Title, field.InternalName]));
    // Title keeps its internal name, whatever its display name is
    fields.set('Title', 'Title');
    return new SharePointList(api, listUrl, fields);
  }

  internalName(column: string): string {
    const name = this.fields.get(column);
    if (!name) throw new Error(`Column "${column}" not found in list "${env.spListTitle}".`);
    return name;
  }

  private toItem(raw: Record<string, unknown>): ListItem {
    const item: ListItem = { Id: raw.Id as number };
    for (const [display, internal] of this.fields) {
      if (internal in raw) item[display] = raw[internal];
    }
    return item;
  }

  /** Items whose column equals the value. */
  async findBy(column: string, value: string): Promise<ListItem[]> {
    const filter = `${this.internalName(column)} eq ${odataString(value)}`;
    const response = await this.api.get(`${this.listUrl}/items`, { params: { $filter: filter, $top: '100' } });
    expect(response.ok(), await response.text()).toBeTruthy();
    const { value: items } = (await response.json()) as { value: Record<string, unknown>[] };
    return items.map((raw) => this.toItem(raw));
  }

  async getById(id: number): Promise<ListItem> {
    const response = await this.api.get(`${this.listUrl}/items(${id})`);
    expect(response.ok(), await response.text()).toBeTruthy();
    return this.toItem((await response.json()) as Record<string, unknown>);
  }

  /** Waits (SharePoint can lag) until exactly one item has this value in the column, and returns it. */
  async waitForItem(column: string, value: string): Promise<ListItem> {
    let items: ListItem[] = [];
    await expect
      .poll(
        async () => {
          items = await this.findBy(column, value);
          return items.length;
        },
        { timeout: POLL_TIMEOUT_MS, intervals: [POLL_INTERVAL_MS], message: `item with ${column} = "${value}"` },
      )
      .toBe(1);
    return items[0];
  }

  /** Checks that no item has this value in the column (nothing was saved). */
  async expectNoItem(column: string, value: string) {
    expect(await this.findBy(column, value), `no item with ${column} = "${value}"`).toHaveLength(0);
  }

  /** Items whose Title starts with the value. */
  async findByTitlePrefix(prefix: string): Promise<ListItem[]> {
    const response = await this.api.get(`${this.listUrl}/items`, {
      params: { $filter: `startswith(Title,${odataString(prefix)})`, $select: 'Id,Title', $top: '5000' },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    const { value } = (await response.json()) as { value: Record<string, unknown>[] };
    return value.map((raw) => this.toItem(raw));
  }

  /** Deletes every item the tests created (Title starts with E2E-). Returns how many were deleted. */
  async deleteTestItems(): Promise<number> {
    const items = await this.findByTitlePrefix(TEST_PREFIX);
    if (items.length === 0) return 0;
    const digest = await this.formDigest();
    for (const item of items) {
      const response = await this.api.post(`${this.listUrl}/items(${item.Id})`, {
        headers: { 'X-RequestDigest': digest, 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' },
      });
      if (!response.ok()) console.warn(`Could not delete item ${item.Id}: ${response.status()}`);
    }
    return items.length;
  }

  private async formDigest(): Promise<string> {
    const response = await this.api.post(`${env.spSiteUrl}/_api/contextinfo`);
    expect(response.ok(), await response.text()).toBeTruthy();
    return ((await response.json()) as { FormDigestValue: string }).FormDigestValue;
  }

  async dispose() {
    await this.api.dispose();
  }
}
