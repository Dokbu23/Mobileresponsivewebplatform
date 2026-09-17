/**
 * Commute & Public Transit Guide for Mansalay, Oriental Mindoro
 * Computes realistic transit advice: where to board (sakayan), what vehicle to ride
 * (tricycle, jeepney, habal-habal, van), where to alight/transfer (babaan),
 * estimated fare, and driver instructions.
 */

export interface CommuteStep {
  stepNumber: number;
  type: 'board' | 'transfer' | 'alight' | 'walk';
  title: string;
  location: string;
  vehicle: string;
  fare?: string;
  details: string;
}
export interface CommuteGuide {
  summary: string;
  vehicleType: string;
  boardingPoint: string;
  dropoffPoint: string;
  driverPhrase: string;
  estimatedFare: string;
  estimatedTime: string;
  steps: CommuteStep[];
  tips: string[];
}

// Known Mansalay barangay junctions along the Strong Republic Nautical Highway
const BARANGAY_JUNCTIONS: Record<string, { junctionName: string; innerVehicle: string; fareEst: string }> = {
  'buktot': {
    junctionName: 'Kanto Manaul / Buktot Junction (Nautical Highway)',
    innerVehicle: 'Local Tricycle or Habal-habal',
    fareEst: '₱40 - ₱60/head (Special trip: ₱150 - ₱200)',
  },
  'panaytayan': {
    junctionName: 'Kanto Panaytayan (Nautical Highway)',
    innerVehicle: 'Habal-habal (Motorcycle)',
    fareEst: '₱60 - ₱100/head',
  },
  'wasig': {
    junctionName: 'Kanto Wasig Junction',
    innerVehicle: 'Tricycle',
    fareEst: '₱20 - ₱35/head',
  },
  'cabalwa': {
    junctionName: 'Cabalwa Highway Crossing',
    innerVehicle: 'Tricycle / Habal-habal',
    fareEst: '₱25 - ₱40/head',
  },
  'don pedro': {
    junctionName: 'Don Pedro Junction',
    innerVehicle: 'Tricycle',
    fareEst: '₱30 - ₱50/head',
  },
  'manaul': {
    junctionName: 'Manaul Highway Junction',
    innerVehicle: 'Tricycle',
    fareEst: '₱25 - ₱40/head',
  },
  'budburan': {
    junctionName: 'Budburan Junction',
    innerVehicle: 'Tricycle',
    fareEst: '₱25 - ₱35/head',
  },
  'sidell': {
    junctionName: 'Mansalay Bay Coastal Access / Poblacion',
    innerVehicle: 'Tricycle',
    fareEst: '₱20 - ₱30/head',
  },
  'pgd': {
    junctionName: 'PGD Coast Crossing',
    innerVehicle: 'Tricycle / Coastal Bangka',
    fareEst: '₱40 - ₱70/head',
  },
  'poblacion': {
    junctionName: 'Mansalay Public Market & Town Plaza',
    innerVehicle: 'Tricycle / Walking',
    fareEst: '₱15 - ₱20/head',
  },
};

/**
 * Generate a personalized commute guide from start position to destination
 */
export function getCommuteGuide(
  startLat: number,
  startLng: number,
  destName: string,
  destLocation?: string,
  destLat?: number,
  destLng?: number
): CommuteGuide {
  const locLower = (destLocation || destName || '').toLowerCase();

  // Find matching barangay or default to Poblacion
  let matchedBrgy = 'poblacion';
  for (const brgy of Object.keys(BARANGAY_JUNCTIONS)) {
    if (locLower.includes(brgy)) {
      matchedBrgy = brgy;
      break;
    }
  }

  const junctionInfo = BARANGAY_JUNCTIONS[matchedBrgy] || BARANGAY_JUNCTIONS['poblacion'];
  const isTownCenter = matchedBrgy === 'poblacion';

  // Distance calculation in KM
  let distanceKm = 3.5;
  if (destLat && destLng) {
    const R = 6371;
    const dLat = (destLat - startLat) * (Math.PI / 180);
    const dLon = (destLng - startLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(startLat * (Math.PI / 180)) * Math.cos(destLat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  }

  const steps: CommuteStep[] = [];

  if (isTownCenter) {
    // Direct commute within Town Center / Poblacion
    steps.push({
      stepNumber: 1,
      type: 'board',
      title: 'Sumakay sa Poblacion Terminal',
      location: 'Mansalay Town Plaza / Public Market Tricycle Stand',
      vehicle: 'Tricycle',
      fare: '₱15 - ₱25',
      details: 'Pumila o sumakay sa mga nakaparadang tricycle sa tapat ng Public Market o Town Plaza.',
    });
    steps.push({
      stepNumber: 2,
      type: 'alight',
      title: 'Bumaba sa Destinasyon',
      location: `Mismong entrance ng ${destName}`,
      vehicle: 'Tricycle',
      details: `Sabihin sa driver na sa ${destName} ang iyong babaan.`,
    });

    return {
      summary: `Mabilis na biyahe gamit ang Tricycle mula Poblacion diretso sa ${destName}.`,
      vehicleType: 'Tricycle (Poblacion Line)',
      boardingPoint: 'Mansalay Town Plaza / Public Market Terminal',
      dropoffPoint: `Entrance ng ${destName}`,
      driverPhrase: `"Manong, sa ${destName} po sa Poblacion."`,
      estimatedFare: '₱15 - ₱25 kada pasahero',
      estimatedTime: '5 - 10 minuto',
      steps,
      tips: [
        'Karaniwang regular fare ang sinisingil kapag may kasabay na ibang pasahero.',
        'Maaaring kumuha ng "special trip" kung maraming dalang bagahe.',
      ],
    };
  }

  // Multi-leg commute to outer barangays & beach resorts
  steps.push({
    stepNumber: 1,
    type: 'board',
    title: 'Saan Sasakay (Main Boarding)',
    location: 'Mansalay Town Plaza Terminal o National Highway',
    vehicle: 'Tricycle o Jeepney / Van',
    fare: '₱15 - ₱30',
    details: `Mula sa bayan o highway, sumakay ng Tricycle o Jeepney patungong ${junctionInfo.junctionName}.`,
  });

  steps.push({
    stepNumber: 2,
    type: 'transfer',
    title: 'Saan Bababa / Lilipat (Junction)',
    location: junctionInfo.junctionName,
    vehicle: junctionInfo.innerVehicle,
    fare: junctionInfo.fareEst,
    details: `Bumaba sa ${junctionInfo.junctionName}. Dito nakapila ang mga ${junctionInfo.innerVehicle} papasok sa dalampasigan o panloob na komunidad.`,
  });

  steps.push({
    stepNumber: 3,
    type: 'alight',
    title: 'Huling Babaan (Arrival)',
    location: `Gate o Entrance ng ${destName}`,
    vehicle: junctionInfo.innerVehicle,
    details: `Ipaalam sa driver na sa mismong gate o entrance ng ${destName} ka ibaba.`,
  });

  return {
    summary: `Sakay mula Poblacion/Highway patungong ${junctionInfo.junctionName}, pagkatapos ay lumipat ng ${junctionInfo.innerVehicle} papasok sa ${destName}.`,
    vehicleType: `Tricycle / ${junctionInfo.innerVehicle}`,
    boardingPoint: 'Mansalay Town Plaza Terminal o Highway Stop',
    dropoffPoint: `Entrance ng ${destName}`,
    driverPhrase: `"Manong, sa ${destName} po, paki-baba po ako sa mismong entrance."`,
    estimatedFare: junctionInfo.fareEst,
    estimatedTime: `${Math.max(10, Math.round(distanceKm * 3))} - ${Math.max(15, Math.round(distanceKm * 4))} minuto`,
    steps,
    tips: [
      'Tanungin muna ang driver kung magkano ang pamasahe bago sumakay para maiwasan ang overcharging.',
      'Kung papuntang beach resort, hingin ang cellphone number ng driver para may masasakyan pabalik sa bayan.',
      'Maghanda ng barya o maliliit na perang papel (₱20, ₱50).',
    ],
  };
}
