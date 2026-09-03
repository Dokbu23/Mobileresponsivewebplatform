import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAuthToken, getChatHistory, sendChatMessage, getJSON } from '../lib/api';
import { useNavigate } from 'react-router';
import {
  MessageSquare, Send, Sparkles, X, RotateCcw,
  Compass, Hotel, Package, Calendar, MapPin, Navigation,
  Globe, Shield, ChevronRight, Phone, Bot, Check, ArrowUpRight
} from 'lucide-react';
import { isBerMonths } from './ChristmasHolidayTheme';

type ChatMessage = {
  id: string;
  room?: string;
  sender: 'user' | 'bot';
  message: string;
  created_at?: string;
};

type QuickReply = {
  text: string;
  icon: string;
};

// ── SMART KNOWLEDGE-BASED CLIENT & FALLBACK AI FOR MANSALAY TOURISM ──
function generateTourismAiReply(text: string, currentLang: 'filipino' | 'english'): string {
  const lower = text.toLowerCase();
  
  // Smart detection of Tagalog keywords
  const isTagalogInput = /\b(ano|saano|saan|magkano|paano|kailan|sino|may|ba|mga|ang|ng|sa|ako|kami|tayong|tayo|pasyal|ganda|tulugan|bili|kainan|pagkain|masarap|sakay|biyahe|pamasahe|kotse|bus|punta|resort|beach|mangyan)\b/i.test(lower);
  const lang = isTagalogInput ? 'filipino' : (currentLang || 'filipino');

  // 1. Buktot Beach / Specific Beaches
  if (/\b(buktot|beach|dagat|baybayin|white sand|snorkeling|pgd|marine sanctuary|bonbon)\b/.test(lower)) {
    return lang === 'filipino'
      ? `**🏖️ Mga Magagandang Beach at Marine Spots sa Mansalay:**\n\n` +
        `• **Buktot Beach** — Ang pinakatanyag na white sand beach sa Mansalay! May malinaw na asul na tubig-dagat, mga kubo para sa picnic, at tahimik na paligid.\n` +
        `• **PGD Beach Marine Sanctuary** — Protektadong santuwaryo na perpekto para sa snorkeling, swimming, at pagmamasid sa makukulay na isda at corals.\n` +
        `• **Bonbon Beach & Coastal Waters** — Payapang baybayin para sa relaxing beach walks at sunset watching.\n\n` +
        `💡 *Tip: Maaari mong puntahan ang **Attractions** page para sa mga larawan at direksyon sa mapa!*`
      : `**🏖️ Beautiful Beaches & Marine Spots in Mansalay:**\n\n` +
        `• **Buktot Beach** — The premier white sand beach destination in Mansalay featuring crystal turquoise waters, seaside cottages, and peaceful coastal scenery.\n` +
        `• **PGD Beach Marine Sanctuary** — A protected marine reserve ideal for snorkeling, diving, and observing vibrant coral reefs.\n` +
        `• **Bonbon Beach** — A tranquil coastline ideal for relaxing beach strolls and stunning sunset views.\n\n` +
        `💡 *Tip: Visit the **Attractions** section for photos, details, and interactive map routes!*`;
  }

  // 2. Attractions & Nature Spots (Melzar, Caves, Mangyan)
  if (/\b(spot|spots|attraction|attractions|pasyalan|tanawin|bundok|mountain|falls|cave|kweba|lugar|melzar|mangyan|cultural|heritage|bundok halcon)\b/.test(lower)) {
    return lang === 'filipino'
      ? `**⛰️ Mga Sikat na Pasyalan at Heritage Sites sa Mansalay:**\n\n` +
        `• **Mangyan Cultural Village (Panaytayan)** — Makasaysayang pamayanan kung saan mararanasan ang tradisyunal na kultura, pamumuhay, at ang Surat Mangyan / Ambahan poetry ng Hanunuo Mangyan.\n` +
        `• **Mangyan Burial Cave** — Sinaunang kweba na nagpapatunay sa mayamang kasaysayan at tradisyon ng Mansalay.\n` +
        `• **Melzar Mountain Viewpoint** — Popular na trail para sa hiking na may 360-degree panoramic view ng dagat at kabundukan.\n` +
        `• **Cabaglat River** — Likas na malinis at malamig na ilog para sa family picnics at swimming.\n` +
        `• **Sidell Kite Festival Grounds** — Pwesto para sa kite flying, coastal events, at sunset viewing.\n\n` +
        `👉 *Tingnan ang lahat sa aming **Attractions** page!*`
      : `**⛰️ Top Attractions & Heritage Sites in Mansalay:**\n\n` +
        `• **Mangyan Cultural Village (Panaytayan)** — Cultural heritage community showcasing the indigenous traditions, lifestyle, and Hanunuo Mangyan Surat / Ambahan script.\n` +
        `• **Mangyan Burial Cave** — Historical cave site offering heritage insights into ancient traditions.\n` +
        `• **Melzar Mountain Viewpoint** — Rewarding trekking trail offering 360-degree panoramic views of mountains and sea.\n` +
        `• **Cabaglat River** — Refreshing freshwater river spot ideal for nature walks and picnics.\n` +
        `• **Sidell Kite Festival Grounds** — Open coastal venue famous for kite flying and community gatherings.\n\n` +
        `👉 *Browse the full directory on our **Attractions** page!*`;
  }

  // 3. Accommodations, Resorts, and Stays
  if (/\b(accommodation|accommodations|resort|resorts|hotel|tulugan|stay|stays|matutulugan|room|kwarto|hiraya|glamping|homestay|matulog|rate|presyo ng room)\b/.test(lower)) {
    return lang === 'filipino'
      ? `**🏨 Mga Rekomendadong Akomodasyon at Resort sa Mansalay:**\n\n` +
        `• **MB Hiraya Beach Resort** — Beachfront accommodation na may swimming pool, modern rooms, seaside cabanas, at restaurant.\n` +
        `• **Mahalta Glamping** — Premium hillside glamping tents na may magandang view sa Mansalay bay.\n` +
        `• **RC Farm and Resort** — Family-friendly farm stay at nature resort na may pool at lush gardens.\n` +
        `• **Nature's Gift Garden** — Serene garden guesthouse para sa tahimik at relaxing na bakasyon.\n\n` +
        `📞 *Paano Mag-book / Mag-inquire:*\n` +
        `Buksan ang **Stays** page sa menu upang makita ang direct phone number, Facebook link, at room rates ng bawat resort!`
      : `**🏨 Recommended Accommodations & Stays in Mansalay:**\n\n` +
        `• **MB Hiraya Beach Resort** — Modern beachfront resort with swimming pool, cozy rooms, and oceanfront dining.\n` +
        `• **Mahalta Glamping** — Scenic hillside glamping tents with panoramic bay views.\n` +
        `• **RC Farm and Resort** — Agri-tourism farmstay with swimming pool and lush tropical gardens.\n` +
        `• **Nature's Gift Garden** — Tranquil garden retreat ideal for relaxation.\n\n` +
        `📞 *How to Inquire / Book:*\n` +
        `Visit the **Stays** section to access direct phone numbers, Facebook pages, and room amenities!`;
  }

  // 4. Products, Souvenirs, AWATI & Delicacies
  if (/\b(product|products|pasalubong|bili|mabili|craft|crafts|souvenir|delicacy|kakanin|honey|awati|basket|ramit|hablon|sukang tuba|banana chips|presyo)\b/.test(lower)) {
    return lang === 'filipino'
      ? `**🎁 Mga Katutubong Produkto at Pasalubong sa Mansalay:**\n\n` +
        `• **AWATI Hanunuo Woven Baskets & Bags** — Tunay na gawang-kamay ng kababaihang Mangyan (Association of Women Artisans of Mansalay). Matibay at makasining na gawa sa uway at nito.\n` +
        `• **Pure Wild Forest Honey (Pukyutan)** — Likas at organikong pulot-pukyutan na inani mula sa kagubatan ng Mansalay.\n` +
        `• **Crispy Banana Chips & Native Delicacies** — Masasarap na meryenda na gawa ng mga lokal na kooperatiba.\n` +
        `• **Coconut Vinegar (Sukang Tuba)** — Katutubong suka na may natural na sili at bawang.\n` +
        `• **Mangyan Beaded Jewelry & Accessories** — Makukulay na pulseras, kwintas, at keychains.\n\n` +
        `🛒 *Bisitahin ang **Products** page para sa listahan ng mga tindahan at direct seller contact!*`
      : `**🎁 Local Products & Souvenirs in Mansalay:**\n\n` +
        `• **AWATI Hanunuo Woven Baskets & Crafts** — Authentic handwoven bags and storage crafts made by the Mangyan Women Artisans (AWATI).\n` +
        `• **Pure Wild Forest Honey** — 100% natural, raw honey harvested from the mountains of Mansalay.\n` +
        `• **Crispy Banana Chips & Local Treats** — Locally prepared savory and sweet snacks.\n` +
        `• **Coconut Vinegar (Sukang Tuba)** — Traditional spiced coconut sap vinegar.\n` +
        `• **Mangyan Beaded Jewelry** — Handcrafted colorful beadwork bracelets & necklaces.\n\n` +
        `🛒 *Visit the **Products** page to explore local shops and contact artisans directly!*`;
  }

  // 5. How to Get to Mansalay / Transportation & Directions
  if (/\b(paano pumunta|sakay|transportasyon|direksyon|how to get|commute|bus|van|roro|barko|byahe|airport|puerto galera|calapan|roxas|san jose|manila)\b/.test(lower)) {
    return lang === 'filipino'
      ? `**🚌 Paano Pumunta sa Mansalay, Oriental Mindoro:**\n\n` +
        `1. **Galing Maynila (Manila) / Batangas:**\n` +
        `   • Sumakay ng bus papuntang **Batangas Port** (PITX, Buendia, o Cubao).\n` +
        `   • Sumakay ng RORO o FastCat papuntang **Calapan Port** (approx. 2 hours).\n` +
        `   • Mula Calapan City, sumakay ng Van o Bus (ALPS / RORO Bus) patungong **Mansalay** (approx. 3 hanggang 3.5 oras).\n\n` +
        `2. **Via Roxas Port (Dangay):**\n` +
        `   • Kung galing Caticlan o Romblon via RORO papuntang Roxas, 15-20 minuto na lang ang layo papuntang Mansalay.\n\n` +
        `3. **Via San Jose Airport (Occidental Mindoro):**\n` +
        `   • Sumakay ng commercial flight papuntang San Jose Airport, pagkatapos ay van patungong Mansalay (approx. 1.5 - 2 oras).\n\n` +
        `🗺️ *Maaari mong buksan ang **Map** page upang makita ang interactive route at live GPS navigation!*`
      : `**🚌 How to Get to Mansalay, Oriental Mindoro:**\n\n` +
        `1. **From Manila / Batangas:**\n` +
        `   • Take a bus to **Batangas Port** from major terminals (PITX, Buendia, Cubao).\n` +
        `   • Board a RORO ferry or FastCat to **Calapan Port** (~2 hours).\n` +
        `   • From Calapan, take a southward Van or Bus (ALPS / Ceres) directly to **Mansalay** (~3 to 3.5 hours).\n\n` +
        `2. **Via Roxas Dangay Port:**\n` +
        `   • If arriving via ferry from Caticlan/Panay or Romblon, Mansalay is just a 15-20 minute van/jeep ride from Roxas.\n\n` +
        `3. **Via San Jose Airport (Occidental Mindoro):**\n` +
        `   • Fly to San Jose Airport, then take a passenger van overland to Mansalay (~1.5 to 2 hours).\n\n` +
        `🗺️ *Check our **Map** section for full interactive directions and landmarks!*`;
  }

  // 6. Itinerary & Trip Planning
  if (/\b(itinerary|plano|plan|trip|gawin|schedule|araw|days|ilang araw|1 day|2 days|3 days)\b/.test(lower)) {
    return lang === 'filipino'
      ? `**🗺️ Mungkahi na 2-3 Araw na Itinerary sa Mansalay:**\n\n` +
        `• **Day 1 (Sun & Sand):**\n` +
        `  - Umaga: Buktot Beach (swimming, sunbathing, snorkeling)\n` +
        `  - Hapon: Cabaglat River & Sunset at Sidell Grounds\n` +
        `  - Gabi: Check-in sa MB Hiraya o Mahalta Glamping\n\n` +
        `• **Day 2 (Culture & Crafts):**\n` +
        `  - Umaga: Bisitahin ang Panaytayan Mangyan Cultural Village & Burial Caves\n` +
        `  - Hapon: Pasalubong shopping sa AWATI Handwoven Crafts & Local Delicacies\n` +
        `  - Gabi: Seafood dinner sa Mansalay Baywalk\n\n` +
        `• **Day 3 (Adventure & Scenic Views):**\n` +
        `  - Umaga: Melzar Mountain Trekking & Photo Session\n` +
        `  - Hapon: Souvenir pick-up at pagbiyahe pauwi\n\n` +
        `✨ *Pumunta sa **Itinerary** page sa menu upang mag-generate o mag-customize ng sarili mong trip schedule!*`
      : `**🗺️ Suggested 2-3 Day Mansalay Travel Itinerary:**\n\n` +
        `• **Day 1 (Sun & Coastal Adventure):**\n` +
        `  - Morning: Swim and relax at pristine Buktot Beach\n` +
        `  - Afternoon: Refresh at Cabaglat River and catch the sunset at Sidell Grounds\n` +
        `  - Evening: Stay at MB Hiraya Beach Resort or Mahalta Glamping\n\n` +
        `• **Day 2 (Cultural Immersion & Crafts):**\n` +
        `  - Morning: Explore Panaytayan Mangyan Cultural Village & Historic Burial Caves\n` +
        `  - Afternoon: Shop authentic souvenirs at AWATI Handicrafts & Pasalubong Centers\n` +
        `  - Evening: Seaside dining along Mansalay coastal baywalk\n\n` +
        `• **Day 3 (Nature Trekking & Departure):**\n` +
        `  - Morning: Melzar Mountain trail trek for scenic vistas\n` +
        `  - Afternoon: Final pasalubong collection and departure\n\n` +
        `✨ *Visit the **Itinerary** tab to customize and save your personal itinerary!*`;
  }

  // 7. Wishlist & Saved Analytics / Features
  if (/\b(wishlist|saved|save|bookmark|analytics|paborito|puso|heart)\b/.test(lower)) {
    return lang === 'filipino'
      ? `**❤️ Paano Gumagana ang Wishlist at Analytics:**\n\n` +
        `• **Para sa mga Turista:** I-click ang Heart icon sa anumang Attraction, Stay, o Product upang i-save ito sa iyong personal na **Wishlist**. Naka-save ito exclusively sa iyong account!\n` +
        `• **Para sa Resort at Enterprise Partners:** Sa inyong **Wishlist Analytics** page, makikita ninyo ang live data kung ilang turista ang nag-save ng inyong mga rooms at produkto, kasama ang platform-wide trends!\n` +
        `• **Para sa Admin:** Comprehensive overview ng most wishlisted destinations at visitor interest sa buong Mansalay.\n\n` +
        `*Buksan ang **Wishlist** sa navigation bar para makita ang iyong collection o analytics!*`
      : `**❤️ How the Wishlist & Analytics System Works:**\n\n` +
        `• **For Tourists:** Click the Heart icon on any Attraction, Resort, or Product to save it to your personal **Wishlist**. Your saved items are securely isolated to your account!\n` +
        `• **For Resort & Enterprise Partners:** In your **Wishlist Analytics** dashboard, view real-time statistics on how many visitors have saved your rooms and products, alongside platform trends.\n` +
        `• **For Administrators:** Comprehensive leaderboard of most saved places and community engagement.\n\n` +
        `*Click the **Wishlist** icon in the navbar to view your collection or analytics!*`;
  }

  // 8. Events & Festivals
  if (/\b(event|events|festival|fiesta|piyesta|handaan|kailan|petsa|date|selebrasyon)\b/.test(lower)) {
    return lang === 'filipino'
      ? `**🎉 Mga Pista at Pagdiriwang sa Mansalay:**\n\n` +
        `• **Mansalay Town Fiesta & St. Joseph the Worker Feast** — Ipinagdiriwang tuwing Mayo na may makukulay na parada, cultural presentations, at trade fairs.\n` +
        `• **Sidell Kite Flying Festival** — Masayang taunang pagpapalipad ng saranggola sa tabi ng baybayin.\n` +
        `• **Mangyan Cultural Day** — Pagdiriwang at pagtatanghal ng katutubong sayaw, musika, at tradisyon ng Hanunuo Mangyan.\n\n` +
        `📅 *Tingnan ang **Events** page sa menu para sa updated na iskedyul ng mga darating na aktibidad!*`
      : `**🎉 Festivals & Events in Mansalay:**\n\n` +
        `• **Mansalay Town Fiesta & Feast of St. Joseph the Worker** — Celebrated every May featuring vibrant street parades, cultural shows, and agro-tourism fairs.\n` +
        `• **Sidell Kite Flying Festival** — Annual summer kite flying competition and beach festival.\n` +
        `• **Mangyan Cultural Day** — Special celebrations highlighting Hanunuo Mangyan music, dances, and folklore.\n\n` +
        `📅 *Check the **Events** section in the menu for the full upcoming calendar!*`;
  }

  // 9. Contact / Direct Inquiry Support
  if (/\b(contact|telepono|phone|facebook|email|tulong|help|support|chat|inquire|inquiry|tanong|book)\b/.test(lower)) {
    return lang === 'filipino'
      ? `**📞 Pakikipag-ugnayan at Direct Inquiries:**\n\n` +
        `Ang **Discover Mansalay** ay nagbibigay ng direktang access sa mga may-ari ng resort at negosyo:\n` +
        `• **Resort Bookings:** Sa **Stays** page, i-click ang resort para makuha ang kanilang direct Phone number, Facebook Messenger, o website.\n` +
        `• **Pasalubong & Products:** Sa **Products** page, maaari mong direktang tawagan o i-message ang AWATI at mga lokal na producer.\n` +
        `• **Municipal Tourism Office:** Maaaring mag-inquire sa Mansalay Municipal Hall para sa guided cultural tours at permits.\n\n` +
        `May partikular ka bang negosyo o lugar na nais kontakin?`
      : `**📞 Contact & Direct Inquiries:**\n\n` +
        `**Discover Mansalay** connects you directly with local operators:\n` +
        `• **Resort Stays:** On the **Stays** page, click any resort to find their direct phone number, Facebook page, and location.\n` +
        `• **Local Products:** On the **Products** page, contact AWATI artisans and stores directly via phone or message.\n` +
        `• **Tourism Information:** Visit the Mansalay Municipal Tourism Office for local guidance and cultural tour assistance.\n\n` +
        `Is there a specific resort or attraction you need assistance with?`;
  }

  // General Conversational Fallback — Strictly Mansalay Tourism
  return lang === 'filipino'
    ? `Pasensya na, ako ay isang **Mansalay Tourism Assistant** na nakalaan lamang para sa mga tanong tungkol sa **Mansalay, Oriental Mindoro**—tulad ng aming mga pasyalan (Buktot Beach, Caves), resorts (MB Hiraya, Mahalta Glamping), lokal na produkto ng AWATI, mga pista, at interactive map.\n\nMay maitutulong ba ako tungkol sa iyong pagbisita sa Mansalay?`
    : `I apologize, but I am the **Mansalay Tourism Assistant** dedicated specifically to inquiries about **Mansalay, Oriental Mindoro**—such as our attractions (Buktot Beach, Caves), resorts (MB Hiraya, Mahalta Glamping), local AWATI products, festivals, and the interactive map.\n\nHow may I help you with your Mansalay travel plans?`;
}

export default function ChatWidgetEnhanced() {
  const { userType, currentUser } = useApp();
  const navigate = useNavigate();
  const isHoliday = isBerMonths();
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState<string>(userType ?? 'tourist');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState<string | null>(currentUser?.name ?? null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [language, setLanguage] = useState<'filipino' | 'english'>('filipino');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Quick reply pills
  const quickReplies: Record<string, Record<string, QuickReply[]>> = {
    tourist: {
      filipino: isHoliday ? [
        { text: 'Ano ang magagandang beach at pasyalan?', icon: '🏖️' },
        { text: 'Saan may available na resort ngayong holiday?', icon: '🏨' },
        { text: 'Sikat na Pamasko at AWATI Crafts', icon: '🎁' },
        { text: 'Mungkahi para sa Christmas Itinerary', icon: '🎄' },
      ] : [
        { text: 'Ano ang magagandang tourist spots?', icon: '🏖️' },
        { text: 'Saan may magandang resort o tulugan?', icon: '🏨' },
        { text: 'Ano ang sikat na pasalubong at AWATI?', icon: '🎁' },
        { text: 'Paano pumunta sa Mansalay?', icon: '🚌' },
        { text: 'Magmungkahi ng 3-Day Itinerary', icon: '🗺️' },
      ],
      english: isHoliday ? [
        { text: 'Where are the top beaches & sights?', icon: '🏖️' },
        { text: 'Any holiday stays or resorts available?', icon: '🏨' },
        { text: 'Popular Christmas gifts & AWATI crafts', icon: '🎁' },
        { text: 'Suggest a Holiday Travel Itinerary', icon: '🎄' },
      ] : [
        { text: 'What are the top tourist spots?', icon: '🏖️' },
        { text: 'Where to stay in Mansalay?', icon: '🏨' },
        { text: 'Popular AWATI souvenirs & crafts', icon: '🎁' },
        { text: 'How to get to Mansalay?', icon: '🚌' },
        { text: 'Suggest a 3-Day Travel Itinerary', icon: '🗺️' },
      ],
    },
    resort: {
      filipino: [
        { text: 'Paano makikita ang Wishlist Analytics?', icon: '📊' },
        { text: 'Paano mag-update ng rooms at presyo?', icon: '🏨' },
        { text: 'Paano mag-upload ng mga larawan?', icon: '📸' },
      ],
      english: [
        { text: 'How to view Wishlist Analytics?', icon: '📊' },
        { text: 'How to update rooms & pricing?', icon: '🏨' },
        { text: 'How to upload listing photos?', icon: '📸' },
      ],
    },
    enterprise: {
      filipino: [
        { text: 'Paano makikita ang Product Wishlist Analytics?', icon: '📊' },
        { text: 'Paano mag-add ng bagong produkto?', icon: '🛍️' },
        { text: 'Paano mag-update ng inventory?', icon: '📦' },
      ],
      english: [
        { text: 'How to view Product Wishlist Analytics?', icon: '📊' },
        { text: 'How to add new products?', icon: '🛍️' },
        { text: 'How to update inventory?', icon: '📦' },
      ],
    },
    admin: {
      filipino: [
        { text: 'Paano mag-manage ng users at listings?', icon: '👥' },
        { text: 'Paano mag-verify ng subscription receipts?', icon: '💳' },
        { text: 'Tingnan ang platform wishlist analytics', icon: '📈' },
      ],
      english: [
        { text: 'How to manage users & listings?', icon: '👥' },
        { text: 'How to verify subscription receipts?', icon: '💳' },
        { text: 'View platform wishlist analytics', icon: '📈' },
      ],
    },
  };

  useEffect(() => {
    setRoom(userType ?? 'tourist');
  }, [userType]);

  useEffect(() => {
    if (currentUser?.name) {
      setUserName(currentUser.name);
    }
  }, [currentUser]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Initial welcome greeting
  useEffect(() => {
    if (!open) return;
    if (messages.length === 0) {
      const displayUser = userName || (currentUser?.name?.split(' ')[0]) || (userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : (language === 'filipino' ? 'Kababayan' : 'Traveler'));
      const hour = new Date().getHours();
      let greeting = language === 'filipino' ? 'Kumusta' : 'Hello';
      if (language === 'filipino') {
        if (hour >= 5 && hour < 12) greeting = 'Magandang umaga';
        else if (hour >= 12 && hour < 18) greeting = 'Magandang hapon';
        else greeting = 'Magandang gabi';
      } else {
        if (hour >= 5 && hour < 12) greeting = 'Good morning';
        else if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
        else greeting = 'Good evening';
      }
      
      const welcomeMsg = isHoliday
        ? (language === 'filipino'
          ? `🎅 **Ho-ho-ho! Maligayang Pasko, ${displayUser}!** 🎄✨\n\nAko si **Santa Claus AI**, ang iyong holiday tourism guide sa bayan ng Mansalay! 🏖️🎁\n\nNaghahanap ka ba ng magandang beach tulad ng Buktot, resort na pwedeng tulugan ngayong bakasyon, masasarap na pamasko at katutubong AWATI crafts, o direksyon sa mapa?\n\nSabihin mo lang at tutulungan kita!`
          : `🎅 **Ho-ho-ho! Merry Christmas, ${displayUser}!** 🎄✨\n\nI'm **Santa Claus AI**, your official holiday tourism assistant in Mansalay! 🏖️🎁\n\nAre you looking for white sand beaches like Buktot, cozy holiday resorts, local pasalubong and AWATI handicrafts, or travel tips?\n\nJust ask and let's explore Mansalay together!`)
        : (language === 'filipino' 
          ? `${greeting}, **${displayUser}**! 👋\n\nAko ang iyong **Discover Mansalay AI Assistant**. Narito ako upang tulungan kang galugarin ang mga magagandang tanawin, beach tulad ng Buktot, mga resort, katutubong produkto ng AWATI, at direksyon sa bayan ng Mansalay.\n\nAno ang nais mong malaman?`
          : `${greeting}, **${displayUser}**! 👋\n\nI'm your **Discover Mansalay AI Assistant**. I'm here to help you explore tourist spots, Buktot Beach, resorts, authentic AWATI handicrafts, travel directions, and itineraries.\n\nHow can I help you today?`);
      
      const greet: ChatMessage = { 
        id: 'greet-bot', 
        sender: 'bot', 
        message: welcomeMsg, 
        created_at: new Date().toISOString() 
      };
      setMessages([greet]);
    }
  }, [open, userName, language, currentUser, userType]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, sending, loading, open]);

  function handleResetChat() {
    setMessages([]);
  }

  async function handleSend(e?: React.FormEvent, quickReplyText?: string) {
    e?.preventDefault();
    const text = (quickReplyText || input).trim();
    if (!text) return;

    const tempId = `temp-${Date.now()}`;
    const tempMsg: ChatMessage = { id: tempId, sender: 'user', message: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    setInput('');
    setSending(true);
    
    try {
      // 1. Try sending to backend AI endpoint
      const res: any = await sendChatMessage(room, text, language).catch(() => null);
      if (res?.reply?.message) {
        setMessages(prev => [...prev, res.reply]);
        setSending(false);
        return;
      }
      
      // 2. Intelligent local Tourism AI response
      setTimeout(() => {
        const replyText = generateTourismAiReply(text, language);
        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          message: replyText,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, botReply]);
        setSending(false);
      }, 400);
    } catch {
      setTimeout(() => {
        const replyText = generateTourismAiReply(text, language);
        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          message: replyText,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, botReply]);
        setSending(false);
      }, 400);
    }
  }

  function formatMessage(text: string) {
    let formatted = text;
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^• (.+)$/gm, '<li class="ml-2 mb-1">$1</li>');
    formatted = formatted.replace(/(<li.*<\/li>)/s, '<ul class="list-disc pl-3 my-2 space-y-1">$1</ul>');
    formatted = formatted.replace(/\n/g, '<br/>');
    return formatted;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex items-end flex-col-reverse">
        {open && (
          <div className="mb-3 w-[420px] max-w-[calc(100vw-2.5rem)] h-[620px] max-h-[82vh] bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp">
            
            {/* ── Chat Header ── */}
            <div className={`px-5 py-4 text-white flex items-center justify-between shadow-md relative ${
              isHoliday
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-emerald-700'
                : 'bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-700'
            }`}>
              {/* Snow cap on top of chat window */}
              {isHoliday && (
                <div className="absolute top-0 left-0 right-0 h-2.5 overflow-hidden pointer-events-none select-none z-10">
                  <svg className="w-full h-full text-white fill-current opacity-95" viewBox="0 0 200 12" preserveAspectRatio="none">
                    <path d="M0,6 Q10,0 20,5 Q30,10 40,4 Q50,0 60,6 Q70,11 80,4 Q90,0 100,6 Q110,12 120,5 Q130,0 140,6 Q150,11 160,4 Q170,0 180,6 Q190,11 200,5 L200,12 L0,12 Z" fill="#ffffff" />
                  </svg>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-2xl shadow-inner text-white ${
                    isHoliday ? 'bg-red-700/60 text-2xl border border-red-300/40' : 'bg-white/20 backdrop-blur-md'
                  }`}>
                    {isHoliday ? '🎅' : <Bot className="h-6 w-6" />}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <div className="font-extrabold text-sm flex items-center gap-1.5">
                    {isHoliday ? 'Santa Claus AI' : 'Discover Mansalay AI'}
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-white/25 uppercase tracking-wider">
                      {isHoliday ? '🎄 Santa Guide' : 'Assistant'}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/90 flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    {isHoliday ? 'Ho-ho-ho! Online • Holiday Tourism Guide' : 'Online • Tourist & Local Guide'}
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-1.5">
                {/* Reset Chat */}
                <button
                  onClick={handleResetChat}
                  className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                  title="Reset conversation"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                {/* Language Switcher */}
                <div className="relative">
                  <button 
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)} 
                    className="px-2 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1"
                    title="Change language"
                  >
                    <span>{language === 'filipino' ? '🇵🇭 FIL' : '🇺🇸 ENG'}</span>
                  </button>
                  
                  {showLanguageMenu && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 min-w-[130px] p-1">
                      <button
                        onClick={() => { setLanguage('filipino'); setShowLanguageMenu(false); setMessages([]); }}
                        className={`w-full px-3 py-2 text-left text-xs rounded-xl font-bold transition-colors flex items-center justify-between ${language === 'filipino' ? 'bg-pink-50 text-pink-600' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <span className="flex items-center gap-1.5">🇵🇭 Filipino</span>
                        {language === 'filipino' && <Check className="h-3.5 w-3.5 text-pink-600" />}
                      </button>
                      <button
                        onClick={() => { setLanguage('english'); setShowLanguageMenu(false); setMessages([]); }}
                        className={`w-full px-3 py-2 text-left text-xs rounded-xl font-bold transition-colors flex items-center justify-between ${language === 'english' ? 'bg-pink-50 text-pink-600' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <span className="flex items-center gap-1.5">🇺🇸 English</span>
                        {language === 'english' && <Check className="h-3.5 w-3.5 text-pink-600" />}
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Close Button */}
                <button 
                  onClick={() => setOpen(false)} 
                  className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors"
                  aria-label="Close chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Quick Shortcut Strip ── */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold text-gray-600 scrollbar-hide">
              <span className="text-[10px] text-gray-400 uppercase font-black px-1">Shortcuts:</span>
              <button onClick={() => navigate('/attractions')} className="px-2.5 py-1 bg-white hover:bg-pink-50 hover:text-pink-600 rounded-lg border border-gray-200 transition-colors whitespace-nowrap">🏖️ Attractions</button>
              <button onClick={() => navigate('/accommodations')} className="px-2.5 py-1 bg-white hover:bg-pink-50 hover:text-pink-600 rounded-lg border border-gray-200 transition-colors whitespace-nowrap">🏨 Stays</button>
              <button onClick={() => navigate('/products')} className="px-2.5 py-1 bg-white hover:bg-pink-50 hover:text-pink-600 rounded-lg border border-gray-200 transition-colors whitespace-nowrap">🎁 Products</button>
              <button onClick={() => navigate('/itinerary')} className="px-2.5 py-1 bg-white hover:bg-pink-50 hover:text-pink-600 rounded-lg border border-gray-200 transition-colors whitespace-nowrap">🗺️ Itinerary</button>
              <button onClick={() => navigate('/map')} className="px-2.5 py-1 bg-white hover:bg-pink-50 hover:text-pink-600 rounded-lg border border-gray-200 transition-colors whitespace-nowrap">📍 Map</button>
            </div>

            {/* ── Message Bubble Container ── */}
            <div ref={listRef} className="p-4 flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white space-y-3.5 chat-scroll">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  {msg.sender === 'bot' && (
                    <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-xs ${
                      isHoliday
                        ? 'bg-gradient-to-br from-red-600 to-rose-600 text-base shadow-red-500/20'
                        : 'bg-gradient-to-br from-pink-500 to-rose-600'
                    }`}>
                      {isHoliday ? '🎅' : <Bot className="h-4 w-4" />}
                    </div>
                  )}

                  <div className={`px-4 py-3 max-w-[82%] text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-2xl rounded-br-xs shadow-sm font-medium'
                      : 'bg-white text-gray-800 rounded-2xl rounded-tl-xs border border-gray-100 shadow-sm'
                  }`}>
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.message) }} />
                    {msg.created_at && (
                      <div className={`text-[9px] mt-1.5 ${msg.sender === 'user' ? 'text-white/70' : 'text-gray-400'} text-right`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-8 h-8 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-xs font-black flex-shrink-0 shadow-xs">
                      {userName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Animation */}
              {sending && (
                <div className="flex items-end gap-2.5 justify-start animate-fadeIn">
                  <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-white flex-shrink-0 ${
                    isHoliday
                      ? 'bg-gradient-to-br from-red-600 to-rose-600 text-base shadow-red-500/20'
                      : 'bg-gradient-to-br from-pink-500 to-rose-600'
                  }`}>
                    {isHoliday ? '🎅' : <Bot className="h-4 w-4" />}
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 bg-pink-500 rounded-full animate-bounce"></span>
                      <span className="h-2 w-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                      <span className="h-2 w-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Reply Suggestions */}
              {!sending && (
                <div className="pt-2">
                  <div className="text-[11px] text-gray-400 font-bold mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-pink-500" />
                    {language === 'filipino' ? 'Mga Mabilisang Tanong:' : 'Suggested Inquiries:'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickReplies[room]?.[language]?.map((qr, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(undefined, qr.text)}
                        className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-pink-300 hover:bg-pink-50/50 text-gray-700 hover:text-pink-600 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs font-medium"
                      >
                        <span>{qr.icon}</span>
                        <span>{qr.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Input Box (Always Active for All Visitors) ── */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input 
                  ref={inputRef}
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  placeholder={language === 'filipino' ? 'Magtanong tungkol sa Mansalay, beaches, stays...' : 'Ask about Mansalay spots, stays, products...'} 
                  className="flex-1 bg-gray-50 border border-gray-200 focus:bg-white rounded-2xl px-4 py-2.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all font-medium" 
                  disabled={sending}
                />
                <button 
                  type="submit" 
                  disabled={sending || !input.trim()} 
                  className={`w-10 h-10 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white flex items-center justify-center shadow-md transition-all flex-shrink-0 ${
                    sending || !input.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                  }`}
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="text-[10px] text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
                <span>Discover Mansalay Smart Tourism Assistant</span>
                <span>•</span>
                <span>Live Guide</span>
              </div>
            </form>

          </div>
        )}

        {/* ── Floating Chat Launcher Button (SANTA CLAUS AI) ── */}
        <button 
          onClick={() => setOpen(o => !o)} 
          title={isHoliday ? "Chat with Santa Claus AI 🎅" : "Chat with AI Tourism Assistant"} 
          className={`p-4 rounded-3xl shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 relative group flex items-center justify-center chat-launcher-btn ${
            isHoliday
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-red-500/40 border border-red-300/40'
              : 'bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 text-white shadow-pink-500/20'
          }`}
        >
          {/* Santa Hat perched on top of button */}
          {isHoliday && !open && (
            <span className="absolute -top-3.5 -left-1.5 text-2xl select-none pointer-events-none transform -rotate-12 filter drop-shadow">
              🎅
            </span>
          )}

          {!open && (
            <div className={`absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-xs animate-bounce ${
              isHoliday ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {isHoliday ? '🎁' : '💬'}
            </div>
          )}

          {open ? (
            <X className="h-6 w-6" />
          ) : isHoliday ? (
            <div className="flex items-center justify-center text-2xl animate-pulse">
              🎅
            </div>
          ) : (
            <Bot className="h-6 w-6" />
          )}
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-lg">
            {isHoliday
              ? (language === 'filipino' ? 'Ho-ho-ho! Magtanong kay Santa Claus AI! 🎅' : 'Ho-ho-ho! Ask Santa Claus AI! 🎅')
              : (language === 'filipino' ? 'Magtanong sa Tourism Assistant! 🏖️' : 'Ask our Tourism Assistant! 🏖️')}
          </div>
        </button>
      </div>

      <style>{`
        .chat-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .chat-scroll::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
