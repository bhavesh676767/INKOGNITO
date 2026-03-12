/* Shared Socket Client Configuration */
// This file provides consistent socket connection setup across the application

(function(window) {
    'use strict';
    
    // Determine server URL based on environment
    function getServerURL() {
        // If running via Vite (port 5173/5174), point to Node backend on port 3000
        if (window.location.port.startsWith('517')) {
            return 'http://localhost:3000';
        }
        // Otherwise, use same origin
        return undefined;
    }
    
    // Export socket connection helper
    window.InkognitoSocket = {
        connect: function() {
            const serverURL = getServerURL();
            return io(serverURL);
        },
        
        getServerURL: getServerURL
    };
    
})(window);
