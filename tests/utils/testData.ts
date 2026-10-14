/** One client as typed into the form. Keys match the control names: `txt<Key>`. */
export type ClientData = {
  CompanyName: string;
  RegistrationNumber: string;
  Industry: string;
  Website: string;
  Country: string;
  ContactName: string;
  ContactEmail: string;
  ContactPhone: string;
  Address: string;
  Notes: string;
};

export type ClientField = keyof ClientData;

/** Form field → SharePoint column (display name) that the app's Patch writes to. */
export const COLUMN: Record<ClientField, string> = {
  CompanyName: 'Title',
  RegistrationNumber: 'Registration Number',
  Industry: 'Industry',
  Website: 'Website',
  Country: 'Country',
  ContactName: 'Contact Name',
  ContactEmail: 'Contact Email',
  ContactPhone: 'Contact Phone',
  Address: 'Address',
  Notes: 'Notes',
};

/** Fields in form (tab) order: left column, then right column. */
export const FIELDS: ClientField[] = [
  'CompanyName',
  'RegistrationNumber',
  'Industry',
  'Website',
  'Country',
  'ContactName',
  'ContactEmail',
  'ContactPhone',
  'Address',
  'Notes',
];

/** Fields the app requires before Submit is enabled. */
export const REQUIRED_FIELDS: ClientField[] = ['CompanyName', 'ContactName', 'ContactEmail'];

/** Label text shown above each field. */
export const LABEL: Record<ClientField, string> = {
  CompanyName: 'Company Name',
  RegistrationNumber: 'Registration Number',
  Industry: 'Industry',
  Website: 'Website',
  Country: 'Country',
  ContactName: 'Contact Name',
  ContactEmail: 'Contact Email',
  ContactPhone: 'Contact Phone',
  Address: 'Address',
  Notes: 'Notes',
};

export function pick<K extends ClientField>(data: ClientData, keys: readonly K[]): Pick<ClientData, K> {
  return Object.fromEntries(keys.map((key) => [key, data[key]])) as Pick<ClientData, K>;
}

/** Prefix of every record the tests create (in Company Name / Title), used by cleanup. */
export const TEST_PREFIX = 'E2E-';

let counter = 0;

/** A unique test id, e.g. `E2E-lq3k2f-1`. Searching the list for it finds this test's records only. */
export function uniqueId(): string {
  counter += 1;
  return `${TEST_PREFIX}${Date.now().toString(36)}-${counter}`;
}

/** A complete, valid client with unique values. */
export function newClient(overrides: Partial<ClientData> = {}): ClientData {
  const id = uniqueId();
  const tag = id.slice(TEST_PREFIX.length);
  return {
    CompanyName: `${id} Contoso Ltd`,
    RegistrationNumber: `HRB ${tag}`,
    Industry: 'Manufacturing',
    Website: `https://contoso-${tag}.example.com`,
    Country: 'Germany',
    ContactName: 'Erika Mustermann',
    ContactEmail: `erika.${tag}@example.com`,
    ContactPhone: '+49 30 1234567',
    Address: 'Musterstraße 1, 10115 Berlin',
    Notes: `Created by an automated test.\nSecond line of notes (${tag}).`,
    ...overrides,
  };
}
