/**
 * cems-brands.js
 * Maps nationalities → flag assets and home schools → CEMS uni logos.
 * Assets live in assets/flags/{iso2}.png and assets/schools/{slug}.png
 */
const CEMS_FLAG_BY_NATIONALITY = {
  // Common MIM nationalities (normalize keys to lowercase)
  portuguese: "pt",
  portugal: "pt",
  german: "de",
  germany: "de",
  italian: "it",
  italy: "it",
  spanish: "es",
  spain: "es",
  french: "fr",
  france: "fr",
  swedish: "se",
  sweden: "se",
  dutch: "nl",
  netherlands: "nl",
  belgian: "be",
  belgium: "be",
  swiss: "ch",
  switzerland: "ch",
  austrian: "at",
  austria: "at",
  danish: "dk",
  denmark: "dk",
  norwegian: "no",
  norway: "no",
  finnish: "fi",
  finland: "fi",
  polish: "pl",
  poland: "pl",
  hungarian: "hu",
  hungary: "hu",
  czech: "cz",
  "czech republic": "cz",
  irish: "ie",
  ireland: "ie",
  british: "gb",
  english: "gb",
  "united kingdom": "gb",
  uk: "gb",
  american: "us",
  "united states": "us",
  usa: "us",
  canadian: "ca",
  canada: "ca",
  brazilian: "br",
  brazil: "br",
  chilean: "cl",
  chile: "cl",
  colombian: "co",
  colombia: "co",
  chinese: "cn",
  china: "cn",
  "hong kong": "hk",
  indian: "in",
  india: "in",
  japanese: "jp",
  japan: "jp",
  korean: "kr",
  "south korean": "kr",
  "south korea": "kr",
  turkish: "tr",
  turkey: "tr",
  egyptian: "eg",
  egypt: "eg",
  singaporean: "sg",
  singapore: "sg",
  australian: "au",
  australia: "au",
  "south african": "za",
  "south africa": "za",
  mexican: "mx",
  mexico: "mx",
  russian: "ru",
  russia: "ru",
  greek: "gr",
  greece: "gr",
  romanian: "ro",
  romania: "ro",
  bulgarian: "bg",
  croatia: "hr",
  croatian: "hr",
  slovak: "sk",
  slovenia: "si",
  slovenian: "si",
  ukrainian: "ua",
  ukraine: "ua",
  israeli: "il",
  israel: "il",
  argentinian: "ar",
  argentine: "ar",
  argentina: "ar",
  taiwanese: "tw",
  taiwan: "tw",
  thai: "th",
  thailand: "th",
  vietnamese: "vn",
  vietnam: "vn",
  indonesian: "id",
  malaysia: "my",
  malaysian: "my",
  filipino: "ph",
  philippines: "ph",
  nigerian: "ng",
  kenya: "ke",
  kenyan: "ke",
  moroccan: "ma",
  morocco: "ma",
  tunisian: "tn",
  tunisia: "tn",
  pakistani: "pk",
  pakistan: "pk",
  bangladeshi: "bd",
  bangladesh: "bd",
  nepali: "np",
  nepal: "np",
  "new zealand": "nz",
  "new zealander": "nz",
  emirati: "ae",
  uae: "ae",
  "saudi arabian": "sa",
  saudi: "sa"
};

/**
 * Each entry: aliases (lowercase match substrings / exact), slug for assets/schools/{slug}.png, label
 */
const CEMS_SCHOOLS = [
  { slug: "aalto", label: "Aalto", aliases: ["aalto"] },
  { slug: "bocconi", label: "Bocconi", aliases: ["bocconi", "ub"] },
  { slug: "cbs", label: "CBS", aliases: ["cbs", "copenhagen business"] },
  { slug: "cornell", label: "Cornell", aliases: ["cornell", "sc johnson"] },
  { slug: "corvinus", label: "Corvinus", aliases: ["corvinus", "cub"] },
  { slug: "esade", label: "ESADE", aliases: ["esade"] },
  { slug: "fgv", label: "FGV EAESP", aliases: ["fgv", "eaesp", "sao paulo"] },
  { slug: "hec", label: "HEC Paris", aliases: ["hec"] },
  { slug: "hkust", label: "HKUST", aliases: ["hkust"] },
  { slug: "iimc", label: "IIM Calcutta", aliases: ["iimc", "iim calcutta", "iim calcutta"] },
  { slug: "ivey", label: "Ivey", aliases: ["ivey"] },
  { slug: "keio", label: "Keio", aliases: ["keio"] },
  { slug: "koc", label: "Koç", aliases: ["koc", "koç", "koc university"] },
  { slug: "kubs", label: "KUBS", aliases: ["kubs", "korea university"] },
  { slug: "lsm", label: "LSM Louvain", aliases: ["lsm", "louvain"] },
  { slug: "nus", label: "NUS", aliases: ["nus", "national university of singapore"] },
  { slug: "nhh", label: "NHH", aliases: ["nhh", "norwegian school of economics"] },
  { slug: "nova", label: "Nova SBE", aliases: ["nova", "novasbe", "nova sbe"] },
  { slug: "rsm", label: "RSM", aliases: ["rsm", "rotterdam", "erasmus"] },
  { slug: "sgh", label: "SGH Warsaw", aliases: ["sgh", "warsaw"] },
  { slug: "sse", label: "SSE", aliases: ["sse", "stockholm school", "hhs"] },
  { slug: "lse", label: "LSE", aliases: ["lse", "london school of economics"] },
  { slug: "sydney", label: "Sydney", aliases: ["sydney"] },
  { slug: "tsinghua", label: "Tsinghua", aliases: ["tsinghua", "sem"] },
  { slug: "ucd", label: "UCD Smurfit", aliases: ["ucd", "smurfit"] },
  { slug: "uai", label: "UAI", aliases: ["uai", "adolfo ibañez", "adolfo ibanez"] },
  { slug: "uniandes", label: "Uniandes", aliases: ["uniandes", "los andes"] },
  { slug: "uct", label: "UCT GSB", aliases: ["uct", "cape town"] },
  { slug: "cologne", label: "Cologne", aliases: ["cologne", "köln", "koln", "uni-koeln"] },
  { slug: "hsg", label: "St.Gallen", aliases: ["st.gallen", "st gallen", "hsg", "unisg"] },
  { slug: "wu", label: "WU Vienna", aliases: ["wu", "vienna"] },
  { slug: "auc", label: "AUC", aliases: ["auc", "american university in cairo", "onsi sawiris"] },
  { slug: "vse", label: "VSE Prague", aliases: ["vse", "prague", "vse prague"] }
];

function normalizeBrandKey(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveFlagCode(nationality) {
  const key = normalizeBrandKey(nationality);
  if (!key) return null;
  if (CEMS_FLAG_BY_NATIONALITY[key]) return CEMS_FLAG_BY_NATIONALITY[key];
  // fuzzy: "portuguese (brazil)" etc.
  for (const [name, code] of Object.entries(CEMS_FLAG_BY_NATIONALITY)) {
    if (key.includes(name) || name.includes(key)) return code;
  }
  return null;
}

function resolveSchool(homeSchool) {
  const key = normalizeBrandKey(homeSchool);
  if (!key) return null;
  for (const school of CEMS_SCHOOLS) {
    for (const alias of school.aliases) {
      const a = normalizeBrandKey(alias);
      if (key === a || key.includes(a)) return school;
    }
  }
  return null;
}

function flagSrc(nationality) {
  const code = resolveFlagCode(nationality);
  if (!code) return null;
  // Prefer square 1x1 SVG (best for circle crop); PNG fallback if present
  return `assets/flags/${code}.svg`;
}

function schoolLogoSrc(homeSchool) {
  const school = resolveSchool(homeSchool);
  if (!school) return null;
  const svgOnly = { bocconi: true, iimc: true, nhh: true };
  const ext = svgOnly[school.slug] ? "svg" : "png";
  return `assets/schools/${school.slug}.${ext}`;
}
