(function (window) {
  'use strict';

  const PHASES = {
    LOBBY: 'Lobby',
    GAME_STARTING: 'GameStarting',
    COUNTDOWN: 'Countdown',
    ROLE_REVEAL: 'RoleReveal',
    WORD_REVEAL: 'WordReveal',
    TURN_ACTIVE: 'TurnActive',
    TURN_END: 'TurnEnd',
    DISCUSSION: 'Discussion',
    VOTING: 'Voting',
    VOTE_REVEAL: 'VoteReveal',
    RESULT: 'Result',
    RESTART_TRANSITION: 'RestartTransition'
  };

  const VALID_TRANSITIONS = {
    [PHASES.LOBBY]: [PHASES.GAME_STARTING],
    [PHASES.GAME_STARTING]: [PHASES.COUNTDOWN, PHASES.LOBBY],
    [PHASES.COUNTDOWN]: [PHASES.ROLE_REVEAL, PHASES.LOBBY],
    [PHASES.ROLE_REVEAL]: [PHASES.WORD_REVEAL],
    [PHASES.WORD_REVEAL]: [PHASES.TURN_ACTIVE],
    [PHASES.TURN_ACTIVE]: [PHASES.TURN_END],
    [PHASES.TURN_END]: [PHASES.DISCUSSION, PHASES.VOTING, PHASES.RESULT],
    [PHASES.DISCUSSION]: [PHASES.VOTING],
    [PHASES.VOTING]: [PHASES.VOTE_REVEAL],
    [PHASES.VOTE_REVEAL]: [PHASES.RESULT, PHASES.TURN_ACTIVE],
    [PHASES.RESULT]: [PHASES.RESTART_TRANSITION, PHASES.LOBBY],
    [PHASES.RESTART_TRANSITION]: [PHASES.COUNTDOWN, PHASES.LOBBY]
  };

  function assertValidPhase(phase) {
    if (!Object.values(PHASES).includes(phase)) {
      throw new Error('[GameStateMachine] Invalid phase: ' + phase);
    }
  }

  function GameStateMachine(initialPhase) {
    const startPhase = initialPhase || PHASES.LOBBY;
    assertValidPhase(startPhase);
    this.phase = startPhase;
  }

  GameStateMachine.prototype.canTransitionTo = function (nextPhase) {
    assertValidPhase(nextPhase);
    const allowed = VALID_TRANSITIONS[this.phase] || [];
    return allowed.includes(nextPhase);
  };

  GameStateMachine.prototype.transitionTo = function (nextPhase) {
    if (!this.canTransitionTo(nextPhase)) {
      throw new Error(
        '[GameStateMachine] Illegal transition from ' +
          this.phase +
          ' to ' +
          nextPhase
      );
    }
    this.phase = nextPhase;
    return this.phase;
  };

  GameStateMachine.prototype.reset = function () {
    this.phase = PHASES.LOBBY;
    return this.phase;
  };

  window.InkognitoStateMachine = {
    PHASES: PHASES,
    GameStateMachine: GameStateMachine,
    VALID_TRANSITIONS: VALID_TRANSITIONS
  };
})(window);

