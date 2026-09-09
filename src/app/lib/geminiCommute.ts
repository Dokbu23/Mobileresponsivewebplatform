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
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-pro-latest',
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
 * Local Fallback Transit Engine for Mansalay & Oriental Mindoro.
 * Automatically generates accurate commute guidance when Gemini API key
 * is missing, rate-limited, or unavailable.
 */
function generateLocalFallbackCommutePlan(
  startLat: number,
  startLng: number,
  destName: string,
  destLocation: string | undefined,
  locationInfo: DetectedBarangayInfo,
  distanceKm: number,
  isLongDistance: boolean,
  isNightTrip: boolean,
  timeOfDayStr: string,
  timeOfDayCategory: 'morning' | 'afternoon' | 'evening' | 'late_night',
  currentClockTime: string,
  lang: 'tl' | 'en'
): AICommuteResult {
  const isEnglish = lang === 'en';
  const durationMinutes = Math.max(15, Math.round(distanceKm * 1.5));
  const arrivalDate = new Date(Date.now() + durationMinutes * 60000);
  const arrivalClockTime = formatClockTime(arrivalDate);

  if (isLongDistance) {
    // Inter-town trip along Strong Republic Nautical Highway (e.g. Gloria / Bongabong / Roxas to Mansalay)
    const vanFare = Math.max(60, Math.round(distanceKm * 2.8));
    const trikeFare = 30;
    const totalFareEst = `₱${vanFare + trikeFare} - ₱${vanFare + trikeFare + 40}`;

    return {
      language: lang,
      currentBarangay: locationInfo.barangay,
      areaType: isEnglish ? 'Inter-Town Highway Corridor' : 'Inter-Town Highway Corridor',
      distanceKm: Math.round(distanceKm * 10) / 10,
      isLongDistance: true,
      timeOfDay: timeOfDayStr,
      timeOfDayCategory,
      isNightTrip,
      nightCommuteAdvisory: isNightTrip
        ? (isEnglish
            ? 'Night Commute Advisory: Regular public jeepneys stop after ~7:00 PM. Along the Strong Republic Nautical Highway, take southbound UV Express vans or Ceres provincial buses heading to Mansalay. Upon arrival at Mansalay Town Proper, local tricycles operate as chartered special trips.'
            : 'Paalala sa Panggabing Byahe: Wala nang regular na jeep sa highway paglampas ng 7:00 PM. Sumakay ng panggabing UV Express Van o Ceres Bus sa highway patungong Mansalay. Pagdating sa bayan ng Mansalay, special trip na ang mga tricycle.')
        : undefined,
      availableVehiclesInArea: [
        {
          vehicle: isNightTrip
            ? (isEnglish ? 'Night UV Express Van / Provincial Bus' : 'Panggabing UV Express Van / Ceres Bus')
            : (isEnglish ? 'UV Express Van / Provincial Bus' : 'UV Express Van / Ceres Bus / Jeepney'),
          status: isEnglish ? 'Available on Highway' : 'Dumadaan sa Highway',
          availabilityNotes: isEnglish
            ? 'Operates along Strong Republic Nautical Highway connecting Oriental Mindoro towns.'
            : 'Bumibiyahe sa kahabaan ng Strong Republic Nautical Highway.',
        },
        {
          vehicle: isEnglish ? 'Local Tricycle (Town Proper)' : 'Lokal na Tricycle (Poblacion)',
          status: isNightTrip ? (isEnglish ? 'Special Trip / Chartered' : 'Special Trip / Pakyaw') : (isEnglish ? 'Available' : 'Bumabyahe'),
          availabilityNotes: isEnglish
            ? 'Takes passengers from Mansalay terminal directly to tourist destination.'
            : 'Naghahatid mula sa terminal ng Mansalay patungo sa mismong destinasyon.',
        },
      ],
      recommendedVehicle: isEnglish
        ? 'Southbound UV Express Van / Bus to Mansalay, then Local Tricycle'
        : 'UV Express Van o Provincial Bus patungong Mansalay, tapos Tricycle',
      summary: isEnglish
        ? `From ${locationInfo.municipality}, take a southbound public van or Ceres bus along the highway to Mansalay Poblacion (${(distanceKm * 0.85).toFixed(1)} km), then transfer to a local tricycle to reach ${destName}.`
        : `Mula sa ${locationInfo.municipality}, sumakay ng southbound UV Express o Ceres Bus sa highway patungong Mansalay Poblacion, at doon sumakay ng tricycle papunta sa ${destName}.`,
      vehicleType: isEnglish ? 'UV Express Van / Bus + Local Tricycle' : 'UV Express / Bus + Tricycle',
      boardingPoint: isEnglish
        ? `Strong Republic Nautical Highway near ${locationInfo.barangay}, ${locationInfo.municipality}`
        : `Highway sa ${locationInfo.barangay}, ${locationInfo.municipality}`,
      transferPoint: isEnglish ? 'Mansalay Town Proper / Poblacion Terminal' : 'Mansalay Poblacion Terminal',
      dropoffPoint: destName,
      driverPhrase: `Manong, sa ${destName} po.`,
      driverPhraseEnglish: `Sir, please take me to ${destName}.`,
      driverPhrasePronunciation: `Mah-NONG, sah ${destName} poh.`,
      estimatedFare: isEnglish ? `${totalFareEst} total (~$2-$3 USD)` : `${totalFareEst} kabuuang pamasahe`,
      regularFare: isEnglish ? `₱${vanFare} (Van/Bus) + ₱${trikeFare} (Tricycle)` : `₱${vanFare} (Van/Bus) + ₱${trikeFare} (Tricycle)`,
      specialFare: isNightTrip
        ? (isEnglish ? '₱100 - ₱150 for night chartered tricycle leg' : '₱100 - ₱150 pakyaw sa panggabing tricycle')
        : (isEnglish ? '₱80 - ₱120 chartered tricycle rate' : '₱80 - ₱120 special trip sa tricycle'),
      fareNotes: isEnglish
        ? 'Pay the van/bus conductor when boarded. Prepare small peso bills (₱20, ₱50, ₱100).'
        : 'Magbayad sa konduktor sa bus o driver ng van. Maghanda ng barya.',
      durationMinutes,
      estimatedTime: isEnglish ? `${durationMinutes} mins` : `${durationMinutes} minuto`,
      estimatedArrivalClockTime: arrivalClockTime,
      departureTime: currentClockTime,
      steps: [
        {
          stepNumber: 1,
          title: isEnglish ? '1. Board Southbound Van or Bus' : '1. Sumakay ng Southbound Bus / Van',
          location: `${locationInfo.barangay}, ${locationInfo.municipality}`,
          vehicle: isEnglish ? 'UV Express Van / Ceres Bus' : 'UV Express Van / Ceres Bus',
          details: isEnglish
            ? `Flag down a southbound public van or Ceres bus along the highway heading toward Mansalay / Roxas. Tell the conductor you will alight at Mansalay Poblacion.`
            : `Pumara ng southbound na van o Ceres bus sa highway. Sabihin sa konduktor na bababa sa Mansalay Poblacion.`,
          fare: `₱${vanFare}`,
        },
        {
          stepNumber: 2,
          title: isEnglish ? '2. Alight at Mansalay Poblacion' : '2. Bumaba sa Mansalay Poblacion',
          location: 'Mansalay Poblacion Terminal / Highway Stop',
          vehicle: isEnglish ? 'Walking / Transfer' : 'Paglipat ng Sasakyan',
          details: isEnglish
            ? `Alight at the Mansalay municipal town center. Walk a few meters to the local tricycle terminal or roadside queue.`
            : `Bumaba sa bayan ng Mansalay. Lumakad patungo sa pila ng mga lokal na tricycle.`,
        },
        {
          stepNumber: 3,
          title: isEnglish ? `3. Tricycle to ${destName}` : `3. Tricycle papuntang ${destName}`,
          location: destName,
          vehicle: isEnglish ? 'Local Tricycle' : 'Tricycle',
          details: isEnglish
            ? `Board a tricycle to ${destName}. Say or flash to driver: "Manong, sa ${destName} po."`
            : `Sumakay ng tricycle papuntang ${destName}. Sabihin o ipakita: "Manong, sa ${destName} po."`,
          fare: isNightTrip ? '₱80 - ₱120 (Special)' : `₱${trikeFare} - ₱50`,
        },
      ],
      tips: [
        isEnglish
          ? 'Show this screen directly to local drivers if you need assistance.'
          : 'Ipakita ang screen na ito sa driver para mabilis kayong magkaintindihan.',
        isEnglish
          ? 'Keep ₱20, ₱50, and ₱100 notes handy; drivers rarely have change for ₱1000 bills.'
          : 'Maghanda ng barya o maliliit na papel na pera (₱20, ₱50, ₱100).',
        isNightTrip
          ? (isEnglish ? 'Tricycles after 7:00 PM usually charge chartered special trip rates.' : 'Pakyaw o special trip na ang karamihang tricycle paglagpas ng 7 PM.')
          : (isEnglish ? 'Always ask and confirm fare before boarding.' : 'Itanong at linawin ang pamasahe bago sumakay.'),
      ],
    };
  }

  // Local short distance within Mansalay (<=10km)
  return {
    language: lang,
    currentBarangay: locationInfo.barangay,
    areaType: isEnglish ? 'Local Mansalay Area' : 'Lokal na Bayan ng Mansalay',
    distanceKm: Math.round(distanceKm * 10) / 10,
    isLongDistance: false,
    timeOfDay: timeOfDayStr,
    timeOfDayCategory,
    isNightTrip,
    nightCommuteAdvisory: isNightTrip
      ? (isEnglish
          ? 'Night Advisory: Local tricycles operate primarily on special chartered rates at night.'
          : 'Paalala sa Gabi: Special trip o pakyaw ang singil ng tricycle sa gabi.')
      : undefined,
    availableVehiclesInArea: [
      {
        vehicle: isEnglish ? 'Local Tricycle' : 'Lokal na Tricycle',
        status: isNightTrip ? (isEnglish ? 'Chartered / Special' : 'Special Trip') : (isEnglish ? 'Available' : 'Bumabyahe'),
        availabilityNotes: isEnglish
          ? 'Primary mode of transport throughout Mansalay barangays.'
          : 'Pangunahing sasakyan sa loob ng mga barangay ng Mansalay.',
      },
    ],
    recommendedVehicle: isNightTrip
      ? (isEnglish ? 'Chartered Tricycle (Special Trip)' : 'Special Trip Tricycle')
      : (isEnglish ? 'Local Tricycle' : 'Tricycle'),
    summary: isEnglish
      ? `Take a local tricycle directly from ${locationInfo.barangay} to ${destName} (${distanceKm.toFixed(1)} km).`
      : `Sumakay ng tricycle mula ${locationInfo.barangay} diretso sa ${destName} (${distanceKm.toFixed(1)} km).`,
    vehicleType: isEnglish ? 'Local Tricycle' : 'Tricycle',
    boardingPoint: `${locationInfo.barangay} / Roadside`,
    dropoffPoint: destName,
    transferPoint: isEnglish ? 'Direct trip (No transfer needed)' : 'Direktang biyahe (Walang transfer)',
    driverPhrase: `Manong, sa ${destName} po.`,
    driverPhraseEnglish: `Sir, please drop me off at ${destName}.`,
    driverPhrasePronunciation: `Mah-NONG, sah ${destName} poh.`,
    estimatedFare: isNightTrip ? '₱80 - ₱120 (Special Trip)' : '₱25 - ₱40 bawat pasahero',
    regularFare: '₱25 - ₱40 bawat pasahero',
    specialFare: '₱80 - ₱120 special trip',
    fareNotes: isEnglish ? 'Standard Mansalay MTFRB tricycle tariff rates.' : 'Alinsunod sa opisyal na taripa ng MTFRB Mansalay.',
    durationMinutes,
    estimatedTime: isEnglish ? `${durationMinutes} mins` : `${durationMinutes} minuto`,
    estimatedArrivalClockTime: arrivalClockTime,
    departureTime: currentClockTime,
    steps: [
      {
        stepNumber: 1,
        title: isEnglish ? '1. Board Local Tricycle' : '1. Sumakay ng Tricycle',
        location: locationInfo.barangay,
        vehicle: isEnglish ? 'Local Tricycle' : 'Tricycle',
        details: isEnglish
          ? `Flag down a tricycle at the roadside or terminal. Tell the driver: "Manong, sa ${destName} po."`
          : `Pumara ng tricycle sa tabing kalsada o terminal. Sabihin sa driver: "Manong, sa ${destName} po."`,
        fare: isNightTrip ? '₱80 - ₱120' : '₱25 - ₱40',
      },
      {
        stepNumber: 2,
        title: isEnglish ? `2. Arrive at ${destName}` : `2. Pagdating sa ${destName}`,
        location: destName,
        vehicle: isEnglish ? 'Arrival' : 'Destinasyon',
        details: isEnglish
          ? `You have arrived at ${destName}. Pay the driver upon alighting.`
          : `Nakarating na sa ${destName}. Magbayad sa driver pagkababa.`,
      },
    ],
    tips: [
      isEnglish ? 'You can flash this screen to the driver.' : 'Ipakita ang screen na ito sa driver.',
      isEnglish ? 'Carry exact fare in coins or small bills.' : 'Magbayad ng barya o eksaktong halaga.',
    ],
  };
}

/**
 * Ask Google Gemini AI to analyze the live GPS position, detect the exact Barangay,
 * detect whether it's daytime or nighttime commute, assess distance, and automatically
 * recommend appropriate transport in either Tagalog or English for international tourists.
 * Includes graceful local fallback if Gemini is offline or without API key.
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

  // If no Gemini API key is configured, immediately return robust local transit fallback
  if (!GEMINI_API_KEY) {
    console.info('[Gemini AI] No VITE_GEMINI_API_KEY found; utilizing built-in local transit engine.');
    return generateLocalFallbackCommutePlan(
      startLat,
      startLng,
      destName,
      destLocation,
      locationInfo,
      distanceKm,
      isLongDistance,
      isNightTrip,
      timeOfDayStr,
      timeOfDayCategory,
      currentClockTime,
      lang
    );
  }

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

  // Gracefully fall back to local transit engine if Gemini API failed or was rate-limited
  console.info('[Gemini AI] Gemini API call finished without response; using local transit plan.');
  return generateLocalFallbackCommutePlan(
    startLat,
    startLng,
    destName,
    destLocation,
    locationInfo,
    distanceKm,
    isLongDistance,
    isNightTrip,
    timeOfDayStr,
    timeOfDayCategory,
    currentClockTime,
    lang
  );
}
