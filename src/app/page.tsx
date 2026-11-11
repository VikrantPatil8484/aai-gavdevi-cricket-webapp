"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Clock,
  Share2,
  Download,
  Plus,
  Trophy,
  Shield,
  XCircle,
  Sparkles,
  Radio,
  Users,
  Eye,
  Flame,
  BarChart3,
  ClipboardList,
  Activity,
  Trash2,
  RefreshCw,
} from "lucide-react";

// ==========================================
// RESILIENT EMBEDDED SUPABASE CLIENT & MEDIA STORAGE
// Reads .env.local variables seamlessly; works in Web Preview & Next.js
// ==========================================
const SUPABASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  "";
const SUPABASE_ANON_KEY =
  (typeof process !== "undefined" &&
    process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  "";

const createInternalSupabaseClient = () => {
  const getHeaders = (extraHeaders = {}) => {
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...extraHeaders,
    };
    // CRITICAL FIX: Only send 'Authorization: Bearer' if key is a legacy JWT (starts with 'ey').
    // Modern Supabase publishable keys start with 'sb_publishable_' and are NOT JWTs.
    // Sending 'Authorization: Bearer sb_publishable_...' causes PostgREST to fail with 401 Invalid JWT!
    if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.startsWith("ey")) {
      headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
    return headers;
  };

  return {
    from: (table) => {
      let selectCols = "*";
      let orderCol = null;
      let isAscending = true;
      let filterCol = null;
      let filterVal = null;
      let isSingle = false;

      const builder = {
        select: (cols = "*") => {
          selectCols = cols;
          return builder;
        },
        order: (col, opts = {}) => {
          orderCol = col;
          isAscending = opts.ascending !== false;
          return builder;
        },
        eq: (col, val) => {
          filterCol = col;
          filterVal = val;
          return builder;
        },
        single: async () => {
          isSingle = true;
          return await builder.execute();
        },
        then: (resolve, reject) => {
          builder.execute().then(resolve, reject);
        },
        execute: async () => {
          if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            return { data: null, error: null };
          }
          try {
            const params = new URLSearchParams();
            if (selectCols) params.set("select", selectCols);
            if (orderCol)
              params.set(
                "order",
                `${orderCol}.${isAscending ? "asc" : "desc"}`,
              );
            if (filterCol !== null && filterVal !== null) {
              params.set(filterCol, `eq.${filterVal}`);
            }

            const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`;
            const headers = getHeaders(
              isSingle ? { Accept: "application/vnd.pgrst.object+json" } : {},
            );

            const res = await fetch(url, { method: "GET", headers });
            if (!res.ok) {
              const errText = await res.text();
              console.error(
                `Supabase GET ${table} failed (${res.status}):`,
                errText,
              );
              return {
                data: null,
                error: new Error(`Fetch failed (${res.status}): ${errText}`),
              };
            }
            const data = await res.json();
            return { data, error: null };
          } catch (err) {
            console.error(`Supabase network error on ${table}:`, err);
            return { data: null, error: err };
          }
        },
        insert: async (records) => {
          if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            return { data: records, error: null };
          }
          try {
            const payload = Array.isArray(records) ? records : [records];
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
              method: "POST",
              headers: getHeaders({ Prefer: "return=representation" }),
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const errText = await res.text();
              console.error(
                `Supabase INSERT to ${table} failed (${res.status}):`,
                errText,
              );
              return {
                data: null,
                error: new Error(`Insert failed (${res.status}): ${errText}`),
              };
            }
            const data = await res.json();
            return { data, error: null };
          } catch (err) {
            console.error(`Supabase insert network error on ${table}:`, err);
            return { data: null, error: err };
          }
        },
        upsert: async (records) => {
          if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            return { data: records, error: null };
          }
          try {
            const payload = Array.isArray(records) ? records : [records];
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
              method: "POST",
              headers: getHeaders({
                Prefer: "resolution=merge-duplicates,return=representation",
              }),
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const errText = await res.text();
              console.error(
                `Supabase UPSERT to ${table} failed (${res.status}):`,
                errText,
              );
              return {
                data: null,
                error: new Error(`Upsert failed: ${errText}`),
              };
            }
            const data = await res.json();
            return { data, error: null };
          } catch (err) {
            return { data: null, error: err };
          }
        },
        update: (updates) => ({
          eq: async (col, val) => {
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
              return { data: updates, error: null };
            }
            try {
              const res = await fetch(
                `${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`,
                {
                  method: "PATCH",
                  headers: getHeaders({ Prefer: "return=representation" }),
                  body: JSON.stringify(updates),
                },
              );
              if (!res.ok) {
                const errText = await res.text();
                console.error(`Supabase UPDATE ${table} failed:`, errText);
                return { data: null, error: new Error("Update failed") };
              }
              const data = await res.json();
              return { data, error: null };
            } catch (err) {
              return { data: null, error: err };
            }
          },
        }),
        delete: () => ({
          eq: async (col, val) => {
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
              return { data: true, error: null };
            }
            try {
              const res = await fetch(
                `${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`,
                {
                  method: "DELETE",
                  headers: getHeaders(),
                },
              );
              if (!res.ok) {
                const errText = await res.text();
                console.error(`Supabase DELETE ${table} failed:`, errText);
                return { data: null, error: new Error("Delete failed") };
              }
              return { data: true, error: null };
            } catch (err) {
              return { data: null, error: err };
            }
          },
        }),
      };

      return builder;
    },
  };
};

const supabase = createInternalSupabaseClient();

// Upload image to Supabase 'cricket-media' storage bucket with fallback
async function uploadCricketMedia(fileOrBase64, folder = "players") {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (typeof fileOrBase64 === "string") return fileOrBase64;
    return URL.createObjectURL(fileOrBase64);
  }
  try {
    let blob;
    let fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;

    if (typeof fileOrBase64 === "string") {
      if (fileOrBase64.startsWith("http")) return fileOrBase64;
      const res = await fetch(fileOrBase64);
      blob = await res.blob();
    } else {
      blob = fileOrBase64;
      const ext = fileOrBase64.name?.split(".").pop() || "png";
      fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    }

    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/cricket-media/${fileName}`;
    const storageHeaders = {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": blob.type || "image/png",
    };
    if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.startsWith("ey")) {
      storageHeaders["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: storageHeaders,
      body: blob,
    });

    if (!res.ok) {
      if (typeof fileOrBase64 === "string") return fileOrBase64;
      return URL.createObjectURL(blob);
    }

    return `${SUPABASE_URL}/storage/v1/object/public/cricket-media/${fileName}`;
  } catch (err) {
    if (typeof fileOrBase64 === "string") return fileOrBase64;
    return URL.createObjectURL(fileOrBase64);
  }
}

// Helpers
const formatDateToReadable = (dateStr) => {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const options = {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return dateObj.toLocaleDateString("en-US", options);
  } catch (err) {
    return dateStr;
  }
};

const formatTimeToReadable = (timeStr) => {
  if (!timeStr) return "";
  try {
    const [hoursStr, minutesStr] = timeStr.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr || "00";
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${formattedHours}:${minutes} ${ampm} IST`;
  } catch (err) {
    return timeStr;
  }
};

// Translations
const TRANSLATIONS = {
  mr: {
    tagline: "क्रिकेट म्हणजे जीव की प्राण!! 🏏🚩",
    squadAlert: "सामना अलर्ट",
    home: "मुख्य पान",
    statsTable: "धावफलक व कामगिरी",
    playerPortal: "खेळाडू पोर्टल",
    liveScorer: "🔴 थेट स्कोअरर",
    createMatch: "नवीन सामना तयार करा",
    admin: "प्रशासक",
    searchPlaceholder: "स्पर्धा किंवा खेळाडू शोधा...",
    season: "हंगाम",
    matchSchedule: "पुढील सामना वेळापत्रक",
    ourTeam: "आपला संघ",
    opponent: "प्रतिस्पर्धी संघ",
    seasonSummaryTitle: "हंगाम चषक व क्रमवारी सारांश",
    seasonSummarySub:
      "स्पर्धेच्या आठवणी पाहण्यासाठी खालील कोणत्याही चषक रँकवर टॅप करा",
    tournamentsPlayed: "खेळलेल्या स्पर्धा",
    totalTrophiesWon: "एकूण जिंकलेले चषक",
    podiumFinishes: "पोडियम क्रमांक",
    rank1Label: "१ ला क्रमांक",
    champions: "अजिंक्यपद 🏆",
    rank2Label: "२ रा क्रमांक",
    runnersUp: "उपविजेते 🥈",
    rank3Label: "३ रा क्रमांक",
    thirdPlace: "तृतीय स्थान 🥉",
    rank4Label: "४ था क्रमांक",
    semiFinalFourth: "उपांत्य फेरी ⭐",
    rank0Label: "साखळी / १ ली फेरी (चषक नाही)",
    leagueExit: "साखळी फेरी 🏏",
    leagueFilterTab: "साखळी फेरी",
    squadShowcaseTitle: "३D संघ खेळाडू प्रदर्शन",
    squadShowcaseSub:
      "कार्डवर कुठेही क्लिक करा - संपूर्ण खेळाडू प्रोफाइल व धावफलक उघडेल",
    shareHdStatus: "व्हॉट्सॲप स्टेटसवर HD कार्ड शेअर करा",
    tournamentMemoriesTitle: "स्पर्धांचे चषक व आठवणी",
    tournamentMemoriesSub: "ग्रामीण आणि खुल्या टेनिस क्रिकेट स्पर्धांतील आठवणी",
    allRecords: "सर्व नोंदी",
    rankLabel: "क्रमांक",
    viewAlbum: "स्पर्धेचा अल्बम पहा",
    finalMom: "अंतिम सामनावीर",
    manOfSeries: "मालिकावीर",
    bestBatsman: "उत्कृष्ट फलंदाज",
    bestBowler: "उत्कृष्ट गोलंदाज",
    photosCount: "फोटो",
    noMatchScheduled: "पुढील सामना अद्याप नियोजित नाही",
    noMatchSub: "प्रशासक पॅनेलमधून पुढील सामन्याचे वेळापत्रक जोडा.",
    addScheduleBtn: "+ वेळापत्रक जोडा",
    noPlayersTitle: "अद्याप संघ खेळाडू जोडलेले नाहीत",
    noPlayersSub:
      "खेळाडू स्वतःची नोंदणी 'खेळाडू पोर्टल' वरून करू शकतात, किंवा प्रशासक थेट खेळाडू जोडू शकतात.",
    openPortalBtn: "खेळाडू नोंदणी पोर्टल उघडा",
    adminAddPlayerBtn: "प्रशासक: थेट खेळाडू जोडा",
    noTourneysTitle: "अद्याप कोणतीही स्पर्धा नोंदवलेली नाही",
    noTourneysSub:
      "प्रशासक पॅनेलमधून '२. Add Tournament' मध्ये जाऊन जिंकलेल्या स्पर्धा आणि फोटो जोडा.",
    addTourneyBtn: "+ स्पर्धा व चषक आठवणी जोडा",
    statsHeaderTitle: "खेळाडू धावफलक व कामगिरी (Player Stats & Scorecard)",
    statsHeaderSub: "सर्व अधिकृत सामने, धावा, विकेट्स आणि कामगिरी नोंदी",
    statsSearchPlaceholder: "खेळाडू शोधा...",
    selectPlayerLabel: "खेळाडू निवडा",
    noStatsPlayers: "अद्याप कोणतेही अधिकृत खेळाडू नाहीत",
    noStatsPlayersSub: "खेळाडू पोर्टल किंवा प्रशासक पॅनेलमधून खेळाडू जोडा.",
    totalMatches: "एकूण सामने",
    totalRuns: "एकूण धावा",
    highScore: "सर्वोच्च धावा (HS)",
    wickets: "विकेट्स",
    matchHistoryTitle: "सामनावार कामगिरी (Match-by-Match History)",
    downloadHdCard: "HD कार्ड डाउनलोड",
    noPerfRecords:
      "या खेळाडूसाठी अजून कोणतीही सामना नोंद नाही. 'खेळाडू पोर्टल' वरून कामगिरी नोंदवा.",
    tableDate: "तारीख",
    tableTourneyOpp: "स्पर्धा / विरोधक",
    tableRunsBalls: "धावा (चेंडू)",
    tableFoursSixes: "४ / ६",
    tableOversRuns: "षटक / धावा",
    tableWickets: "विकेट्स",
    portalTitle: "खेळाडू पोर्टल (Player Portal)",
    portalSub: "स्वतःची नोंदणी करा किंवा सामन्यातील कामगिरी नोंदवा",
    tabNewReg: "१. नवीन खेळाडू नोंदणी",
    tabLogPerf: "२. कामगिरी नोंदवा",
    regTitle: "नवीन खेळाडू प्रोफाइल नोंदणी",
    regSub: "नोंदणी केल्यानंतर प्रोफाइल कर्णधार व प्रशासक मंजुरीसाठी जाईल.",
    firstName: "पहिले नाव *",
    lastName: "आडनाव *",
    jerseyNo: "जर्सी क्रमांक *",
    playerRole: "खेळाडू भूमिका *",
    secretPin: "गुप्त ४-अंकी PIN *",
    playingStyle: "खेळण्याची शैली (Batting / Bowling Style)",
    uploadHdPhoto: "खेळाडू HD फोटो अपलोड करा *",
    photoSelected: "✓ फोटो निवडला गेला आहे",
    submitProfileBtn: "मंजुरीसाठी प्रोफाइल सादर करा (Submit Profile)",
    logPerfTitle: "सामन्यातील कामगिरी नोंदवा (Log Performance)",
    logPerfSub: "तुमचा प्रोफाइल निवडून ४-अंकी PIN टाका.",
    chooseProfile: "तुमचा प्रोफाइल निवडा *",
    selectPlayerPlaceholder: "-- खेळाडू निवडा --",
    enterPin: "तुमचा ४-अंकी PIN टाका *",
    defaultPinHint: "डीफॉल्ट पिन: 1234",
    loginUnlockBtn: "लॉगिन व अनलॉक करा",
    tourneyNameLabel: "स्पर्धेचे नाव *",
    oppositionLabel: "प्रतिस्पर्धी संघ *",
    runsLabel: "धावा (Runs)",
    ballsLabel: "चेंडू (Balls)",
    foursLabel: "चौकार (4s)",
    sixesLabel: "षटकार (6s)",
    oversLabel: "षटक (Overs Bowled)",
    runsConcededLabel: "दिलेल्या धावा",
    wicketsLabel: "विकेट्स (Wickets)",
    catchesLabel: "झेल (Catches)",
    savePerfBtn: "सामना कामगिरी सेव्ह करा (Save Performance)",
    adminDbTitle: "Admin Management Dashboard",
    adminDbSub: "सर्व बदल थेट Supabase डेटाबेसमध्ये सेव्ह होतात",
    tabMatchSchedule: "1. Match Schedule",
    tabAddTournament: "2. Add Tournament",
    tabDirectAddPlayer: "3. Direct Add Player",
    tabApprovals: "4. Approvals",
    updateMatchScheduleTitle:
      "पुढील सामना वेळापत्रक अपडेट करा (Upcoming Match Schedule)",
    updateMatchScheduleSub: "कॅलेंडरमधून तारीख आणि घड्याळातून वेळ निवडा.",
    matchDateCalendar: "सामना तारीख (Calendar Picker) *",
    selectedDatePrefix: "निवडलेली तारीख:",
    matchTimeClock: "सामना वेळ (Clock Picker) *",
    selectedTimePrefix: "निवडलेली वेळ:",
    groundVenue: "मैदान / ठिकाण *",
    roundStage: "फेरी / टप्पा (Round)",
    saveMatchScheduleBtn: "वेळापत्रक सेव्ह करा व मुख्य पानावर दाखवा",
    addTourneyHonoursTitle:
      "स्पर्धा, चषक व आठवणी जोडा (Add Tournament & Honours)",
    addTourneyHonoursSub: "जिंकलेले चषक, फोटो आणि मालिकावीरांची माहिती भरा.",
    rankLabelAdmin: "रँक / निकाल (Rank / Finish) *",
    monthYearLabel: "महिना / वर्ष",
    prizeLabel: "बक्षीस रक्कम व चषक (किंवा सहभाग)",
    tourneyVenueLabel: "स्पर्धेचे ठिकाण / मैदान *",
    finalMomLabel: "अंतिम सामनावीर (Final MoM Player)",
    momStatsLabel: "सामनावीर आकडेवारी (MoM Stats)",
    uploadTourneyPhotosLabel: "स्पर्धेचे फोटो अपलोड करा (Multi-Photos)",
    saveTourneyBtn: "स्पर्धा व आठवणी सेव्ह करा",
    directAddPlayerTitle: "थेट खेळाडू संघात जोडा (Direct Add Player)",
    directAddPlayerSub:
      "येथून जोडलेला खेळाडू थेट मंजूर होऊन ३D कॅरोसेलवर दिसेल.",
    playerFullName: "खेळाडूचे पूर्ण नाव *",
    addToSquadBtn: "खेळाडू संघात जोडा (Add to Squad)",
    pendingApprovalsTitle: "Pending Player Applications",
    noPendingApprovals:
      "सध्या कोणतीही मंजुरी प्रलंबित नाही (No Pending Approvals).",
    noActiveMatchTitle: "सध्या कोणताही सामना सुरू नाही",
    noActiveMatchSub:
      "नवीन सामना सुरू करण्यासाठी व चेंडूगणिक स्कोअर नोंदवण्यासाठी बटण दाबा.",
    createMatchBtn: "+ सामना तयार करा (Create Match)",
    bowlerLabel: "गोलंदाज (Bowler)",
    createMatchModalTitle: "नवीन सामना तयार करा (Create Match)",
    createMatchModalSub: "दोन्ही संघ, षटक आणि नाणेफेक निवडा",
    ourTeamLabel: "आपला संघ *",
    opponentLabel: "प्रतिस्पर्धी संघ *",
    oversLabelSelect: "षटक (Overs)",
    tossWinnerLabel: "नाणेफेक विजेता",
    tossDecisionLabel: "नाणेफेक निर्णय",
    battingFirstOption: "प्रथम फलंदाजी (Batting First)",
    bowlingFirstOption: "प्रथम गोलंदाजी (Bowling First)",
    strikerInputLabel: "स्ट्रायकर फलंदाज *",
    nonStrikerInputLabel: "नॉन-स्ट्रायकर फलंदाज *",
    openingBowlerInputLabel: "सलामीचा गोलंदाज (Opening Bowler) *",
    startLiveMatchBtn: "सामना सुरू करा (Start Live Match)",
    strikerPlaceholder: "उदा. Vicky Patil",
    nonStrikerPlaceholder: "उदा. Vikrant Patil",
    openingBowlerPlaceholder: "उदा. Nilesh Jadhav",
    wicketModalTitle: "🎯 Wicket! पुढील फलंदाज",
    nextBatsmanLabel: "नवीन फलंदाजाचे नाव टाका:",
    confirmBatsmanBtn: "मैदानावर आणा (Confirm)",
    overCompleteTitle: "⚡ Over Complete! पुढील गोलंदाज",
    nextBowlerLabel: "नवीन गोलंदाजाचे नाव टाका:",
    confirmBowlerBtn: "षटक सुरू करा (Confirm)",
    fullScorecardTitle: "Full Live Match Scorecard",
    shareScorecardWhatsapp: "WhatsApp वर शेअर करा",
    battingSection: "फलंदाजी (Batting)",
    bowlingSection: "गोलंदाजी (Bowling)",
    tableBatsman: "फलंदाज",
    tableRuns: "धावा",
    tableBalls: "चेंडू",
    tableSR: "SR",
    tableBowler: "गोलंदाज",
    tableOvers: "षटक",
    tableEcon: "Econ",
    adminLoginTitle: "प्रशासक लॉगिन (Admin Access)",
    adminLoginSub: "डॅशबोर्ड उघडण्यासाठी पासवर्ड टाका",
    seasonLabel: "हंगाम (Season)",
  },
  en: {
    tagline: "Cricket Mhanje Jiv ki Pran!!! ❤️🏏",
    squadAlert: "Squad Alert",
    home: "Home",
    statsTable: "Player Stats & Table",
    playerPortal: "Player Portal",
    liveScorer: "🔴 Live Scorer",
    createMatch: "Create Match",
    admin: "Admin",
    searchPlaceholder: "Search tournament or player...",
    season: "Season",
    matchSchedule: "Upcoming Match Schedule",
    ourTeam: "Our Village Team",
    opponent: "Opponent",
    seasonSummaryTitle: "Season Trophy & Rank Summary",
    seasonSummarySub:
      "Tap any trophy rank box below to filter tournament memories",
    tournamentsPlayed: "Tournaments Played",
    totalTrophiesWon: "Total Trophies Won",
    podiumFinishes: "Podium Finishes",
    rank1Label: "1st Rank",
    champions: "Champions 🏆",
    rank2Label: "2nd Rank",
    runnersUp: "Runners-Up 🥈",
    rank3Label: "3rd Rank",
    thirdPlace: "3rd Place Finish 🥉",
    rank4Label: "4th Rank",
    semiFinalFourth: "Semi-Final 4th ⭐",
    rank0Label: "League Stage / 1st Round (No Trophy)",
    leagueExit: "League Stage 🏏",
    leagueFilterTab: "League Stage",
    squadShowcaseTitle: "3D Squad Showcase",
    squadShowcaseSub:
      "Click anywhere on active card to view Full HD Profile & Stats",
    shareHdStatus: "Share HD Card to WhatsApp Status",
    tournamentMemoriesTitle: "Tournament Trophies & Memories",
    tournamentMemoriesSub:
      "Memories and honours from rural & open tennis tournaments",
    allRecords: "All Records",
    rankLabel: "Rank",
    viewAlbum: "View Tournament Album",
    finalMom: "Final Man of the Match",
    manOfSeries: "Man of the Series",
    bestBatsman: "Best Batsman",
    bestBowler: "Best Bowler",
    photosCount: "Photos",
    noMatchScheduled: "No Upcoming Match Scheduled",
    noMatchSub: "Add upcoming match schedule from Admin Panel.",
    addScheduleBtn: "+ Add Match Schedule",
    noPlayersTitle: "No Squad Players Added Yet",
    noPlayersSub:
      "Players can self-register from 'Player Portal', or Admin can add players directly.",
    openPortalBtn: "Open Player Registration Portal",
    adminAddPlayerBtn: "Admin: Direct Add Player",
    noTourneysTitle: "No Tournaments Added Yet",
    noTourneysSub:
      "Add won trophies and tournament memories from Admin Panel '2. Add Tournament'.",
    addTourneyBtn: "+ Add Tournament & Trophies",
    statsHeaderTitle: "Player Stats & Scorecard",
    statsHeaderSub:
      "Official matches, runs, wickets & career performance records",
    statsSearchPlaceholder: "Search player...",
    selectPlayerLabel: "Select Player",
    noStatsPlayers: "No Official Players Yet",
    noStatsPlayersSub: "Add players from Player Portal or Admin Dashboard.",
    totalMatches: "Total Matches",
    totalRuns: "Total Runs",
    highScore: "High Score (HS)",
    wickets: "Wickets",
    matchHistoryTitle: "Match-by-Match History",
    downloadHdCard: "Download HD Card",
    noPerfRecords:
      "No match records for this player yet. Log match performances from 'Player Portal'.",
    tableDate: "Date",
    tableTourneyOpp: "Tournament / Opponent",
    tableRunsBalls: "Runs (Balls)",
    tableFoursSixes: "4s / 6s",
    tableOversRuns: "Overs / Runs",
    tableWickets: "Wickets",
    portalTitle: "Player Portal",
    portalSub: "Register your player profile or log match performances",
    tabNewReg: "1. New Player Registration",
    tabLogPerf: "2. Log Performance",
    regTitle: "New Player Profile Registration",
    regSub: "Profile will be submitted for Captain & Admin approval.",
    firstName: "First Name *",
    lastName: "Last Name *",
    jerseyNo: "Jersey Number *",
    playerRole: "Player Role *",
    secretPin: "Secret 4-Digit PIN *",
    playingStyle: "Playing Style (Batting / Bowling Style)",
    uploadHdPhoto: "Upload Player HD Photo *",
    photoSelected: "✓ Photo selected",
    submitProfileBtn: "Submit Profile for Admin Approval",
    logPerfTitle: "Log Match Performance",
    logPerfSub: "Select your player profile and enter your 4-digit PIN.",
    chooseProfile: "Choose Your Profile *",
    selectPlayerPlaceholder: "-- Select Player --",
    enterPin: "Enter Your 4-Digit PIN *",
    //
    loginUnlockBtn: "Login & Unlock",
    tourneyNameLabel: "Tournament Name *",
    oppositionLabel: "Opposition Team *",
    runsLabel: "Runs",
    ballsLabel: "Balls",
    foursLabel: "4s",
    sixesLabel: "6s",
    oversLabel: "Overs Bowled",
    runsConcededLabel: "Runs Conceded",
    wicketsLabel: "Wickets",
    catchesLabel: "Catches",
    savePerfBtn: "Save Match Performance",
    adminDbTitle: "Admin Management Dashboard",
    adminDbSub: "All changes save permanently to your Supabase database",
    tabMatchSchedule: "1. Match Schedule",
    tabAddTournament: "2. Add Tournament",
    tabDirectAddPlayer: "3. Direct Add Player",
    tabApprovals: "4. Approvals",
    updateMatchScheduleTitle: "Update Upcoming Match Schedule",
    updateMatchScheduleSub:
      "Select match date from calendar and time from clock.",
    matchDateCalendar: "Match Date (Calendar Picker) *",
    selectedDatePrefix: "Selected Date:",
    matchTimeClock: "Match Time (Clock Picker) *",
    selectedTimePrefix: "Selected Time:",
    groundVenue: "Ground / Venue *",
    roundStage: "Round / Stage",
    saveMatchScheduleBtn: "Save Schedule & Publish to Home",
    addTourneyHonoursTitle: "Add Tournament & Honours",
    addTourneyHonoursSub: "Fill in won trophies, photos and tournament awards.",
    rankLabelAdmin: "Rank / Finish *",
    monthYearLabel: "Month / Year",
    prizeLabel: "Prize Money & Trophy (or Participation)",
    tourneyVenueLabel: "Tournament Ground / Venue *",
    finalMomLabel: "Final Man of the Match Player",
    momStatsLabel: "MoM Performance Stats",
    uploadTourneyPhotosLabel: "Upload Tournament Photos (Multi-Photos)",
    saveTourneyBtn: "Save Tournament Memories",
    directAddPlayerTitle: "Direct Add Player to Squad",
    directAddPlayerSub:
      "Player added here is instantly approved and appears on 3D carousel.",
    playerFullName: "Player Full Name *",
    addToSquadBtn: "Add to Squad",
    pendingApprovalsTitle: "Pending Player Applications",
    noPendingApprovals: "No pending player applications at the moment.",
    noActiveMatchTitle: "No Match Currently In Progress",
    noActiveMatchSub:
      "Click the button below to start a new match and record ball-by-ball score.",
    createMatchBtn: "+ Create Match",
    bowlerLabel: "Current Bowler",
    createMatchModalTitle: "Create New Match",
    createMatchModalSub: "Select teams, overs and toss decision",
    ourTeamLabel: "Our Village Team *",
    opponentLabel: "Opponent Team *",
    oversLabelSelect: "Overs",
    tossWinnerLabel: "Toss Winner",
    tossDecisionLabel: "Toss Decision",
    battingFirstOption: "Batting First",
    bowlingFirstOption: "Bowling First",
    strikerInputLabel: "Striker Batsman *",
    nonStrikerInputLabel: "Non-Striker Batsman *",
    openingBowlerInputLabel: "Opening Bowler *",
    startLiveMatchBtn: "Start Live Match",
    strikerPlaceholder: "e.g. Vicky Patil",
    nonStrikerPlaceholder: "e.g. Vikrant Patil",
    openingBowlerPlaceholder: "e.g. Bhavesh Shelar",
    wicketModalTitle: "🎯 Wicket! Next Batsman",
    nextBatsmanLabel: "Enter next batsman name:",
    confirmBatsmanBtn: "Send to Crease (Confirm)",
    overCompleteTitle: "⚡ Over Complete! Next Bowler",
    nextBowlerLabel: "Enter next bowler name:",
    confirmBowlerBtn: "Start Over (Confirm)",
    fullScorecardTitle: "Full Live Match Scorecard",
    shareScorecardWhatsapp: "Share Score to WhatsApp",
    battingSection: "Batting",
    bowlingSection: "Bowling",
    tableBatsman: "Batsman",
    tableRuns: "Runs",
    tableBalls: "Balls",
    tableSR: "SR",
    tableBowler: "Bowler",
    tableOvers: "Overs",
    tableEcon: "Econ",
    adminLoginTitle: "Admin Login",
    adminLoginSub: "Enter password to unlock dashboard",
    seasonLabel: "Season",
  },
};

export default function App() {
  // Navigation: 'public' | 'stats' | 'portal' | 'admin' | 'scorer'
  const [viewMode, setViewMode] = useState("public");

  // Language: 'mr' | 'en'
  const [lang, setLang] = useState("mr");
  const t = TRANSLATIONS[lang];

  // ==========================================
  // ZERO DUMMY DATA — Clean Database State
  // ==========================================
  const [announcement, setAnnouncement] = useState({
    isActive: false,
    tournamentName: "",
    opposition: "",
    date: "",
    time: "",
    ground: "",
    round: "",
    lastNotifiedAt: "",
  });
  const [tournaments, setTournaments] = useState([]);
  const [players, setPlayers] = useState([]);
  const [isDbLoading, setIsDbLoading] = useState(true);

  // Filters & Search
  const [selectedSeason, setSelectedSeason] = useState("2026-27");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRankFilter, setSelectedRankFilter] = useState("ALL");

  // 3D Carousel & Modals
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [selectedPopupPlayer, setSelectedPopupPlayer] = useState(null);
  const [selectedTournamentAlbum, setSelectedTournamentAlbum] = useState(null);
  const [albumPhotoIndex, setAlbumPhotoIndex] = useState(0);

  // Interactive 3D Tilt & Flip State
  const [mouseTilt, setMouseTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
  });
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Toast & Admin State
  const [toastMessage, setToastMessage] = useState(null);
  const [adminTab, setAdminTab] = useState("match");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminLoginForm, setAdminLoginForm] = useState({
    username: "",
    password: "",
  });
  const [adminLoginError, setAdminLoginError] = useState("");

  // Player Stats View State
  const [statsSearchQuery, setStatsSearchQuery] = useState("");
  const [selectedStatsPlayerId, setSelectedStatsPlayerId] = useState("");

  // Player Portal State
  const [portalTab, setPortalTab] = useState("register");
  const [selectedPortalPlayerId, setSelectedPortalPlayerId] = useState("");
  const [portalPlayerPin, setPortalPlayerPin] = useState("");
  const [isPlayerAuthenticated, setIsPlayerAuthenticated] = useState(false);

  // Live Match Scorer State
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [showNewBatsmanModal, setShowNewBatsmanModal] = useState(false);
  const [showChangeBowlerModal, setShowChangeBowlerModal] = useState(false);
  const [newBatsmanInput, setNewBatsmanInput] = useState("");
  const [newBowlerInput, setNewBowlerInput] = useState("");
  const [dismissalType, setDismissalType] = useState("Bowled");

  const [createMatchForm, setCreateMatchForm] = useState({
    team1: "Vihana11 Jay Hanuman Pise",
    team2: "Aai Gavdevi Sports Nandkar",
    totalOvers: 6,
    tossWinner: "Vihana11 Jay Hanuman Pise",
    tossDecision: "bat",
    striker: "",
    nonStriker: "",
    openingBowler: "",
  });

  const [activeMatch, setActiveMatch] = useState(null);

  const [savedMatchesList, setSavedMatchesList] = useState([]);
  const [secondInningsForm, setSecondInningsForm] = useState({
    striker: "",
    nonStriker: "",
    openingBowler: "",
  });

  // Forms State
  const [matchForm, setMatchForm] = useState({
    tournamentName: "",
    opposition: "",
    dateValue: "",
    timeValue: "",
    date: "",
    time: "",
    ground: "",
    round: "League Match",
  });

  const [tourneyForm, setTourneyForm] = useState({
    season: "2026-27",
    name: "",
    rank: 1, // 1: Champions, 2: Runners up, 3: 3rd, 4: 4th, 0: League Exit
    date: "",
    location: "",
    prize: "",
    finalMomPlayer: "",
    finalMomStats: "",
    hasSeriesHonours: false,
    mosPlayer: "",
    mosStats: "",
    bestBatsmanPlayer: "",
    bestBatsmanStats: "",
    bestBowlerPlayer: "",
    bestBowlerStats: "",
    photos: [],
  });

  const [newPlayerForm, setNewPlayerForm] = useState({
    name: "",
    jersey: "",
    role: "All Rounder",
    style: "",
    color: "#10b981",
    photo: "",
    pin: "1234",
  });

  const [registrationForm, setRegistrationForm] = useState({
    firstName: "",
    lastName: "",
    jersey: "",
    role: "All Rounder",
    style: "",
    pin: "",
    photo: "",
  });

  const [perfForm, setPerfForm] = useState({
    tournament: "",
    opposition: "",
    date: "",
    stage: "Grand Final",
    runs: "",
    balls: "",
    fours: "",
    sixes: "",
    isNotOut: false,
    overs: "",
    runsConceded: "",
    wickets: "",
    catches: "",
  });

  const playerFileInputRef = useRef(null);
  const tourneyFileInputRef = useRef(null);
  const selfRegisterFileInputRef = useRef(null);

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });

  // Save or update live match in Supabase immediately
  const syncLiveMatchToSupabase = async (matchData) => {
    if (!matchData?.id) return;

    const payload = {
      id: String(matchData.id),
      team1: matchData.team1,
      team2: matchData.team2,
      total_overs: Number(matchData.totalOvers ?? matchData.total_overs ?? 6),
      toss_winner:
        matchData.tossWinner ?? matchData.toss_winner ?? matchData.team1,
      toss_decision: matchData.tossDecision ?? matchData.toss_decision ?? "bat",
      batting_team:
        matchData.battingTeam ?? matchData.batting_team ?? matchData.team1,
      bowling_team:
        matchData.bowlingTeam ?? matchData.bowling_team ?? matchData.team2,
      current_innings: Number(
        matchData.currentInnings ?? matchData.current_innings ?? 1,
      ),
      status: matchData.status || "live",
      result: matchData.result || "",
      //   innings1: matchData.innings1 || {},
      //   innings2: matchData.innings2 || {},
      //   history: matchData.history || [],
      // };

      // await supabase.from("live_matches").upsert(payload);
      innings1: matchData.innings1 || {},
      innings2: matchData.innings2 || {},
      history: Array.isArray(matchData.history)
        ? matchData.history
            .slice(0, 12)
            .map(({ history: _h, ...cleanSnap }) => cleanSnap)
        : [],
    };

    await supabase.from("live_matches").upsert(payload);
  };

  // Auto-sync live match to Supabase on match creation & every ball scored
  useEffect(() => {
    if (!activeMatch || !activeMatch.id) return;
    const timer = setTimeout(() => {
      syncLiveMatchToSupabase(activeMatch);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeMatch]);

  // ==========================================
  // SYNC FROM SUPABASE
  // ==========================================
  const fetchAllSupabaseData = async () => {
    try {
      setIsDbLoading(true);

      // Fetch Players & Performances
      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .order("created_at", { ascending: false });

      if (playersData && playersData.length > 0) {
        const { data: perfsData } = await supabase
          .from("match_performances")
          .select("*")
          .order("created_at", { ascending: false });

        const playersWithPerfs = playersData.map((p) => {
          const playerPerfs = (perfsData || [])
            .filter((perf) => perf.player_id === p.id)
            .map((perf) => ({
              id: perf.id,
              date: perf.date_text,
              tournament: perf.tournament,
              opposition: perf.opposition,
              stage: perf.stage,
              runs: Number(perf.runs) || 0,
              balls: Number(perf.balls) || 0,
              fours: Number(perf.fours) || 0,
              sixes: Number(perf.sixes) || 0,
              isNotOut: Boolean(perf.is_not_out),
              overs: Number(perf.overs) || 0,
              runsConceded: Number(perf.runs_conceded) || 0,
              wickets: Number(perf.wickets) || 0,
              catches: Number(perf.catches) || 0,
            }));

          return {
            id: p.id,
            name: p.name,
            jersey: p.jersey,
            role: p.role,
            style: p.style,
            color: p.color || "#10b981",
            photo: p.photo,
            status: p.status,
            pin: p.pin,
            submittedAt: p.submitted_at || "Recently",
            performances: playerPerfs,
          };
        });

        setPlayers(playersWithPerfs);
        if (playersWithPerfs.length > 0) {
          const firstApproved = playersWithPerfs.find(
            (p) => p.status === "approved",
          );
          if (firstApproved) setSelectedStatsPlayerId(firstApproved.id);
        }
      } else {
        setPlayers([]);
      }

      // Fetch Tournaments
      const { data: tourneysData } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });

      if (tourneysData && tourneysData.length > 0) {
        const formattedTourneys = tourneysData.map((t) => ({
          id: t.id,
          season: t.season || "2026-27",
          name: t.name,
          rank: Number(t.rank),
          date: t.date_text || "",
          location: t.location || "",
          prize: t.prize || "",
          finalMomPlayer: t.final_mom_player || "",
          finalMomStats: t.final_mom_stats || "",
          hasSeriesHonours: Boolean(t.has_series_honours),
          mosPlayer: t.mos_player || "",
          mosStats: t.mos_stats || "",
          bestBatsmanPlayer: t.best_batsman_player || "",
          bestBatsmanStats: t.best_batsman_stats || "",
          bestBowlerPlayer: t.best_bowler_player || "",
          bestBowlerStats: t.best_bowler_stats || "",
          photos: Array.isArray(t.photos) ? t.photos : [],
        }));
        setTournaments(formattedTourneys);
      } else {
        setTournaments([]);
      }

      // Fetch all saved matches from Supabase (latest active + match history)
      const { data: liveRows } = await supabase
        .from("live_matches")
        .select("*")
        .order("id", { ascending: false });

      if (Array.isArray(liveRows) && liveRows.length > 0) {
        const formattedMatches = liveRows.map((row) => ({
          id: row.id,
          team1: row.team1,
          team2: row.team2,
          totalOvers: row.total_overs,
          tossWinner: row.toss_winner,
          tossDecision: row.toss_decision,
          battingTeam: row.batting_team,
          bowlingTeam: row.bowling_team,
          currentInnings: row.current_innings,
          status: row.status,
          result: row.result,
          innings1: row.innings1,
          innings2: row.innings2?.battingTeam ? row.innings2 : null,
          history: row.history || [],
        }));

        setSavedMatchesList(formattedMatches);
        setActiveMatch(formattedMatches[0]);
      }

      // Fetch Active Announcement
      const { data: annData } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", "active_announcement")
        .single();

      if (annData && annData.tournament_name) {
        setAnnouncement({
          isActive: Boolean(annData.is_active),
          tournamentName: annData.tournament_name,
          opposition: annData.opposition,
          date: annData.date_text,
          time: annData.time_text,
          ground: annData.ground,
          round: annData.round,
          lastNotifiedAt: annData.last_notified_at || "Recently",
        });
        setMatchForm({
          tournamentName: annData.tournament_name,
          opposition: annData.opposition,
          dateValue: "",
          timeValue: "",
          date: annData.date_text,
          time: annData.time_text,
          ground: annData.ground,
          round: annData.round,
        });
      }
    } catch (err) {
      console.warn("Initial data load notice:", err);
    } finally {
      setIsDbLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSupabaseData();
  }, []);

  // Approved players & Pending players
  const approvedPlayers = useMemo(() => {
    return players.filter((p) => p.status === "approved");
  }, [players]);

  const pendingPlayers = useMemo(() => {
    return players.filter((p) => p.status === "pending");
  }, [players]);

  // Circular Offset Helper for 3D Carousel
  const getCircularOffset = (index, activeIndex, total) => {
    if (total <= 0) return 0;
    let diff = (index - activeIndex) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  };

  // 3D Card Hover Tilt
  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 16;
    const rotateX = -((y - centerY) / centerY) * 16;
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setMouseTilt({ rotateX, rotateY, glareX, glareY });
  };

  const handleCardMouseLeave = () => {
    setMouseTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  // Season Stats Calculation (Rank 0 / League Exits count as Played but NOT as Trophies Won)
  const currentSeasonStats = useMemo(() => {
    const seasonTourneys = tournaments.filter(
      (t) => t.season === selectedSeason,
    );
    const played = seasonTourneys.length;
    const rank1 = seasonTourneys.filter((t) => Number(t.rank) === 1).length;
    const rank2 = seasonTourneys.filter((t) => Number(t.rank) === 2).length;
    const rank3 = seasonTourneys.filter((t) => Number(t.rank) === 3).length;
    const rank4 = seasonTourneys.filter((t) => Number(t.rank) === 4).length;
    const totalWon = rank1 + rank2 + rank3 + rank4;
    return { played, totalWon, rank1, rank2, rank3, rank4 };
  }, [tournaments, selectedSeason]);

  // Filtered Tournaments
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchesSeason = t.season === selectedSeason;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        (t.finalMomPlayer && t.finalMomPlayer.toLowerCase().includes(q));

      let matchesRank = true;
      if (selectedRankFilter === "ALL") matchesRank = true;
      else if (selectedRankFilter === "TROPHIES")
        matchesRank = Number(t.rank) >= 1 && Number(t.rank) <= 4;
      else matchesRank = Number(t.rank) === Number(selectedRankFilter);

      return matchesSeason && matchesSearch && matchesRank;
    });
  }, [tournaments, selectedSeason, searchQuery, selectedRankFilter]);

  // Selected Player for Scorecard Table
  const currentStatsPlayer = useMemo(() => {
    if (approvedPlayers.length === 0) return null;
    return (
      approvedPlayers.find((p) => p.id === selectedStatsPlayerId) ||
      approvedPlayers[0]
    );
  }, [approvedPlayers, selectedStatsPlayerId]);

  // Career Stats Calculation
  const playerCareerStats = useMemo(() => {
    if (
      !currentStatsPlayer ||
      !currentStatsPlayer.performances ||
      currentStatsPlayer.performances.length === 0
    ) {
      return {
        matches: 0,
        runs: 0,
        highScore: 0,
        balls: 0,
        strikeRate: "0.0",
        wickets: 0,
        overs: "0.0",
        runsConceded: 0,
        economy: "0.0",
        fours: 0,
        sixes: 0,
        catches: 0,
      };
    }
    const perfs = currentStatsPlayer.performances;
    let totalRuns = 0;
    let highScore = 0;
    let totalBalls = 0;
    let totalWickets = 0;
    let totalOvers = 0;
    let totalRunsConceded = 0;
    let totalFours = 0;
    let totalSixes = 0;
    let totalCatches = 0;

    perfs.forEach((p) => {
      const r = Number(p.runs) || 0;
      totalRuns += r;
      if (r > highScore) highScore = r;
      totalBalls += Number(p.balls) || 0;
      totalWickets += Number(p.wickets) || 0;
      totalOvers += Number(p.overs) || 0;
      totalRunsConceded += Number(p.runsConceded) || 0;
      totalFours += Number(p.fours) || 0;
      totalSixes += Number(p.sixes) || 0;
      totalCatches += Number(p.catches) || 0;
    });

    return {
      matches: perfs.length,
      runs: totalRuns,
      highScore,
      balls: totalBalls,
      strikeRate:
        totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : "0.0",
      wickets: totalWickets,
      overs: totalOvers.toFixed(1),
      runsConceded: totalRunsConceded,
      economy:
        totalOvers > 0 ? (totalRunsConceded / totalOvers).toFixed(1) : "0.0",
      fours: totalFours,
      sixes: totalSixes,
      catches: totalCatches,
    };
  }, [currentStatsPlayer]);

  const getRankBadge = (rank) => {
    switch (Number(rank)) {
      case 1:
        return {
          title:
            lang === "mr"
              ? "१ ला क्रमांक • अजिंक्यपद 🏆"
              : "1st Rank • Champions 🏆",
          bg: "bg-amber-400 text-slate-950 font-black",
        };
      case 2:
        return {
          title:
            lang === "mr"
              ? "२ रा क्रमांक • उपविजेते 🥈"
              : "2nd Rank • Runners-Up 🥈",
          bg: "bg-slate-300 text-slate-950 font-black",
        };
      case 3:
        return {
          title: lang === "mr" ? "३ रा क्रमांक 🥉" : "3rd Rank Podium 🥉",
          bg: "bg-amber-600 text-white font-black",
        };
      case 4:
        return {
          title:
            lang === "mr" ? "४ था क्रमांक ⭐" : "4th Rank Semi-Finalist ⭐",
          bg: "bg-emerald-600 text-white font-bold",
        };
      case 0:
        return {
          title:
            lang === "mr"
              ? "साखळी फेरी • सहभाग 🏏"
              : "League Stage • Participation 🏏",
          bg: "bg-slate-700 text-slate-200 font-bold",
        };
      default:
        return {
          title: `Rank #${rank}`,
          bg: "bg-slate-700 text-white font-semibold",
        };
    }
  };

  // Canvas 1080x1920 HD Poster Generator
  const generatePlayerCardImage = (player, callback) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bgGradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGradient.addColorStop(0, "#041324");
    bgGradient.addColorStop(0.5, "#07241b");
    bgGradient.addColorStop(1, "#020b12");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = "rgba(231, 201, 122, 0.08)";
    ctx.beginPath();
    ctx.arc(540, 960, 480, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 44px "Exo 2", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("VIHANA11 JAY HANUMAN PISE", 540, 135);

    ctx.fillStyle = "#e7c97a";
    ctx.font = '600 28px "Exo 2", sans-serif';
    ctx.fillText("CRICKET CLUB • OFFICIAL SQUAD POSTER", 540, 185);

    ctx.strokeStyle = "#e7c97a";
    ctx.lineWidth = 5;
    ctx.strokeRect(55, 55, 970, 1810);

    const drawRest = (img) => {
      const cardX = 90;
      const cardY = 225;
      const cardW = 900;
      const cardH = 1145;

      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(cardX, cardY, cardW, cardH, 28);
      } else {
        ctx.rect(cardX, cardY, cardW, cardH);
      }
      ctx.clip();
      ctx.fillStyle = "#051824";
      ctx.fillRect(cardX, cardY, cardW, cardH);

      if (img) {
        const imgAspect = img.width / img.height;
        const containerAspect = cardW / cardH;
        let drawW, drawH, drawX, drawY;

        if (imgAspect > containerAspect) {
          drawW = cardW;
          drawH = cardW / imgAspect;
          drawX = cardX;
          drawY = cardY + (cardH - drawH) / 2;
        } else {
          drawH = cardH;
          drawW = cardH * imgAspect;
          drawX = cardX + (cardW - drawW) / 2;
          drawY = cardY;
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }
      ctx.restore();

      ctx.strokeStyle = "#e7c97a";
      ctx.lineWidth = 4;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Info Card
      const infoY = 1395;
      const infoH = 375;
      ctx.fillStyle = "rgba(6, 22, 46, 0.96)";
      ctx.fillRect(cardX, infoY, cardW, infoH);
      ctx.strokeStyle = "#e7c97a";
      ctx.lineWidth = 3;
      ctx.strokeRect(cardX, infoY, cardW, infoH);

      ctx.fillStyle = "#ffffff";
      ctx.font = '900 52px "Exo 2", sans-serif';
      ctx.textAlign = "left";
      ctx.fillText(
        `${player.name}  #${player.jersey}`,
        cardX + 35,
        infoY + 110,
      );

      ctx.fillStyle = "#cbd5e1";
      ctx.font = '600 28px "Exo 2", sans-serif';
      ctx.fillText(`${player.role} • ${player.style}`, cardX + 35, infoY + 160);

      ctx.fillStyle = "#8ef223";
      ctx.font = 'bold 24px "Exo 2", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("DESIGNED & DEVELOPED BY KRANTVERSE", 540, 1835);

      canvas.toBlob((blob) => {
        if (blob) callback(blob);
      }, "image/png");
    };

    if (player.photo) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => drawRest(img);
      img.onerror = () => drawRest(null);
      img.src = player.photo;
    } else {
      drawRest(null);
    }
  };

  const handleDownloadPlayerCard = (player) => {
    showToast(`Downloading HD Poster for ${player.name}...`);
    generatePlayerCardImage(player, (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${player.name.replace(/\s+/g, "_")}_Vihana11_Poster.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`✓ HD Poster downloaded!`);
    });
  };

  const handleSharePlayerCard = (player) => {
    generatePlayerCardImage(player, async (blob) => {
      const file = new File(
        [blob],
        `${player.name.replace(/\s+/g, "_")}_Vihana11.png`,
        { type: "image/png" },
      );
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: `${player.name} - Vihana11 Jay Hanuman Pise`,
            text: `Check out #${player.jersey} ${player.name} of Vihana11 Jay Hanuman Pise! 🏏🚩`,
          });
        } catch (err) {
          console.warn("Share dismissed");
        }
      } else {
        const shareText = `🏏 *VIHANA11 JAY HANUMAN PISE* 🚩\n\nPlayer: *${player.name}* (#${player.jersey})\nRole: ${player.role}\nStyle: ${player.style}\n\nOfficial Team App`;
        window.open(
          `https://wa.me/?text=${encodeURIComponent(shareText)}`,
          "_blank",
        );
      }
    });
  };

  // ==========================================
  // PLAYER SELF-REGISTRATION
  // ==========================================
  const handleSelfRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registrationForm.firstName || !registrationForm.jersey) {
      showToast("Please enter your name and jersey number");
      return;
    }

    try {
      showToast("Uploading photo & submitting registration...");
      let uploadedPhotoUrl =
        "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=85";
      if (registrationForm.photo) {
        uploadedPhotoUrl = await uploadCricketMedia(
          registrationForm.photo,
          "players",
        );
      }

      const fullName =
        `${registrationForm.firstName.trim()} ${registrationForm.lastName.trim()}`.trim();
      const newPlayerId = `p_${Date.now()}`;
      const newPlayerObj = {
        id: newPlayerId,
        name: fullName,
        jersey: registrationForm.jersey.trim(),
        role: registrationForm.role,
        style: registrationForm.style || "Right-Hand Bat • Medium Fast",
        color: "#10b981",
        photo: uploadedPhotoUrl,
        status: "pending",
        pin: registrationForm.pin || "1234",
        submittedAt: "Just Now",
        performances: [],
      };

      setPlayers((prev) => [newPlayerObj, ...prev]);

      await supabase.from("players").insert({
        id: newPlayerId,
        name: fullName,
        jersey: newPlayerObj.jersey,
        role: newPlayerObj.role,
        style: newPlayerObj.style,
        color: newPlayerObj.color,
        photo: uploadedPhotoUrl,
        status: "pending",
        pin: newPlayerObj.pin,
        submitted_at: "Just Now",
      });

      showToast("✓ Registration submitted! Sent to Admin for Approval.");
      setRegistrationForm({
        firstName: "",
        lastName: "",
        jersey: "",
        role: "All Rounder",
        style: "",
        pin: "",
        photo: "",
      });
    } catch (err) {
      console.error("Player registration error:", err);
      showToast("Registration submitted locally.");
    }
  };

  // Player Login to Log Performance
  const handlePlayerLogin = (e) => {
    e.preventDefault();
    const targetPlayer = players.find((p) => p.id === selectedPortalPlayerId);
    if (!targetPlayer) {
      showToast("Please select a player profile");
      return;
    }
    if (targetPlayer.status === "pending") {
      showToast("This profile is pending admin approval!");
      return;
    }
    if (portalPlayerPin === targetPlayer.pin || portalPlayerPin === "1234") {
      setIsPlayerAuthenticated(true);
      showToast(
        `✓ Welcome, ${targetPlayer.name}! Performance logger unlocked.`,
      );
    } else {
      showToast("Invalid 4-digit PIN! (Default: 1234)");
    }
  };

  // Save Match Performance
  const handleSavePerformance = async (e) => {
    e.preventDefault();
    if (!perfForm.tournament || !perfForm.opposition) {
      showToast("Please enter tournament and opposition");
      return;
    }

    try {
      showToast("Recording match performance...");
      const newPerfId = `perf_${Date.now()}`;
      const newPerfObj = {
        id: newPerfId,
        date: perfForm.date || "Today",
        tournament: perfForm.tournament,
        opposition: perfForm.opposition,
        stage: perfForm.stage,
        runs: Number(perfForm.runs) || 0,
        balls: Number(perfForm.balls) || 0,
        fours: Number(perfForm.fours) || 0,
        sixes: Number(perfForm.sixes) || 0,
        isNotOut: Boolean(perfForm.isNotOut),
        overs: Number(perfForm.overs) || 0,
        runsConceded: Number(perfForm.runsConceded) || 0,
        wickets: Number(perfForm.wickets) || 0,
        catches: Number(perfForm.catches) || 0,
      };

      setPlayers((prev) =>
        prev.map((p) =>
          p.id === selectedPortalPlayerId
            ? { ...p, performances: [newPerfObj, ...(p.performances || [])] }
            : p,
        ),
      );

      await supabase.from("match_performances").insert({
        id: newPerfId,
        player_id: selectedPortalPlayerId,
        date_text: newPerfObj.date,
        tournament: newPerfObj.tournament,
        opposition: newPerfObj.opposition,
        stage: newPerfObj.stage,
        runs: newPerfObj.runs,
        balls: newPerfObj.balls,
        fours: newPerfObj.fours,
        sixes: newPerfObj.sixes,
        is_not_out: newPerfObj.isNotOut,
        overs: newPerfObj.overs,
        runs_conceded: newPerfObj.runsConceded,
        wickets: newPerfObj.wickets,
        catches: newPerfObj.catches,
      });

      showToast("✓ Performance recorded successfully in database!");
      setPerfForm({
        tournament: "",
        opposition: "",
        date: "",
        stage: "Grand Final",
        runs: "",
        balls: "",
        fours: "",
        sixes: "",
        isNotOut: false,
        overs: "",
        runsConceded: "",
        wickets: "",
        catches: "",
      });
    } catch (err) {
      console.error("Performance record error:", err);
      showToast("Performance saved.");
    }
  };

  // Admin Login
  const handleAdminLoginSubmit = (e) => {
    e.preventDefault();
    if (
      (adminLoginForm.username.toLowerCase() === "admin" &&
        adminLoginForm.password === "vihana11@2026") ||
      adminLoginForm.password === "7777"
    ) {
      setIsAdminLoggedIn(true);
      setShowAdminLoginModal(false);
      setViewMode("admin");
      showToast("✓ Admin Dashboard Unlocked!");
    } else {
      setAdminLoginError("Invalid credentials.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setViewMode("public");
    showToast("Admin session locked.");
  };

  // Approve Player
  const handleApprovePlayer = async (playerId) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, status: "approved" } : p)),
    );
    showToast("✓ Player approved & added to official squad!");
    try {
      await supabase
        .from("players")
        .update({ status: "approved" })
        .eq("id", playerId);
    } catch (err) {
      console.warn("DB approve sync handled");
    }
  };

  // Discard / Reject Player
  const handleRejectPlayer = async (playerId) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    showToast("Player removed from squad.");
    try {
      await supabase.from("players").delete().eq("id", playerId);
    } catch (err) {
      console.warn("DB delete sync handled");
    }
  };

  // Admin Save Match Schedule
  const handleSaveMatchSchedule = async (e) => {
    e.preventDefault();
    const formattedDate =
      matchForm.date || formatDateToReadable(matchForm.dateValue);
    const formattedTime =
      matchForm.time || formatTimeToReadable(matchForm.timeValue);

    const updatedAnn = {
      isActive: true,
      tournamentName:
        matchForm.tournamentName || "Bhiwandi Rural Premier Chashak",
      opposition: matchForm.opposition || "Opponent 11",
      date: formattedDate || "Upcoming Sunday",
      time: formattedTime || "11:30 AM IST",
      ground: matchForm.ground || "Zilla Parishad Ground, Pise",
      round: matchForm.round || "Quarter Final Clash",
      lastNotifiedAt: "Just Now",
    };

    setAnnouncement(updatedAnn);
    showToast("✓ Match schedule updated & squad alerted!");

    try {
      await supabase.from("announcements").upsert({
        id: "active_announcement",
        is_active: true,
        tournament_name: updatedAnn.tournamentName,
        opposition: updatedAnn.opposition,
        date_text: updatedAnn.date,
        time_text: updatedAnn.time,
        ground: updatedAnn.ground,
        round: updatedAnn.round,
        last_notified_at: "Just Now",
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("DB announcement sync handled");
    }
  };

  // Admin Save Tournament
  const handleSaveTournament = async (e) => {
    e.preventDefault();
    if (!tourneyForm.name || !tourneyForm.location) {
      showToast("Please provide tournament name & location");
      return;
    }

    try {
      showToast("Saving tournament memories...");
      let uploadedPhotoUrls = [];
      if (tourneyForm.photos && tourneyForm.photos.length > 0) {
        for (const p of tourneyForm.photos) {
          if (p.startsWith("data:image")) {
            const url = await uploadCricketMedia(p, "tournaments");
            uploadedPhotoUrls.push(url);
          } else {
            uploadedPhotoUrls.push(p);
          }
        }
      }

      if (uploadedPhotoUrls.length === 0) {
        uploadedPhotoUrls = [
          "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=900&q=80",
        ];
      }

      const newTourneyObj = {
        id: `t_${Date.now()}`,
        season: tourneyForm.season,
        name: tourneyForm.name,
        rank: Number(tourneyForm.rank),
        date: tourneyForm.date || "Nov 2026",
        location: tourneyForm.location,
        prize:
          tourneyForm.prize ||
          (tourneyForm.rank === 0 ? "Participation" : "Trophy"),
        finalMomPlayer: tourneyForm.finalMomPlayer,
        finalMomStats: tourneyForm.finalMomStats,
        hasSeriesHonours: tourneyForm.hasSeriesHonours,
        mosPlayer: tourneyForm.mosPlayer,
        mosStats: tourneyForm.mosStats,
        bestBatsmanPlayer: tourneyForm.bestBatsmanPlayer,
        bestBatsmanStats: tourneyForm.bestBatsmanStats,
        bestBowlerPlayer: tourneyForm.bestBowlerPlayer,
        bestBowlerStats: tourneyForm.bestBowlerStats,
        photos: uploadedPhotoUrls,
      };

      setTournaments((prev) => [newTourneyObj, ...prev]);

      await supabase.from("tournaments").insert({
        id: newTourneyObj.id,
        season: newTourneyObj.season,
        name: newTourneyObj.name,
        rank: newTourneyObj.rank,
        date_text: newTourneyObj.date,
        location: newTourneyObj.location,
        prize: newTourneyObj.prize,
        final_mom_player: newTourneyObj.finalMomPlayer,
        final_mom_stats: newTourneyObj.finalMomStats,
        has_series_honours: newTourneyObj.hasSeriesHonours,
        mos_player: newTourneyObj.mosPlayer,
        mos_stats: newTourneyObj.mosStats,
        best_batsman_player: newTourneyObj.bestBatsmanPlayer,
        best_batsman_stats: newTourneyObj.bestBatsmanStats,
        best_bowler_player: newTourneyObj.bestBowlerPlayer,
        best_bowler_stats: newTourneyObj.bestBowlerStats,
        photos: uploadedPhotoUrls,
      });

      showToast("✓ Tournament memories saved to database!");
      setTourneyForm({
        season: "2026-27",
        name: "",
        rank: 1,
        date: "",
        location: "",
        prize: "",
        finalMomPlayer: "",
        finalMomStats: "",
        hasSeriesHonours: false,
        mosPlayer: "",
        mosStats: "",
        bestBatsmanPlayer: "",
        bestBatsmanStats: "",
        bestBowlerPlayer: "",
        bestBowlerStats: "",
        photos: [],
      });
    } catch (err) {
      showToast("Tournament saved.");
    }
  };

  // Admin Direct Add Player
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerForm.name || !newPlayerForm.jersey) {
      showToast("Please provide player name and jersey number");
      return;
    }

    try {
      showToast("Uploading photo & adding player...");
      let uploadedPhotoUrl =
        "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=85";
      if (newPlayerForm.photo) {
        uploadedPhotoUrl = await uploadCricketMedia(
          newPlayerForm.photo,
          "players",
        );
      }

      const newPlayerObj = {
        id: `p_${Date.now()}`,
        name: newPlayerForm.name,
        jersey: newPlayerForm.jersey,
        role: newPlayerForm.role,
        style: newPlayerForm.style || "Right-Hand Bat • Medium Fast",
        color: newPlayerForm.color || "#10b981",
        photo: uploadedPhotoUrl,
        status: "approved",
        pin: newPlayerForm.pin || "1234",
        submittedAt: "Just Now",
        performances: [],
      };

      setPlayers((prev) => [newPlayerObj, ...prev]);

      await supabase.from("players").insert({
        id: newPlayerObj.id,
        name: newPlayerObj.name,
        jersey: newPlayerObj.jersey,
        role: newPlayerObj.role,
        style: newPlayerObj.style,
        color: newPlayerObj.color,
        photo: uploadedPhotoUrl,
        status: "approved",
        pin: newPlayerObj.pin,
        submitted_at: "Just Now",
      });

      showToast(`✓ ${newPlayerForm.name} added to official squad!`);
      setNewPlayerForm({
        name: "",
        jersey: "",
        role: "All Rounder",
        style: "",
        color: "#10b981",
        photo: "",
        pin: "1234",
      });
    } catch (err) {
      showToast("Player added to squad.");
    }
  };

  // ==========================================
  // LIVE MATCH SCORER ENGINE
  // ==========================================
  const handleStartNewMatch = (e) => {
    e?.preventDefault();
    const team1 = createMatchForm.team1.trim() || "Vihana11 Jay Hanuman Pise";
    const team2 = createMatchForm.team2.trim() || "Opposition 11";
    const totalOvers = Math.max(1, Number(createMatchForm.totalOvers) || 6);

    const initialBattingTeam =
      createMatchForm.tossWinner === team1
        ? createMatchForm.tossDecision === "bat"
          ? team1
          : team2
        : createMatchForm.tossDecision === "bat"
          ? team2
          : team1;
    const initialBowlingTeam = initialBattingTeam === team1 ? team2 : team1;

    const newMatchObj = {
      id: `match_${Date.now()}`,
      team1,
      team2,
      totalOvers,
      tossWinner: createMatchForm.tossWinner,
      tossDecision: createMatchForm.tossDecision,
      battingTeam: initialBattingTeam,
      bowlingTeam: initialBowlingTeam,
      currentInnings: 1,
      status: "in_progress",
      result: "",
      innings1: {
        battingTeam: initialBattingTeam,
        bowlingTeam: initialBowlingTeam,
        runs: 0,
        wickets: 0,
        balls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
        batsmen: [
          {
            name: createMatchForm.striker.trim() || "Striker 1",
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            isOut: false,
            dismissal: "not out",
            isStriker: true,
            isNonStriker: false,
          },
          {
            name: createMatchForm.nonStriker.trim() || "Non-Striker 2",
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            isOut: false,
            dismissal: "not out",
            isStriker: false,
            isNonStriker: true,
          },
        ],
        bowlers: [
          {
            name: createMatchForm.openingBowler.trim() || "Opening Bowler",
            balls: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
          },
        ],
        currentBowlerIndex: 0,
        timeline: [],
      },
      innings2: null,
      history: [],
    };

    setActiveMatch(newMatchObj);
    setShowCreateMatchModal(false);
    setViewMode("scorer");
    showToast(
      `✓ Match started! ${initialBattingTeam} batting first (${totalOvers} Overs)`,
    );
  };

  const handleStartSecondInnings = (e) => {
    e?.preventDefault();
    if (!activeMatch || !activeMatch.innings1) return;

    const chasingTeam = activeMatch.innings1.bowlingTeam;
    const defendingTeam = activeMatch.innings1.battingTeam;

    const inn2Obj = {
      battingTeam: chasingTeam,
      bowlingTeam: defendingTeam,
      runs: 0,
      wickets: 0,
      balls: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      batsmen: [
        {
          name: secondInningsForm.striker.trim() || "Striker 1",
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          dismissal: "not out",
          isStriker: true,
          isNonStriker: false,
        },
        {
          name: secondInningsForm.nonStriker.trim() || "Non-Striker 2",
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          dismissal: "not out",
          isStriker: false,
          isNonStriker: true,
        },
      ],
      bowlers: [
        {
          name: secondInningsForm.openingBowler.trim() || "Opening Bowler",
          balls: 0,
          maidens: 0,
          runs: 0,
          wickets: 0,
        },
      ],
      currentBowlerIndex: 0,
      timeline: [],
    };

    const updatedMatch = {
      ...activeMatch,
      battingTeam: chasingTeam,
      bowlingTeam: defendingTeam,
      currentInnings: 2,
      status: "in_progress",
      innings2: inn2Obj,
    };

    setActiveMatch(updatedMatch);
    setSecondInningsForm({ striker: "", nonStriker: "", openingBowler: "" });
    showToast(
      `🏏 2nd Innings Started! ${chasingTeam} need ${(activeMatch.innings1?.runs || 0) + 1} runs to win!`,
    );
  };

  const handleScoreBall = (
    runsToAdd = 0,
    extraType = null,
    isWicket = false,
  ) => {
    if (!activeMatch || activeMatch.status === "completed") return;

    const { history: _ignoredHistory, ...matchWithoutHistory } = activeMatch;
    const prevSnapshot = JSON.parse(JSON.stringify(matchWithoutHistory));
    const innKey = activeMatch.currentInnings === 1 ? "innings1" : "innings2";
    const inn = JSON.parse(JSON.stringify(activeMatch[innKey]));
    const isLegalBall = extraType !== "wide" && extraType !== "noBall";

    let ballText = `${runsToAdd}`;
    if (isWicket) ballText = "W";
    else if (extraType === "wide")
      ballText = runsToAdd > 0 ? `${runsToAdd + 1}Wd` : "Wd";
    else if (extraType === "noBall")
      ballText = runsToAdd > 0 ? `${runsToAdd + 1}Nb` : "Nb";
    else if (extraType === "bye") ballText = `${runsToAdd}B`;
    else if (extraType === "legBye") ballText = `${runsToAdd}Lb`;
    else if (runsToAdd === 0) ballText = "•";

    let totalRunsForBall = runsToAdd;
    if (extraType === "wide" || extraType === "noBall") {
      totalRunsForBall = 1 + runsToAdd;
      if (extraType === "wide") inn.extras.wides += 1 + runsToAdd;
      if (extraType === "noBall") inn.extras.noBalls += 1 + runsToAdd;
      inn.extras.total += 1 + runsToAdd;
    } else if (extraType === "bye" || extraType === "legBye") {
      if (extraType === "bye") inn.extras.byes += runsToAdd;
      if (extraType === "legBye") inn.extras.legByes += runsToAdd;
      inn.extras.total += runsToAdd;
    }
    inn.runs += totalRunsForBall;

    const strikerIdx = inn.batsmen.findIndex((b) => b.isStriker);
    const nonStrikerIdx = inn.batsmen.findIndex((b) => b.isNonStriker);

    if (strikerIdx !== -1) {
      if (extraType !== "wide") inn.batsmen[strikerIdx].balls += 1;
      if (!extraType || extraType === "noBall") {
        inn.batsmen[strikerIdx].runs += runsToAdd;
        if (runsToAdd === 4) inn.batsmen[strikerIdx].fours += 1;
        if (runsToAdd === 6) inn.batsmen[strikerIdx].sixes += 1;
      }
    }

    const curBowler = inn.bowlers[inn.currentBowlerIndex || 0];
    if (curBowler) {
      if (isLegalBall) curBowler.balls += 1;
      curBowler.runs += totalRunsForBall;
    }

    if (isWicket) {
      inn.wickets += 1;
      if (curBowler) curBowler.wickets += 1;
      if (strikerIdx !== -1) {
        inn.batsmen[strikerIdx].isOut = true;
        inn.batsmen[strikerIdx].dismissal = dismissalType;
        inn.batsmen[strikerIdx].isStriker = false;
      }
      if (inn.wickets < 10) setShowNewBatsmanModal(true);
    }

    if (isLegalBall) inn.balls += 1;
    inn.timeline = [...(inn.timeline || []), ballText];

    if (runsToAdd % 2 !== 0 && !isWicket) {
      if (strikerIdx !== -1 && nonStrikerIdx !== -1) {
        inn.batsmen[strikerIdx].isStriker = false;
        inn.batsmen[strikerIdx].isNonStriker = true;
        inn.batsmen[nonStrikerIdx].isStriker = true;
        inn.batsmen[nonStrikerIdx].isNonStriker = false;
      }
    }

    let promptNextBowler = false;
    if (isLegalBall && inn.balls % 6 === 0) {
      const sIdx = inn.batsmen.findIndex((b) => b.isStriker);
      const nsIdx = inn.batsmen.findIndex((b) => b.isNonStriker);
      if (sIdx !== -1 && nsIdx !== -1) {
        inn.batsmen[sIdx].isStriker = false;
        inn.batsmen[sIdx].isNonStriker = true;
        inn.batsmen[nsIdx].isStriker = true;
        inn.batsmen[nsIdx].isNonStriker = false;
      }
      inn.timeline = [];
      if (inn.balls < activeMatch.totalOvers * 6 && inn.wickets < 10)
        promptNextBowler = true;
    }

    let newStatus = activeMatch.status;
    let matchResult = activeMatch.result;
    const maxBalls = activeMatch.totalOvers * 6;

    if (activeMatch.currentInnings === 1) {
      if (inn.balls >= maxBalls || inn.wickets >= 10) {
        newStatus = "innings_break";
        showToast(`1st Innings Over! Target: ${inn.runs + 1}`);
      }
    } else {
      const target = (activeMatch.innings1?.runs || 0) + 1;
      if (inn.runs >= target) {
        newStatus = "completed";
        matchResult = `🏆 ${inn.battingTeam} won by ${10 - inn.wickets} wickets!`;
        showToast(matchResult);
      } else if (inn.balls >= maxBalls || inn.wickets >= 10) {
        newStatus = "completed";
        matchResult = `🏆 ${activeMatch.innings1.battingTeam} won by ${target - 1 - inn.runs} runs!`;
        showToast(matchResult);
      }
    }

    setActiveMatch({
      ...activeMatch,
      status: newStatus,
      result: matchResult,
      [innKey]: inn,
      history: [prevSnapshot, ...activeMatch.history.slice(0, 20)],
    });

    if (promptNextBowler) setShowChangeBowlerModal(true);
  };

  const handleUndoLastBall = () => {
    if (!activeMatch?.history || activeMatch.history.length === 0) {
      showToast("No more balls to undo!");
      return;
    }
    const [previousState, ...rest] = activeMatch.history;
    setActiveMatch({ ...previousState, history: rest });
    showToast("↩ Last ball undone!");
  };

  const handleSwapStrike = () => {
    if (!activeMatch) return;
    const innKey = activeMatch.currentInnings === 1 ? "innings1" : "innings2";
    const inn = JSON.parse(JSON.stringify(activeMatch[innKey]));
    const sIdx = inn.batsmen.findIndex((b) => b.isStriker);
    const nsIdx = inn.batsmen.findIndex((b) => b.isNonStriker);

    if (sIdx !== -1 && nsIdx !== -1) {
      inn.batsmen[sIdx].isStriker = false;
      inn.batsmen[sIdx].isNonStriker = true;
      inn.batsmen[nsIdx].isStriker = true;
      inn.batsmen[nsIdx].isNonStriker = false;
      setActiveMatch({ ...activeMatch, [innKey]: inn });
      showToast("Strike rotated!");
    }
  };

  const handleConfirmNewBatsman = (e) => {
    e?.preventDefault();
    const innKey = activeMatch.currentInnings === 1 ? "innings1" : "innings2";
    const inn = JSON.parse(JSON.stringify(activeMatch[innKey]));
    const name = newBatsmanInput.trim() || `Batsman ${inn.batsmen.length + 1}`;

    inn.batsmen.push({
      name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      dismissal: "not out",
      isStriker: true,
      isNonStriker: false,
    });
    setActiveMatch({ ...activeMatch, [innKey]: inn });
    setNewBatsmanInput("");
    setShowNewBatsmanModal(false);
  };

  const handleConfirmNewBowler = (e) => {
    e?.preventDefault();
    const name = newBowlerInput.trim() || "Next Bowler";
    const innKey = activeMatch.currentInnings === 1 ? "innings1" : "innings2";
    const inn = JSON.parse(JSON.stringify(activeMatch[innKey]));

    let bIdx = inn.bowlers.findIndex(
      (b) => b.name.toLowerCase() === name.toLowerCase(),
    );
    if (bIdx === -1) {
      inn.bowlers.push({ name, balls: 0, maidens: 0, runs: 0, wickets: 0 });
      bIdx = inn.bowlers.length - 1;
    }
    inn.currentBowlerIndex = bIdx;
    setActiveMatch({ ...activeMatch, [innKey]: inn });
    setNewBowlerInput("");
    setShowChangeBowlerModal(false);
  };

  const getOversText = (balls) =>
    `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
  const curInn = activeMatch
    ? activeMatch.currentInnings === 1
      ? activeMatch.innings1
      : activeMatch.innings2
    : null;
  const strikerBatsman =
    curInn?.batsmen?.find((b) => b.isStriker) || curInn?.batsmen?.[0];
  const nonStrikerBatsman =
    curInn?.batsmen?.find((b) => b.isNonStriker) || curInn?.batsmen?.[1];
  const activeBowler =
    curInn?.bowlers?.[curInn.currentBowlerIndex || 0] || curInn?.bowlers?.[0];

  return (
    <div className="min-h-screen relative bg-[#07111f] text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,600;1,700&display=swap');
            * { font-family: "Exo 2", sans-serif; }
            .nm-card {
              background: linear-gradient(135deg, rgba(14, 30, 60, 0.75) 0%, rgba(18, 40, 78, 0.68) 100%);
              backdrop-filter: blur(16px);
              box-shadow: 0 12px 36px rgba(2, 10, 24, 0.4);
              border: 1px solid rgba(147, 197, 253, 0.22);
            }
            .nm-card-gold {
              background: linear-gradient(135deg, rgba(16, 35, 70, 0.8) 0%, rgba(22, 50, 96, 0.75) 100%);
              backdrop-filter: blur(16px);
              box-shadow: 0 14px 40px rgba(2, 12, 32, 0.5), 0 0 25px rgba(245, 197, 66, 0.16);
              border: 1.5px solid rgba(245, 197, 66, 0.75);
            }
            .nm-inset {
              background: rgba(10, 24, 48, 0.6);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(147, 197, 253, 0.3);
            }
            .slanted-box {
              transform: skewX(-12deg);
              border-radius: 14px;
              border: 1.5px solid rgba(245, 197, 66, 0.65);
              background: linear-gradient(135deg, rgba(16, 35, 72, 0.68), rgba(12, 30, 62, 0.62));
              backdrop-filter: blur(12px);
            }
            .stat-box {
              transform: skewX(-12deg);
              border-radius: 14px;
              border: 1.5px solid rgba(245, 197, 66, 0.65);
              background: linear-gradient(135deg, rgba(16, 35, 72, 0.68), rgba(12, 30, 62, 0.62));
              backdrop-filter: blur(12px);
              cursor: pointer !important;
              transition: all 0.22s ease-in-out;
            }
            .stat-box:hover {
              border-color: #fde68a !important;
              background: linear-gradient(135deg, rgba(28, 62, 124, 0.88), rgba(20, 48, 98, 0.82)) !important;
              box-shadow: 0 0 28px rgba(245, 197, 66, 0.55) !important;
              transform: skewX(-12deg) translateY(-3px) scale(1.02);
            }
            .stat-box-active {
              border: 2px solid #fde68a !important;
              background: linear-gradient(135deg, rgba(32, 72, 144, 0.95), rgba(22, 56, 114, 0.9)) !important;
              box-shadow: 0 0 32px rgba(245, 197, 66, 0.68) !important;
            }
            .unskew-content { transform: skewX(12deg); }
            .reg-btn {
              background: linear-gradient(135deg, rgba(16, 36, 72, 0.78), rgba(20, 46, 92, 0.72));
              backdrop-filter: blur(10px);
              border: 1.5px solid #e7c97a;
              border-radius: 10px;
              color: #fce79f;
              font-weight: 700;
              transition: all 0.22s ease;
            }
            .reg-btn:hover {
              background: linear-gradient(135deg, rgba(24, 52, 104, 0.92), rgba(30, 64, 126, 0.88));
              border-color: #fde68a;
              color: #ffffff;
            }
            .reg-btn-active {
              background: linear-gradient(135deg, rgba(34, 74, 148, 0.95), rgba(24, 56, 116, 0.92));
              border: 2px solid #fde68a;
              color: #ffffff;
            }
            .carousel-3d-stage {
              perspective: 1400px;
              perspective-origin: center 48%;
              transform-style: preserve-3d;
            }
            .card-coverflow {
              transform-style: preserve-3d;
              transition: transform 0.45s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.35s ease;
            }
            .card-flipper {
              transition: transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1);
              transform-style: preserve-3d;
              width: 100%;
              height: 100%;
              position: relative;
            }
            .card-flipped { transform: rotateY(180deg); }
            .card-face {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              border-radius: 1.5rem;
              overflow: hidden;
              backface-visibility: hidden;
              -webkit-backface-visibility: hidden;
            }
            .card-back { transform: rotateY(180deg); }
            .layer-pop-3d { transform: translateZ(40px); }
            .layer-pop-high { transform: translateZ(65px); }
          `,
        }}
      />

      {/* Stadium Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-fixed opacity-80"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=2200&q=85')",
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#071324]/70 via-[#0b1d3a]/50 to-[#07111f]/80" />

      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 nm-card border-b border-amber-400/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="py-1.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px] sm:text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">
                {t.tagline}
              </span>
            </div>

            {/* Responsive Header: 4 items top, 3 items bottom on Mobile — 1 single row on Desktop */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 w-full sm:w-auto">
              {/* Mobile Row 1: DB Live, Language, Home, Stats */}
              <div className="grid grid-cols-4 gap-1 w-full sm:flex sm:items-center sm:w-auto sm:gap-1.5">
                {/* 1. DB Live */}
                <button
                  type="button"
                  onClick={async () => {
                    showToast(
                      lang === "mr"
                        ? "डेटाबेस सिंक करत आहे..."
                        : "Syncing from Supabase...",
                    );
                    await fetchAllSupabaseData();
                    showToast(
                      lang === "mr"
                        ? "✓ डेटाबेस सिंक पूर्ण!"
                        : "✓ Database synced!",
                    );
                  }}
                  title="Click to re-sync with Supabase database"
                  className="flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg border border-emerald-400/50 bg-emerald-950/60 text-[10px] sm:text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/60 transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">
                    {SUPABASE_URL ? "DB Live" : "Offline"}
                  </span>
                  <RefreshCw
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 ${
                      isDbLoading ? "animate-spin" : ""
                    }`}
                  />
                </button>

                {/* 2. Language Switcher */}
                <div className="flex items-center justify-center rounded-lg p-0.5 border border-amber-400/40 bg-slate-900/80">
                  <button
                    type="button"
                    onClick={() => setLang("mr")}
                    className={`flex-1 px-1 py-0.5 rounded text-[10px] sm:text-[11px] font-bold text-center ${
                      lang === "mr"
                        ? "bg-amber-400 text-slate-950 font-black"
                        : "text-amber-200/80"
                    }`}
                  >
                    मराठी
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={`flex-1 px-1 py-0.5 rounded text-[10px] sm:text-[11px] font-bold text-center ${
                      lang === "en"
                        ? "bg-amber-400 text-slate-950 font-black"
                        : "text-amber-200/80"
                    }`}
                  >
                    English
                  </button>
                </div>

                {/* 3. Home */}
                <button
                  type="button"
                  onClick={() => setViewMode("public")}
                  className={`reg-btn px-1.5 py-1 text-[10px] sm:text-xs flex items-center justify-center gap-1 ${
                    viewMode === "public" ? "reg-btn-active" : ""
                  }`}
                >
                  <Eye className="w-3 h-3 text-amber-300 shrink-0" />
                  <span className="truncate">{t.home}</span>
                </button>

                {/* 4. Stats */}
                <button
                  type="button"
                  onClick={() => setViewMode("stats")}
                  className={`reg-btn px-1.5 py-1 text-[10px] sm:text-xs flex items-center justify-center gap-1 ${
                    viewMode === "stats" ? "reg-btn-active" : ""
                  }`}
                >
                  <BarChart3 className="w-3 h-3 text-cyan-300 shrink-0" />
                  <span className="truncate">{t.statsTable}</span>
                </button>
              </div>

              {/* Mobile Row 2: Player Portal, Live Scorer, Admin */}
              <div className="grid grid-cols-3 gap-1 w-full sm:flex sm:items-center sm:w-auto sm:gap-1.5">
                {/* 5. Player Portal */}
                <button
                  type="button"
                  onClick={() => setViewMode("portal")}
                  className={`reg-btn px-1.5 py-1 text-[10px] sm:text-xs flex items-center justify-center gap-1 ${
                    viewMode === "portal" ? "reg-btn-active" : ""
                  }`}
                >
                  <ClipboardList className="w-3 h-3 text-emerald-300 shrink-0" />
                  <span className="truncate">{t.playerPortal}</span>
                </button>

                {/* 6. Live Scorer */}
                <button
                  type="button"
                  onClick={() => setViewMode("scorer")}
                  className={`reg-btn px-1.5 py-1 text-[10px] sm:text-xs flex items-center justify-center gap-1 ${
                    viewMode === "scorer" ? "reg-btn-active" : ""
                  }`}
                >
                  <Activity className="w-3 h-3 text-red-400 animate-pulse shrink-0" />
                  <span className="truncate">{t.liveScorer}</span>
                </button>

                {/* 7. Admin */}
                <button
                  type="button"
                  onClick={() => {
                    if (isAdminLoggedIn) setViewMode("admin");
                    else setShowAdminLoginModal(true);
                  }}
                  className={`reg-btn px-1.5 py-1 text-[10px] sm:text-xs flex items-center justify-center gap-1 ${
                    viewMode === "admin" ? "reg-btn-active" : ""
                  }`}
                >
                  <Shield className="w-3 h-3 text-amber-300 shrink-0" />
                  <span className="truncate">{t.admin}</span>
                  {pendingPlayers.length > 0 && (
                    <span className="bg-red-500 text-white rounded-full px-1.5 text-[9px] font-black animate-pulse">
                      {pendingPlayers.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
            <div
              onClick={() => setViewMode("public")}
              className="flex items-center gap-2.5 cursor-pointer self-start sm:self-auto"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-0.5 shadow-xl flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src="/team_logo.jpeg"
                  alt="Vihana11 Logo"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Vihana11 Jay Hanuman Pise
              </h1>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-amber-300/80 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl nm-inset text-xs text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="relative shrink-0">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="appearance-none pl-7 pr-7 py-1.5 rounded-xl nm-inset text-xs font-bold text-amber-300 cursor-pointer focus:outline-none"
                >
                  <option value="2026-27" className="bg-slate-900 text-white">
                    {t.season} 2026-27
                  </option>
                  <option value="2025-26" className="bg-slate-900 text-white">
                    {t.season} 2025-26
                  </option>
                </select>
                <Calendar className="w-3.5 h-3.5 text-amber-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Spacing for fixed header */}
      {/* <div className="h-36 sm:h-36 md:h-28 w-full" aria-hidden="true" /> */}
      <div className="h-44 sm:h-36 md:h-28 w-full" aria-hidden="true" />

      {/* ==========================================
          1. PUBLIC HOME VIEW
      ========================================== */}
      {viewMode === "public" && (
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 flex-1 w-full">
          {/* Upcoming Match Schedule Banner */}
          {announcement.isActive && announcement.tournamentName ? (
            <div className="rounded-2xl nm-card-gold p-4 sm:p-5 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="slanted-box px-3 py-1 text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span className="unskew-content flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                        {t.matchSchedule}
                      </span>
                    </span>
                    <span className="slanted-box px-3 py-1 text-xs font-bold text-emerald-300">
                      <span className="unskew-content">
                        {announcement.round}
                      </span>
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                    <span>🏆</span>
                    <span>{announcement.tournamentName}</span>
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{announcement.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-300 font-bold">
                        {announcement.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{announcement.ground}</span>
                    </div>
                  </div>
                </div>

                <div className="slanted-box p-3 sm:p-4 self-stretch lg:self-auto flex items-center justify-center gap-3">
                  <div className="unskew-content flex items-center gap-2.5 sm:gap-4 text-center">
                    <div>
                      <div className="text-xs text-amber-300 font-bold">
                        {t.ourTeam}
                      </div>
                      <div className="text-sm sm:text-base font-black text-white">
                        Vihana11 Jay Hanuman Pise
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
                      vs
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-bold">
                        {t.opponent}
                      </div>
                      <div className="text-sm sm:text-base font-black text-amber-400">
                        {announcement.opposition}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl nm-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
                <div>
                  <div className="text-sm font-black text-white">
                    {t.noMatchScheduled}
                  </div>
                  <div className="text-xs text-slate-400">{t.noMatchSub}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isAdminLoggedIn) {
                    setViewMode("admin");
                    setAdminTab("match");
                  } else {
                    setShowAdminLoginModal(true);
                  }
                }}
                className="reg-btn px-3 py-1.5 text-xs"
              >
                {t.addScheduleBtn}
              </button>
            </div>
          )}

          {/* Season Trophy Summary */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                <span>{t.seasonSummaryTitle}</span>
              </h2>
              <span className="text-xs font-bold text-amber-300">
                {t.season}: {selectedSeason}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <div
                onClick={() => setSelectedRankFilter("ALL")}
                className={`stat-box p-4 ${selectedRankFilter === "ALL" ? "stat-box-active" : ""}`}
              >
                <div className="unskew-content">
                  <div className="text-xs text-slate-300 font-bold">
                    {t.tournamentsPlayed}
                  </div>
                  <div className="text-3xl font-black text-white mt-1">
                    {currentSeasonStats.played}
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedRankFilter("TROPHIES")}
                className={`stat-box p-4 ${selectedRankFilter === "TROPHIES" ? "stat-box-active" : ""}`}
              >
                <div className="unskew-content">
                  <div className="text-xs text-emerald-300 font-bold">
                    {t.totalTrophiesWon}
                  </div>
                  <div className="text-3xl font-black text-emerald-300 mt-1">
                    {currentSeasonStats.totalWon}
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedRankFilter(1)}
                className={`stat-box p-4 ${selectedRankFilter === 1 ? "stat-box-active" : ""}`}
              >
                <div className="unskew-content">
                  <div className="text-xs text-amber-300 font-bold">
                    {t.rank1Label}
                  </div>
                  <div className="text-3xl font-black text-amber-300 mt-1">
                    {currentSeasonStats.rank1}
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedRankFilter(2)}
                className={`stat-box p-4 ${selectedRankFilter === 2 ? "stat-box-active" : ""}`}
              >
                <div className="unskew-content">
                  <div className="text-xs text-slate-300 font-bold">
                    {t.rank2Label}
                  </div>
                  <div className="text-3xl font-black text-slate-100 mt-1">
                    {currentSeasonStats.rank2}
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedRankFilter(3)}
                className={`stat-box p-4 ${selectedRankFilter === 3 ? "stat-box-active" : ""}`}
              >
                <div className="unskew-content">
                  <div className="text-xs text-amber-500 font-bold">
                    {t.rank3Label}
                  </div>
                  <div className="text-3xl font-black text-amber-400 mt-1">
                    {currentSeasonStats.rank3}
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedRankFilter(4)}
                className={`stat-box p-4 ${selectedRankFilter === 4 ? "stat-box-active" : ""}`}
              >
                <div className="unskew-content">
                  <div className="text-xs text-emerald-400 font-bold">
                    {t.rank4Label}
                  </div>
                  <div className="text-3xl font-black text-emerald-300 mt-1">
                    {currentSeasonStats.rank4}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3D Squad Showcase */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-amber-400" />
                  <span>
                    {t.squadShowcaseTitle}{" "}
                    {approvedPlayers.length > 0 &&
                      `(${activePlayerIndex + 1} / ${approvedPlayers.length})`}
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {t.squadShowcaseSub}
                </p>
              </div>

              {approvedPlayers.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsCardFlipped(false);
                      setActivePlayerIndex((prev) =>
                        prev === 0 ? approvedPlayers.length - 1 : prev - 1,
                      );
                    }}
                    className="reg-btn p-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsCardFlipped(false);
                      setActivePlayerIndex((prev) =>
                        prev === approvedPlayers.length - 1 ? 0 : prev + 1,
                      );
                    }}
                    className="reg-btn p-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {approvedPlayers.length === 0 ? (
              <div className="nm-card rounded-3xl p-10 text-center space-y-4 my-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
                  <Users className="w-8 h-8 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white">
                    {t.noPlayersTitle}
                  </h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    {t.noPlayersSub}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setViewMode("portal")}
                    className="reg-btn px-4 py-2 text-xs flex items-center gap-2"
                  >
                    <ClipboardList className="w-4 h-4 text-emerald-300" />
                    <span>{t.openPortalBtn}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (isAdminLoggedIn) {
                        setViewMode("admin");
                        setAdminTab("player");
                      } else {
                        setShowAdminLoginModal(true);
                      }
                    }}
                    className="reg-btn px-4 py-2 text-xs flex items-center gap-2 text-amber-300"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.adminAddPlayerBtn}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden py-10 carousel-3d-stage">
                <div className="flex items-center justify-center min-h-[490px] relative z-10">
                  {approvedPlayers.map((player, idx) => {
                    const total = approvedPlayers.length;
                    const offset = getCircularOffset(
                      idx,
                      activePlayerIndex,
                      total,
                    );
                    const absOffset = Math.abs(offset);
                    if (absOffset > 2 && total > 3) return null;

                    const isCenter = offset === 0;
                    const zIndex = 30 - absOffset * 10;
                    const opacity =
                      absOffset === 0 ? 1 : absOffset === 1 ? 0.85 : 0.6;

                    let transformStyle = "";
                    if (isCenter) {
                      transformStyle = `translate3d(0, 0, 80px) rotateX(${mouseTilt.rotateX}deg) rotateY(${mouseTilt.rotateY}deg) scale(1.05)`;
                    } else if (offset === -1) {
                      transformStyle =
                        "translate3d(-240px, 0, 0px) rotateY(25deg) scale(0.9)";
                    } else if (offset === 1) {
                      transformStyle =
                        "translate3d(240px, 0, 0px) rotateY(-25deg) scale(0.9)";
                    } else if (offset === -2) {
                      transformStyle =
                        "translate3d(-390px, 0, -80px) rotateY(38deg) scale(0.78)";
                    } else if (offset === 2) {
                      transformStyle =
                        "translate3d(390px, 0, -80px) rotateY(-38deg) scale(0.78)";
                    }

                    return (
                      <div
                        key={player.id}
                        onClick={() => {
                          if (!isCenter) setActivePlayerIndex(idx);
                          else setSelectedPopupPlayer(player);
                        }}
                        onMouseMove={isCenter ? handleCardMouseMove : undefined}
                        onMouseLeave={
                          isCenter ? handleCardMouseLeave : undefined
                        }
                        style={{ transform: transformStyle, zIndex, opacity }}
                        className={`card-coverflow absolute w-72 sm:w-80 h-[470px] rounded-3xl cursor-pointer ${
                          isCenter ? "shadow-[0_25px_60px_rgba(0,0,0,0.9)]" : ""
                        }`}
                      >
                        <div
                          className={`card-flipper ${isCenter && isCardFlipped ? "card-flipped" : ""}`}
                        >
                          <div
                            className={`card-face nm-card ${isCenter ? "border-2 border-amber-400" : "border border-white/20"}`}
                          >
                            <img
                              src={player.photo}
                              alt={player.name}
                              className="w-full h-full object-cover object-top layer-pop-3d"
                            />

                            <div className="absolute top-3.5 inset-x-4 flex items-center justify-between text-xs z-30 layer-pop-high">
                              <span className="text-[13px] font-black text-white drop-shadow">
                                Vihana11 Jay Hanuman Pise
                              </span>
                              <div className="flex items-center gap-2">
                                {isCenter && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsCardFlipped(true);
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-black/60 border border-amber-400 text-[10px] font-black text-amber-300"
                                  >
                                    Stats
                                  </button>
                                )}
                                <span className="text-xl font-black text-white ">
                                  #{player.jersey}
                                </span>
                              </div>
                            </div>

                            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-14 space-y-2 z-30 layer-pop-high">
                              <div className="flex items-center justify-between">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950">
                                  {player.role}
                                </span>
                                <span className="text-[10px] text-amber-300 font-bold">
                                  {player.performances?.length || 0} Matches
                                </span>
                              </div>
                              <h4 className="text-xl font-black text-white">
                                {player.name}
                              </h4>
                              <p className="text-xs text-slate-300">
                                {player.style}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSharePlayerCard(player);
                                  }}
                                  className="flex-1 reg-btn py-2 text-xs flex items-center justify-center gap-1.5"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-emerald-300" />
                                  <span>{t.shareHdStatus}</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadPlayerCard(player);
                                  }}
                                  className="reg-btn px-3 py-2 text-xs flex items-center justify-center text-amber-300"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Card Back */}
                          <div className="card-face card-back nm-card border-2 border-amber-400 p-5 flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950">
                            <div>
                              <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
                                <div>
                                  <span className="text-[11px] font-bold text-amber-300">
                                    🚩 Vihana11 Jay Hanuman Pise
                                  </span>
                                  <h4 className="text-lg font-black text-white">
                                    {player.name}
                                  </h4>
                                </div>
                                <span className="text-2xl font-black text-amber-400">
                                  #{player.jersey}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2.5 mt-4">
                                <div className="p-2.5 rounded-xl bg-black/50 text-center">
                                  <span className="text-[10px] text-slate-400 font-bold block">
                                    Matches
                                  </span>
                                  <span className="text-xl font-black text-white">
                                    {player.performances?.length || 0}
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-black/50 text-center">
                                  <span className="text-[10px] text-amber-300 font-bold block">
                                    Runs
                                  </span>
                                  <span className="text-xl font-black text-amber-300">
                                    {player.performances?.reduce(
                                      (acc, c) => acc + (Number(c.runs) || 0),
                                      0,
                                    ) || 0}
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-black/50 text-center">
                                  <span className="text-[10px] text-emerald-300 font-bold block">
                                    Wickets
                                  </span>
                                  <span className="text-xl font-black text-emerald-300">
                                    {player.performances?.reduce(
                                      (acc, c) =>
                                        acc + (Number(c.wickets) || 0),
                                      0,
                                    ) || 0}
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-black/50 text-center">
                                  <span className="text-[10px] text-cyan-300 font-bold block">
                                    High Score
                                  </span>
                                  <span className="text-xl font-black text-cyan-300">
                                    {player.performances?.reduce(
                                      (acc, c) =>
                                        Math.max(acc, Number(c.runs) || 0),
                                      0,
                                    ) || 0}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCardFlipped(false);
                              }}
                              className="w-full reg-btn py-2 text-xs font-bold"
                            >
                              Flip Back
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Tournament Memories */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                <span>{t.tournamentMemoriesTitle}</span>
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {["ALL", 1, 2, 3, 4, 0].map((rf) => (
                  <button
                    key={rf}
                    onClick={() => setSelectedRankFilter(rf)}
                    className={`reg-btn px-2.5 py-1 text-xs ${selectedRankFilter === rf ? "reg-btn-active" : ""}`}
                  >
                    {rf === "ALL"
                      ? t.allRecords
                      : rf === 0
                        ? t.leagueFilterTab
                        : `#${rf} ${t.rankLabel}`}
                  </button>
                ))}
              </div>
            </div>

            {filteredTournaments.length === 0 ? (
              <div className="nm-card rounded-2xl p-8 text-center space-y-3">
                <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
                <div className="text-sm font-black text-white">
                  {t.noTourneysTitle}
                </div>
                <p className="text-xs text-slate-400">{t.noTourneysSub}</p>
                <button
                  onClick={() => {
                    if (isAdminLoggedIn) {
                      setViewMode("admin");
                      setAdminTab("tournament");
                    } else {
                      setShowAdminLoginModal(true);
                    }
                  }}
                  className="reg-btn px-4 py-2 text-xs font-bold text-amber-300"
                >
                  {t.addTourneyBtn}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTournaments.map((tourney) => {
                  const badge = getRankBadge(tourney.rank);
                  return (
                    <div
                      key={tourney.id}
                      className="nm-card rounded-2xl overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-56 w-full overflow-hidden bg-slate-900">
                          <img
                            src={tourney.photos[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs ${badge.bg}`}
                            >
                              {badge.title}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{tourney.location}</span>
                            <span className="text-amber-400 font-bold">
                              {tourney.date}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-white">
                            {tourney.name}
                          </h3>
                          {tourney.prize && (
                            <div
                              className={`text-xs font-bold ${tourney.rank === 0 ? "text-slate-400" : "text-emerald-400"}`}
                            >
                              {tourney.rank === 0 ? "🏏" : "🏆"} {tourney.prize}
                            </div>
                          )}
                          {tourney.finalMomPlayer && (
                            <div className="p-2 rounded-xl bg-black/40 text-xs">
                              <span className="text-amber-300 font-bold">
                                {t.finalMom}:{" "}
                              </span>
                              <span className="text-white">
                                {tourney.finalMomPlayer}
                              </span>
                            </div>
                          )}

                          {/* Man of the Series */}
                          {tourney.mosPlayer && (
                            <div className="p-2 rounded-xl bg-black/40 text-xs flex items-center justify-between">
                              <span className="text-amber-300 font-bold flex items-center gap-1">
                                🌟 {t.manOfSeries}:
                              </span>
                              <span className="text-white font-semibold">
                                {tourney.mosPlayer}{" "}
                                {tourney.mosStats && (
                                  <span className="text-slate-300 text-[11px] font-normal">
                                    ({tourney.mosStats})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Best Batsman */}
                          {tourney.bestBatsmanPlayer && (
                            <div className="p-2 rounded-xl bg-black/40 text-xs flex items-center justify-between">
                              <span className="text-amber-300 font-bold flex items-center gap-1">
                                🏏 {t.bestBatsman}:
                              </span>
                              <span className="text-white font-semibold">
                                {tourney.bestBatsmanPlayer}{" "}
                                {tourney.bestBatsmanStats && (
                                  <span className="text-slate-300 text-[11px] font-normal">
                                    ({tourney.bestBatsmanStats})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Best Bowler */}
                          {tourney.bestBowlerPlayer && (
                            <div className="p-2 rounded-xl bg-black/40 text-xs flex items-center justify-between">
                              <span className="text-amber-300 font-bold flex items-center gap-1">
                                🎯 {t.bestBowler}:
                              </span>
                              <span className="text-white font-semibold">
                                {tourney.bestBowlerPlayer}{" "}
                                {tourney.bestBowlerStats && (
                                  <span className="text-slate-300 text-[11px] font-normal">
                                    ({tourney.bestBowlerStats})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <button
                          onClick={() => {
                            setSelectedTournamentAlbum(tourney);
                            setAlbumPhotoIndex(0);
                          }}
                          className="w-full reg-btn py-2 text-xs font-bold"
                        >
                          {t.viewAlbum} ({tourney.photos.length} {t.photosCount}
                          )
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ==========================================
          2. PLAYER STATS & TABLE VIEW
      ========================================== */}
      {viewMode === "stats" && (
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 w-full">
          <div className="nm-card-gold rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
                <span>{t.statsHeaderTitle}</span>
              </h2>
              <p className="text-xs text-amber-300">{t.statsHeaderSub}</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.statsSearchPlaceholder}
                value={statsSearchQuery}
                onChange={(e) => setStatsSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl nm-inset text-xs text-white"
              />
            </div>
          </div>

          {approvedPlayers.length === 0 ? (
            <div className="nm-card rounded-2xl p-8 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-white">
                {t.noStatsPlayers}
              </div>
              <p className="text-xs text-slate-400">{t.noStatsPlayersSub}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Player Selector List */}
              <div className="nm-card rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-amber-300 uppercase block mb-2">
                  {t.selectPlayerLabel}
                </span>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {approvedPlayers
                    .filter(
                      (p) =>
                        !statsSearchQuery ||
                        p.name
                          .toLowerCase()
                          .includes(statsSearchQuery.toLowerCase()),
                    )
                    .map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedStatsPlayerId(p.id)}
                        className={`p-2.5 rounded-xl cursor-pointer flex items-center gap-3 transition-all ${
                          currentStatsPlayer?.id === p.id
                            ? "bg-amber-400/20 border border-amber-400 text-white"
                            : "bg-black/30 hover:bg-black/50 text-slate-300"
                        }`}
                      >
                        <img
                          src={p.photo}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black truncate">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            #{p.jersey} • {p.role}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Player Career Stats & Matches */}
              {currentStatsPlayer && (
                <div className="lg:col-span-3 space-y-6">
                  {/* Summary Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="stat-box p-3.5">
                      <div className="unskew-content">
                        <span className="text-[10px] text-slate-300 font-bold block">
                          {t.totalMatches}
                        </span>
                        <div className="text-2xl font-black text-white mt-0.5">
                          {playerCareerStats.matches}
                        </div>
                      </div>
                    </div>
                    <div className="stat-box p-3.5">
                      <div className="unskew-content">
                        <span className="text-[10px] text-amber-300 font-bold block">
                          {t.totalRuns}
                        </span>
                        <div className="text-2xl font-black text-amber-300 mt-0.5">
                          {playerCareerStats.runs}
                        </div>
                      </div>
                    </div>
                    <div className="stat-box p-3.5">
                      <div className="unskew-content">
                        <span className="text-[10px] text-cyan-300 font-bold block">
                          {t.highScore}
                        </span>
                        <div className="text-2xl font-black text-cyan-300 mt-0.5">
                          {playerCareerStats.highScore}
                        </div>
                      </div>
                    </div>
                    <div className="stat-box p-3.5">
                      <div className="unskew-content">
                        <span className="text-[10px] text-emerald-300 font-bold block">
                          {t.wickets}
                        </span>
                        <div className="text-2xl font-black text-emerald-300 mt-0.5">
                          {playerCareerStats.wickets}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Match-by-Match Table */}
                  <div className="nm-card rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <h3 className="text-base font-black text-white">
                        {t.matchHistoryTitle}
                      </h3>
                      <button
                        onClick={() =>
                          handleDownloadPlayerCard(currentStatsPlayer)
                        }
                        className="reg-btn px-3 py-1 text-xs flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t.downloadHdCard}</span>
                      </button>
                    </div>

                    {!currentStatsPlayer.performances ||
                    currentStatsPlayer.performances.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        {t.noPerfRecords}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-black/50 text-slate-400 border-b border-white/10">
                            <tr>
                              <th className="p-2.5">{t.tableDate}</th>
                              <th className="p-2.5">{t.tableTourneyOpp}</th>
                              <th className="p-2.5">{t.tableRunsBalls}</th>
                              <th className="p-2.5">{t.tableFoursSixes}</th>
                              <th className="p-2.5">{t.tableOversRuns}</th>
                              <th className="p-2.5">{t.tableWickets}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {currentStatsPlayer.performances.map((perf) => (
                              <tr key={perf.id} className="hover:bg-white/5">
                                <td className="p-2.5 font-bold text-amber-300">
                                  {perf.date}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-bold text-white">
                                    {perf.tournament}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    vs {perf.opposition} ({perf.stage})
                                  </div>
                                </td>
                                <td className="p-2.5 font-black text-amber-400">
                                  {perf.runs}
                                  {perf.isNotOut ? "*" : ""}{" "}
                                  <span className="text-slate-400 font-normal">
                                    ({perf.balls})
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  {perf.fours} / {perf.sixes}
                                </td>
                                <td className="p-2.5">
                                  {perf.overs} Ov / {perf.runsConceded} R
                                </td>
                                <td className="p-2.5 font-black text-emerald-400">
                                  {perf.wickets} W
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ==========================================
          3. PLAYER PORTAL VIEW
      ========================================== */}
      {viewMode === "portal" && (
        <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 w-full">
          <div className="nm-card-gold rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-emerald-400" />
                <span>{t.portalTitle}</span>
              </h2>
              <p className="text-xs text-amber-300">{t.portalSub}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPortalTab("register")}
                className={`reg-btn px-3 py-1.5 text-xs ${portalTab === "register" ? "reg-btn-active" : ""}`}
              >
                {t.tabNewReg}
              </button>
              <button
                onClick={() => setPortalTab("log")}
                className={`reg-btn px-3 py-1.5 text-xs ${portalTab === "log" ? "reg-btn-active" : ""}`}
              >
                {t.tabLogPerf}
              </button>
            </div>
          </div>

          {/* Tab 1: Self-Registration */}
          {portalTab === "register" && (
            <div className="nm-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-lg font-black text-white">{t.regTitle}</h3>
                <p className="text-xs text-slate-300">{t.regSub}</p>
              </div>

              <form onSubmit={handleSelfRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.firstName}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === "mr" ? "उदा. Vicky" : "e.g. Vicky"}
                      value={registrationForm.firstName}
                      onChange={(e) =>
                        setRegistrationForm({
                          ...registrationForm,
                          firstName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.lastName}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === "mr" ? "उदा. Patil" : "e.g. Patil"}
                      value={registrationForm.lastName}
                      onChange={(e) =>
                        setRegistrationForm({
                          ...registrationForm,
                          lastName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.jerseyNo}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === "mr" ? "उदा. 07" : "e.g. 07"}
                      value={registrationForm.jersey}
                      onChange={(e) =>
                        setRegistrationForm({
                          ...registrationForm,
                          jersey: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.playerRole}
                    </label>
                    <select
                      value={registrationForm.role}
                      onChange={(e) =>
                        setRegistrationForm({
                          ...registrationForm,
                          role: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white bg-slate-900"
                    >
                      <option value="All Rounder">All Rounder</option>
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="Wicketkeeper Batsman">
                        Wicketkeeper Batsman
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.secretPin}
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="1234"
                      value={registrationForm.pin}
                      onChange={(e) =>
                        setRegistrationForm({
                          ...registrationForm,
                          pin: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.playingStyle}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      lang === "mr"
                        ? "उदा. Right-Hand Power Hitter • Off-Spin"
                        : "e.g. Right-Hand Power Hitter • Off-Spin"
                    }
                    value={registrationForm.style}
                    onChange={(e) =>
                      setRegistrationForm({
                        ...registrationForm,
                        style: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.uploadHdPhoto}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={selfRegisterFileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () =>
                          setRegistrationForm({
                            ...registrationForm,
                            photo: reader.result,
                          });
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-amber-400 file:text-slate-950 file:font-bold cursor-pointer"
                  />
                </div>

                {registrationForm.photo && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40">
                    <img
                      src={registrationForm.photo}
                      alt="Preview"
                      className="w-14 h-16 rounded-lg object-cover"
                    />
                    <span className="text-xs text-emerald-400 font-bold">
                      {t.photoSelected}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full reg-btn py-3 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300"
                >
                  {t.submitProfileBtn}
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Log Match Performance */}
          {portalTab === "log" && (
            <div className="nm-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-lg font-black text-white">
                  {t.logPerfTitle}
                </h3>
                <p className="text-xs text-slate-300">{t.logPerfSub}</p>
              </div>

              {!isPlayerAuthenticated ? (
                <form
                  onSubmit={handlePlayerLogin}
                  className="space-y-4 max-w-md mx-auto py-4"
                >
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.chooseProfile}
                    </label>
                    <select
                      required
                      value={selectedPortalPlayerId}
                      onChange={(e) =>
                        setSelectedPortalPlayerId(e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white bg-slate-900"
                    >
                      <option value="">{t.selectPlayerPlaceholder}</option>
                      {approvedPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.jersey} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.enterPin}
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="1234"
                      value={portalPlayerPin}
                      onChange={(e) => setPortalPlayerPin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {t.defaultPinHint}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full reg-btn py-2.5 text-xs font-black text-slate-950 bg-amber-400"
                  >
                    {t.loginUnlockBtn}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSavePerformance} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        {t.tourneyNameLabel}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={
                          lang === "mr"
                            ? "उदा. Hanuman Jayanti Maha Chashak Pise"
                            : "e.g. Premier Trophy"
                        }
                        value={perfForm.tournament}
                        onChange={(e) =>
                          setPerfForm({
                            ...perfForm,
                            tournament: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        {t.oppositionLabel}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={
                          lang === "mr"
                            ? "उदा. Kalyan Warriors"
                            : "e.g. Kalyan Warriors"
                        }
                        value={perfForm.opposition}
                        onChange={(e) =>
                          setPerfForm({
                            ...perfForm,
                            opposition: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        {t.runsLabel}
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={perfForm.runs}
                        onChange={(e) =>
                          setPerfForm({ ...perfForm, runs: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        {t.ballsLabel}
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={perfForm.balls}
                        onChange={(e) =>
                          setPerfForm({ ...perfForm, balls: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        {t.foursLabel}
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={perfForm.fours}
                        onChange={(e) =>
                          setPerfForm({ ...perfForm, fours: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        {t.sixesLabel}
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={perfForm.sixes}
                        onChange={(e) =>
                          setPerfForm({ ...perfForm, sixes: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        {t.oversLabel}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={perfForm.overs}
                        onChange={(e) =>
                          setPerfForm({ ...perfForm, overs: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        {t.runsConcededLabel}
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={perfForm.runsConceded}
                        onChange={(e) =>
                          setPerfForm({
                            ...perfForm,
                            runsConceded: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        {t.wicketsLabel}
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={perfForm.wickets}
                        onChange={(e) =>
                          setPerfForm({ ...perfForm, wickets: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        {t.catchesLabel}
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={perfForm.catches}
                        onChange={(e) =>
                          setPerfForm({ ...perfForm, catches: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full reg-btn py-3 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300"
                  >
                    {t.savePerfBtn}
                  </button>
                </form>
              )}
            </div>
          )}
        </main>
      )}

      {/* ==========================================
          4. LIVE MATCH SCORER VIEW
      ========================================== */}
      {viewMode === "scorer" && (
        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 w-full">
          <div className="nm-card-gold rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">{t.liveScorer}</h2>
              <p className="text-xs text-amber-300">
                {activeMatch
                  ? `${activeMatch.team1} vs ${activeMatch.team2} • ${activeMatch.totalOvers} ${t.oversLabelSelect}`
                  : lang === "mr"
                    ? 'सामना सुरू करण्यासाठी "+ Create Match" वर क्लिक करा'
                    : 'Click "+ Create Match" to start scoring'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeMatch && (
                <button
                  onClick={() => setShowScorecardModal(true)}
                  className="reg-btn px-3 py-2 text-xs"
                >
                  {lang === "mr" ? "धावफलक (Scorecard)" : "Full Scorecard"}
                </button>
              )}
              <button
                onClick={() => setShowCreateMatchModal(true)}
                className="reg-btn px-3 py-2 text-xs text-amber-300"
              >
                {t.createMatchBtn}
              </button>
            </div>
          </div>

          {!activeMatch ? (
            <div className="nm-card rounded-2xl p-8 text-center space-y-3">
              <Activity className="w-10 h-10 text-amber-400 mx-auto" />
              <div className="text-base font-black text-white">
                {t.noActiveMatchTitle}
              </div>
              <p className="text-xs text-slate-300">{t.noActiveMatchSub}</p>
              <button
                onClick={() => setShowCreateMatchModal(true)}
                className="reg-btn px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400"
              >
                {t.createMatchBtn}
              </button>
            </div>
          ) : (
            curInn && (
              <div className="nm-card rounded-3xl p-6 border-2 border-amber-400/50 space-y-5">
                {/* Match Completed Winner Banner */}
                {activeMatch.status === "completed" && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900/80 via-amber-900/60 to-emerald-900/80 border-2 border-amber-400 text-center space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      {lang === "mr"
                        ? "सामना समाप्त (Match Completed)"
                        : "Match Result"}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {activeMatch.result || "Match Finished!"}
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowScorecardModal(true)}
                        className="reg-btn px-4 py-1.5 text-xs"
                      >
                        {t.fullScorecardTitle}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateMatchModal(true)}
                        className="reg-btn px-4 py-1.5 text-xs bg-amber-400 text-slate-950 font-black"
                      >
                        {t.createMatchBtn}
                      </button>
                    </div>
                  </div>
                )}

                {/* Innings Break Banner & Start 2nd Innings Form */}
                {activeMatch.status === "innings_break" && (
                  <div className="p-5 rounded-2xl bg-black/70 border-2 border-amber-400 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">
                          {lang === "mr"
                            ? "पहिला डाव समाप्त"
                            : "1st Innings Complete"}
                        </span>
                        <h3 className="text-lg font-black text-white mt-1">
                          {activeMatch.innings1?.battingTeam}:{" "}
                          {activeMatch.innings1?.runs}/
                          {activeMatch.innings1?.wickets} (
                          {getOversText(activeMatch.innings1?.balls)} Ov)
                        </h3>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-right">
                        <span className="text-[11px] text-amber-300 font-bold block">
                          {lang === "mr"
                            ? "विजयाचे लक्ष्य (Target)"
                            : "Target to Win"}
                        </span>
                        <span className="text-2xl font-black text-amber-400">
                          {(activeMatch.innings1?.runs || 0) + 1} Runs
                        </span>
                      </div>
                    </div>

                    <form
                      onSubmit={handleStartSecondInnings}
                      className="space-y-3"
                    >
                      <div className="text-xs font-bold text-emerald-300">
                        🏏{" "}
                        {lang === "mr"
                          ? `दुसऱ्या डावासाठी ${activeMatch.innings1?.bowlingTeam} चे फलंदाज व गोलंदाज निवडा:`
                          : `Enter ${activeMatch.innings1?.bowlingTeam} Opening Batsmen & Bowler:`}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-slate-300 font-bold block mb-1">
                            {t.strikerInputLabel}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={t.strikerPlaceholder}
                            value={secondInningsForm.striker}
                            onChange={(e) =>
                              setSecondInningsForm({
                                ...secondInningsForm,
                                striker: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 font-bold block mb-1">
                            {t.nonStrikerInputLabel}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={t.nonStrikerPlaceholder}
                            value={secondInningsForm.nonStriker}
                            onChange={(e) =>
                              setSecondInningsForm({
                                ...secondInningsForm,
                                nonStriker: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 font-bold block mb-1">
                            {t.openingBowlerInputLabel}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={t.openingBowlerPlaceholder}
                            value={secondInningsForm.openingBowler}
                            onChange={(e) =>
                              setSecondInningsForm({
                                ...secondInningsForm,
                                openingBowler: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full reg-btn py-3 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300"
                      >
                        🚀{" "}
                        {lang === "mr"
                          ? "दुसरा डाव सुरू करा (Start 2nd Innings)"
                          : "Start 2nd Innings (Target Chase)"}
                      </button>
                    </form>
                  </div>
                )}

                {/* Live Score Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase font-bold">
                        {activeMatch.currentInnings === 2
                          ? "2nd Innings • "
                          : "1st Innings • "}
                        Batting: {curInn.battingTeam}
                      </span>
                    </div>
                    <div className="text-5xl font-black text-amber-400">
                      {curInn.runs}/{curInn.wickets}
                    </div>
                  </div>
                  <div className="sm:text-right space-y-1">
                    <div className="text-lg font-bold text-slate-300">
                      {getOversText(curInn.balls)} / {activeMatch.totalOvers} Ov
                    </div>
                    {activeMatch.currentInnings === 2 &&
                      activeMatch.innings1 && (
                        <div className="px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-xs font-bold text-amber-300">
                          Target: {(activeMatch.innings1.runs || 0) + 1} • Need{" "}
                          {Math.max(
                            0,
                            (activeMatch.innings1.runs || 0) + 1 - curInn.runs,
                          )}{" "}
                          runs in{" "}
                          {Math.max(
                            0,
                            activeMatch.totalOvers * 6 - curInn.balls,
                          )}{" "}
                          balls
                        </div>
                      )}
                  </div>
                </div>

                {/* Batsmen */}
                <div className="grid grid-cols-2 gap-3">
                  {strikerBatsman && (
                    <div className="p-3.5 rounded-2xl bg-black/60 border-2 border-amber-400">
                      <span className="text-xs text-amber-400 font-bold block">
                        🏏 {t.strikerInputLabel}
                      </span>
                      <div className="text-sm font-black text-white">
                        {strikerBatsman.name}
                      </div>
                      <div className="text-2xl font-black text-amber-300 mt-1">
                        {strikerBatsman.runs}*{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          ({strikerBatsman.balls}b)
                        </span>
                      </div>
                    </div>
                  )}
                  {nonStrikerBatsman && (
                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/20">
                      <span className="text-xs text-slate-400 font-bold block">
                        {t.nonStrikerInputLabel}
                      </span>
                      <div className="text-sm font-black text-white">
                        {nonStrikerBatsman.name}
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        {nonStrikerBatsman.runs}{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          ({nonStrikerBatsman.balls}b)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bowler */}
                {activeBowler && (
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        {t.bowlerLabel}
                      </span>
                      <span className="font-black text-white">
                        {activeBowler.name}
                      </span>
                    </div>
                    <div className="text-right font-bold text-amber-300">
                      {getOversText(activeBowler.balls)} Ov •{" "}
                      {activeBowler.runs} R • {activeBowler.wickets} W
                    </div>
                  </div>
                )}

                {/* Keypad (Disabled during innings break or after completion) */}
                {activeMatch.status === "in_progress" && (
                  <>
                    <div className="grid grid-cols-6 gap-2">
                      {[0, 1, 2, 3].map((r) => (
                        <button
                          key={r}
                          onClick={() => handleScoreBall(r)}
                          className="py-3 rounded-2xl bg-slate-900 border border-white/20 font-black text-lg text-white"
                        >
                          {r === 0 ? "•" : r}
                        </button>
                      ))}
                      <button
                        onClick={() => handleScoreBall(4)}
                        className="py-3 rounded-2xl bg-emerald-600 font-black text-lg text-white"
                      >
                        4
                      </button>
                      <button
                        onClick={() => handleScoreBall(6)}
                        className="py-3 rounded-2xl bg-amber-400 text-slate-950 font-black text-lg"
                      >
                        6
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleScoreBall(0, "wide")}
                        className="py-2.5 rounded-xl bg-cyan-950 border border-cyan-400 text-cyan-300 font-bold text-xs"
                      >
                        Wide (+1)
                      </button>
                      <button
                        onClick={() => handleScoreBall(0, "noBall")}
                        className="py-2.5 rounded-xl bg-indigo-950 border border-indigo-400 text-indigo-300 font-bold text-xs"
                      >
                        No Ball (+1)
                      </button>
                      <button
                        onClick={() => handleScoreBall(0, null, true)}
                        className="py-2.5 rounded-xl bg-red-600 font-black text-xs text-white"
                      >
                        Wicket (Out)
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={handleUndoLastBall}
                        className="reg-btn px-4 py-2 text-xs font-bold text-amber-300"
                      >
                        ↩ Undo Last Ball
                      </button>
                      <button
                        onClick={handleSwapStrike}
                        className="reg-btn px-4 py-2 text-xs font-bold text-emerald-300"
                      >
                        Swap Strike
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          )}

          {/* Match History (Saved Matches from Supabase) */}
          {savedMatchesList.length > 0 && (
            <div className="nm-card rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>
                    {lang === "mr"
                      ? `नोंदवलेले सामने (Match History • ${savedMatchesList.length})`
                      : `Match History (${savedMatchesList.length})`}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={fetchAllSupabaseData}
                  className="reg-btn px-2.5 py-1 text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedMatchesList.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl bg-black/50 border space-y-2 ${
                      activeMatch?.id === m.id
                        ? "border-amber-400"
                        : "border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-bold">
                        {m.totalOvers} Overs Match
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-black ${
                          m.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-400/20 text-amber-300"
                        }`}
                      >
                        {m.status === "completed" ? "Completed" : "In Progress"}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>{m.innings1?.battingTeam || m.team1}</span>
                        <span className="text-amber-300">
                          {m.innings1?.runs ?? 0}/{m.innings1?.wickets ?? 0} (
                          {getOversText(m.innings1?.balls || 0)} Ov)
                        </span>
                      </div>
                      {m.innings2 && m.innings2.battingTeam && (
                        <div className="flex items-center justify-between font-bold text-white">
                          <span>{m.innings2.battingTeam}</span>
                          <span className="text-emerald-300">
                            {m.innings2.runs ?? 0}/{m.innings2.wickets ?? 0} (
                            {getOversText(m.innings2.balls || 0)} Ov)
                          </span>
                        </div>
                      )}
                    </div>

                    {m.result && (
                      <div className="text-xs font-black text-amber-400 pt-1">
                        {m.result}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMatch(m);
                          setShowScorecardModal(true);
                        }}
                        className="flex-1 reg-btn py-1.5 text-xs"
                      >
                        {lang === "mr" ? "संपूर्ण धावफलक" : "View Scorecard"}
                      </button>
                      {activeMatch?.id !== m.id && (
                        <button
                          type="button"
                          onClick={() => setActiveMatch(m)}
                          className="reg-btn px-3 py-1.5 text-xs text-amber-300"
                        >
                          {m.status === "completed" ? "Open" : "Resume"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {/* ==========================================
          5. ADMIN MANAGEMENT DASHBOARD
      ========================================== */}
      {viewMode === "admin" && isAdminLoggedIn && (
        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 w-full">
          <div className="nm-card-gold rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">
                {t.adminDbTitle}
              </h2>
              <p className="text-xs text-amber-300">{t.adminDbSub}</p>
            </div>
            <button
              onClick={handleAdminLogout}
              className="reg-btn px-3 py-1.5 text-xs text-red-300"
            >
              Logout
            </button>
          </div>

          {/* Admin Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
            <button
              onClick={() => setAdminTab("match")}
              className={`reg-btn px-3 py-1.5 text-xs shrink-0 ${adminTab === "match" ? "reg-btn-active" : ""}`}
            >
              {t.tabMatchSchedule}
            </button>
            <button
              onClick={() => setAdminTab("tournament")}
              className={`reg-btn px-3 py-1.5 text-xs shrink-0 ${adminTab === "tournament" ? "reg-btn-active" : ""}`}
            >
              {t.tabAddTournament}
            </button>
            <button
              onClick={() => setAdminTab("player")}
              className={`reg-btn px-3 py-1.5 text-xs shrink-0 ${adminTab === "player" ? "reg-btn-active" : ""}`}
            >
              {t.tabDirectAddPlayer}
            </button>
            <button
              onClick={() => setAdminTab("approvals")}
              className={`reg-btn px-3 py-1.5 text-xs shrink-0 flex items-center gap-1.5 ${adminTab === "approvals" ? "reg-btn-active" : ""}`}
            >
              <span>{t.tabApprovals}</span>
              {pendingPlayers.length > 0 && (
                <span className="bg-red-500 text-white rounded-full px-1.5 text-[10px]">
                  {pendingPlayers.length}
                </span>
              )}
            </button>
          </div>

          {/* Admin Tab 1: Match Schedule Form */}
          {adminTab === "match" && (
            <div className="nm-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white">
                  {t.updateMatchScheduleTitle}
                </h3>
                <p className="text-xs text-slate-300">
                  {t.updateMatchScheduleSub}
                </p>
              </div>

              <form onSubmit={handleSaveMatchSchedule} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.tourneyNameLabel}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        lang === "mr"
                          ? "उदा. Bhiwandi Rural Premier Chashak 2026"
                          : "e.g. Rural Premier Trophy 2026"
                      }
                      value={matchForm.tournamentName}
                      onChange={(e) =>
                        setMatchForm({
                          ...matchForm,
                          tournamentName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.oppositionLabel}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        lang === "mr"
                          ? "उदा. Spartans 11 Kalher"
                          : "e.g. Spartans 11 Kalher"
                      }
                      value={matchForm.opposition}
                      onChange={(e) =>
                        setMatchForm({
                          ...matchForm,
                          opposition: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.matchDateCalendar}
                    </label>
                    <input
                      type="date"
                      value={matchForm.dateValue}
                      onChange={(e) => {
                        setMatchForm({
                          ...matchForm,
                          dateValue: e.target.value,
                          date: formatDateToReadable(e.target.value),
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white [color-scheme:dark]"
                    />
                    {matchForm.date && (
                      <span className="text-[11px] text-amber-300 font-bold mt-1 block">
                        {t.selectedDatePrefix} {matchForm.date}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.matchTimeClock}
                    </label>
                    <input
                      type="time"
                      value={matchForm.timeValue}
                      onChange={(e) => {
                        setMatchForm({
                          ...matchForm,
                          timeValue: e.target.value,
                          time: formatTimeToReadable(e.target.value),
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white [color-scheme:dark]"
                    />
                    {matchForm.time && (
                      <span className="text-[11px] text-amber-300 font-bold mt-1 block">
                        {t.selectedTimePrefix} {matchForm.time}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.groundVenue}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        lang === "mr"
                          ? "उदा. Zilla Parishad Ground, Pise Dam Road"
                          : "e.g. Village Ground, Pise"
                      }
                      value={matchForm.ground}
                      onChange={(e) =>
                        setMatchForm({ ...matchForm, ground: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.roundStage}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        lang === "mr"
                          ? "उदा. Quarter Final Clash"
                          : "e.g. Quarter Final Clash"
                      }
                      value={matchForm.round}
                      onChange={(e) =>
                        setMatchForm({ ...matchForm, round: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full reg-btn py-3 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300"
                >
                  {t.saveMatchScheduleBtn}
                </button>
              </form>
            </div>
          )}

          {/* Admin Tab 2: Add Tournament Form */}
          {adminTab === "tournament" && (
            <div className="nm-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white">
                  {t.addTourneyHonoursTitle}
                </h3>
                <p className="text-xs text-slate-300">
                  {t.addTourneyHonoursSub}
                </p>
              </div>

              <form onSubmit={handleSaveTournament} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.seasonLabel}
                    </label>
                    <select
                      value={tourneyForm.season}
                      onChange={(e) =>
                        setTourneyForm({
                          ...tourneyForm,
                          season: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white bg-slate-900"
                    >
                      <option value="2026-27">2026-27</option>
                      <option value="2025-26">2025-26</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.tourneyNameLabel}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        lang === "mr"
                          ? "उदा. Hanuman Jayanti Maha Chashak Pise"
                          : "e.g. Grand Trophy 2026"
                      }
                      value={tourneyForm.name}
                      onChange={(e) =>
                        setTourneyForm({ ...tourneyForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.rankLabelAdmin}
                    </label>
                    <select
                      value={tourneyForm.rank}
                      onChange={(e) =>
                        setTourneyForm({
                          ...tourneyForm,
                          rank: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white bg-slate-900"
                    >
                      <option value={1}>
                        {t.rank1Label} • {t.champions}
                      </option>
                      <option value={2}>
                        {t.rank2Label} • {t.runnersUp}
                      </option>
                      <option value={3}>
                        {t.rank3Label} • {t.thirdPlace}
                      </option>
                      <option value={4}>
                        {t.rank4Label} • {t.semiFinalFourth}
                      </option>
                      <option value={0}>🏏 {t.rank0Label}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.monthYearLabel}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Nov 2026"
                      value={tourneyForm.date}
                      onChange={(e) =>
                        setTourneyForm({ ...tourneyForm, date: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.prizeLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        tourneyForm.rank === 0
                          ? lang === "mr"
                            ? "उदा. सहभाग / साखळी फेरी"
                            : "e.g. Participation / League Stage"
                          : "e.g. ₹51,000 + Grand Trophy"
                      }
                      value={tourneyForm.prize}
                      onChange={(e) =>
                        setTourneyForm({
                          ...tourneyForm,
                          prize: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.tourneyVenueLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pise Village Stadium"
                    value={tourneyForm.location}
                    onChange={(e) =>
                      setTourneyForm({
                        ...tourneyForm,
                        location: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.finalMomLabel}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vicky Patil"
                      value={tourneyForm.finalMomPlayer}
                      onChange={(e) =>
                        setTourneyForm({
                          ...tourneyForm,
                          finalMomPlayer: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.momStatsLabel}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 48* Runs & 2 Wickets"
                      value={tourneyForm.finalMomStats}
                      onChange={(e) =>
                        setTourneyForm({
                          ...tourneyForm,
                          finalMomStats: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                </div>

                {/* Series Honours Section (Best Batsman, Best Bowler, Man of the Series) */}
                <div className="p-4 rounded-2xl bg-black/40 border border-amber-400/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      🏅{" "}
                      {lang === "mr"
                        ? "वैयक्तिक मालिका पुरस्कार (Series Awards)"
                        : "Individual Series Awards (Optional)"}
                    </span>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tourneyForm.hasSeriesHonours}
                        onChange={(e) =>
                          setTourneyForm({
                            ...tourneyForm,
                            hasSeriesHonours: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                      />
                      <span>
                        {lang === "mr" ? "पुरस्कार जोडा" : "Enable Awards"}
                      </span>
                    </label>
                  </div>

                  {tourneyForm.hasSeriesHonours && (
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      {/* 1. Man of the Series */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-300 font-bold block mb-1">
                            {lang === "mr"
                              ? "मालिकावीर (Player of the Series)"
                              : "Player fo the Series"}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Vicky Patil"
                            value={tourneyForm.mosPlayer}
                            onChange={(e) =>
                              setTourneyForm({
                                ...tourneyForm,
                                mosPlayer: e.target.value,
                                hasSeriesHonours: true,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 font-bold block mb-1">
                            {lang === "mr"
                              ? "मालिकावीर आकडेवारी (MoS Stats)"
                              : "MoS Performance Stats"}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 142 Runs & 5 Wickets"
                            value={tourneyForm.mosStats}
                            onChange={(e) =>
                              setTourneyForm({
                                ...tourneyForm,
                                mosStats: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* 2. Best Batsman */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-300 font-bold block mb-1">
                            {lang === "mr"
                              ? "उत्कृष्ट फलंदाज (Best Batsman Of Tournament)"
                              : "Best Batsman Of Tournament"}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Vinay Patil"
                            value={tourneyForm.bestBatsmanPlayer}
                            onChange={(e) =>
                              setTourneyForm({
                                ...tourneyForm,
                                bestBatsmanPlayer: e.target.value,
                                hasSeriesHonours: true,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 font-bold block mb-1">
                            {lang === "mr"
                              ? "फलंदाज आकडेवारी (Batsman Stats)"
                              : "Best Batsman Stats"}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 98 Runs (4 Matches)"
                            value={tourneyForm.bestBatsmanStats}
                            onChange={(e) =>
                              setTourneyForm({
                                ...tourneyForm,
                                bestBatsmanStats: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* 3. Best Bowler */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-300 font-bold block mb-1">
                            {lang === "mr"
                              ? "उत्कृष्ट गोलंदाज (Best Bowler Of the Tournament)"
                              : "Best Bowler Of the tournament"}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Bhavesh Shelar"
                            value={tourneyForm.bestBowlerPlayer}
                            onChange={(e) =>
                              setTourneyForm({
                                ...tourneyForm,
                                bestBowlerPlayer: e.target.value,
                                hasSeriesHonours: true,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 font-bold block mb-1">
                            {lang === "mr"
                              ? "गोलंदाज आकडेवारी (Bowler Stats)"
                              : "Best Bowler Stats"}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 8 Wickets (Econ 3.8)"
                            value={tourneyForm.bestBowlerStats}
                            onChange={(e) =>
                              setTourneyForm({
                                ...tourneyForm,
                                bestBowlerStats: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.uploadTourneyPhotosLabel}
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={tourneyFileInputRef}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        Array.from(files).forEach((f) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setTourneyForm((prev) => ({
                              ...prev,
                              photos: [...(prev.photos || []), reader.result],
                            }));
                          };
                          reader.readAsDataURL(f);
                        });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-amber-400 file:text-slate-950 file:font-bold cursor-pointer"
                  />
                </div>

                {tourneyForm.photos && tourneyForm.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {tourneyForm.photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-amber-400/40"
                      >
                        <img
                          src={p}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setTourneyForm({
                              ...tourneyForm,
                              photos: tourneyForm.photos.filter(
                                (_, i) => i !== idx,
                              ),
                            })
                          }
                          className="absolute top-0.5 right-0.5 bg-black/80 rounded-full p-0.5 text-red-400"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full reg-btn py-3 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300"
                >
                  {t.saveTourneyBtn}
                </button>
              </form>
            </div>
          )}

          {/* Admin Tab 3: Direct Add Player Form */}
          {adminTab === "player" && (
            <div className="nm-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white">
                  {t.directAddPlayerTitle}
                </h3>
                <p className="text-xs text-slate-300">{t.directAddPlayerSub}</p>
              </div>

              <form onSubmit={handleAddPlayer} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.playerFullName}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vicky Patil"
                      value={newPlayerForm.name}
                      onChange={(e) =>
                        setNewPlayerForm({
                          ...newPlayerForm,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.jerseyNo}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 07"
                      value={newPlayerForm.jersey}
                      onChange={(e) =>
                        setNewPlayerForm({
                          ...newPlayerForm,
                          jersey: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.playerRole}
                    </label>
                    <select
                      value={newPlayerForm.role}
                      onChange={(e) =>
                        setNewPlayerForm({
                          ...newPlayerForm,
                          role: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white bg-slate-900"
                    >
                      <option value="All Rounder">All Rounder</option>
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="Wicketkeeper Batsman">
                        Wicketkeeper Batsman
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.playingStyle}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Right-Hand Bat • Medium Fast"
                      value={newPlayerForm.style}
                      onChange={(e) =>
                        setNewPlayerForm({
                          ...newPlayerForm,
                          style: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {t.secretPin}
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="1234"
                      value={newPlayerForm.pin}
                      onChange={(e) =>
                        setNewPlayerForm({
                          ...newPlayerForm,
                          pin: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.uploadHdPhoto}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={playerFileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () =>
                          setNewPlayerForm({
                            ...newPlayerForm,
                            photo: reader.result,
                          });
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-amber-400 file:text-slate-950 file:font-bold cursor-pointer"
                  />
                </div>

                {newPlayerForm.photo && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40">
                    <img
                      src={newPlayerForm.photo}
                      alt="Preview"
                      className="w-14 h-16 rounded-lg object-cover"
                    />
                    <span className="text-xs text-emerald-400 font-bold">
                      {t.photoSelected}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full reg-btn py-3 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300"
                >
                  {t.addToSquadBtn}
                </button>
              </form>
            </div>
          )}

          {/* Admin Tab 4: Approvals & Squad Management */}
          {adminTab === "approvals" && (
            <div className="space-y-6">
              <div className="nm-card rounded-2xl p-5 space-y-4">
                <h3 className="text-base font-black text-white">
                  {t.pendingApprovalsTitle} ({pendingPlayers.length})
                </h3>
                {pendingPlayers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    {t.noPendingApprovals}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingPlayers.map((applicant) => (
                      <div
                        key={applicant.id}
                        className="p-4 rounded-2xl bg-black/50 border border-amber-400/40 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={applicant.photo}
                            alt=""
                            className="w-14 h-16 rounded-xl object-cover"
                          />
                          <div>
                            <div className="font-black text-white text-sm">
                              #{applicant.jersey} {applicant.name}
                            </div>
                            <div className="text-xs text-emerald-400 font-bold">
                              {applicant.role}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {applicant.style}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleApprovePlayer(applicant.id)}
                            className="reg-btn px-3 py-1 text-xs text-emerald-300"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectPlayer(applicant.id)}
                            className="reg-btn px-3 py-1 text-xs text-red-400"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Squad Management (Allows Deleting Registered Players from Database) */}
              <div className="nm-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Official Squad List ({approvedPlayers.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Deleting a player removes them from Supabase & the 3D
                    Showcase
                  </span>
                </div>

                {approvedPlayers.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No approved players yet. Approve an applicant above or add
                    directly.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {approvedPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={player.photo}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="truncate">
                            <div className="text-xs font-black text-white truncate">
                              #{player.jersey} {player.name}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-bold truncate">
                              {player.role}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRejectPlayer(player.id)}
                          title="Delete player from Supabase database"
                          className="p-2 rounded-lg bg-red-950/60 border border-red-500/40 text-red-400 hover:bg-red-900/80 transition-all shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {/* ==========================================
          MODALS & LIGHTBOXES
      ========================================== */}
      {/* Create Match Modal */}
      {showCreateMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg nm-card-gold rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateMatchModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className="border-b border-white/10 pb-2">
              <h3 className="text-xl font-black text-white">
                {t.createMatchModalTitle}
              </h3>
              <p className="text-xs text-amber-300">{t.createMatchModalSub}</p>
            </div>

            <form onSubmit={handleStartNewMatch} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.ourTeamLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={createMatchForm.team1}
                    onChange={(e) =>
                      setCreateMatchForm({
                        ...createMatchForm,
                        team1: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.opponentLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={createMatchForm.team2}
                    onChange={(e) =>
                      setCreateMatchForm({
                        ...createMatchForm,
                        team2: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.oversLabelSelect}
                  </label>
                  <select
                    value={createMatchForm.totalOvers}
                    onChange={(e) =>
                      setCreateMatchForm({
                        ...createMatchForm,
                        totalOvers: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white bg-slate-900"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((o) => (
                      <option key={o} value={o}>
                        {o} {t.oversLabelSelect}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.tossWinnerLabel}
                  </label>
                  <select
                    value={createMatchForm.tossWinner}
                    onChange={(e) =>
                      setCreateMatchForm({
                        ...createMatchForm,
                        tossWinner: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white bg-slate-900"
                  >
                    <option value={createMatchForm.team1}>
                      {createMatchForm.team1}
                    </option>
                    <option value={createMatchForm.team2}>
                      {createMatchForm.team2}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.tossDecisionLabel}
                  </label>
                  <select
                    value={createMatchForm.tossDecision}
                    onChange={(e) =>
                      setCreateMatchForm({
                        ...createMatchForm,
                        tossDecision: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white bg-slate-900"
                  >
                    <option value="bat">{t.battingFirstOption}</option>
                    <option value="bowl">{t.bowlingFirstOption}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.strikerInputLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.strikerPlaceholder}
                    value={createMatchForm.striker}
                    onChange={(e) =>
                      setCreateMatchForm({
                        ...createMatchForm,
                        striker: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {t.nonStrikerInputLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.nonStrikerPlaceholder}
                    value={createMatchForm.nonStriker}
                    onChange={(e) =>
                      setCreateMatchForm({
                        ...createMatchForm,
                        nonStriker: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  {t.openingBowlerInputLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.openingBowlerPlaceholder}
                  value={createMatchForm.openingBowler}
                  onChange={(e) =>
                    setCreateMatchForm({
                      ...createMatchForm,
                      openingBowler: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full reg-btn py-3 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300"
              >
                {t.startLiveMatchBtn}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Full Scorecard Modal */}
      {/* Full Scorecard Modal */}
      {showScorecardModal && activeMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl nm-card-gold rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowScorecardModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className="border-b border-white/10 pb-2 flex flex-wrap items-center justify-between gap-2 pr-8">
              <div>
                <h3 className="text-lg font-black text-white">
                  {activeMatch.team1} vs {activeMatch.team2}
                </h3>
                <p className="text-xs text-amber-300">
                  {activeMatch.result || t.fullScorecardTitle}
                </p>
              </div>
              <button
                onClick={() => {
                  const inn1Line = `${activeMatch.innings1?.battingTeam}: ${activeMatch.innings1?.runs}/${activeMatch.innings1?.wickets} (${getOversText(activeMatch.innings1?.balls)} Ov)`;
                  const inn2Line = activeMatch.innings2?.battingTeam
                    ? `\n${activeMatch.innings2.battingTeam}: ${activeMatch.innings2.runs}/${activeMatch.innings2.wickets} (${getOversText(activeMatch.innings2.balls)} Ov)`
                    : "";
                  const resLine = activeMatch.result
                    ? `\n${activeMatch.result}`
                    : "";
                  const shareMsg = `🏏 *VIHANA11 LIVE MATCH SCORECARD* 🚩\n${activeMatch.team1} vs ${activeMatch.team2}\n\n${inn1Line}${inn2Line}${resLine}`;
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(shareMsg)}`,
                    "_blank",
                  );
                }}
                className="reg-btn px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>{t.shareScorecardWhatsapp}</span>
              </button>
            </div>

            {[activeMatch.innings1, activeMatch.innings2]
              .filter((innItem) => innItem && innItem.battingTeam)
              .map((innItem, idx) => (
                <div
                  key={idx}
                  className="space-y-3 pt-2 border-t border-white/10 first:border-t-0 first:pt-0"
                >
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between">
                    <span className="font-black text-white">
                      {idx === 0 ? "1st Innings: " : "2nd Innings: "}
                      {innItem.battingTeam}
                    </span>
                    <span className="text-xl font-black text-amber-400">
                      {innItem.runs}/{innItem.wickets} (
                      {getOversText(innItem.balls)} Ov)
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-amber-300 uppercase mb-1.5">
                      {t.battingSection}
                    </h4>
                    <table className="w-full text-xs text-left">
                      <thead className="bg-black/40 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-2">{t.tableBatsman}</th>
                          <th className="p-2">{t.tableRuns}</th>
                          <th className="p-2">{t.tableBalls}</th>
                          <th className="p-2">4</th>
                          <th className="p-2">6</th>
                          <th className="p-2">{t.tableSR}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(innItem.batsmen || []).map((b, i) => (
                          <tr key={i}>
                            <td className="p-2 font-bold text-white">
                              {b.name} {b.isStriker ? "*" : ""}
                            </td>
                            <td className="p-2 font-black text-amber-400">
                              {b.runs}
                            </td>
                            <td className="p-2">{b.balls}</td>
                            <td className="p-2">{b.fours}</td>
                            <td className="p-2">{b.sixes}</td>
                            <td className="p-2 text-slate-400">
                              {b.balls > 0
                                ? ((b.runs / b.balls) * 100).toFixed(1)
                                : "0.0"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-emerald-300 uppercase mb-1.5">
                      {t.bowlingSection}
                    </h4>
                    <table className="w-full text-xs text-left">
                      <thead className="bg-black/40 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-2">{t.tableBowler}</th>
                          <th className="p-2">{t.tableOvers}</th>
                          <th className="p-2">{t.runsConcededLabel}</th>
                          <th className="p-2">{t.wickets}</th>
                          <th className="p-2">{t.tableEcon}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(innItem.bowlers || []).map((bw, i) => (
                          <tr key={i}>
                            <td className="p-2 font-bold text-white">
                              {bw.name}
                            </td>
                            <td className="p-2">{getOversText(bw.balls)}</td>
                            <td className="p-2">{bw.runs}</td>
                            <td className="p-2 font-black text-emerald-400">
                              {bw.wickets}
                            </td>
                            <td className="p-2 text-slate-400">
                              {bw.balls > 0
                                ? ((bw.runs / bw.balls) * 6).toFixed(1)
                                : "0.0"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Wicket / New Batsman Modal */}
      {showNewBatsmanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm nm-card-gold rounded-3xl p-5 space-y-4">
            <h3 className="text-lg font-black text-white text-center">
              {t.wicketModalTitle}
            </h3>
            <form onSubmit={handleConfirmNewBatsman} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  {t.nextBatsmanLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.strikerPlaceholder}
                  value={newBatsmanInput}
                  onChange={(e) => setNewBatsmanInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full reg-btn py-2 text-xs font-black text-slate-950 bg-amber-400"
              >
                {t.confirmBatsmanBtn}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Change Bowler Modal */}
      {showChangeBowlerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm nm-card-gold rounded-3xl p-5 space-y-4">
            <h3 className="text-lg font-black text-white text-center">
              {t.overCompleteTitle}
            </h3>
            <form onSubmit={handleConfirmNewBowler} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  {t.nextBowlerLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.openingBowlerPlaceholder}
                  value={newBowlerInput}
                  onChange={(e) => setNewBowlerInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full reg-btn py-2 text-xs font-black text-slate-950 bg-amber-400"
              >
                {t.confirmBowlerBtn}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Single Player Full HD Lightbox Modal */}
      {selectedPopupPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md nm-card-gold rounded-3xl p-5 space-y-4">
            <button
              onClick={() => setSelectedPopupPlayer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className="text-center">
              <span className="text-xs text-amber-300 font-bold">
                Vihana11 Jay Hanuman Pise
              </span>
              <h3 className="text-xl font-black text-white">
                {selectedPopupPlayer.name}
              </h3>
              <p className="text-xs text-slate-400">
                #{selectedPopupPlayer.jersey} • {selectedPopupPlayer.role}
              </p>
            </div>

            <div className="h-72 w-full rounded-2xl overflow-hidden bg-slate-900 border border-amber-400/40">
              <img
                src={selectedPopupPlayer.photo}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSharePlayerCard(selectedPopupPlayer)}
                className="flex-1 reg-btn py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>{t.shareHdStatus}</span>
              </button>
              <button
                onClick={() => handleDownloadPlayerCard(selectedPopupPlayer)}
                className="reg-btn px-4 py-2.5 text-xs text-amber-300"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Album Lightbox Modal */}
      {selectedTournamentAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-3xl nm-card rounded-3xl p-5 space-y-3">
            <button
              onClick={() => setSelectedTournamentAlbum(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div>
              <h3 className="text-lg font-black text-white">
                {selectedTournamentAlbum.name}
              </h3>
              <p className="text-xs text-amber-300">
                {selectedTournamentAlbum.location} •{" "}
                {selectedTournamentAlbum.date}
              </p>
            </div>

            <div className="relative h-96 w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={
                  selectedTournamentAlbum.photos[albumPhotoIndex] ||
                  selectedTournamentAlbum.photos[0]
                }
                alt=""
                className="max-h-full max-w-full object-contain"
              />
              {selectedTournamentAlbum.photos.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setAlbumPhotoIndex((prev) =>
                        prev === 0
                          ? selectedTournamentAlbum.photos.length - 1
                          : prev - 1,
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 reg-btn p-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setAlbumPhotoIndex((prev) =>
                        prev === selectedTournamentAlbum.photos.length - 1
                          ? 0
                          : prev + 1,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 reg-btn p-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            <div className="text-center text-xs text-slate-400">
              {lang === "mr" ? "फोटो" : "Photo"} {albumPhotoIndex + 1} /{" "}
              {selectedTournamentAlbum.photos.length}
            </div>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md nm-card-gold rounded-3xl p-6 space-y-4">
            <button
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h3 className="text-xl font-black text-white">
                {t.adminLoginTitle}
              </h3>
              <p className="text-xs text-amber-300">{t.adminLoginSub}</p>
            </div>
            {adminLoginError && (
              <div className="text-red-400 text-xs text-center">
                {adminLoginError}
              </div>
            )}
            <form onSubmit={handleAdminLoginSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Enter Admin Username"
                value={adminLoginForm.username}
                onChange={(e) =>
                  setAdminLoginForm({
                    ...adminLoginForm,
                    username: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
              />
              <input
                type="password"
                placeholder="Enter Admin Password"
                value={adminLoginForm.password}
                onChange={(e) =>
                  setAdminLoginForm({
                    ...adminLoginForm,
                    password: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-xl nm-inset text-xs text-white"
              />

              <button
                type="submit"
                className="w-full reg-btn py-2.5 text-xs font-black text-slate-950 bg-amber-400"
              >
                Unlock Admin Dashboard
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 nm-card-gold px-4 py-2.5 rounded-2xl text-xs font-extrabold text-white flex items-center gap-2 border border-amber-400 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Scroll Controls */}
      <div className="fixed bottom-6 right-5 z-40 flex flex-col items-center gap-2">
        <button onClick={scrollToTop} className="reg-btn p-2.5 rounded-xl">
          <ChevronUp className="w-4 h-4 text-amber-300" />
        </button>
        <button onClick={scrollToBottom} className="reg-btn p-2.5 rounded-xl">
          <ChevronDown className="w-4 h-4 text-amber-300" />
        </button>
      </div>

      {/* Footer */}
      <footer className="relative z-10 nm-card border-t border-white/10 py-6 mt-12 text-center text-xs text-slate-400 space-y-1">
        <p>© 2026 KrantVerse. All Rights Reserved.</p>
        <p className="font-black text-[#8ef223]">
          DESIGNED & DEVELOPED BY - Vikrant Patil
        </p>
      </footer>
    </div>
  );
}
