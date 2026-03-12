/* Shared Configuration */
// This file contains global configuration for the Inkognito application

(function(window) {
    'use strict';
    
    window.InkognitoConfig = {
        // Socket.IO connection settings
        socket: {
            // Auto-connect attempts
            reconnectAttempts: 5,
            // Delay between reconnection attempts
            reconnectDelay: 1000,
            // Connection timeout
            timeout: 5000
        },
        
        // Game settings
        game: {
            // Minimum players required to start
            minPlayers: 2,
            // Maximum players allowed
            maxPlayers: 8,
            // Room code length
            roomCodeLength: 4
        },
        
        // UI settings
        ui: {
            // Toast notification duration (ms)
            toastDuration: 3000,
            // Animation duration (ms)
            animationDuration: 300
        },
        
        // Asset paths
        assets: {
            base: '/assets',
            characters: '/assets/characters',
            hats: '/assets/characters/hats',
            expressions: '/assets/characters/expressions',
            ui: '/assets/UI Chalk',
            logo: '/assets/logo'
        }
    };
    
})(window);
