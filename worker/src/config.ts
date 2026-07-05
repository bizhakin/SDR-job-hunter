export const envConfig = {
  supabaseUrl: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
}

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}. Set it in .env`)
  }
  return value
}

export const greenhouseBoards = [
  'stripe',
  'hubspot',
  'zapier',
  'gitlab',
  'webflow',
  'calendly',
  'dropbox',
  'canva',
  'deel',
  'remote',
  'brex',
  'ramp',
  'gong',
  'outreach',
  'pipedrive',
  'airtable',
  'notion',
  'reddit',
  'twilio',
  'coinbase',
  'plaid',
  'datadog',
  'mongodb',
  'shopify',
  'amplitude',
]

export const leverBoards = [
  'intercom',
  'figma',
  'carta',
  'cultureamp',
  'pagerduty',
  'grammarly',
  'mercari',
  'starburst',
  'workiva',
  'huntress',
]

export const keywordTaxonomy: Record<string, string[]> = {
  closer: [
    'closer',
    'high ticket closer',
    'sales closer',
    'closing specialist',
    'remote closer',
  ],
  setter: [
    'setter',
    'appointment setter',
    'meeting setter',
    'appointment scheduler',
    'scheduling specialist',
  ],
  sdr: [
    'sdr',
    'sales development representative',
    'sales development rep',
    'sdr manager',
  ],
  bdr: [
    'bdr',
    'business development representative',
    'business development rep',
    'bdr manager',
  ],
  other: [
    'high ticket',
    'remote sales',
    'commission only',
    '100% commission',
    'uncapped commission',
  ],
}
