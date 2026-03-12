// sanitize.js
function sanitize(inputStr) {
    if (typeof inputStr !== 'string') return '';
    // Basic trimming, replacing < and > to prevent naive HTML inject
    const trimmed = inputStr.trim();
    return trimmed.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = { sanitize };
