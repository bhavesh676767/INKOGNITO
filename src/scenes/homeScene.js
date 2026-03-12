import { useEffect, useState } from 'preact/hooks';
import { ChalkNoiseOverlay } from '../components/ChalkNoiseOverlay.jsx';
import { LogoJitter } from '../components/LogoJitter.jsx';
import { NameInput } from '../components/NameInput.jsx';
import { CharacterSelector } from '../components/CharacterSelector.jsx';
import { ChalkButton } from '../components/ChalkButton.jsx';
import { HowToPlayPanel } from '../components/HowToPlayPanel.jsx';
import {
  loadLobbyState,
  saveLobbyState,
  generateLobbyId,
  generateRoomCode
} from '../systems/lobby.js';

export function HomeScene() {
  const [name, setName] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [language, setLanguage] = useState('English');
  const [lobbyId, setLobbyId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [reservedCharacters, setReservedCharacters] = useState([]);
  const [languageOpen, setLanguageOpen] = useState(false);

  useEffect(() => {
    const stored = loadLobbyState();
    if (!stored) return;

    if (stored.playerName) setName(stored.playerName);
    if (stored.selectedCharacterId) {
      setSelectedCharacterId(stored.selectedCharacterId);
    }
    if (stored.language) setLanguage(stored.language);
    if (stored.lobbyId) setLobbyId(stored.lobbyId);
    if (stored.roomCode) setRoomCode(stored.roomCode);
    if (Array.isArray(stored.reservedCharacters)) {
      setReservedCharacters(stored.reservedCharacters);
    }
  }, []);

  useEffect(() => {
    saveLobbyState({
      playerName: name,
      selectedCharacterId,
      language,
      lobbyId,
      roomCode,
      reservedCharacters
    });
  }, [name, selectedCharacterId, language, lobbyId, roomCode, reservedCharacters]);

  const handleStartGame = () => {
    if (!name || !selectedCharacterId) return;
    const id = lobbyId || generateLobbyId();
    setLobbyId(id);
    if (!reservedCharacters.includes(selectedCharacterId)) {
      setReservedCharacters((prev) => [...prev, selectedCharacterId]);
    }
  };

  const handleCreatePrivateRoom = () => {
    if (!name || !selectedCharacterId) return;
    const code = generateRoomCode();
    setRoomCode(code);
    if (!reservedCharacters.includes(selectedCharacterId)) {
      setReservedCharacters((prev) => [...prev, selectedCharacterId]);
    }
  };

  const handleJoinRoom = () => {
    if (!name || !selectedCharacterId || !joinCode.trim()) return;
    if (!reservedCharacters.includes(selectedCharacterId)) {
      setReservedCharacters((prev) => [...prev, selectedCharacterId]);
    }
  };

  const languages = ['English', 'Hindi', 'Spanish'];

  return (
    <div class="ink-app-root">
      <ChalkNoiseOverlay />
      <main class="ink-fullscreen ink-layer">
        <section class="ink-chalk-surface ink-main-layout">
          <header class="ink-top-bar">
            <div
              style={{
                fontFamily: 'var(--ink-font-heading)',
                letterSpacing: '0.18em',
                fontSize: '13px',
                textTransform: 'uppercase',
                opacity: 0.9
              }}
            >
              <span class="ink-blood-accent">●</span> INKOGNITO LOBBY
            </div>
            <div
              class="ink-chalk-outline ink-language-toggle"
              style={{
                padding: '6px 10px 7px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.9)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px'
                }}
              >
                🌐
              </span>
              <span class="ink-chalk-label">{language}</span>
            </div>
            {languageOpen && (
              <div class="ink-language-menu ink-chalk-outline">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    class="ink-language-option"
                    onClick={() => {
                      setLanguage(lang);
                      setLanguageOpen(false);
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </header>

          <section class="ink-center-column">
            <div class="ink-main-left">
              <LogoJitter />
              <NameInput value={name} onChange={setName} />
              <div class="ink-main-actions">
                <button
                  type="button"
                  class="ink-cta-start"
                  onClick={handleStartGame}
                >
                  START GAME
                </button>
                <ChalkButton
                  variant="secondary"
                  label="Create Private Room"
                  onClick={handleCreatePrivateRoom}
                />
                <div class="ink-join-room-row">
                  <input
                    class="ink-join-input"
                    type="text"
                    maxLength={6}
                    placeholder="Enter room code"
                    value={joinCode}
                    onInput={(e) =>
                      setJoinCode(e.currentTarget.value.toUpperCase())
                    }
                  />
                  <button
                    type="button"
                    class="ink-cta-join"
                    onClick={handleJoinRoom}
                  >
                    JOIN
                  </button>
                </div>
                {roomCode && (
                  <div class="ink-room-code-note ink-chalk-label">
                    Private room code:{' '}
                    <span class="ink-room-code-value">{roomCode}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <CharacterSelector
                selectedId={selectedCharacterId}
                reservedIds={reservedCharacters}
                onSelect={setSelectedCharacterId}
              />
              <HowToPlayPanel />
            </div>
          </section>

          <footer class="ink-footer-bar">
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
              <span>Contact</span>
              <span>Terms of Service</span>
              <span>Privacy</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px'
              }}
            >
              <span>Twitter</span>
              <span>Discord</span>
              <span>Instagram</span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}

