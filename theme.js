import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://recgvfcuxsonkhlyctrw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MS-dVMY2bgi4ljM4tDTIdg_t4YKb80o';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Récupère le slug ou 'tristan' par défaut
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

    // REMPLACE LE BLOC IF PAR CELUI-CI :
    if (error || !prof) {
        console.error("Erreur Supabase ou profil introuvable :", error);
        document.body.innerHTML = "<h1>Erreur de connexion à la base de données. Ouvrez la console (F12) pour voir les détails.</h1>";
        return null;
    }

    // 3. Remplir le Header (Menu)
    const headerMenu = document.getElementById('header-menu');
    if (headerMenu && prof.header_menu) {
        headerMenu.innerHTML = prof.header_menu.map(item => {
            const separator = item.link.includes('?') ? '&' : '?';
            return `<li><a href="${item.link}${separator}prof=${slug}">${item.text}</a></li>`;
        }).join('');
    }

    // 4. Remplir le Footer (Menu)
    const footerMenu = document.getElementById('footer-list');
    if (footerMenu && prof.footer_menu) {
        footerMenu.innerHTML = prof.footer_menu.map(item => {
            const separator = item.link.includes('?') ? '&' : '?';
            return `<li><a href="${item.link}${separator}prof=${slug}">${item.text}</a></li>`;
        }).join('');
    }

    // 5. Identité globale (Titre onglet + Logo)
    document.title = prof.name; // Met à jour l'onglet du navigateur
    
    // Met à jour tous les éléments avec la classe .site-name (ex: le Logo)
    document.querySelectorAll('.site-name').forEach(el => el.innerText = prof.name);

    // Copyright année
    const yearEl = document.getElementById('current-year-text');
    if (yearEl) yearEl.innerText = `© ${new Date().getFullYear()} ${prof.name}`;

    return prof; 
}
