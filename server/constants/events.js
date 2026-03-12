/**
 * Socket event constants.
 * Single source of truth for all event names used across the backend.
 */

// ─── Client → Server ───
const C2S = {
    ROOM_CREATE:        'room:create',
    ROOM_JOIN:          'room:join',
    ROOM_LEAVE:         'room:leave',
    ROOM_RECONNECT:     'room:reconnect',
    ROOM_REQUEST_STATE: 'room:requestState',

    PLAYER_UPDATE:      'player:updateProfile',

    SETTINGS_UPDATE:    'room:updateSettings',
    CUSTOM_WORD_ADD:    'room:addCustomWord',
    CUSTOM_WORD_REMOVE: 'room:removeCustomWord',

    CHAT_SEND:          'chat:send',

    GAME_START:         'game:start',
    GAME_RESTART:       'game:restart',
    GAME_RETURN_LOBBY:  'game:returnToLobby',

    DRAW_STROKE:        'draw:stroke',
    VOTE_SUBMIT:        'vote:submit',
};

// ─── Server → Client ───
const S2C = {
    ROOM_CREATED:       'room:created',
    ROOM_JOINED:        'room:joined',
    ROOM_UPDATE:        'room:state',       // public room state
    ROOM_ERROR:         'room:error',
    ROOM_CLOSED:        'room:closed',

    PLAYER_JOINED:      'player:joined',
    PLAYER_LEFT:        'player:left',
    HOST_CHANGED:       'host:changed',

    SETTINGS_UPDATED:   'settings:updated',

    CHAT_NEW_MESSAGE:   'chat:newMessage',
    CHAT_SYSTEM:        'chat:system',

    GAME_STARTING:      'game:starting',
    GAME_PHASE_CHANGED: 'game:phaseChanged',
    GAME_STATE:         'game:state',       // public gameplay state
    GAME_PRIVATE_STATE: 'game:privateState',// per-player private data
    GAME_ROLE:          'game:role',
    GAME_TURN_START:    'game:turnStart',
    GAME_TURN_END:      'game:turnEnd',
    GAME_OUT_OF_INK:    'game:outOfInk',
    GAME_VOTE_START:    'game:voteStart',
    GAME_VOTE_RESULT:   'game:voteResult',
    GAME_END:           'game:end',

    DRAW_STROKE:        'draw:stroke',      // relayed to other clients

    TIMER_UPDATE:       'timer:update',
};

// ─── Room Phases ───
const PHASE = {
    LOBBY:       'lobby',
    STARTING:    'starting',
    PROMPT:      'prompt',
    DRAWING:     'drawing',
    VOTING:      'voting',
    VOTE_RESULT: 'voteResult',
    END:         'end',
};

// ─── Error Codes ───
const ERR = {
    ROOM_NOT_FOUND:     'ROOM_NOT_FOUND',
    ROOM_FULL:          'ROOM_FULL',
    ROOM_IN_GAME:       'ROOM_IN_GAME',
    NOT_HOST:           'NOT_HOST',
    NOT_IN_ROOM:        'NOT_IN_ROOM',
    NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
    INVALID_SETTINGS:   'INVALID_SETTINGS',
    INVALID_PHASE:      'INVALID_PHASE',
    INVALID_INPUT:      'INVALID_INPUT',
    RATE_LIMITED:        'RATE_LIMITED',
    ALREADY_IN_ROOM:    'ALREADY_IN_ROOM',
};

module.exports = { C2S, S2C, PHASE, ERR };
