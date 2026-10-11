import React, { useState, useEffect, useId } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { COUNTRIES, findCountry, lookupPostalCode, type CountryOption } from "@/lib/countries";
import type { AddressRecord } from "@/lib/supabase";
import { Search, Loader2, Sparkles, Check, Home, Briefcase, MapPin, AlertCircle } from "lucide-react";

export interface AddressFormData {
  full_name: string;
  phone: string;
  country: string;
  street: string;
  apartment?: string | undefined;
  city: string;
  state: string;
  zip: string;
  type: string;
  is_default?: boolean | undefined;
}

interface AddressFormProps {
  initialData?: AddressRecord | null | undefined;
  onSubmit: (data: AddressFormData) => Promise<void> | void;
  onCancel?: (() => void) | undefined;
  isSubmitting?: boolean | undefined;
  submitLabel?: string | undefined;
  cancelLabel?: string | undefined;
}

export function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel,
  cancelLabel = "Cancel",
}: AddressFormProps) {
  const formId = useId();

  // Parse existing phone into dial code + local number if possible
  const fallbackCountry = COUNTRIES[0] as CountryOption;
  const initialCountry: CountryOption = findCountry(initialData?.country || "United Kingdom") || fallbackCountry;
  
  const [fullName, setFullName] = useState(initialData?.full_name || "");
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(initialCountry);
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  // Phone state
  const [selectedDialCode, setSelectedDialCode] = useState(() => {
    if (initialData?.phone) {
      // Find matching dial code
      const matched = COUNTRIES.find((c) => initialData.phone.startsWith(c.dialCode));
      if (matched) return matched.dialCode;
    }
    return initialCountry.dialCode;
  });
  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (initialData?.phone) {
      const matched = COUNTRIES.find((c) => initialData.phone.startsWith(c.dialCode));
      if (matched) {
        return initialData.phone.slice(matched.dialCode.length).trim();
      }
      return initialData.phone;
    }
    return "";
  });

  const [street, setStreet] = useState(initialData?.street || "");
  const [apartment, setApartment] = useState(initialData?.apartment || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [state, setState] = useState(initialData?.state || "");
  const [postalCode, setPostalCode] = useState(initialData?.zip || "");
  const [addressType, setAddressType] = useState(initialData?.type || "Home");
  const [isDefault, setIsDefault] = useState(Boolean(initialData?.is_default));

  // Lookup state
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Synchronize when initialData changes
  useEffect(() => {
    if (initialData) {
      setFullName(initialData.full_name || "");
      const c: CountryOption = findCountry(initialData.country) || initialCountry;
      setSelectedCountry(c);
      setStreet(initialData.street || "");
      setApartment(initialData.apartment || "");
      setCity(initialData.city || "");
      setState(initialData.state || "");
      setPostalCode(initialData.zip || "");
      setAddressType(initialData.type || "Home");
      setIsDefault(Boolean(initialData.is_default));

      const matched = COUNTRIES.find((co) => initialData.phone.startsWith(co.dialCode));
      if (matched) {
        setSelectedDialCode(matched.dialCode);
        setPhoneNumber(initialData.phone.slice(matched.dialCode.length).trim());
      } else {
        setPhoneNumber(initialData.phone || "");
      }
    } else {
      setFullName("");
      setSelectedCountry(initialCountry);
      setSelectedDialCode(initialCountry.dialCode);
      setPhoneNumber("");
      setStreet("");
      setApartment("");
      setCity("");
      setState("");
      setPostalCode("");
      setAddressType("Home");
      setIsDefault(false);
      setErrors({});
      setLookupFeedback(null);
    }
  }, [initialData]);

  // Handle Country selection change
  const handleSelectCountry = (country: CountryOption) => {
    setSelectedCountry(country);
    setSelectedDialCode(country.dialCode);
    setIsCountryOpen(false);
    setCountrySearch("");
    setLookupFeedback(null);
  };

  // Postal code auto-lookup handler
  const triggerPostalLookup = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 3) return;

    setIsLookingUp(true);
    setLookupFeedback(null);

    const result = await lookupPostalCode(trimmed, selectedCountry.code);
    setIsLookingUp(false);

    if (result) {
      if (result.city && !city) setCity(result.city);
      else if (result.city) setCity(result.city); // update city for convenience

      if (result.state) setState(result.state);
      setLookupFeedback(`Autofilled from ${result.source}: ${[result.city, result.state].filter(Boolean).join(", ")}`);
    }
  };

  // Filtered countries list for search
  const filteredCountries = COUNTRIES.filter((c) => {
    const q = countrySearch.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dialCode.includes(q)
    );
  });

  // Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) {
      errs["fullName"] = "Full name is required";
    }

    const cleanPhone = phoneNumber.replace(/[\s-]/g, "");
    if (!cleanPhone) {
      errs["phone"] = "Phone number is required";
    } else if (cleanPhone.length < 6 || cleanPhone.length > 15) {
      errs["phone"] = "Please enter a valid phone number (6 to 15 digits)";
    }

    if (!street.trim()) {
      errs["street"] = "House/Flat number, building or street address is required";
    }

    if (!city.trim()) {
      errs["city"] = "City / District is required";
    }

    if (!state.trim()) {
      errs["state"] = "State / County / Region is required";
    }

    const cleanPostal = postalCode.trim();
    if (!cleanPostal) {
      errs["postalCode"] = `${selectedCountry.postalCodeLabel} is required`;
    } else if (selectedCountry.postalCodePattern) {
      const regex = new RegExp(selectedCountry.postalCodePattern, "i");
      if (!regex.test(cleanPostal)) {
        errs["postalCode"] = `Please enter a valid ${selectedCountry.postalCodeLabel} for ${selectedCountry.name}`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Combine dial code with phone number cleanly
    const fullPhone = `${selectedDialCode} ${phoneNumber.trim()}`.trim();

    await onSubmit({
      full_name: fullName.trim(),
      phone: fullPhone,
      country: selectedCountry.name,
      street: street.trim(),
      apartment: apartment.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      zip: postalCode.trim(),
      type: addressType,
      is_default: isDefault,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-[#1A1A1A]">
      {/* 1. Country / Region Dropdown (Searchable) */}
      <div className="space-y-1.5 relative">
        <Label htmlFor={`${formId}-country`} className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
          Country / Region <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <button
            type="button"
            id={`${formId}-country`}
            onClick={() => setIsCountryOpen((prev) => !prev)}
            disabled={isSubmitting}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm bg-background border rounded-md hover:border-black/30 focus:outline-none focus:ring-2 focus:ring-[#6B2C3A]/20 transition-all text-left"
          >
            <span className="font-medium">{selectedCountry.name}</span>
            <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              {selectedCountry.dialCode}
            </span>
          </button>

          {isCountryOpen && (
            <div className="absolute z-50 left-0 top-full mt-1 w-full bg-popover text-popover-foreground border rounded-md shadow-lg max-h-64 overflow-hidden flex flex-col">
              <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
                <Search className="size-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search country or code..."
                  autoFocus
                  className="w-full text-xs bg-transparent focus:outline-none"
                />
              </div>
              <div className="overflow-y-auto max-h-52 divide-y divide-border/40">
                {filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-muted/60 transition-colors"
                  >
                    <span>{c.name}</span>
                    <span className="text-muted-foreground font-mono">{c.dialCode}</span>
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No matching country found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Full Name & Phone Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-name`} className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${formId}-name`}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors["fullName"]) setErrors((prev) => ({ ...prev, fullName: "" }));
            }}
            placeholder="e.g. Ramanpreet Singh"
            disabled={isSubmitting}
            className={errors["fullName"] ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {errors["fullName"] && (
            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
              <AlertCircle className="size-3" /> {errors["fullName"]}
            </p>
          )}
        </div>

        {/* International Phone with Dial Code Selector */}
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-phone`} className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <select
              value={selectedDialCode}
              onChange={(e) => setSelectedDialCode(e.target.value)}
              disabled={isSubmitting}
              className="w-28 text-xs font-mono bg-background border rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-[#6B2C3A]/20"
            >
              {COUNTRIES.map((c) => (
                <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                  {c.dialCode} ({c.code})
                </option>
              ))}
            </select>
            <Input
              id={`${formId}-phone`}
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (errors["phone"]) setErrors((prev) => ({ ...prev, phone: "" }));
              }}
              placeholder="7123 456789"
              disabled={isSubmitting}
              className={`flex-1 ${errors["phone"] ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
          </div>
          {errors["phone"] && (
            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
              <AlertCircle className="size-3" /> {errors["phone"]}
            </p>
          )}
        </div>
      </div>

      {/* 3. Postal Code with Auto-Lookup */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor={`${formId}-postal`} className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
            {selectedCountry.postalCodeLabel} <span className="text-destructive">*</span>
          </Label>
          {(selectedCountry.code === "IN" || selectedCountry.code === "GB" || selectedCountry.code === "US") && (
            <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
              <Sparkles className="size-3" /> Auto-fill city & state supported
            </span>
          )}
        </div>
        <div className="relative">
          <Input
            id={`${formId}-postal`}
            value={postalCode}
            onChange={(e) => {
              const val = e.target.value;
              setPostalCode(val);
              if (errors["postalCode"]) setErrors((prev) => ({ ...prev, postalCode: "" }));
            }}
            onBlur={(e) => triggerPostalLookup(e.target.value)}
            placeholder={selectedCountry.postalCodePlaceholder || "Postal code"}
            disabled={isSubmitting}
            className={errors["postalCode"] ? "border-destructive focus-visible:ring-destructive pr-10" : "pr-10"}
          />
          <div className="absolute right-3 top-2.5 text-muted-foreground">
            {isLookingUp ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : postalCode.length >= 4 ? (
              <button
                type="button"
                onClick={() => triggerPostalLookup(postalCode)}
                title="Lookup City & State"
                className="text-xs text-primary hover:underline"
              >
                Lookup
              </button>
            ) : null}
          </div>
        </div>
        {lookupFeedback && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <Check className="size-3" /> {lookupFeedback}
          </p>
        )}
        {errors["postalCode"] && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="size-3" /> {errors["postalCode"]}
          </p>
        )}
      </div>

      {/* 4. House / Street Address */}
      <div className="space-y-1.5">
        <Label htmlFor={`${formId}-street`} className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
          Flat, House no., Building, Company, Apartment <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${formId}-street`}
          value={street}
          onChange={(e) => {
            setStreet(e.target.value);
            if (errors["street"]) setErrors((prev) => ({ ...prev, street: "" }));
          }}
          placeholder="e.g. 14 Belgrave Road / Flat 4B, Victoria Heights"
          disabled={isSubmitting}
          className={errors["street"] ? "border-destructive focus-visible:ring-destructive" : ""}
        />
        {errors["street"] && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="size-3" /> {errors["street"]}
          </p>
        )}
      </div>

      {/* 5. Apartment / Area / Landmark (Optional) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor={`${formId}-apartment`} className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
            Area, Colony, Street, Sector, Village <span className="text-xs text-muted-foreground font-normal lowercase">(optional)</span>
          </Label>
          <span className="text-[11px] text-muted-foreground">e.g. Near Gurudwara Sahib</span>
        </div>
        <Input
          id={`${formId}-apartment`}
          value={apartment}
          onChange={(e) => setApartment(e.target.value)}
          placeholder="Landmark or additional directions"
          disabled={isSubmitting}
        />
      </div>

      {/* 6. City & State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-city`} className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
            Town / City <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${formId}-city`}
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              if (errors["city"]) setErrors((prev) => ({ ...prev, city: "" }));
            }}
            placeholder="e.g. Leicester / Patiala / London"
            disabled={isSubmitting}
            className={errors["city"] ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {errors["city"] && (
            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
              <AlertCircle className="size-3" /> {errors["city"]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-state`} className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
            State / Province / County <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${formId}-state`}
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              if (errors["state"]) setErrors((prev) => ({ ...prev, state: "" }));
            }}
            placeholder="e.g. Leicestershire / Punjab / England"
            disabled={isSubmitting}
            className={errors["state"] ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {errors["state"] && (
            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
              <AlertCircle className="size-3" /> {errors["state"]}
            </p>
          )}
        </div>
      </div>

      {/* 7. Address Type Selection (Home, Work, Other) */}
      <div className="space-y-2 pt-2">
        <Label className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
          Address Type
        </Label>
        <RadioGroup
          value={addressType}
          onValueChange={setAddressType}
          className="flex flex-wrap gap-4 pt-1"
          disabled={isSubmitting}
        >
          <label
            htmlFor={`${formId}-type-home`}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer transition-all ${
              addressType === "Home" ? "border-[#6B2C3A] bg-[#6B2C3A]/5 font-semibold text-[#6B2C3A]" : "hover:bg-muted"
            }`}
          >
            <RadioGroupItem value="Home" id={`${formId}-type-home`} />
            <Home className="size-3.5" />
            Home (7 AM — 9 PM delivery)
          </label>

          <label
            htmlFor={`${formId}-type-work`}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer transition-all ${
              addressType === "Work" ? "border-[#6B2C3A] bg-[#6B2C3A]/5 font-semibold text-[#6B2C3A]" : "hover:bg-muted"
            }`}
          >
            <RadioGroupItem value="Work" id={`${formId}-type-work`} />
            <Briefcase className="size-3.5" />
            Work (10 AM — 6 PM delivery)
          </label>

          <label
            htmlFor={`${formId}-type-other`}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer transition-all ${
              addressType === "Other" ? "border-[#6B2C3A] bg-[#6B2C3A]/5 font-semibold text-[#6B2C3A]" : "hover:bg-muted"
            }`}
          >
            <RadioGroupItem value="Other" id={`${formId}-type-other`} />
            <MapPin className="size-3.5" />
            Other
          </label>
        </RadioGroup>
      </div>

      {/* 8. Make this my default address */}
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id={`${formId}-default`}
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(Boolean(checked))}
          disabled={isSubmitting}
        />
        <label
          htmlFor={`${formId}-default`}
          className="text-xs font-medium leading-none cursor-pointer select-none text-muted-foreground hover:text-foreground"
        >
          Use as my default delivery address
        </label>
      </div>

      {/* 9. Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary !py-2.5 !px-6 !text-xs flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
          {submitLabel || (initialData ? "Save Changes" : "Save Address")}
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="btn-outline !py-2.5 !px-5 !text-xs"
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}
