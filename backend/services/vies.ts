export type ViesResult = 'VALID' | 'INVALID' | 'ERROR';

export async function checkVies(_countryCode: string, _vatNumber: string): Promise<ViesResult> {
  // MOCK: always returns VALID for testing
  return 'VALID';
}
