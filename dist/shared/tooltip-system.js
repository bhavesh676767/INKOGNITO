/* Universal Tooltip System for Inkognito
   Lightweight, chalk-style tooltips with smooth animations
*/

(function(window) {
    'use strict';
    
    class TooltipSystem {
        constructor() {
            this.activeTooltip = null;
            this.tooltipElement = null;
            this.init();
        }
        
        init() {
            // Create tooltip element once
            this.tooltipElement = document.createElement('div');
            this.tooltipElement.className = 'inkognito-tooltip';
            this.tooltipElement.innerHTML = '<span class="tooltip-text"></span>';
            document.body.appendChild(this.tooltipElement);
            
            // Hide initially
            this.hide();
        }
        
        show(element, text, position = 'top') {
            if (!text || !element) return;
            
            // Update text
            this.tooltipElement.querySelector('.tooltip-text').textContent = text;
            
            // Position tooltip
            this.position(element, position);
            
            // Set position attribute for arrow
            this.tooltipElement.setAttribute('data-position', position);
            
            // Show with animation
            this.tooltipElement.style.opacity = '1';
            this.tooltipElement.style.visibility = 'visible';
            this.tooltipElement.classList.add('show-anim');
            
            this.activeTooltip = element;
        }
        
        hide() {
            if (this.tooltipElement) {
                this.tooltipElement.style.opacity = '0';
                this.tooltipElement.style.visibility = 'hidden';
                this.tooltipElement.style.transform = 'translateY(-5px)';
                this.tooltipElement.classList.remove('show-anim');
            }
            this.activeTooltip = null;
        }
        
        position(element, position = 'top') {
            const rect = element.getBoundingClientRect();
            const tooltipRect = this.tooltipElement.getBoundingClientRect();
            const offset = 8; // Distance from element
            
            let left, top;
            
            switch (position) {
                case 'top':
                    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    top = rect.top - tooltipRect.height - offset;
                    break;
                case 'bottom':
                    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    top = rect.bottom + offset;
                    break;
                case 'left':
                    left = rect.left - tooltipRect.width - offset;
                    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    break;
                case 'right':
                    left = rect.right + offset;
                    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    break;
                default:
                    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    top = rect.top - tooltipRect.height - offset;
            }
            
            // Keep tooltip within viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            if (left < 10) left = 10;
            if (left + tooltipRect.width > viewportWidth - 10) {
                left = viewportWidth - tooltipRect.width - 10;
            }
            if (top < 10) {
                top = rect.bottom + offset; // Show below if no room above
            }
            if (top + tooltipRect.height > viewportHeight - 10) {
                top = rect.top - tooltipRect.height - offset;
            }
            
            this.tooltipElement.style.left = `${left}px`;
            this.tooltipElement.style.top = `${top}px`;
        }
        
        // Static method to easily add tooltip to element
        static addToElement(element, text, position = 'top') {
            if (!element || !text) return;
            
            element.addEventListener('mouseenter', (e) => {
                if (!window.inkognitoTooltips) {
                    window.inkognitoTooltips = new TooltipSystem();
                }
                window.inkognitoTooltips.show(element, text, position);
            });
            
            element.addEventListener('mouseleave', (e) => {
                if (window.inkognitoTooltips) {
                    window.inkognitoTooltips.hide();
                }
            });
            
            // Touch devices - show on touch
            element.addEventListener('touchstart', (e) => {
                if (!window.inkognitoTooltips) {
                    window.inkognitoTooltips = new TooltipSystem();
                }
                window.inkognitoTooltips.show(element, text, position);
                
                // Hide after 3 seconds on touch
                setTimeout(() => {
                    if (window.inkognitoTooltips) {
                        window.inkognitoTooltips.hide();
                    }
                }, 3000);
            });
        }
        
        // Destroy tooltip system
        destroy() {
            if (this.tooltipElement && this.tooltipElement.parentNode) {
                this.tooltipElement.parentNode.removeChild(this.tooltipElement);
            }
            this.activeTooltip = null;
            this.tooltipElement = null;
        }
    }
    
    // Initialize global tooltip system
    window.inkognitoTooltips = new TooltipSystem();
    
    // Export for easier access
    window.TooltipSystem = TooltipSystem;
    
})(window);
