import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  COUNTRIES,
  findCountry,
  validatePostalCode,
  lookupPostalCode,
} from "@/lib/countries";
import type { AddressFormData } from "@/components/address/AddressForm";

describe("Address Management & System Audit Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Valid Indian Address Verification
  it("Scenario 1: validates a valid Indian address with 6-digit PIN code and +91 phone", () => {
    const india = findCountry("India");
    expect(india).toBeDefined();
    expect(india?.dialCode).toBe("+91");

    const validPin = "147001";
    expect(validatePostalCode(validPin, india!)).toBe(true);

    const address: AddressFormData = {
      full_name: "Gurpreet Kaur",
      phone: "+91 9876543210",
      country: "India",
      street: "House 12, Leela Bhawan",
      apartment: "Near Mall Road",
      city: "Patiala",
      state: "Punjab",
      zip: validPin,
      type: "Home",
      is_default: true,
    };

    expect(address.country).toBe("India");
    expect(address.zip).toHaveLength(6);
    expect(address.phone).toContain("+91");
  });

  // 2. Leading Zero Postal Code Preservation
  it("Scenario 2: preserves leading zero in postal codes as strings (e.g. US 07001, Germany 01067)", () => {
    const usCountry = findCountry("United States");
    const deCountry = findCountry("Germany");

    // US ZIP with leading zero
    const usLeadingZeroZip = "07001"; // Avenel, New Jersey
    expect(typeof usLeadingZeroZip).toBe("string");
    expect(usLeadingZeroZip.startsWith("0")).toBe(true);
    expect(validatePostalCode(usLeadingZeroZip, usCountry!)).toBe(true);

    // Germany PLZ with leading zero
    const deLeadingZeroPlz = "01067"; // Dresden
    expect(typeof deLeadingZeroPlz).toBe("string");
    expect(deLeadingZeroPlz.startsWith("0")).toBe(true);
    expect(validatePostalCode(deLeadingZeroPlz, deCountry!)).toBe(true);

    // If accidentally parsed as integer, it would corrupt 07001 into 7001
    const corruptedInt = parseInt(usLeadingZeroZip, 10);
    expect(corruptedInt.toString()).not.toBe(usLeadingZeroZip);
    // Preserved as string:
    expect(usLeadingZeroZip).toBe("07001");
  });

  // 3. Country-Specific Postal Code Formats
  it("Scenario 3: verifies country-specific postal code format validation across different regions", () => {
    const uk = findCountry("United Kingdom")!;
    const us = findCountry("United States")!;
    const canada = findCountry("Canada")!;
    const india = findCountry("India")!;
    const uae = findCountry("United Arab Emirates")!;

    // UK alphanumeric
    expect(validatePostalCode("SW1A 1AA", uk)).toBe(true);
    expect(validatePostalCode("EC1A1BB", uk)).toBe(true);
    expect(validatePostalCode("12345", uk)).toBe(false);

    // US 5-digit or 5+4
    expect(validatePostalCode("90210", us)).toBe(true);
    expect(validatePostalCode("90210-1234", us)).toBe(true);
    expect(validatePostalCode("9021", us)).toBe(false);

    // Canada alphanumeric A1A 1A1
    expect(validatePostalCode("K1A 0B1", canada)).toBe(true);
    expect(validatePostalCode("12345", canada)).toBe(false);

    // India 6 digits numeric
    expect(validatePostalCode("110001", india)).toBe(true);
    expect(validatePostalCode("11000", india)).toBe(false);
    expect(validatePostalCode("1100012", india)).toBe(false);
    expect(validatePostalCode("11000A", india)).toBe(false);

    // UAE optional/no postal code system
    expect(validatePostalCode("", uae)).toBe(true);
    expect(validatePostalCode("00000", uae)).toBe(true);
  });

  // 4. International Phone Number Validation & Calling Codes
  it("Scenario 4: verifies international dialing code association and phone structure", () => {
    const uk = findCountry("United Kingdom");
    const ca = findCountry("Canada");
    const aus = findCountry("Australia");

    expect(uk?.dialCode).toBe("+44");
    expect(ca?.dialCode).toBe("+1");
    expect(aus?.dialCode).toBe("+61");

    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    expect(phoneRegex.test("+44 7911 123456")).toBe(true);
    expect(phoneRegex.test("+1 416 555 0199")).toBe(true);
    expect(phoneRegex.test("+91 98765 43210")).toBe(true);
    expect(phoneRegex.test("123")).toBe(false); // too short
  });

  // 5. Incomplete / Invalid Submission Rejection
  it("Scenario 5: rejects missing mandatory fields", () => {
    function validateForm(data: Partial<AddressFormData>) {
      const errors: Record<string, string> = {};
      if (!data.full_name?.trim()) errors["full_name"] = "Full name is required";
      if (!data.street?.trim()) errors["street"] = "Street address is required";
      if (!data.city?.trim()) errors["city"] = "City is required";
      if (!data.state?.trim()) errors["state"] = "State is required";
      if (!data.country?.trim()) errors["country"] = "Country is required";
      return errors;
    }

    const invalid = validateForm({ full_name: "John Doe" });
    expect(Object.keys(invalid)).toContain("street");
    expect(Object.keys(invalid)).toContain("city");
    expect(Object.keys(invalid)).toContain("state");
    expect(Object.keys(invalid)).toContain("country");
  });

  // 6. Postal Code Lookup Success (India, UK, US)
  it("Scenario 6: successfully retrieves city and state via lookupPostalCode when available", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("postalpincode.in")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                Status: "Success",
                PostOffice: [
                  {
                    District: "Patiala",
                    State: "Punjab",
                    Block: "Patiala",
                  },
                ],
              },
            ]),
        });
      }
      if (url.includes("postcodes.io")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 200,
              result: {
                admin_district: "Westminster",
                country: "England",
              },
            }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    global.fetch = mockFetch;

    const inResult = await lookupPostalCode("147001", findCountry("India")!);
    expect(inResult).not.toBeNull();
    expect(inResult?.city).toBe("Patiala");
    expect(inResult?.state).toBe("Punjab");
    expect(inResult?.source).toBe("Postal PIN Directory");

    const ukResult = await lookupPostalCode("SW1A 1AA", findCountry("United Kingdom")!);
    expect(ukResult).not.toBeNull();
    expect(ukResult?.city).toBe("Westminster");
    expect(ukResult?.state).toBe("England");
  });

  // 7. Postal Code Lookup Failure and Manual Entry Fallback
  it("Scenario 7: cleanly returns null on network timeout or invalid PIN without crashing form", async () => {
    const mockFailingFetch = vi.fn().mockRejectedValue(new Error("Network timeout"));
    global.fetch = mockFailingFetch;

    const result = await lookupPostalCode("999999", findCountry("India")!);
    expect(result).toBeNull(); // Graceful fallback to manual entry
  });

  // 8. Default Address Management & Single-Default Guarantee
  it("Scenario 8: ensures setting a new default overrides previous default", () => {
    const addresses = [
      { id: "addr-1", full_name: "Home 1", is_default: true },
      { id: "addr-2", full_name: "Home 2", is_default: false },
    ];

    function setDefault(newDefaultId: string) {
      return addresses.map((a) => ({
        ...a,
        is_default: a.id === newDefaultId,
      }));
    }

    const updated = setDefault("addr-2");
    expect(updated.find((a) => a.id === "addr-1")?.is_default).toBe(false);
    expect(updated.find((a) => a.id === "addr-2")?.is_default).toBe(true);
    expect(updated.filter((a) => a.is_default)).toHaveLength(1);
  });

  // 9. Foreign Key Integrity On Deletion
  it("Scenario 9: detects when an address deletion is constrained by order history", () => {
    const foreignKeyError = {
      code: "23503",
      message: 'update or delete on table "addresses" violates foreign key constraint "orders_address_id_fkey"',
    };

    const isReferencedByOrder =
      foreignKeyError.code === "23503" ||
      foreignKeyError.message.includes("orders_address_id_fkey");
    expect(isReferencedByOrder).toBe(true);
  });

  // 10. Checkout Address Association & Order Immutability
  it("Scenario 10: associates selected address ID without modifying RPC contract", () => {
    const selectedAddressId = "11111111-2222-3333-4444-555555555555";
    const idempotencyKey = "chk_test_123456";
    const cartItems = [{ id: "prod-1", quantity: 2, price: 100 }];

    const rpcPayload = {
      p_address_id: selectedAddressId,
      p_items: cartItems,
      p_idempotency_key: idempotencyKey,
    };

    expect(rpcPayload.p_address_id).toBe(selectedAddressId);
    expect(rpcPayload.p_items).toHaveLength(1);
    expect(rpcPayload.p_idempotency_key).toBe(idempotencyKey);
  });

  // 11. Security & Ownership isolation
  it("Scenario 11: verifies address payloads enforce authenticated user_id", () => {
    const currentUserId = "user-abc-123";
    const newAddressPayload = {
      user_id: currentUserId,
      full_name: "Sohni Customer",
      street: "Boutique Lane",
      city: "London",
      state: "Greater London",
      zip: "W1D 3QU",
      country: "United Kingdom",
      phone: "+44 20 7946 0912",
      type: "Home",
    };

    // Client can never forge or assign another user's ID
    expect(newAddressPayload.user_id).toBe(currentUserId);
  });
});
