import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://recgvfcuxsonkhlyctrw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MS-dVMY2bgi4ljM4tDTIdg_t4YKb80o';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fonction utilitaire pour récupérer le slug (utilisable par d'autres scripts)
export function getSlug() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('prof') || 'tristan';
}

export async function initLayout() {
    const slug = getSlug();

    // 1. Récupération du profil
    const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', slug)
        .single();

    // 2. Gestion 404 (Si pas de profil ou erreur)
    if (error || !prof) {
        console.error("Profil introuvable, redirection 404");
        window.location.href = '/404.html'; 
        return null; // On arrête tout
    }

    // 3. Remplir le Header
    const headerMenu = document.getElementById('header-menu');
    if (headerMenu && prof.header_menu) {
        // On ajoute le paramètre ?prof=slug aux liens pour garder le contexte
        headerMenu.innerHTML = prof.header_menu.map(item => {
            const separator = item.link.includes('?') ? '&' : '?';
            return `<li><a href="${item.link}${separator}prof=${slug}">${item.text}</a></li>`;
        }).join('');
    }

    // 4. Remplir le Footer
    const footerMenu = document.getElementById('footer-list');
    if (footerMenu && prof.footer_menu) {
        footerMenu.innerHTML = prof.footer_menu.map(item => {
            const separator = item.link.includes('?') ? '&' : '?';
            return `<li><a href="${item.link}${separator}prof=${slug}">${item.text}</a></li>`;
        }).join('');
    }

    // 5. Mettre à jour les infos de base
    document.querySelectorAll('.site-name').forEach(el => el.innerText = prof.name);
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.innerText = new Date().getFullYear();

    // On retourne le profil au cas où l'appelant en aurait besoin immédiatement
    return prof; 
}
