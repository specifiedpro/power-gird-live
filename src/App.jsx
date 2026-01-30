import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, Users, Map, ArrowRight, Info, CheckCircle, Factory, 
  Flame, Trash2, AlertTriangle, Gavel, Home, DollarSign, 
  Menu, X, Layers, BookOpen, Crown, Smartphone, Monitor, Lock, Beaker
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc,
  runTransaction
} from 'firebase/firestore';

// --- FIREBASE SETUP ---
// We check if the environment provides a config (for the preview), otherwise use placeholders.
// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDCe3JHlj8Eyi1kuT4vr7jTu2vdwEmqEkQ",
  authDomain: "power-grid-game-room.firebaseapp.com",
  projectId: "power-grid-game-room",
  storageBucket: "power-grid-game-room.firebasestorage.app",
  messagingSenderId: "326593005137",
  appId: "1:326593005137:web:bec2dcc420f60b4c8a1a70",
  measurementId: "G-L6ZPT415RL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Use the provided app ID from environment or fallback to default
const appId = typeof __app_id !== 'undefined' ? __app_id : 'power-grid-live-v1';

// --- CONSTANTS & DATA ---
const PHASE_TITLES = ["Determine Order", "Auction Plants", "Buy Resources", "Build Cities", "Bureaucracy"];

const REFILL_RATES = {
  2: { step1: [3, 2, 1, 1], step2: [4, 2, 2, 1], step3: [3, 4, 3, 1] },
  3: { step1: [4, 2, 1, 1], step2: [5, 3, 2, 1], step3: [3, 4, 3, 1] },
  4: { step1: [5, 3, 2, 1], step2: [6, 4, 3, 2], step3: [4, 5, 4, 2] },
  5: { step1: [5, 4, 3, 2], step2: [7, 5, 3, 3], step3: [5, 6, 5, 2] },
  6: { step1: [7, 5, 3, 2], step2: [9, 6, 5, 3], step3: [6, 7, 6, 3] }
};

const STEP_2_TRIGGER = { 2: 7, 3: 7, 4: 7, 5: 7, 6: 6 };
const GAME_END_TRIGGER = { 2: 18, 3: 17, 4: 17, 5: 15, 6: 14 };

const PHASE_RULES = [
  `• The player with the MOST cities is 1st.\n• Tie-breaker: Player with the HIGHEST numbered power plant.`,
  `• Played in Turn Order.\n• Each player may buy max 1 plant.\n• Min Bid = Plant Number.`,
  `• Played in REVERSE Order (Last player first).\n• Storage Limit: 2x production requirement.`,
  `• Played in REVERSE Order.\n• Step 1: Max 1/city ($10).\n• Step 2: Max 2 ($15).\n• Step 3: Max 3 ($20).`,
  `• Earn Cash based on powered cities.\n• Refill Resources.\n• Update Market (Remove highest in Step 1/2, lowest in Step 3).`
];

const COLORS = ["bg-purple-600", "bg-yellow-600", "bg-red-600", "bg-blue-600", "bg-green-600", "bg-orange-600"];
const COLOR_NAMES = ["Purple", "Yellow", "Red", "Blue", "Green", "Orange"];

// --- SUB-COMPONENTS ---

function LobbyScreen({ onCreate, onJoin, joinError, onTest }) {
  const [mode, setMode] = useState('menu'); // menu, join, create
  const [inputGameId, setInputGameId] = useState('');
  
  // Create State
  const [numPlayers, setNumPlayers] = useState(4);
  const [map, setMap] = useState('USA');
  const [names, setNames] = useState(['','','','','','']);

  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 space-y-6">
        <h1 className="text-4xl font-bold text-green-500 flex items-center gap-2"><Zap /> Power Grid Live</h1>
        <div className="grid gap-4 w-full max-w-sm">
          <button onClick={() => setMode('create')} className="bg-green-600 hover:bg-green-500 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/50">
            <Monitor /> Host New Game
          </button>
          <button onClick={() => setMode('join')} className="bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
            <Smartphone /> Join Game
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 space-y-6">
        <h2 className="text-2xl font-bold text-white">Join Game</h2>
        <input 
          value={inputGameId}
          onChange={(e) => setInputGameId(e.target.value.toUpperCase())}
          placeholder="ENTER 4-LETTER CODE"
          className="bg-slate-800 text-white text-center text-2xl tracking-widest p-4 rounded-xl w-full max-w-xs uppercase border-2 border-slate-700 focus:border-green-500 outline-none"
        />
        {joinError && <p className="text-red-400">{joinError}</p>}
        <div className="flex gap-4 w-full max-w-xs">
          <button onClick={() => setMode('menu')} className="flex-1 bg-slate-800 text-slate-400 p-3 rounded-lg">Back</button>
          <button 
            onClick={() => {
              if (inputGameId === '!@#$') {
                onTest();
              } else {
                onJoin(inputGameId);
              }
            }} 
            className="flex-1 bg-green-600 text-white p-3 rounded-lg font-bold"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  return ( // Create Mode
    <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-6">
        <h2 className="text-2xl font-bold text-white">Game Setup</h2>
        
        <div>
          <label className="text-slate-400 text-sm">Players</label>
          <div className="flex gap-2 mt-2">
            {[2,3,4,5,6].map(n => (
              <button key={n} onClick={() => setNumPlayers(n)} className={`flex-1 py-2 rounded font-bold ${numPlayers === n ? 'bg-green-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>{n}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-slate-400 text-sm">Map</label>
          <div className="flex gap-2 mt-2">
            {['USA', 'Germany'].map(m => (
              <button key={m} onClick={() => setMap(m)} className={`flex-1 py-2 rounded font-bold ${map === m ? 'bg-green-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>{m}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-slate-400 text-sm">Names (Optional)</label>
          {Array.from({length: numPlayers}).map((_, i) => (
             <div key={i} className="flex items-center gap-2">
               <div className={`w-3 h-3 rounded-full ${COLORS[i]}`} />
               <input 
                 placeholder={`Player ${i+1}`}
                 value={names[i]}
                 onChange={e => {
                   const newN = [...names];
                   newN[i] = e.target.value;
                   setNames(newN);
                 }}
                 className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1 text-white"
               />
             </div>
          ))}
        </div>

        <button onClick={() => onCreate(numPlayers, map, names)} className="w-full bg-green-500 py-3 rounded-xl text-slate-900 font-bold text-lg hover:bg-green-400">
          Start Game
        </button>
      </div>
    </div>
  );
}

function AdminPanel({ gameState, updateGameState, nextPhase, calculateTurnOrder, applyNewOrder }) {
  const activeOrder = (gameState.phase === 2 || gameState.phase === 3) 
    ? [...gameState.turnOrder].reverse() 
    : gameState.turnOrder;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl overflow-hidden shadow-2xl">
      <div className="bg-slate-950 p-4 border-b border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-green-400 flex items-center gap-2">
          <Monitor size={18} /> Host Controls
        </h3>
        <button 
          onClick={nextPhase}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
        >
          Next Phase <ArrowRight size={16} />
        </button>
      </div>

      <div className="p-4 space-y-6">
        
        {/* PHASE SPECIFIC INPUTS */}
        {gameState.phase === 0 && (
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-slate-200">Re-Order Players</h4>
              <button onClick={applyNewOrder} className="text-xs bg-blue-600 px-2 py-1 rounded text-white">Auto Sort</button>
            </div>
            <p className="text-xs text-slate-400 mb-2">Ensure "Cities" & "Highest Plant" are correct below before sorting.</p>
          </div>
        )}

        {gameState.phase === 3 && (
          <div className="bg-slate-700/50 p-4 rounded-lg flex justify-between items-center">
             <div className="text-sm">
                <strong>Step 2 Trigger:</strong> {STEP_2_TRIGGER[gameState.numPlayers]} Cities
             </div>
             {!gameState.step2Triggered && (
               <button 
                 onClick={() => updateGameState({ step: 2, step2Triggered: true })}
                 className="bg-yellow-600 text-white text-xs px-3 py-2 rounded font-bold"
               >
                 Trigger Step 2
               </button>
             )}
          </div>
        )}

        {/* PLAYER DATA TABLE (Efficient Input) */}
        <div className="space-y-2">
          <div className="flex text-xs text-slate-500 uppercase font-bold px-2">
            <span className="w-8">#</span>
            <span className="flex-1">Name</span>
            <span className="w-16 text-center">Cities</span>
            <span className="w-16 text-center">Plant #</span>
          </div>
          {gameState.players.map((p, idx) => (
             <div key={idx} className="flex items-center bg-slate-700 p-2 rounded gap-2">
               <span className="w-8 font-mono text-slate-400">P{idx+1}</span>
               <div className={`w-3 h-3 rounded-full shrink-0 ${p.color}`} />
               <span className="flex-1 font-bold truncate">{p.name}</span>
               
               {/* City Input */}
               <input 
                 type="number"
                 className="w-16 bg-slate-900 border border-slate-600 rounded text-center text-white font-mono"
                 value={p.cities}
                 onChange={(e) => {
                   const newPlayers = [...gameState.players];
                   newPlayers[idx].cities = parseInt(e.target.value) || 0;
                   updateGameState({ players: newPlayers });
                 }}
               />

               {/* Plant Input (Only need highest for sorting) */}
               <input 
                 type="number"
                 className="w-16 bg-slate-900 border border-slate-600 rounded text-center text-white font-mono"
                 placeholder="Max"
                 value={p.highestPlant}
                 onChange={(e) => {
                    const newPlayers = [...gameState.players];
                    newPlayers[idx].highestPlant = parseInt(e.target.value) || 0;
                    updateGameState({ players: newPlayers });
                  }}
               />
             </div>
          ))}
        </div>

        {/* STEP 3 TRIGGER (Global check if step < 3) */}
        {gameState.step < 3 && (
          <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg flex justify-between items-center">
            <div className="text-sm text-red-200">
              <span className="font-bold block flex items-center gap-2">
                <Layers size={16}/> Step 3 Card Drawn?
              </span>
              <span className="text-xs opacity-75">Click this if the "Step 3" card appears.</span>
            </div>
            <button
              onClick={() => updateGameState({ step: 3, step3Drawn: true })}
              className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-2 rounded font-bold shadow-lg shadow-red-900/50"
            >
              Activate Step 3
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerView({ gameState, myPlayerIndex, setMyPlayerIndex, isHost, claimSeat, claimError, userId, isTestMode }) {
  // 1. Seat Selection Screen (If not joined yet)
  if (myPlayerIndex === null && (!isHost || isTestMode)) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
        <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
          <Users size={20} className="text-green-400" /> Select Your Seat
        </h3>
        
        {claimError && (
          <div className="mb-4 bg-red-900/50 text-red-300 p-3 rounded-lg text-sm border border-red-500/30 flex items-center gap-2">
            <AlertTriangle size={16}/> {claimError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {gameState.players.map((p, i) => {
            const isTaken = !!p.userId;
            const isMe = p.userId === userId;

            return (
              <button 
                key={i}
                disabled={isTaken && !isMe}
                onClick={() => claimSeat(i)}
                className={`
                  p-4 rounded-lg flex flex-col items-center gap-2 border transition-all
                  ${isMe 
                    ? 'bg-green-600 border-green-400 ring-2 ring-green-400 shadow-lg scale-105' 
                    : isTaken 
                      ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed grayscale'
                      : 'bg-slate-700 hover:bg-slate-600 border-slate-600 hover:border-slate-500'
                  }
                `}
              >
                <div className={`w-8 h-8 rounded-full ${p.color} shadow-sm`} />
                <span className="font-bold text-white text-sm">{p.name}</span>
                {isTaken && !isMe && (
                  <span className="text-[10px] uppercase bg-slate-900 text-slate-500 px-2 py-0.5 rounded flex items-center gap-1">
                    <Lock size={8} /> Taken
                  </span>
                )}
                {isMe && (
                  <span className="text-[10px] uppercase bg-white text-green-700 px-2 py-0.5 rounded font-bold">
                    You
                  </span>
                )}
                {!isTaken && (
                  <span className="text-[10px] uppercase bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                    Open
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const viewIndex = (!isHost || (isTestMode && myPlayerIndex !== null)) 
    ? (myPlayerIndex ?? gameState.turnOrder[0])
    : gameState.turnOrder[0];

  const activeOrder = (gameState.phase === 2 || gameState.phase === 3) 
    ? [...gameState.turnOrder].reverse() 
    : gameState.turnOrder;

  const myRank = activeOrder.indexOf(viewIndex);

  const getStrategy = () => {
    const isFirst = myRank === 0;
    const isLast = myRank === gameState.numPlayers - 1;
    
    switch(gameState.phase) {
      case 0: return "Check your Cities & Highest Plant. The Admin will re-order everyone shortly.";
      case 1: 
        if (isFirst) return "You start the first auction! Pick a plant you want, or Pass to save money. Remember: Passing puts you out for the whole phase.";
        return "Wait for your turn to bid. Don't overpay if you need money for resources!";
      case 2: 
        if (isFirst) return "You buy resources FIRST! Prices are lowest for you. Stock up!";
        if (isLast) return "You buy resources LAST. Prices will be high. Hope there's something left!";
        return "Check your plant storage capacity (2x input).";
      case 3: 
        if (isFirst) return "You build FIRST! Grab the cheap spots in the map before others.";
        if (isLast) return "You build LAST. You might get blocked. Watch out for the Step 2 trigger!";
        return `Cost is $${gameState.step === 1 ? 10 : gameState.step === 2 ? 15 : 20} + connection fees.`;
      case 4: 
        return "Get paid! Check the payment table below. Admin will refill the market.";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* PERSONAL DASHBOARD */}
      {(!isHost || (isTestMode && myPlayerIndex !== null)) && myPlayerIndex !== null && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl relative overflow-hidden">
           <div className={`absolute top-0 left-0 w-2 h-full ${gameState.players[myPlayerIndex].color}`} />
           
           <div className="flex justify-between items-start mb-4 pl-4">
             <div>
               <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                 {gameState.players[myPlayerIndex].name}
                 {activeOrder[0] === myPlayerIndex && <Crown size={20} className="text-yellow-400" />}
               </h2>
               <div className="text-slate-400 text-sm">
                 Cities: <span className="text-white font-bold">{gameState.players[myPlayerIndex].cities}</span>
               </div>
             </div>
           </div>

           <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10 ml-4">
             <div className="text-xs uppercase text-blue-400 font-bold mb-1 flex items-center gap-1">
               <Info size={12}/> Strategic Advice
             </div>
             <p className="text-slate-200 text-sm leading-relaxed">
               {getStrategy()}
             </p>
           </div>
        </div>
      )}

      {/* TURN ORDER VISUALIZER */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
        <h4 className="text-xs uppercase text-slate-500 font-bold mb-3">
          {gameState.phase === 2 || gameState.phase === 3 ? "Acting Order (Reverse)" : "Acting Order (Standard)"}
        </h4>
        <div className="flex flex-col gap-2">
          {activeOrder.map((pIdx, i) => (
            <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${pIdx === myPlayerIndex ? 'bg-white/10 border border-white/20' : 'bg-slate-700/30'}`}>
              <span className="font-mono text-slate-500 w-4">{i+1}</span>
              <div className={`w-3 h-3 rounded-full ${gameState.players[pIdx].color}`} />
              <span className={`text-sm font-bold ${pIdx === myPlayerIndex ? 'text-white' : 'text-slate-300'}`}>
                {gameState.players[pIdx].name}
              </span>
              {i === 0 && <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Active</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BureaucracyInfo({ gameState }) {
  const stepKey = `step${gameState.step}`;
  const rates = REFILL_RATES[gameState.numPlayers][stepKey];

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
      <h3 className="font-bold text-white flex items-center gap-2 mb-4">
        <Factory size={18} className="text-green-400"/> Bureaucracy Refill
      </h3>
      <div className="grid grid-cols-4 gap-2 text-center">
        {['Coal', 'Oil', 'Garbage', 'Uranium'].map((r, i) => (
          <div key={r} className="bg-slate-900 p-2 rounded border border-slate-700">
            <div className={`text-[10px] uppercase font-bold mb-1 ${
              r === 'Coal' ? 'text-amber-600' : 
              r === 'Oil' ? 'text-slate-500' : 
              r === 'Garbage' ? 'text-yellow-500' : 'text-red-500'
            }`}>{r}</div>
            <div className="text-xl font-bold text-white">{rates[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuildCosts({ step }) {
  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
      <h3 className="font-bold text-white flex items-center gap-2 mb-4">
        <Home size={18} className="text-green-400"/> Build Costs
      </h3>
      <div className="grid grid-cols-3 gap-2">
         {[1,2,3].map(s => (
           <div key={s} className={`p-2 rounded border text-center ${step >= s ? 'bg-green-900/20 border-green-500/50' : 'bg-slate-700/30 border-slate-600 opacity-50'}`}>
             <div className="text-xs text-slate-400">Step {s}</div>
             <div className="font-bold text-lg">${s === 1 ? 10 : s === 2 ? 15 : 20}</div>
           </div>
         ))}
      </div>
    </div>
  );
}

function RuleButton({ phase }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
       {open && (
         <div className="bg-slate-800 border border-slate-600 shadow-2xl p-4 rounded-xl mb-4 max-w-xs animate-in slide-in-from-bottom-2">
           <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
             <h4 className="font-bold text-green-400">{PHASE_TITLES[phase]}</h4>
             <button onClick={() => setOpen(false)}><X size={16} className="text-slate-400"/></button>
           </div>
           <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{PHASE_RULES[phase]}</p>
         </div>
       )}
       <button onClick={() => setOpen(!open)} className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-full shadow-lg border border-slate-500 transition-all">
         <BookOpen size={24} className="text-green-400" />
       </button>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function PowerGridLive() {
  const [user, setUser] = useState(null);
  const [gameId, setGameId] = useState("");
  const [gameState, setGameState] = useState(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(null);
  const [joinError, setJoinError] = useState("");
  const [claimError, setClaimError] = useState("");
  
  // Test Mode State
  const [isTestMode, setIsTestMode] = useState(false);

  // HYBRID ROLE: In Test Mode, you are Host AND Player
  const isHost = (gameState?.hostId === user?.uid) || isTestMode;
  
  // Auth Init
  useEffect(() => {
    const initAuth = async () => {
      // In Vite env, these vars are undefined, so it defaults to anonymous
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Game Sync Listener
  useEffect(() => {
    if (!user || !gameId || isTestMode) return; // Skip sync if testing

    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', `game_${gameId}`);
    
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameState(data);
        setJoinError("");
      } else {
        setJoinError("Game ID not found.");
      }
    }, (error) => {
      console.error("Sync error:", error);
      setJoinError("Connection error.");
    });

    return () => unsubscribe();
  }, [user, gameId, isTestMode]);

  // Auto-detect if I am a player
  useEffect(() => {
    if (gameState && user) {
      const idx = gameState.players.findIndex(p => p.userId === user.uid);
      if (idx !== -1) {
        setMyPlayerIndex(idx);
      }
    }
  }, [gameState, user]);

  // --- ACTIONS (Host Only) ---

  const createGame = async (playerCount, mapType, playerNames) => {
    if (!user) return;
    const newGameId = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const players = playerNames.slice(0, playerCount).map((name, i) => ({
      name: name || `Player ${i + 1}`,
      cities: 0,
      highestPlant: 0,
      color: COLORS[i],
      colorName: COLOR_NAMES[i],
      userId: null // New field for seat claiming
    }));

    // Randomize initial order
    const initialOrder = players.map((_, i) => i).sort(() => Math.random() - 0.5);

    const initialState = {
      createdAt: new Date().toISOString(),
      hostId: user.uid,
      mapType,
      numPlayers: playerCount,
      players,
      turnOrder: initialOrder,
      round: 1,
      phase: 0,
      step: 1,
      step2Triggered: false,
      step3Drawn: false,
      activePlayerIdx: initialOrder[0], // Used for phase logic
    };

    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', `game_${newGameId}`);
    await setDoc(gameRef, initialState);
    
    setGameId(newGameId);
  };

  const updateGameState = async (updates) => {
    if (isTestMode) {
        setGameState(prev => ({ ...prev, ...updates }));
        return;
    }
    if (!user || !gameId) return;
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', `game_${gameId}`);
    await updateDoc(gameRef, updates);
  };

  const nextPhase = () => {
    if (!gameState) return;
    let nextP = gameState.phase + 1;
    let nextR = gameState.round;
    
    if (nextP > 4) {
      nextP = 0;
      nextR += 1;
    }
    
    updateGameState({
      phase: nextP,
      round: nextR
    });
  };

  const startTestGame = () => {
    setIsTestMode(true);
    setGameId("TEST-1234");
    // Create a mock game state
    setGameState({
      createdAt: new Date().toISOString(),
      hostId: "bot-host", // Ensure we are NOT host (unless overriden by isHost logic)
      mapType: 'USA',
      numPlayers: 4,
      players: [
        { name: 'Alice (Bot)', cities: 4, highestPlant: 15, color: COLORS[0], colorName: COLOR_NAMES[0], userId: 'bot-1' },
        { name: 'Bob (Bot)', cities: 3, highestPlant: 10, color: COLORS[1], colorName: COLOR_NAMES[1], userId: 'bot-2' },
        { name: 'Charlie (Open)', cities: 2, highestPlant: 8, color: COLORS[2], colorName: COLOR_NAMES[2], userId: null },
        { name: 'Dave (Open)', cities: 2, highestPlant: 5, color: COLORS[3], colorName: COLOR_NAMES[3], userId: null },
      ],
      turnOrder: [0, 1, 2, 3],
      round: 2,
      phase: 1, // Auction Phase
      step: 1,
      step2Triggered: false,
      step3Drawn: false,
      activePlayerIdx: 0,
    });
  };

  // --- PLAYER ACTIONS ---

  const claimSeat = async (index) => {
    if (!user) return;
    setClaimError("");

    // Test Mode Local Claim
    if (isTestMode) {
      const newPlayers = [...gameState.players];
      if (newPlayers[index].userId) {
        setClaimError("Seat already taken (Test Mode).");
        return;
      }
      // Clear previous seat if any (simple toggle for test)
      newPlayers.forEach(p => { if (p.userId === user.uid) p.userId = null; });
      newPlayers[index].userId = user.uid;
      
      setGameState(prev => ({ ...prev, players: newPlayers }));
      // Force update myPlayerIndex locally since useEffect might lag in test mode
      setMyPlayerIndex(index);
      return;
    }

    // Real Firebase Claim
    if (!gameId) return;
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', `game_${gameId}`);

    try {
      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) throw "Game does not exist!";
        
        const data = gameDoc.data();
        const players = data.players;

        // Check if already taken
        if (players[index].userId) {
          throw "Seat already taken by another player.";
        }

        // Check if I already have a seat? (Optional, enforced by UI mostly)
        const myExistingSeat = players.findIndex(p => p.userId === user.uid);
        if (myExistingSeat !== -1 && myExistingSeat !== index) {
          throw `You already claimed ${players[myExistingSeat].name}!`;
        }

        players[index].userId = user.uid;
        transaction.update(gameRef, { players });
      });
    } catch (e) {
      console.error("Claim failed:", e);
      setClaimError(typeof e === 'string' ? e : "Failed to claim seat. Try again.");
    }
  };

  // --- LOGIC HELPERS ---

  const calculateTurnOrder = () => {
    if (!gameState) return [];
    const indices = gameState.players.map((_, i) => i);
    
    return indices.sort((a, b) => {
      const pA = gameState.players[a];
      const pB = gameState.players[b];
      if (pA.cities !== pB.cities) return pB.cities - pA.cities; // Descending cities
      return pB.highestPlant - pA.highestPlant; // Descending plant #
    });
  };

  const applyNewOrder = () => {
    const newOrder = calculateTurnOrder();
    updateGameState({ turnOrder: newOrder });
  };

  // --- RENDERERS ---

  if (!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Connecting...</div>;

  // 1. LOBBY / SETUP
  if (!gameState) {
    return <LobbyScreen onCreate={createGame} onJoin={(id) => setGameId(id)} joinError={joinError} onTest={startTestGame} />;
  }

  // 2. MAIN GAME INTERFACE
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24">
      {/* HEADER */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-20 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-mono">
                {isTestMode ? <span className="text-yellow-400 font-bold tracking-widest">TEST MODE</span> : <span>GAME ID: <span className="text-white font-bold tracking-widest">{gameId}</span></span>}
            </div>
            <div className="font-bold flex items-center gap-2">
              Round {gameState.round} 
              <span className="text-slate-600">|</span>
              <span className={gameState.step === 1 ? 'text-green-400' : gameState.step === 2 ? 'text-yellow-400' : 'text-red-400'}>
                Step {gameState.step}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
             {isHost ? (
               <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded border border-green-500/50 flex items-center gap-1">
                 <Monitor size={12} /> Admin {isTestMode && "+ Player"}
               </span>
             ) : (
               <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/50 flex items-center gap-1">
                 <Smartphone size={12} /> Player
               </span>
             )}
          </div>
        </div>
        
        {/* Phase Progress Bar */}
        <div className="flex overflow-x-auto bg-slate-900/50 no-scrollbar">
          {PHASE_TITLES.map((t, i) => (
             <div key={i} className={`flex-none px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap ${gameState.phase === i ? 'border-green-500 text-green-400 bg-green-500/5' : 'border-transparent text-slate-600'}`}>
               {i+1}. {t}
             </div>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* ADMIN CONTROLS (Visible to Host OR Test Mode) */}
        {isHost && (
          <AdminPanel 
            gameState={gameState} 
            updateGameState={updateGameState} 
            nextPhase={nextPhase} 
            calculateTurnOrder={calculateTurnOrder} 
            applyNewOrder={applyNewOrder}
          />
        )}

        {/* PLAYER VIEW / DASHBOARD */}
        <PlayerView 
          gameState={gameState} 
          myPlayerIndex={myPlayerIndex} 
          setMyPlayerIndex={setMyPlayerIndex}
          isHost={isHost}
          isTestMode={isTestMode}
          claimSeat={claimSeat}
          claimError={claimError}
          userId={user.uid}
        />

        {/* SHARED INFO (Refills/Costs) */}
        {gameState.phase === 4 && <BureaucracyInfo gameState={gameState} />}
        {gameState.phase === 3 && <BuildCosts step={gameState.step} />}

      </main>
      
      {/* FLOATING RULE BUTTON */}
      <RuleButton phase={gameState.phase} />
    </div>
  );
}