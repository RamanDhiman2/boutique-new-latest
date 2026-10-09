import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { useState, useMemo } from "react";
import { Ruler, RotateCcw, BookOpen, ArrowRight, Scissors, Check, Mail } from "lucide-react";
import { toast } from "sonner";

export type MetricKey =
  | "shirtLength"
  | "chest"
  | "ghera"
  | "waist"
  | "hip"
  | "teera"
  | "neck"
  | "sleeves"
  | "plates"
  | "chak"
  | "bottomLength"
  | "muhri"
  | "belt";

export interface MeasurementFieldDef {
  key: MetricKey;
  label: string;
  subtitle: string;
  defaultInches: number;
  minInches: number;
  maxInches: number;
  step: number;
  category: "kurta" | "bottom";
  description: string;
  howToMeasure: string;
  row: number;
  col: number;
}

export type UnitType = "inches" | "cm";

export type FitPreference = "slim" | "regular" | "relaxed" | "patiala";

export type KurtaStyle = "straight" | "aline" | "anarkali" | "short";

export type BottomStyle = "salwar" | "trouser" | "patiala" | "plazo" | "churidar";

export type NeckStyle = "round" | "v_neck" | "sweetheart" | "boat" | "collar";

export interface CustomerMeasurements {
  values: Record<MetricKey, number>;
  unit: UnitType;
  fitPreference: FitPreference;
  kurtaStyle: KurtaStyle;
  bottomStyle: BottomStyle;
  neckStyle: NeckStyle;
  notes: string;
  customerName?: string;
  phone?: string;
}

export const MEASUREMENT_CONFIGS: MeasurementFieldDef[] = [
  // Row 1
  {
    key: "shirtLength",
    label: "Shirt Length",
    subtitle: "HEIGHT",
    defaultInches: 39,
    minInches: 28,
    maxInches: 55,
    step: 0.5,
    category: "kurta",
    description:
      "Total vertical length of the kameez/kurta from highest shoulder point down to desired hem.",
    howToMeasure:
      "Place the measuring tape at the top of your shoulder near the neck, and let it hang straight down to below your knees or desired length.",
    row: 1,
    col: 1,
  },
  {
    key: "chest",
    label: "Chest",
    subtitle: "SHOULDER",
    defaultInches: 38,
    minInches: 26,
    maxInches: 60,
    step: 0.5,
    category: "kurta",
    description: "Circumference around the fullest part of the bust / upper chest area.",
    howToMeasure:
      "Wrap tape measure around the fullest part of your bust/chest, keeping tape level across the back and under armpits.",
    row: 1,
    col: 2,
  },
  {
    key: "ghera",
    label: "Ghera",
    subtitle: "BUST",
    defaultInches: 22.5,
    minInches: 16,
    maxInches: 42,
    step: 0.5,
    category: "kurta",
    description:
      "The flat bottom flare width / daman of the shirt hemline from side slit to side slit.",
    howToMeasure:
      "Measure the flat bottom width of your best-fitting kurta from left hem side to right hem side.",
    row: 1,
    col: 3,
  },

  // Row 2
  {
    key: "waist",
    label: "Waist",
    subtitle: "WAIST",
    defaultInches: 34,
    minInches: 22,
    maxInches: 56,
    step: 0.5,
    category: "kurta",
    description:
      "Circumference of natural midriff / waistline curve, usually 7-8 inches below bust.",
    howToMeasure:
      "Measure around your natural waistline, typically the narrowest point above your navel. Keep tape comfortably snug.",
    row: 2,
    col: 1,
  },
  {
    key: "hip",
    label: "Hip",
    subtitle: "HIP",
    defaultInches: 41,
    minInches: 28,
    maxInches: 65,
    step: 0.5,
    category: "kurta",
    description:
      "Circumference around the fullest part of the hips and seat where side slits usually commence.",
    howToMeasure:
      "Wrap tape around the fullest part of your hips and buttocks, ensuring the tape is parallel to the floor.",
    row: 2,
    col: 2,
  },
  {
    key: "teera",
    label: "Teera",
    subtitle: "ARMHOLE",
    defaultInches: 14.5,
    minInches: 11,
    maxInches: 20,
    step: 0.5,
    category: "kurta",
    description:
      "Shoulder width across back from left shoulder bone edge to right shoulder bone edge.",
    howToMeasure:
      "Measure across the back from the tip of the left shoulder bone horizontally to the tip of the right shoulder bone.",
    row: 2,
    col: 3,
  },

  // Row 3
  {
    key: "neck",
    label: "Neck",
    subtitle: "UPPER ARM",
    defaultInches: 6.5,
    minInches: 4.5,
    maxInches: 11,
    step: 0.25,
    category: "kurta",
    description: "Neckline drop depth from shoulder intersection to front center.",
    howToMeasure:
      "From the top shoulder neck juncture diagonally down to center chest where you want the neck opening to end.",
    row: 3,
    col: 1,
  },
  {
    key: "sleeves",
    label: "Sleeves",
    subtitle: "SLEEVE LENGTH",
    defaultInches: 17,
    minInches: 4,
    maxInches: 26,
    step: 0.5,
    category: "kurta",
    description: "Length from shoulder edge seam down along the arm to desired sleeve cuff.",
    howToMeasure:
      "Start at the outer shoulder point and measure straight down the outside of your arm to your wrist or desired sleeve style (elbow, 3/4, full).",
    row: 3,
    col: 2,
  },
  {
    key: "plates",
    label: "Plates",
    subtitle: "WRIST",
    defaultInches: 9,
    minInches: 5,
    maxInches: 15,
    step: 0.5,
    category: "kurta",
    description: "Wrist circumference opening / sleeve cuff round and chest dart tuck plates.",
    howToMeasure:
      "Wrap tape around the wrist bone comfortably, allowing hand to slip in and out easily.",
    row: 3,
    col: 3,
  },

  // Row 4
  {
    key: "chak",
    label: "Chak",
    subtitle: "KURTA LENGTH",
    defaultInches: 14,
    minInches: 10,
    maxInches: 22,
    step: 0.5,
    category: "kurta",
    description:
      "Side slit opening length: measured from the waistline down to where the side slit begins above the hem.",
    howToMeasure:
      "From natural waist or armpit down to where you want the side slit (chak) to open on your kurta.",
    row: 4,
    col: 1,
  },
  {
    key: "bottomLength",
    label: "Bottom Length",
    subtitle: "TROUSER LENGTH",
    defaultInches: 38,
    minInches: 28,
    maxInches: 48,
    step: 0.5,
    category: "bottom",
    description:
      "Total vertical outseam length of salwar, trouser, or churidar from waistband down to ankle.",
    howToMeasure:
      "From where you tie your salwar or trouser waistband at the waist/navel straight down to the ankle bone or floor.",
    row: 4,
    col: 2,
  },
  {
    key: "muhri",
    label: "Muhri",
    subtitle: "SALWAR LENGTH",
    defaultInches: 6.5,
    minInches: 4.5,
    maxInches: 14,
    step: 0.25,
    category: "bottom",
    description: "Ankle cuff opening (Paucha) width of salwar or trouser hem.",
    howToMeasure:
      "Measure the flat bottom width of the ankle cuff (paucha) of your favorite salwar/trouser, or circumference around ankle.",
    row: 4,
    col: 3,
  },

  // Row 5
  {
    key: "belt",
    label: "Belt",
    subtitle: "DUPATTA LENGTH",
    defaultInches: 36,
    minInches: 24,
    maxInches: 54,
    step: 0.5,
    category: "bottom",
    description: "Salwar waistband / belt circumference and dupatta matching drape length.",
    howToMeasure:
      "Measure around the circumference where you tie the drawstring (naala) or elastic waistband of the salwar.",
    row: 5,
    col: 1,
  },
];

export type PresetKey = "S" | "M" | "L" | "XL" | "XXL";

export const STANDARD_PRESETS: Record<
  PresetKey,
  { label: string; values: Record<MetricKey, number> }
> = {
  S: {
    label: "Small (36)",
    values: {
      shirtLength: 38,
      chest: 36,
      ghera: 21,
      waist: 32,
      hip: 38,
      teera: 14,
      neck: 6,
      sleeves: 16.5,
      plates: 8.5,
      chak: 13.5,
      bottomLength: 37,
      muhri: 6,
      belt: 34,
    },
  },
  M: {
    label: "Medium (38)",
    values: {
      shirtLength: 39,
      chest: 38,
      ghera: 22.5,
      waist: 34,
      hip: 41,
      teera: 14.5,
      neck: 6.5,
      sleeves: 17,
      plates: 9,
      chak: 14,
      bottomLength: 38,
      muhri: 6.5,
      belt: 36,
    },
  },
  L: {
    label: "Large (40)",
    values: {
      shirtLength: 40,
      chest: 40,
      ghera: 24,
      waist: 36,
      hip: 43,
      teera: 15,
      neck: 7,
      sleeves: 17.5,
      plates: 9.5,
      chak: 14.5,
      bottomLength: 39,
      muhri: 7,
      belt: 38,
    },
  },
  XL: {
    label: "X-Large (42)",
    values: {
      shirtLength: 41,
      chest: 42,
      ghera: 25.5,
      waist: 38.5,
      hip: 45.5,
      teera: 15.5,
      neck: 7.25,
      sleeves: 18,
      plates: 10,
      chak: 15,
      bottomLength: 39.5,
      muhri: 7.25,
      belt: 41,
    },
  },
  XXL: {
    label: "2X-Large (44)",
    values: {
      shirtLength: 42,
      chest: 44,
      ghera: 27,
      waist: 41,
      hip: 48,
      teera: 16,
      neck: 7.5,
      sleeves: 18.5,
      plates: 10.5,
      chak: 15.5,
      bottomLength: 40,
      muhri: 7.5,
      belt: 44,
    },
  },
};

export const Route = createFileRoute("/measurements")({
  head: () => ({
    meta: [
      { title: "Measurements — SohniMutiyaar By CC" },
      { name: "description", content: "Submit your measurements for a perfect custom fit." },
    ],
  }),
  component: MeasurementsPage,
});

function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<CustomerMeasurements>({
    values: { ...STANDARD_PRESETS.M.values },
    unit: "inches",
    fitPreference: "regular",
    kurtaStyle: "straight",
    bottomStyle: "salwar",
    neckStyle: "round",
    notes:
      "Please keep side slits (chak) modest. Add 2 inches extra inside margin for future alterations.",
    customerName: "Simran Kaur",
    phone: "+91 98765 43210",
  });

  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("M");

  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [slipModalOpen, setSlipModalOpen] = useState(false);

  const circledKeys: MetricKey[] = ["chak", "bottomLength", "muhri", "belt"];

  const handleMetricChange = (key: MetricKey, value: number) => {
    setMeasurements((prev) => ({ ...prev, values: { ...prev.values, [key]: value } }));
    setSelectedPreset("Custom");
  };

  const handleToggleUnit = (newUnit: UnitType) => {
    if (newUnit === measurements.unit) return;
    const conversionFactor = newUnit === "cm" ? 2.54 : 1 / 2.54;
    const newValues = { ...measurements.values };
    (Object.keys(newValues) as MetricKey[]).forEach((k) => {
      newValues[k] = Number((newValues[k] * conversionFactor).toFixed(1));
    });
    setMeasurements((prev) => ({ ...prev, unit: newUnit, values: newValues }));
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = STANDARD_PRESETS[presetKey as keyof typeof STANDARD_PRESETS];
    if (!preset) return;
    const appliedValues = { ...preset.values };
    if (measurements.unit === "cm") {
      (Object.keys(appliedValues) as MetricKey[]).forEach((k) => {
        appliedValues[k] = Number((appliedValues[k] * 2.54).toFixed(1));
      });
    }
    setMeasurements((prev) => ({ ...prev, values: appliedValues }));
    setSelectedPreset(presetKey);
  };

  const rows = useMemo(() => {
    return [
      MEASUREMENT_CONFIGS.filter((c) => c.row === 1),
      MEASUREMENT_CONFIGS.filter((c) => c.row === 2),
      MEASUREMENT_CONFIGS.filter((c) => c.row === 3),
      MEASUREMENT_CONFIGS.filter((c) => c.row === 4),
      MEASUREMENT_CONFIGS.filter((c) => c.row === 5),
    ];
  }, []);

  const handleSelectFieldFromVisualizer = (key: MetricKey) => {
    setActiveMetric(key);
    const el = document.getElementById(`metric-card-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="bg-[#FAF7F2] text-[#2C2420] flex flex-col font-sans min-h-screen pb-24 animate-rise">
      <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
        <SiteBreadcrumb items={[{ label: "Measurements" }]} />
      </div>
      <div className="pt-8 pb-8 text-center px-4">
        <h1 className="font-serif text-4xl md:text-5xl text-stone-900 mb-4">Measurements</h1>
        <p className="text-sm text-stone-500 max-w-2xl mx-auto">
          Enter your bespoke Punjabi suit tailoring specifications below ({measurements.unit}).
          Values update the real-time garment blueprint dynamically on the right.
        </p>
      </div>

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-stone-200/80">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setGuideModalOpen(true)}
              className="inline-flex items-center gap-1 text-[#741B2B] hover:text-[#5C1421] font-semibold transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">How to Measure Guide</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-white border border-stone-200 rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={() => handleToggleUnit("inches")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${measurements.unit === "inches" ? "bg-[#741B2B] text-white" : "text-stone-600 hover:text-stone-900"}`}
              >
                Inches (in)
              </button>
              <button
                type="button"
                onClick={() => handleToggleUnit("cm")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${measurements.unit === "cm" ? "bg-[#741B2B] text-white" : "text-stone-600 hover:text-stone-900"}`}
              >
                Centimeters (cm)
              </button>
            </div>
            <div className="flex items-center bg-white border border-stone-200 rounded-xl p-1 shadow-sm text-xs">
              <span className="px-2 text-stone-400 text-[11px] font-medium hidden sm:inline">
                Preset:
              </span>
              {(["S", "M", "L", "XL", "XXL"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleApplyPreset(sz)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${selectedPreset === sz ? "bg-[#B84A39] text-white" : "text-stone-600 hover:text-stone-900"}`}
                >
                  {sz}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleApplyPreset("M")}
              className="p-2 bg-white border border-stone-200 rounded-xl text-stone-500 hover:text-stone-800 shadow-sm"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              {rows.map((rowItems, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4"
                >
                  {rowItems.map((config) => (
                    <div id={`metric-card-${config.key}`} key={config.key}>
                      <MeasurementFieldCard
                        config={config}
                        value={measurements.values[config.key]}
                        unit={measurements.unit}
                        onChange={(val: number) => handleMetricChange(config.key, val)}
                        highlightedCircled={circledKeys.includes(config.key)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-3.5 flex items-start gap-3 text-xs text-emerald-900">
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                ✓
              </div>
              <div className="flex-1">
                <span className="font-semibold block text-emerald-950">
                  Key Suit Proportions Checked: Chak, Bottom Length, Muhri & Belt
                </span>
                <p className="text-emerald-800 mt-0.5">
                  These highlighted lower-body coordinates dictate your side-slit drop and salwar
                  fall. Our cutters calculate your custom drape ratio in sync with your selected fit
                  preference.
                </p>
              </div>
            </div>

            <div className="bg-white/80 border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm mt-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-[#741B2B] flex items-center justify-center font-bold">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-stone-900">
                    Ready for Masterji Cutting
                  </h4>
                  <p className="text-xs text-stone-500">
                    All 13 bespoke measurement specs confirmed & calibrated
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSlipModalOpen(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-stone-300 hover:bg-stone-50 font-semibold text-xs text-stone-700 transition-colors bg-white"
                >
                  View Tailor Slip
                </button>
                <button
                  type="button"
                  onClick={() => setSlipModalOpen(true)}
                  className="flex-1 sm:flex-none bg-[#741B2B] hover:bg-[#5C1421] text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
                >
                  <span>SAVE & CONTINUE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <GarmentVisualizer
              measurements={measurements}
              activeMetric={activeMetric}
              onSelectMetric={handleSelectFieldFromVisualizer}
              hoveredMetric={hoveredMetric}
              onHoverMetric={setHoveredMetric}
            />
          </div>
        </div>
      </main>
      <MeasurementGuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
      <SaveSlipModal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        measurements={measurements}
      />
    </div>
  );
}

function MeasurementFieldCard({
  config,
  value,
  unit,
  onChange,
  highlightedCircled,
}: {
  config: MeasurementFieldDef;
  value: number;
  unit: string;
  onChange: (val: number) => void;
  highlightedCircled?: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-xl p-4 shadow-sm transition-colors ${highlightedCircled ? "border-emerald-500 bg-emerald-50/10" : "border-stone-200"}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-sm font-semibold text-stone-900">{config.label}</div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">
            {config.subtitle}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full text-lg font-bold border-b border-stone-300 focus:border-[#741B2B] outline-none pb-1 bg-transparent text-stone-900"
        />
        <span className="text-xs text-stone-500 font-medium">{unit}</span>
      </div>
    </div>
  );
}

function GarmentVisualizer({
  measurements,
  activeMetric,
  onSelectMetric,
  hoveredMetric,
  onHoverMetric,
}: {
  measurements: CustomerMeasurements;
  activeMetric: MetricKey | null;
  onSelectMetric: (m: MetricKey) => void;
  hoveredMetric: MetricKey | null;
  onHoverMetric: (m: MetricKey | null) => void;
}) {
  const v = measurements?.values || {};
  const u = measurements?.unit || "in";

  const MeasureLabel = ({
    label,
    val,
    x,
    y,
    active,
    onClick,
    onHover,
  }: {
    label: string;
    val: number;
    x: number;
    y: number;
    active: boolean;
    onClick: () => void;
    onHover?: (hover: boolean) => void;
  }) => (
    <g
      className={`cursor-pointer transition-all ${active ? "text-[#741B2B] font-bold" : "text-[#A86F58]"}`}
      onClick={onClick}
      onMouseEnter={() => onHover && onHover(true)}
      onMouseLeave={() => onHover && onHover(false)}
    >
      <rect
        x={x - 30}
        y={y - 10}
        width="60"
        height="20"
        rx="10"
        fill="white"
        stroke="currentColor"
        className={active ? "text-[#741B2B]" : "text-stone-300"}
        strokeWidth={active ? 2 : 1}
      />
      <text
        x={x}
        y={y + 4}
        fontSize="9"
        textAnchor="middle"
        fill={active ? "currentColor" : "#57534e"}
      >
        {label} {val}
        {u}
      </text>
    </g>
  );

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex flex-col items-center sticky top-24">
      {/* Title & Subtitle */}
      <div className="w-full text-left mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#B84A39]" />
          <h3 className="font-serif text-xl text-stone-900 font-bold">
            Interactive Silhouette Visualizer
          </h3>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Dynamic Punjabi Suit schematic - Click points to inspect & measure
        </p>
      </div>

      {/* Tabs */}
      <div className="w-full flex items-center gap-1 mb-5">
        <div className="flex bg-stone-50 rounded-lg p-1 border border-stone-100">
          <button className="px-4 py-1.5 text-xs font-semibold bg-white shadow-sm rounded-md text-stone-900">
            Full Suit
          </button>
          <button className="px-4 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-900">
            Kurta Top
          </button>
          <button className="px-4 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-900">
            Bottom
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="w-full flex items-center justify-between text-xs border-b border-stone-100 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[#B84A39] font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>Guides Active</span>
          </div>
          <span className="text-stone-300">|</span>
          <div className="flex items-center gap-1 text-stone-500">
            <div className="w-1.5 h-1.5 rounded-full bg-[#B84A39]" />
            <span>Garment Wireframe</span>
          </div>
          <div className="flex items-center gap-1 text-stone-500">
            <div className="w-3 h-[1px] bg-[#B84A39]" />
            <span>Active Spec</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-stone-400 font-mono text-[10px]">
          <button className="hover:text-stone-700">-</button>
          <span>100%</span>
          <button className="hover:text-stone-700">+</button>
        </div>
      </div>

      {/* Visualizer Canvas */}
      <div className="relative w-full aspect-[2/3] max-h-[600px] overflow-hidden flex items-center justify-center p-2 border-b border-stone-100 pb-6">
        {/* Dotted Grid Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "radial-gradient(#e5e7eb 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        ></div>

        <svg viewBox="0 0 400 650" className="w-full h-full drop-shadow-sm z-10 relative">
          {/* Vertical Center Guide Line */}
          <line
            x1="200"
            y1="20"
            x2="200"
            y2="600"
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Kurta Wireframe */}
          <g
            stroke="#B84A39"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(0, 10)"
          >
            {/* Neck */}
            <path d="M 170 80 Q 200 110 230 80" />
            <circle cx="200" cy="95" r="2" fill="#B84A39" />
            {/* Shoulders / Teera */}
            <path d="M 170 80 L 140 95" />
            <circle cx="170" cy="80" r="2" fill="#B84A39" />
            <circle cx="230" cy="80" r="2" fill="#B84A39" />
            <path d="M 230 80 L 260 95" />
            {/* Sleeves */}
            <path d="M 140 95 L 80 160 L 100 190 L 135 140" />
            <path d="M 260 95 L 320 160 L 300 190 L 265 140" />
            {/* Body */}
            <path d="M 135 140 L 145 220 L 135 320 L 265 320 L 255 220 L 265 140" />

            <circle cx="135" cy="140" r="2" fill="#B84A39" />
            <circle cx="265" cy="140" r="2" fill="#B84A39" />
            <circle cx="145" cy="220" r="2" fill="#B84A39" />
            <circle cx="255" cy="220" r="2" fill="#B84A39" />
            <circle cx="135" cy="320" r="2" fill="#B84A39" />
            <circle cx="265" cy="320" r="2" fill="#B84A39" />

            {/* Dashed lines for measurements */}
            <g strokeDasharray="4 4" strokeWidth="1" strokeOpacity="0.5">
              <line x1="140" y1="95" x2="260" y2="95" /> {/* Teera */}
              <line x1="135" y1="140" x2="265" y2="140" /> {/* Chest */}
              <line x1="145" y1="220" x2="255" y2="220" /> {/* Waist */}
              <line x1="140" y1="270" x2="260" y2="270" /> {/* Hip */}
              <line x1="135" y1="320" x2="265" y2="320" /> {/* Ghera */}
              <line x1="110" y1="175" x2="135" y2="140" /> {/* Muhri / Plates */}
            </g>
          </g>

          {/* Salwar Wireframe */}
          <g
            stroke="#B84A39"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(0, 360)"
          >
            <path d="M 150 0 L 250 0 L 260 40 Q 270 120 240 190 L 160 190 Q 130 120 140 40 Z" />
            <path d="M 200 40 L 200 170" strokeDasharray="4 4" strokeWidth="1" />{" "}
            {/* Center seam */}
            <circle cx="200" cy="0" r="2" fill="#B84A39" />
            {/* Pleats styling */}
            <path d="M 170 40 L 180 80" strokeDasharray="2 2" strokeWidth="1" strokeOpacity="0.5" />
            <path d="M 185 40 L 195 80" strokeDasharray="2 2" strokeWidth="1" strokeOpacity="0.5" />
            <path d="M 230 40 L 220 80" strokeDasharray="2 2" strokeWidth="1" strokeOpacity="0.5" />
            <path d="M 215 40 L 205 80" strokeDasharray="2 2" strokeWidth="1" strokeOpacity="0.5" />
            <g strokeDasharray="4 4" strokeWidth="1" strokeOpacity="0.5">
              <line x1="150" y1="0" x2="250" y2="0" /> {/* Belt */}
              <line x1="160" y1="190" x2="240" y2="190" /> {/* Bottom Muhri */}
            </g>
          </g>

          {/* Separation Line */}
          <g stroke="black" strokeWidth="4" strokeLinecap="round">
            <line x1="80" y1="355" x2="320" y2="355" />
          </g>
          <circle cx="200" cy="355" r="3" fill="#B84A39" stroke="white" strokeWidth="2" />

          {/* Height bracket logic */}
          <g stroke="#B84A39" strokeWidth="1" strokeOpacity="0.5">
            {/* Kurta Length Bracket */}
            <line x1="95" y1="90" x2="105" y2="90" />
            <line x1="100" y1="90" x2="100" y2="330" />
            <line x1="95" y1="330" x2="105" y2="330" />
            {/* Bottom Length Bracket */}
            <line x1="115" y1="370" x2="125" y2="370" />
            <line x1="120" y1="370" x2="120" y2="550" />
            <line x1="115" y1="550" x2="125" y2="550" />
          </g>

          {/* Measurement Labels */}
          {/* Teera */}
          <MeasureLabel
            label="Teera"
            val={v.teera}
            x={200}
            y={105}
            active={activeMetric === "teera"}
            onClick={() => onSelectMetric("teera")}
            onHover={(h: boolean) => onHoverMetric(h ? "teera" : null)}
          />
          {/* Neck */}
          <MeasureLabel
            label="Neck"
            val={v.neck}
            x={230}
            y={120}
            active={activeMetric === "neck"}
            onClick={() => onSelectMetric("neck")}
            onHover={(h: boolean) => onHoverMetric(h ? "neck" : null)}
          />
          {/* Chest */}
          <MeasureLabel
            label="Chest"
            val={v.chest}
            x={200}
            y={150}
            active={activeMetric === "chest"}
            onClick={() => onSelectMetric("chest")}
            onHover={(h: boolean) => onHoverMetric(h ? "chest" : null)}
          />
          {/* Waist */}
          <MeasureLabel
            label="Waist"
            val={v.waist}
            x={200}
            y={230}
            active={activeMetric === "waist"}
            onClick={() => onSelectMetric("waist")}
            onHover={(h: boolean) => onHoverMetric(h ? "waist" : null)}
          />
          {/* Hip */}
          <MeasureLabel
            label="Hip"
            val={v.hip}
            x={200}
            y={280}
            active={activeMetric === "hip"}
            onClick={() => onSelectMetric("hip")}
            onHover={(h: boolean) => onHoverMetric(h ? "hip" : null)}
          />
          {/* Ghera */}
          <MeasureLabel
            label="Ghera"
            val={v.ghera}
            x={200}
            y={330}
            active={activeMetric === "ghera"}
            onClick={() => onSelectMetric("ghera")}
            onHover={(h: boolean) => onHoverMetric(h ? "ghera" : null)}
          />
          {/* Chak */}
          <MeasureLabel
            label="Chak"
            val={v.chak}
            x={290}
            y={260}
            active={activeMetric === "chak"}
            onClick={() => onSelectMetric("chak")}
            onHover={(h: boolean) => onHoverMetric(h ? "chak" : null)}
          />

          {/* Sleeves */}
          <MeasureLabel
            label="Sleeves"
            val={v.sleeves}
            x={290}
            y={120}
            active={activeMetric === "sleeves"}
            onClick={() => onSelectMetric("sleeves")}
            onHover={(h: boolean) => onHoverMetric(h ? "sleeves" : null)}
          />
          {/* Plates */}
          <MeasureLabel
            label="Plates"
            val={v.plates}
            x={315}
            y={185}
            active={activeMetric === "plates"}
            onClick={() => onSelectMetric("plates")}
            onHover={(h: boolean) => onHoverMetric(h ? "plates" : null)}
          />

          {/* Shirt Length (Rotated) */}
          <g transform="translate(75, 210) rotate(-90)">
            <MeasureLabel
              label="Length"
              val={v.shirtLength}
              x={0}
              y={0}
              active={activeMetric === "shirtLength"}
              onClick={() => onSelectMetric("shirtLength")}
              onHover={(h: boolean) => onHoverMetric(h ? "shirtLength" : null)}
            />
          </g>

          {/* Bottom Belt */}
          <MeasureLabel
            label="Belt"
            val={v.belt}
            x={200}
            y={360}
            active={activeMetric === "belt"}
            onClick={() => onSelectMetric("belt")}
            onHover={(h: boolean) => onHoverMetric(h ? "belt" : null)}
          />
          {/* Bottom Muhri */}
          <MeasureLabel
            label="Muhri"
            val={v.muhri}
            x={245}
            y={560}
            active={activeMetric === "muhri"}
            onClick={() => onSelectMetric("muhri")}
            onHover={(h: boolean) => onHoverMetric(h ? "muhri" : null)}
          />

          {/* Bottom Length (Rotated) */}
          <g transform="translate(95, 460) rotate(-90)">
            <MeasureLabel
              label="Length"
              val={v.bottomLength}
              x={0}
              y={0}
              active={activeMetric === "bottomLength"}
              onClick={() => onSelectMetric("bottomLength")}
              onHover={(h: boolean) => onHoverMetric(h ? "bottomLength" : null)}
            />
          </g>
        </svg>
      </div>

      {/* Footer / Standard */}
      <div className="w-full flex items-center justify-between text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 mt-4">
        <div className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-[#B84A39]" />
          <span>Masterji Cut Standard: Classic Straight Punjabi Suit</span>
        </div>
        <span className="font-mono font-medium">13 Tailor Points</span>
      </div>
    </div>
  );
}

function MeasurementGuideModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl max-w-md w-full">
        <h2 className="text-2xl font-serif mb-4 text-stone-900">How to Measure</h2>
        <p className="text-stone-500 mb-6 text-sm">
          To get the best fit, we recommend having someone else measure you using a flexible
          measuring tape. Keep the tape comfortably snug, but not tight.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 bg-[#741B2B] text-white rounded font-medium text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function SaveSlipModal({
  isOpen,
  onClose,
  measurements,
}: {
  isOpen: boolean;
  onClose: () => void;
  measurements: CustomerMeasurements;
}) {
  const [referenceId] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [orderDate] = useState(() => "2026-10-09");

  if (!isOpen) return null;
  const v = measurements?.values || {};

  const handleSaveSlip = () => {
    try {
      const refId = referenceId;
      const payload = {
        ...measurements,
        refId,
        savedAt: new Date().toISOString(),
      };

      const serialized = JSON.stringify(payload);
      localStorage.setItem("sm-tailor-slip", serialized);

      // Verify persistence: ensure the tailor slip is actually saved before confirming
      const verified = localStorage.getItem("sm-tailor-slip");
      if (!verified) {
        throw new Error("Tailor slip could not be confirmed in storage.");
      }
      const parsed = JSON.parse(verified) as { refId?: string };
      if (parsed.refId !== refId) {
        throw new Error("Tailor slip verification failed.");
      }

      // Also append to saved slips history for long-term reference
      try {
        const historyRaw = localStorage.getItem("sm-tailor-slips-history");
        const history = historyRaw ? (JSON.parse(historyRaw) as unknown[]) : [];
        history.unshift(payload);
        localStorage.setItem("sm-tailor-slips-history", JSON.stringify(history.slice(0, 10)));
      } catch {
        // history storage non-fatal
      }

      toast.success(`Tailor slip #${refId} confirmed and saved to your profile!`);
      onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not save tailor slip to local storage",
      );
    }
  };

  const waSpecs = Object.entries(v)
    .map(([key, val]) => `${key}: ${val}${measurements.unit === "cm" ? "cm" : "in"}`)
    .join(", ");
  const waMessage = `Hi SohniMutiyaar By CC, here are my bespoke measurements for my order:\nName: ${measurements.customerName || "Customer"}\nFit: ${measurements.fitPreference}\nSpecs: ${waSpecs}`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-2xl font-serif text-stone-900">Tailor Slip</h2>
            <p className="text-xs text-stone-500 mt-1">
              Order Reference: #{referenceId} • {orderDate}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="p-2 text-stone-500 hover:text-stone-900 bg-stone-100 rounded"
            title="Print Slip"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3">
            Customer Profile
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-stone-500 text-xs block">Name</span>
              <span className="font-medium">{measurements.customerName || "Simran Kaur"}</span>
            </div>
            <div>
              <span className="text-stone-500 text-xs block">Phone</span>
              <span className="font-medium">{measurements.phone || "+91 98765 43210"}</span>
            </div>
            <div>
              <span className="text-stone-500 text-xs block">Fit Preference</span>
              <span className="font-medium capitalize">
                {measurements.fitPreference || "Regular"}
              </span>
            </div>
            <div>
              <span className="text-stone-500 text-xs block">Units</span>
              <span className="font-medium capitalize">{measurements.unit}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3">
            13-Point Specifications
          </h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-stone-50 p-4 rounded-lg border border-stone-200">
            {Object.entries(v).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b border-stone-200 pb-1">
                <span className="capitalize text-stone-600">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <span className="font-mono font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <a
            href={`mailto:Charminngchic@gmail.com?subject=${encodeURIComponent("Bespoke Punjabi Suit Measurement Slip")}&body=${encodeURIComponent(waMessage)}`}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-xs flex items-center justify-center gap-2 uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <Mail className="size-4" /> Email Measurement Slip
          </a>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-300 text-stone-700 rounded-lg font-medium text-sm hover:bg-stone-50"
            >
              Back to Edit
            </button>
            <button
              onClick={handleSaveSlip}
              className="flex-1 py-2.5 bg-[#741B2B] text-white rounded-lg font-medium text-sm hover:bg-[#5C1421] transition-colors"
            >
              Save & Confirm Slip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
