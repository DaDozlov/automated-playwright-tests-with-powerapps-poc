/** Every company created by the tests starts with this, so cleanup can find them. */
export const TEST_PREFIX = 'E2E-';

/** Keys match the app's control names: txt<Key>. */
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

/** SharePoint column display name for each field. */
export const COLUMN: Record<keyof ClientData, string> = {
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

/** All fields, in form order. */
export const FIELDS = Object.keys(COLUMN) as (keyof ClientData)[];

/** Fields the form requires before Submit is enabled. */
export const REQUIRED_FIELDS: (keyof ClientData)[] = ['CompanyName', 'ContactName', 'ContactEmail'];

/** Only the given fields of a client, e.g. pick(client, REQUIRED_FIELDS). */
export function pick(client: ClientData, fields: (keyof ClientData)[]): Partial<ClientData> {
  return Object.fromEntries(fields.map((f) => [f, client[f]]));
}

export function newClient(overrides: Partial<ClientData> = {}): ClientData {
  const id = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return {
    CompanyName: `${TEST_PREFIX}Panda GmbH ${id}`,
    RegistrationNumber: `HRB ${id}`,
    Industry: 'IT',
    Website: 'https://example.com',
    Country: 'Germany',
    ContactName: 'Erika Mustermann',
    ContactEmail: `erika.${id}@example.com`,
    ContactPhone: '+49 30 1234567',
    Address: 'Musterstraße 1, 10115 Berlin',
    Notes: 'Created by Playwright',
    ...overrides,
  };
}
