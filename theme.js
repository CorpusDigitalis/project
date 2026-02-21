import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://recgvfcuxsonkhlyctrw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MS-dVMY2bgi4ljM4tDTIdg_t4YKb80o';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Récupère le slug ou 'louanne' par défaut
export function getSlug() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('prof') || 'louanne';
}

export async function initLayout() {
    const slug = getSlug();

    // 1. Récupération du profil
    const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error || !prof) {
        console.error("DÉTAIL DE L'ERREUR SUPABASE :", error);
        console.error("PROFIL TROUVÉ :", prof);
        return null;
    }

    // 2. Remplir le Header (Menu dynamique basé sur la config de l'Admin)
    const headerMenu = document.getElementById('header-menu');
    if (headerMenu) {
        let hLinks = '';
        // On récupère la configuration ou on met celle par défaut
        const conf = prof.config?.header || { home: true, courses: true, publications: true, interventions: true };
        
        if (conf.home) hLinks += `<a href="index.html?prof=${slug}">Accueil</a>`;
        if (conf.courses) hLinks += `<a href="cours.html?prof=${slug}">Cours</a>`;
        if (conf.publications) hLinks += `<a href="publications.html?prof=${slug}">Publications</a>`;
        if (conf.interventions) hLinks += `<a href="interventions.html?prof=${slug}">Interventions</a>`;
        
        headerMenu.innerHTML = hLinks;
    }

    // 3. Remplir le Footer (Basé sur les URL de ta base de données)
    const footerMenu = document.getElementById('footer-list');
    if (footerMenu) {
        let fLinks = '';
        const fConf = prof.config?.footer || { linkedin: true, scholar: true, cv: true, custom: [] };

        // Liens dynamiques renseignés dans l'admin
        if (fConf.linkedin && prof.linkedin_url) {
            fLinks += `<a href="${prof.linkedin_url}" target="_blank">LinkedIn</a>`;
        }
        if (fConf.scholar && prof.scholar_url) {
            fLinks += `<a href="${prof.scholar_url}" target="_blank">Google Scholar</a>`;
        }
        if (fConf.cv && prof.cv_url) {
            fLinks += `<a href="${prof.cv_url}" target="_blank">CV</a>`;
        }
        
        // Liens personnalisés du footer (ex: Université)
        if (fConf.custom && fConf.custom.length > 0) {
            fConf.custom.forEach(link => {
                fLinks += `<a href="${link.url}" target="_blank">${link.label}</a>`;
            });
        }

        footerMenu.innerHTML = fLinks;
    }

    // 4. Identité globale (Titre onglet + Logo)
    document.title = prof.name;
    document.querySelectorAll('.site-name').forEach(el => el.innerText = prof.name);

    // 5. Copyright année
    const yearEl = document.getElementById('current-year-text');
    if (yearEl) yearEl.innerText = `© ${new Date().getFullYear()} ${prof.name}`;

    return prof; 
}
