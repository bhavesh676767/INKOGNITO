document.addEventListener('DOMContentLoaded', () => {
    // 1. Tooltip System
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'ink-tooltip';
    document.body.appendChild(tooltipEl);

    let activeTarget = null;
    let fadeOutTimer = null;

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            clearTimeout(fadeOutTimer);
            activeTarget = target;
            tooltipEl.textContent = target.getAttribute('data-tooltip');
            tooltipEl.classList.add('show');
            updateTooltipPosition(e);
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (activeTarget && tooltipEl.classList.contains('show')) {
            updateTooltipPosition(e);
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target && target === activeTarget) {
            activeTarget = null;
            // Slight delay so it doesn't instantly blink out if traversing gaps
            fadeOutTimer = setTimeout(() => {
                tooltipEl.classList.remove('show');
            }, 50);
        }
    });

    function updateTooltipPosition(e) {
        const offset = 15;
        let x = e.clientX + offset;
        let y = e.clientY + offset;

        const rect = tooltipEl.getBoundingClientRect();
        
        if (x + rect.width > window.innerWidth) {
            x = e.clientX - rect.width - offset;
        }
        if (y + rect.height > window.innerHeight) {
            y = e.clientY - rect.height - offset;
        }

        x = Math.max(5, x);
        y = Math.max(5, y);

        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top = `${y}px`;
    }

    // 2. Hint System
    window.showFirstTimeHint = function(elementSelector, text, position = 'top', hintKey) {
        // Prevent showing duplicate hints or if already seen
        if (localStorage.getItem(hintKey)) return;
        
        // Wait a short moment to ensure UI elements are rendered properly
        setTimeout(() => {
            const target = document.querySelector(elementSelector);
            if (!target) return;

            const hintEl = document.createElement('div');
            hintEl.className = `ink-hint ${position}`;
            hintEl.textContent = text;
            document.body.appendChild(hintEl);

            const targetRect = target.getBoundingClientRect();

            // Wait a frame for hint dimensions to resolve
            requestAnimationFrame(() => {
                const hintRect = hintEl.getBoundingClientRect();
                let top = 0;
                let left = 0;

                if (position === 'top') {
                    top = targetRect.top - hintRect.height - 15;
                    left = targetRect.left + (targetRect.width / 2) - (hintRect.width / 2);
                } else if (position === 'bottom') {
                    top = targetRect.bottom + 15;
                    left = targetRect.left + (targetRect.width / 2) - (hintRect.width / 2);
                } else if (position === 'left') {
                    top = targetRect.top + (targetRect.height / 2) - (hintRect.height / 2);
                    left = targetRect.left - hintRect.width - 15;
                } else if (position === 'right') {
                    top = targetRect.top + (targetRect.height / 2) - (hintRect.height / 2);
                    left = targetRect.right + 15;
                }

                // Small bounds check
                left = Math.max(10, Math.min(left, window.innerWidth - hintRect.width - 10));

                hintEl.style.top = `${top + window.scrollY}px`;
                hintEl.style.left = `${left + window.scrollX}px`;

                // Auto fade-out
                setTimeout(() => {
                    hintEl.style.opacity = '0';
                    hintEl.style.transition = 'opacity 0.5s ease-out';
                    setTimeout(() => hintEl.remove(), 500);
                }, 3000);

                // Mark as seen permanently
                localStorage.setItem(hintKey, 'true');
            });
        }, 500);
    };
});
