import re
import os

def rewrite_css(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Apply Hand-drawn style borders: 255px 15px 225px 15px/15px 225px 15px 255px
    hand_drawn_radius = 'border-radius: 255px 15px 225px 15px/15px 225px 15px 255px'
    
    # Let's replace fonts
    content = re.sub(r'var\(--font-head\)', "'Gloria Hallelujah', cursive", content)
    content = re.sub(r'var\(--font-body\)', "'Gloria Hallelujah', cursive", content)
    content = re.sub(r"'Fredoka One', cursive", "'Gloria Hallelujah', cursive", content)
    content = re.sub(r"'Nunito', sans-serif", "'Gloria Hallelujah', cursive", content)

    # Change background colors to black
    content = re.sub(r'background:\s*#04040d;', 'background: #000000;', content)
    content = re.sub(r'background:\s*#080b14;', 'background: #000000;', content)
    
    # Change specific panel backgrounds to solid black
    content = re.sub(r'background:\s*rgba\(5,\s*4,\s*16,\s*0\.94\);', 'background: #000000;', content)
    content = re.sub(r'--card-bg:\s*rgba\(5, 4, 16, 0.94\);', '--card-bg: #000000;', content)
    content = re.sub(r'--panel-bg:\s*rgba\(10, 12, 22, 0\.82\);', '--panel-bg: #000000;', content)
    content = re.sub(r'--bg:\s*#080b14;', '--bg: #000000;', content)
    
    # Replace colors with white
    content = re.sub(r'--cyan:\s*#[a-fA-F0-9]+;', '--cyan: #ffffff;', content)
    content = re.sub(r'--amber:\s*#[a-fA-F0-9]+;', '--amber: #ffffff;', content)
    content = re.sub(r'--red:\s*#[a-fA-F0-9]+;', '--red: #ffffff;', content)
    content = re.sub(r'--green:\s*#[a-fA-F0-9]+;', '--green: #ffffff;', content)
    content = re.sub(r'--purple:\s*#[a-fA-F0-9]+;', '--purple: #ffffff;', content)
    content = re.sub(r'--pink:\s*#[a-fA-F0-9]+;', '--pink: #ffffff;', content)
    content = re.sub(r'--blue:\s*#[a-fA-F0-9]+;', '--blue: #ffffff;', content)
    
    content = re.sub(r'--chip-\d+:\s*#[a-fA-F0-9]+;', '--chip-1: transparent;', content)
    content = re.sub(r'background:\s*var\(--chip-\d+\);', 'background: transparent; color: #ffffff;', content)
    
    # Replace colored nebulae and glows with white alpha
    content = re.sub(r'rgba\(80, 20, 140, 0\.45\)', 'rgba(255, 255, 255, 0.05)', content)
    content = re.sub(r'rgba\(10, 50, 130, 0\.50\)', 'rgba(255, 255, 255, 0.03)', content)
    content = re.sub(r'rgba\(10, 80, 100, 0\.30\)', 'rgba(255, 255, 255, 0.04)', content)
    content = re.sub(r'rgba\(130, 20, 80, 0\.25\)', 'rgba(255, 255, 255, 0.02)', content)

    content = re.sub(r'rgba\(126,\s*244,\s*248,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(255,\s*209,\s*102,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(168,\s*255,\s*176,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(255,\s*75,\s*75,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(255,\s*100,\s*100,\s*([0-9]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(255,\s*72,\s*72,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(255,\s*85,\s*102,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(175,\s*148,\s*255,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(198,\s*175,\s*255,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(200,\s*180,\s*255,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(90,\s*212,\s*200,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(110,\s*228,\s*218,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)
    content = re.sub(r'rgba\(120,\s*238,\s*228,\s*([0-9.]+)\)', r'rgba(255, 255, 255, \1)', content)

    # Color classes like .host-badge { background: var(--cyan); color: #000; }
    # These are handled since --cyan is white -> background white, color black. Which is exactly B&W!

    # We need wobbly outlines and thicker strokes!
    content = re.sub(r'border:\s*([0-9.]+)px solid rgba\((.*?)\);', r'border: 4px solid #ffffff;', content)
    content = content.replace('border: 3px solid var(--card-border);', 'border: 5px solid #ffffff;')
    content = content.replace('border: 3px solid #000;', 'border: 4px solid #ffffff;')
    content = content.replace('border: 2px solid #000;', 'border: 3px solid #ffffff;')
    content = content.replace('border: 2.5px solid rgba(255, 255, 255, 0.70);', 'border: 4px solid #ffffff;')
    
    # Hand drawn border radius where it was 12px, 14px, 16px, 20px
    content = re.sub(r'border-radius:\s*(1[0-9]|2[0-9])px;', hand_drawn_radius + ';', content)

    # Animations
    content = content.replace('scale(1.04)', 'scale(1.08) rotate(-2deg)')
    content = content.replace('scale(1.06)', 'scale(1.08) rotate(2deg)')
    content = content.replace('scale(1.05)', 'scale(1.08) rotate(-3deg)')
    content = content.replace('scale(0.97)', 'scale(0.9, 1.1) translateY(2px)')
    content = content.replace('scale(0.90)', 'scale(0.85, 1.15)')
    content = content.replace('scale(0.93)', 'scale(0.85, 1.15)')
    content = content.replace('scale(0.88)', 'scale(0.85, 1.15)')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

rewrite_css('c:\\Users\\bhave\\OneDrive\\Documents\\projects\\coding\\INKOGNITO\\entry-page.css')
rewrite_css('c:\\Users\\bhave\\OneDrive\\Documents\\projects\\coding\\INKOGNITO\\public\\pregame-lobby\\pregame-lobby.css')
