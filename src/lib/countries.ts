export interface CountryOption {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  dialCode: string;
  postalCodeLabel: string;
  postalCodePattern?: string; // Regex pattern for validation
  postalCodePlaceholder?: string;
}

export const COUNTRIES: CountryOption[] = [
  { name: "United Kingdom", code: "GB", dialCode: "+44", postalCodeLabel: "Postcode", postalCodePattern: "^[A-Za-z]{1,2}[0-9][A-Za-z0-9]? ?[0-9][A-Za-z]{2}$", postalCodePlaceholder: "e.g. SW1A 1AA, LE4 6AS" },
  { name: "India", code: "IN", dialCode: "+91", postalCodeLabel: "PIN Code", postalCodePattern: "^[1-9][0-9]{5}$", postalCodePlaceholder: "e.g. 147001, 110001" },
  { name: "United States", code: "US", dialCode: "+1", postalCodeLabel: "ZIP Code", postalCodePattern: "^[0-9]{5}(-[0-9]{4})?$", postalCodePlaceholder: "e.g. 90210, 07001" },
  { name: "Canada", code: "CA", dialCode: "+1", postalCodeLabel: "Postal Code", postalCodePattern: "^[A-Za-z][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]$", postalCodePlaceholder: "e.g. M5V 2T6" },
  { name: "Australia", code: "AU", dialCode: "+61", postalCodeLabel: "Postcode", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 2000" },
  { name: "Germany", code: "DE", dialCode: "+49", postalCodeLabel: "Postal Code (PLZ)", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 10115" },
  { name: "France", code: "FR", dialCode: "+33", postalCodeLabel: "Code Postal", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 75001" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", postalCodeLabel: "Postal / Area Code", postalCodePlaceholder: "e.g. 00000 / optional" },
  { name: "Italy", code: "IT", dialCode: "+39", postalCodeLabel: "CAP", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 00118" },
  { name: "Spain", code: "ES", dialCode: "+34", postalCodeLabel: "Código Postal", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 28001" },
  { name: "Netherlands", code: "NL", dialCode: "+31", postalCodeLabel: "Postcode", postalCodePattern: "^[0-9]{4} ?[A-Za-z]{2}$", postalCodePlaceholder: "e.g. 1012 JS" },
  { name: "New Zealand", code: "NZ", dialCode: "+64", postalCodeLabel: "Postcode", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 6011" },
  { name: "Singapore", code: "SG", dialCode: "+65", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{6}$", postalCodePlaceholder: "e.g. 238801" },
  { name: "Malaysia", code: "MY", dialCode: "+60", postalCodeLabel: "Poskod", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 50450" },
  { name: "Pakistan", code: "PK", dialCode: "+92", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 44000" },
  { name: "Bangladesh", code: "BD", dialCode: "+880", postalCodeLabel: "Post Code", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 1205" },
  { name: "Ireland", code: "IE", dialCode: "+353", postalCodeLabel: "Eircode", postalCodePlaceholder: "e.g. D02 X285" },
  { name: "Switzerland", code: "CH", dialCode: "+41", postalCodeLabel: "Postleitzahl", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 8001" },
  { name: "Sweden", code: "SE", dialCode: "+46", postalCodeLabel: "Postnummer", postalCodePattern: "^[0-9]{3} ?[0-9]{2}$", postalCodePlaceholder: "e.g. 111 22" },
  { name: "Norway", code: "NO", dialCode: "+47", postalCodeLabel: "Postnummer", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 0150" },
  { name: "Denmark", code: "DK", dialCode: "+45", postalCodeLabel: "Postnummer", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 1050" },
  { name: "Belgium", code: "BE", dialCode: "+32", postalCodeLabel: "Code Postal", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 1000" },
  { name: "Austria", code: "AT", dialCode: "+43", postalCodeLabel: "Postleitzahl", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 1010" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. 12271" },
  { name: "Qatar", code: "QA", dialCode: "+974", postalCodeLabel: "Postal / Zone Code", postalCodePlaceholder: "e.g. Zone 22" },
  { name: "Kuwait", code: "KW", dialCode: "+965", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. 13001" },
  { name: "Bahrain", code: "BH", dialCode: "+973", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. 317" },
  { name: "Oman", code: "OM", dialCode: "+968", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. 100" },
  { name: "South Africa", code: "ZA", dialCode: "+27", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 2000" },
  { name: "Portugal", code: "PT", dialCode: "+351", postalCodeLabel: "Código Postal", postalCodePattern: "^[0-9]{4}-[0-9]{3}$", postalCodePlaceholder: "e.g. 1000-001" },
  { name: "Poland", code: "PL", dialCode: "+48", postalCodeLabel: "Kod Pocztowy", postalCodePattern: "^[0-9]{2}-[0-9]{3}$", postalCodePlaceholder: "e.g. 00-001" },
  { name: "Japan", code: "JP", dialCode: "+81", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{3}-?[0-9]{4}$", postalCodePlaceholder: "e.g. 100-0001" },
  { name: "Hong Kong", code: "HK", dialCode: "+852", postalCodeLabel: "Postal Code / Area", postalCodePlaceholder: "e.g. 999077 / optional" },
  { name: "Singapore", code: "SG", dialCode: "+65", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{6}$", postalCodePlaceholder: "e.g. 018956" },
  { name: "Kenya", code: "KE", dialCode: "+254", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. 00100" },
  { name: "Uganda", code: "UG", dialCode: "+256", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. 256" },
  { name: "Tanzania", code: "TZ", dialCode: "+255", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. 11101" },
  { name: "Mauritius", code: "MU", dialCode: "+230", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. 742CU001" },
  { name: "Fiji", code: "FJ", dialCode: "+679", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. Suva" },
  { name: "Trinidad and Tobago", code: "TT", dialCode: "+1-868", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. 00000" },
  { name: "Guyana", code: "GY", dialCode: "+592", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. Georgetown" },
  { name: "Suriname", code: "SR", dialCode: "+597", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. Paramaribo" },
  { name: "Greece", code: "GR", dialCode: "+30", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{3} ?[0-9]{2}$", postalCodePlaceholder: "e.g. 105 57" },
  { name: "Turkey", code: "TR", dialCode: "+90", postalCodeLabel: "Posta Kodu", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 34000" },
  { name: "Cyprus", code: "CY", dialCode: "+357", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 1010" },
  { name: "Malta", code: "MT", dialCode: "+356", postalCodeLabel: "Postcode", postalCodePlaceholder: "e.g. VLT 1115" },
  { name: "Thailand", code: "TH", dialCode: "+66", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 10110" },
  { name: "Indonesia", code: "ID", dialCode: "+62", postalCodeLabel: "Kode Pos", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 10110" },
  { name: "Philippines", code: "PH", dialCode: "+63", postalCodeLabel: "ZIP Code", postalCodePattern: "^[0-9]{4}$", postalCodePlaceholder: "e.g. 1000" },
  { name: "Sri Lanka", code: "LK", dialCode: "+94", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 00100" },
  { name: "Nepal", code: "NP", dialCode: "+977", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 44600" },
  { name: "Mexico", code: "MX", dialCode: "+52", postalCodeLabel: "Código Postal", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 01000" },
  { name: "Brazil", code: "BR", dialCode: "+55", postalCodeLabel: "CEP", postalCodePattern: "^[0-9]{5}-?[0-9]{3}$", postalCodePlaceholder: "e.g. 01001-000" },
  { name: "Argentina", code: "AR", dialCode: "+54", postalCodeLabel: "Código Postal", postalCodePlaceholder: "e.g. C1002" },
  { name: "Chile", code: "CL", dialCode: "+56", postalCodeLabel: "Código Postal", postalCodePattern: "^[0-9]{7}$", postalCodePlaceholder: "e.g. 8320000" },
  { name: "Colombia", code: "CO", dialCode: "+57", postalCodeLabel: "Código Postal", postalCodePattern: "^[0-9]{6}$", postalCodePlaceholder: "e.g. 110111" },
  { name: "Egypt", code: "EG", dialCode: "+20", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 11511" },
  { name: "Nigeria", code: "NG", dialCode: "+234", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{6}$", postalCodePlaceholder: "e.g. 100001" },
  { name: "Ghana", code: "GH", dialCode: "+233", postalCodeLabel: "Postal Code / Digital Address", postalCodePlaceholder: "e.g. GA-183-9150" },
  { name: "Israel", code: "IL", dialCode: "+972", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{7}$", postalCodePlaceholder: "e.g. 9100000" },
  { name: "Jordan", code: "JO", dialCode: "+962", postalCodeLabel: "Postal Code", postalCodePattern: "^[0-9]{5}$", postalCodePlaceholder: "e.g. 11118" },
  { name: "Lebanon", code: "LB", dialCode: "+961", postalCodeLabel: "Postal Code", postalCodePlaceholder: "e.g. 1107 2020" },
];

export function findCountry(query: string | CountryOption): CountryOption | undefined {
  if (!query) return undefined;
  if (typeof query === "object" && query.name) return query;
  const q = String(query).trim().toLowerCase();
  return COUNTRIES.find(
    (c) =>
      c.name.toLowerCase() === q ||
      c.code.toLowerCase() === q ||
      c.dialCode.toLowerCase() === q
  );
}

export function validatePostalCode(postalCode: string, country: CountryOption | string): boolean {
  const target = typeof country === "string" ? findCountry(country) : country;
  if (!target || !target.postalCodePattern) return true;
  const cleaned = postalCode.trim();
  if (!cleaned) return false;
  try {
    return new RegExp(target.postalCodePattern, "i").test(cleaned);
  } catch {
    return true;
  }
}

export interface PostalLookupResult {
  city?: string;
  state?: string;
  district?: string;
  country?: string;
  source: string;
}

/**
 * Free, non-blocking postal code lookup supporting India (postalpincode.in), UK (postcodes.io), and US (zippopotam.us).
 * Always safe with timeout and fallback. Never throws.
 */
export async function lookupPostalCode(
  postalCode: string,
  countryInput: string | CountryOption
): Promise<PostalLookupResult | null> {
  const cleanCode = postalCode.trim();
  if (!cleanCode || cleanCode.length < 3) return null;

  const country = typeof countryInput === "object" ? countryInput : findCountry(countryInput);
  const code = country?.code?.toUpperCase() || (typeof countryInput === "string" ? countryInput.trim().toUpperCase() : "");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    // 1. India Postal PIN Code Lookup (Govt postal API)
    if (code === "IN" || country?.name === "India") {
      const pinOnly = cleanCode.replace(/\D/g, "");
      if (pinOnly.length !== 6) return null;

      const res = await fetch(`https://api.postalpincode.in/pincode/${pinOnly}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        return {
          city: po.District || po.Block || po.Circle || "",
          state: po.State || "",
          district: po.District || "",
          country: "India",
          source: "Postal PIN Directory",
        };
      }
      return null;
    }

    // 2. UK Postcode Lookup (postcodes.io)
    if (code === "GB" || country?.name === "United Kingdom") {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanCode)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status === 200 && data.result) {
        return {
          city: data.result.admin_district || data.result.parish || "",
          state: data.result.country || data.result.european_electoral_region || "England",
          country: "United Kingdom",
          source: "UK Postcodes.io",
        };
      }
      return null;
    }

    // 3. United States ZIP Code Lookup (Zippopotam)
    if (code === "US" || country?.name === "United States") {
      const parts = cleanCode.split("-");
      const zipOnly = (parts[0] || "").trim();
      if (zipOnly.length !== 5) return null;
      const res = await fetch(`https://api.zippopotam.us/us/${zipOnly}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.places && data.places.length > 0) {
        return {
          city: data.places[0]["place name"] || "",
          state: data.places[0]["state"] || "",
          country: "United States",
          source: "USPS/Zippopotam",
        };
      }
      return null;
    }

    // Other countries: no safe public free API without rate limits, return null to keep manual entry
    clearTimeout(timeoutId);
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
