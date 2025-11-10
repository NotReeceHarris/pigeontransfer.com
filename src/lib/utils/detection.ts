import { browser } from "$app/environment";

export function isChromiumBased() {

    if (!browser) {
        return false;
    }

    const userAgent = navigator.userAgent;
    
    // Exclude Edge (which is now Chromium-based but might need special handling)
    const isEdge = userAgent.includes('Edg/');
    
    return (
        (userAgent.includes('Chrome') || userAgent.includes('Chromium')) &&
        !userAgent.includes('Edg/') && // Exclude legacy Edge
        !userAgent.includes('OPR/') && // Exclude Opera
        !userAgent.includes('Firefox') // Exclude Firefox
    ) || isEdge; // Include new Edge if you consider it Chromium-based
}