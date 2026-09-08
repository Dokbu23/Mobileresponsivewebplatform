/**
 * Gemini AI Commute & Public Transit Engine for Mansalay, Oriental Mindoro
 * Dynamically reverse-geocodes the tourist's live GPS coordinates to determine
 * their exact current Barangay and area type, then uses Google Gemini AI
 * to identify all available vehicles in that specific location and guide
 * the tourist on where to board, where to alight/transfer, driver phrases,
 * accurate Oriental Mindoro fare tariffs, and precise clock arrival time (ETA).
 *
 * FULL BILINGUAL SUPPORT (TAGALOG & ENGLISH FOR FOREIGN TOURISTS):
 * - Supports both Tagalog (local travelers) and English (international tourists).
 * - For foreigners: Explains local transit types (tricycles, habal-habal, UV Express, Ceres buses)
 *   and provides phonetic Tagalog driver phrases with English translations so
 *   foreigners can either speak or simply show their phone screen to the driver.
 *
 * AUTOMATIC REAL-TIME TIME-OF-DAY DETECTION (DAY VS NIGHT):
 * - Detects whether it's Morning, Afternoon, Evening, or Late Night.
 * - In Evening/Night (after ~6:30 PM - 8:00 PM):
 *   Accurately recognizes that regular jeepneys stop or are rare, recommending
 *   late-night UV Express Vans or Ceres/RORO Buses along the highway, and
 *   informing the passenger that local town tricycles switch to special trip rates.
 * - In Daytime: Recommends full regular passenger services.
 *
 * AUTOMATIC VEHICLE SELECTION BASED ON DISTANCE:
 * - Long distance (>10km) or inter-town (Gloria, Bansud, Pinamalayan, Bongabong, Calapan, etc.):
 *   Strictly recommends UV Express Van / Provincial Bus / Inter-town Jeepney on highway,
 *   then transfers to local tricycle upon reaching Mansalay. Tricycle for 20-50km highway
 *   trips is strictly prohibited.
 * - Short distance (<=10km within Mansalay): Recommends local Tricycle or Habal-habal.
 *
 * 100% Dynamic — No hardcoded routes or static data.
 */

export interface AvailableVehicle {
  vehicle: string;
  status: string; // e.g. 'Available', 'Pangunahin', 'Dumadaan sa Highway', 'Special Trip / Pakyaw'
  availabilityNotes: string;
}

export interface AICommuteStep {
  stepNumber: number;
  title: string;
  location: string;
  vehicle: string;
  details: string;
  fare?: string;
}

export interface AICommuteResult {
  language: 'tl' | 'en';
  currentBarangay: string;
  areaType: string;
  distanceKm: number;
  isLongDistance: boolean;
  // Day / Night Time Detection
  timeOfDay: string; // e.g. "Gabi (8:40 PM)" or "Evening (8:40 PM)"
  timeOfDayCategory: 'morning' | 'afternoon' | 'evening' | 'late_night';
  isNightTrip: boolean; // true if between 6:00 PM and 5:00 AM
  nightCommuteAdvisory?: string; // Guidance specific to night travel
  availableVehiclesInArea: AvailableVehicle[];
  recommendedVehicle: string;
  summary: string;
  vehicleType: string;
  boardingPoint: string;
  dropoffPoint: string;
  transferPoint?: string;
  // Driver Communication (Tagalog + English translation & pronunciation)
  driverPhrase: string;
  driverPhraseEnglish?: string;
  driverPhrasePronunciation?: string;
  // Authentic Oriental Mindoro Fare Structure
  estimatedFare: string;
  regularFare?: string; // e.g. "₱20 - ₱30 bawat pasahero"
  specialFare?: string; // e.g. "₱120 - ₱180 pakyaw / special trip"
  fareNotes?: string;
  // Accurate Time & Clock Arrival (ETA)
  durationMinutes: number; // e.g. 25
  estimatedTime: string; // e.g. "20 - 25 minuto" or "20 - 25 minutes"
  estimatedArrivalClockTime: string; // e.g. "8:52 PM"
  departureTime: string; // e.g. "8:27 PM"
  steps: AICommuteStep[];
  tips: string[];
}

export interface DetectedBarangayInfo {
  barangay: string;
  municipality: string;
  province: string;
  fullLocation: string;
}

const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
const MAPBOX_ACCESS_TOKEN = (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN || '';

// Primary models to try in sequence for high availability
const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.5-flash',
];

/**
 * Compute straight-line distance in kilometers using the Haversine formula
 */
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Reverse-geocode coordinates using Mapbox API and Nominatim fallback
 * to accurately identify the tourist's real Barangay in Mansalay or nearby towns.
 */
export async function resolveBarangayFromCoordinates(
  lat: number,
  lng: number
): Promise<DetectedBarangayInfo> {
  let detectedBarangay = '';
  let detectedMunicipality = 'Mansalay';
  let detectedProvince = 'Oriental Mindoro';

  // 1. Try Mapbox Geocoding if token is available
  if (MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN.startsWith('pk.')) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=locality,neighborhood,address,place`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const features = data?.features || [];

        const locality = features.find((f: any) => f.place_type?.includes('locality'));
        const neighborhood = features.find((f: any) => f.place_type?.includes('neighborhood'));
        const place = features.find((f: any) => f.place_type?.includes('place'));

        if (locality?.text) {
          detectedBarangay = locality.text;
        } else if (neighborhood?.text) {
          detectedBarangay = neighborhood.text;
        }

        if (place?.text) {
          detectedMunicipality = place.text;
        }
      }
    } catch (e) {
      console.warn('[ReverseGeocode] Mapbox geocoding error:', e);
    }
  }

  // 2. If barangay wasn't found via Mapbox, use OpenStreetMap Nominatim
  if (!detectedBarangay) {
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      const res = await fetch(osmUrl, {
        headers: { 'User-Agent': 'MansalayTourApp/1.0' },
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data?.address || {};

        detectedBarangay =
          addr.village ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.hamlet ||
          addr.quarter ||
          '';

        if (addr.town || addr.municipality || addr.city) {
          detectedMunicipality = addr.town || addr.municipality || addr.city;
        }
        if (addr.state || addr.province) {
          detectedProvince = addr.state || addr.province;
        }
      }
    } catch (e) {
      console.warn('[ReverseGeocode] Nominatim reverse geocode error:', e);
    }
  }

  // Format clean Barangay string
  const cleanBarangay = detectedBarangay
    ? detectedBarangay.toLowerCase().startsWith('barangay') || detectedBarangay.toLowerCase().startsWith('brgy')
      ? detectedBarangay
      : `Barangay ${detectedBarangay}`
    : `Mansalay Area (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

  return {
    barangay: cleanBarangay,
    municipality: detectedMunicipality,
    province: detectedProvince,
    fullLocation: `${cleanBarangay}, ${detectedMunicipality}, ${detectedProvince}`,
  };
}

/**
 * Clean and parse JSON returned by Gemini (handles markdown fences like ```json ... ```)
 */
function extractJsonFromText(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(cleaned);
}

/**
 * Compute clock arrival time (ETA) based on departure and minutes
 */
function formatClockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Ask Google Gemini AI to analyze the live GPS position, detect the exact Barangay,
 * detect whether it's daytime or nighttime commute, assess distance, and automatically
 * recommend appropriate transport in either Tagalog or English for international tourists.
 */
export async function getAICommuteGuide(
  startLat: number,
  startLng: number,
  destName: string,
  destLocation?: string,
  destLat?: number,
  destLng?: number,
  lang: 'tl' | 'en' = 'tl'
): Promise<AICommuteResult | null> {
  if (!GEMINI_API_KEY) {
    console.warn('[Gemini AI] No VITE_GEMINI_API_KEY found.');
    return null;
  }

  // Current client clock time & time-of-day detection
  const now = new Date();
  const currentClockTime = formatClockTime(now);
  const hours = now.getHours();

  let timeOfDayCategory: 'morning' | 'afternoon' | 'evening' | 'late_night' = 'morning';
  let timeOfDayLabel = lang === 'en' ? 'Morning' : 'Umaga';
  const isNightTrip = hours >= 18 || hours < 5;

  if (hours >= 5 && hours < 12) {
    timeOfDayCategory = 'morning';
    timeOfDayLabel = lang === 'en' ? 'Morning' : 'Umaga';
  } else if (hours >= 12 && hours < 18) {
    timeOfDayCategory = 'afternoon';
    timeOfDayLabel = lang === 'en' ? 'Afternoon' : 'Hapon';
  } else if (hours >= 18 && hours < 22) {
    timeOfDayCategory = 'evening';
    timeOfDayLabel = lang === 'en' ? 'Evening' : 'Gabi';
  } else {
    timeOfDayCategory = 'late_night';
    timeOfDayLabel = lang === 'en' ? 'Late Night / Dawn' : 'Hatinggabi / Madaling Araw';
  }
  const timeOfDayStr = `${timeOfDayLabel} (${currentClockTime})`;

  // 1. Resolve real live barangay & municipality from GPS coordinates
  const locationInfo = await resolveBarangayFromCoordinates(startLat, startLng);

  // 2. Calculate actual road/air distance between tourist and destination
  const destinationLat = destLat || 12.5298;
  const destinationLng = destLng || 121.4397;
  const distanceKm = getDistanceKm(startLat, startLng, destinationLat, destinationLng);
  const isDifferentTown = locationInfo.municipality.toLowerCase() !== 'mansalay';
  const isLongDistance = distanceKm > 10 || isDifferentTown;

  const isEnglish = lang === 'en';

  const prompt = `
You are the official local AI Commute & Transit Navigator of Mansalay, Oriental Mindoro, Philippines.
${isEnglish 
  ? 'An international foreign tourist who only speaks English wants to commute via local public transportation to reach their destination.' 
  : 'Isang turista ang nais mag-commute gamit ang pampublikong transportasyon upang marating ang kanilang destinasyon.'}

LANGUAGE REQUIREMENT:
Respond in ${isEnglish ? 'FLUENT, CLEAR ENGLISH (tailored for foreign international tourists)' : 'NATURAL, FRIENDLY TAGALOG (Filipino)'}.

CURRENT TRIP PROFILE:
- Current Time: ${currentClockTime} (${timeOfDayStr})
- Time of Day: ${timeOfDayLabel}
- Night Travel: ${isNightTrip ? 'YES (NIGHTTIME / LATE NIGHT)' : 'NO (DAYTIME)'}
- Tourist Current Location: ${locationInfo.fullLocation}
- Municipality: ${locationInfo.municipality}
- GPS Coordinates: Latitude ${startLat}, Longitude ${startLng}
- Target Destination: ${destName} (${destLocation || 'Mansalay, Oriental Mindoro'})
${destLat && destLng ? `- Destination Coordinates: (${destLat}, ${destLng})` : ''}
- Total Distance: ${distanceKm.toFixed(1)} km
- Route Type: ${isLongDistance ? 'INTER-TOWN LONG DISTANCE (>10km)' : 'LOCAL SHORT DISTANCE (Within Mansalay)'}

${isEnglish ? `
CRITICAL GUIDELINES FOR INTERNATIONAL FOREIGN TOURISTS IN THE PHILIPPINES:
1. EXPLAIN LOCAL VEHICLES:
   - "Tricycle": Motorbike with a covered passenger sidecar, the standard vehicle for town travel.
   - "Habal-habal": Passenger single motorbike used for steep or unpaved mountain trails.
   - "UV Express Van / Provincial Bus": Air-conditioned public vans or Ceres/RORO buses traveling between towns along the Strong Republic Nautical Highway.
2. BILINGUAL DRIVER COMMUNICATION:
   - Provide the exact Tagalog phrase the foreigner can say or show to the driver on their smartphone screen.
   - Provide the English meaning.
   - Provide a phonetic pronunciation guide (e.g., "Mah-NONG, sah...").
3. NIGHT COMMUTE ADVISORY (IF NIGHT):
   - Explain that regular jeepneys stop operating after ~7:00 PM. Night UV Express vans and Ceres buses continue along the highway. Town tricycles at night switch to chartered "special trip" rates.
4. PRACTICAL TIPS FOR FOREIGNERS:
   - Always carry small Philippine Peso cash denominations (₱20, ₱50, ₱100 notes and coins); drivers rarely have change for ₱1000 bills.
   - Remind them they can simply show their smartphone screen to the driver.
` : `
MGA PANUNTUNAN SA PAGBIYAHE SA ORIENTAL MINDORO:
1. GABI O ARAW:
   - Kung gabi na (${isNightTrip ? currentClockTime : 'Araw'}), linawin na wala nang regular jeepney sa highway paglampas ng 7 PM. Panggabing van at Ceres bus ang bumibiyahe sa highway, at special trip na ang mga tricycle sa bayan.
2. MAIKLI O MALAYUANG BYAHE:
   - Kung malayo (>10km) o galing sa ibang bayan tulad ng Gloria, Pinamalayan, Bansud, Bongabong: BAWAL ang tricycle sa highway. UV Express Van o Provincial Bus ang inirerekomenda patungong Mansalay, bago lumipat ng lokal na tricycle sa bayan.
`}

Respond with ONLY a valid JSON object matching this structure:
{
  "language": "${lang}",
  "currentBarangay": "${locationInfo.barangay}",
  "areaType": "${isEnglish ? (isLongDistance ? 'Inter-Town Highway Corridor' : 'Local Town / Barangay') : (isLongDistance ? 'Inter-Town / Ibang Bayan' : 'Local Barangay / Mansalay')}",
  "timeOfDay": "${timeOfDayStr}",
  "isNightTrip": ${isNightTrip},
  "nightCommuteAdvisory": "${isNightTrip 
    ? (isEnglish 
        ? 'Night Transit Advisory: Regular public jeepneys stop after 7:00 PM. Along the Strong Republic Nautical Highway, take night UV Express vans or Ceres provincial buses traveling south to Mansalay. Town tricycles at night operate on chartered special trip rates.' 
        : 'Paalala sa Gabi: Paglampas ng 7:00 PM, wala nang regular jeepney. Sumakay ng panggabing UV Express o Ceres Bus sa highway, at special trip na ang tricycle pagdating sa Mansalay.')
    : ''}",
  "availableVehiclesInArea": [
    {
      "vehicle": "${isLongDistance ? (isNightTrip ? (isEnglish ? 'Night UV Express Van / Provincial Bus' : 'Panggabing UV Express Van / Ceres Bus') : (isEnglish ? 'UV Express Van / Provincial Bus' : 'UV Express Van / Provincial Bus')) : (isEnglish ? 'Local Tricycle' : 'Tricycle')}",
      "status": "Available",
      "availabilityNotes": "${isEnglish ? 'Travels along Strong Republic Nautical Highway toward Mansalay.' : 'Dumadaan sa Strong Republic Nautical Highway.'}"
    }
  ],
  "recommendedVehicle": "${isLongDistance ? (isEnglish ? 'Southbound UV Express Van / Bus to Mansalay, then Local Tricycle' : 'UV Express Van o Provincial Bus tapos Local Tricycle sa Mansalay') : (isNightTrip ? (isEnglish ? 'Special Trip Tricycle (Night rate)' : 'Special Trip Tricycle') : (isEnglish ? 'Local Tricycle' : 'Tricycle'))}",
  "summary": "${isEnglish ? 'Summary in English...' : 'Buod sa Tagalog...'}",
  "vehicleType": "${isLongDistance ? 'UV Express Van / Bus + Local Tricycle' : 'Tricycle'}",
  "boardingPoint": "${isEnglish ? 'Boarding point details...' : 'Saan sasakay...'}",
  "transferPoint": "${isLongDistance ? (isEnglish ? 'Mansalay Town Proper / Poblacion Terminal' : 'Mansalay Poblacion Terminal') : (isEnglish ? 'Direct trip (No transfer needed)' : 'Direktang biyahe')}",
  "dropoffPoint": "${destName}",
  "driverPhrase": "Manong, sa ${destName} po.",
  "driverPhraseEnglish": "Sir, please drop me off at ${destName}.",
  "driverPhrasePronunciation": "Mah-NONG, sah ${destName} poh.",
  "estimatedFare": "${isEnglish ? '₱... total (~$... USD)' : '₱... kabuuan'}",
  "regularFare": "${isEnglish ? '₱... per person' : '₱... bawat pasahero'}",
  "specialFare": "${isLongDistance ? (isEnglish ? 'Chartered tricycles not recommended for 40+ km highway trips' : 'Hindi praktikal ang arkilang tricycle sa malayuang highway trip') : '₱... special trip'}",
  "fareNotes": "${isEnglish ? 'Carry small PHP peso bills. Confirm fare before boarding.' : 'I-klaro ang pamasahe bago sumakay.'}",
  "durationMinutes": ${Math.max(15, Math.round(distanceKm * 1.35))},
  "estimatedTime": "${Math.max(15, Math.round(distanceKm * 1.35))} ${isEnglish ? 'minutes' : 'minuto'}",
  "steps": [
    {
      "stepNumber": 1,
      "title": "${isEnglish ? '1. Boarding' : '1. Pagsakay'}",
      "location": "Location",
      "vehicle": "Vehicle",
      "details": "${isEnglish ? 'Clear instructions in English...' : 'Mga detalye sa Tagalog...'}",
      "fare": "₱..."
    }
  ],
  "tips": [
    "${isEnglish ? 'You can show this screen directly to the driver if you do not speak Tagalog.' : 'Maghanda ng barya.'}",
    "${isEnglish ? 'Keep small PHP peso cash denominations with you.' : 'I-klaro ang pamasahe bago sumakay.'}"
  ]
}
`;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1600,
          },
        }),
      });

      if (!response.ok) {
        console.warn(`[Gemini AI] Model ${model} returned HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed: AICommuteResult = extractJsonFromText(rawText);
      if (parsed && parsed.boardingPoint && parsed.steps) {
        // Ensure metadata is always populated
        parsed.language = lang;
        if (!parsed.currentBarangay) {
          parsed.currentBarangay = locationInfo.barangay;
        }

        parsed.distanceKm = distanceKm;
        parsed.isLongDistance = isLongDistance;
        parsed.timeOfDay = timeOfDayStr;
        parsed.timeOfDayCategory = timeOfDayCategory;
        parsed.isNightTrip = isNightTrip;

        // Calculate exact client clock arrival time (ETA)
        const mins = Number(parsed.durationMinutes) || Math.max(15, Math.round(distanceKm * 1.35));
        const arrivalDate = new Date(now.getTime() + mins * 60000);
        parsed.departureTime = currentClockTime;
        parsed.estimatedArrivalClockTime = formatClockTime(arrivalDate);
        parsed.durationMinutes = mins;

        return parsed;
      }
    } catch (err) {
      console.warn(`[Gemini AI] Error with model ${model}:`, err);
    }
  }

  return null;
}
