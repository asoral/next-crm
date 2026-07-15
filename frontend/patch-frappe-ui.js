import fs from 'fs';
import path from 'path';

// Find the frappe-ui module in node_modules, handling yarn hoisting
const searchPaths = [
    path.join(process.cwd(), 'node_modules/frappe-ui/vite/lucideIcons.js'),
    path.join(process.cwd(), '../node_modules/frappe-ui/vite/lucideIcons.js'),
    path.join(process.cwd(), '../../node_modules/frappe-ui/vite/lucideIcons.js')
];

let modulePath = null;
for (const p of searchPaths) {
    if (fs.existsSync(p)) {
        modulePath = p;
        break;
    }
}

if (modulePath) {
    let content = fs.readFileSync(modulePath, 'utf8');
    if (content.includes("iconSvg && iconSvg.includes('stroke-width')")) {
        content = content.replace(
            "iconSvg && iconSvg.includes('stroke-width')",
            "iconSvg && typeof iconSvg === 'string' && iconSvg.includes('stroke-width')"
        );
        fs.writeFileSync(modulePath, content);
        console.log(`Successfully patched ${modulePath}`);
    } else {
        console.log(`Patch already applied or not needed in ${modulePath}`);
    }
} else {
    console.warn("Could not find frappe-ui/vite/lucideIcons.js to patch!");
}
