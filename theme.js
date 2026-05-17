import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'


const SUPABASE_URL = 'https://recgvfcuxsonkhlyctrw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MS-dVMY2bgi4ljM4tDTIdg_t4YKb80o';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
        return null;
    }

    // 2. INJECTION DU MENU MOBILE (Burger + Overlay)
    const nav = document.querySelector('nav');
    const headerMenu = document.getElementById('header-menu');
    
    if (nav && headerMenu && !document.getElementById('burger-menu')) {
        // Création de l'overlay (fond noir transparent)
        const overlay = document.createElement('div');
        overlay.id = 'nav-overlay';
        overlay.className = 'nav-overlay';
        document.body.appendChild(overlay);

        // Création du bouton burger (3 barres)
        const burger = document.createElement('div');
        burger.id = 'burger-menu';
        burger.className = 'burger-menu';
        burger.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';
        nav.insertBefore(burger, headerMenu);

        // Logique d'ouverture/fermeture
        const toggleMenu = () => {
            burger.classList.toggle('open');
            headerMenu.classList.toggle('open');
            overlay.classList.toggle('open');
            // Empêche de scroller la page quand le menu est ouvert
            document.body.style.overflow = burger.classList.contains('open') ? 'hidden' : '';
        };

        burger.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    }

    // 3. Remplir le Header (Liens dynamiques)
    if (headerMenu) {
        let hLinks = '';
        const conf = prof.config?.header || { home: true, courses: true, publications: true, interventions: true };
        
        if (conf.home) hLinks += `<a href="/accueil/?prof=${slug}">Accueil</a>`;
        if (conf.courses) hLinks += `<a href="/cours/?prof=${slug}">Cours</a>`;
        if (conf.publications) hLinks += `<a href="/publications/?prof=${slug}">Publications</a>`;
        if (conf.interventions) hLinks += `<a href="/interventions/?prof=${slug}">Interventions</a>`;
        
        headerMenu.innerHTML = hLinks;
    }

    // 4. Remplir le Footer
    const footerMenu = document.getElementById('footer-list');
    if (footerMenu) {
        let fLinks = '';
        const fConf = prof.config?.footer || { linkedin: true, scholar: true, cv: true, custom: [] };

        if (fConf.linkedin && prof.linkedin_url) fLinks += `<a href="${prof.linkedin_url}" target="_blank">LinkedIn</a>`;
        if (fConf.scholar && prof.scholar_url) fLinks += `<a href="${prof.scholar_url}" target="_blank">Google Scholar</a>`;
        if (fConf.cv && prof.cv_url) fLinks += `<a href="${prof.cv_url}" target="_blank">CV</a>`;
        
        if (fConf.custom && fConf.custom.length > 0) {
            fConf.custom.forEach(link => {
                fLinks += `<a href="${link.url}" target="_blank">${link.label}</a>`;
            });
        }
        footerMenu.innerHTML = fLinks;
    }

    // 5. Identité globale
    document.title = prof.name;
    document.querySelectorAll('.site-name').forEach(el => {
        // Protection vitale : ne pas écraser la boîte de chargement (skeleton)
        const realSpan = el.querySelector('#real-site-name');
        if (realSpan) {
            realSpan.innerText = prof.name;
        } else {
            el.innerText = prof.name;
        }
    });

    return prof;
}

// Tracking silencieux des clics — fire & forget, jamais bloquant
export async function trackClick(profId, page, linkType, label, url) {
    try {
        await supabase.from('link_clicks').insert({
            prof_id: profId,
            page: page,
            link_type: linkType,
            link_label: (label || '').substring(0, 200),
            link_url: (url || '').substring(0, 500)
        });
    } catch(e) { /* silent — never block navigation */ }
}

// Initialise le tracking sur une page de profil
export function setupTracking(profId, page) {
    document.querySelectorAll('a[href]').forEach(a => {
        const url = a.getAttribute('href') || '';
        if (!url || url.startsWith('#') || url.startsWith('javascript')) return;
        // Ne pas tracker les liens internes de navigation
        if (url.startsWith('/accueil') || url.startsWith('/cours') || url.startsWith('/publications') || url.startsWith('/interventions')) return;
        a.addEventListener('click', () => {
            let linkType = 'external';
            if (url.includes('doi.org')) linkType = 'doi';
            else if (url.includes('linkedin.com')) linkType = 'linkedin';
            else if (url.includes('scholar.google')) linkType = 'scholar';
            else if (url.includes('hal.') || url.includes('hal-')) linkType = 'hal';
            else if (url.includes('orcid.org')) linkType = 'orcid';
            else if (url.includes('arxiv.org')) linkType = 'arxiv';
            else if (url.startsWith('mailto:')) linkType = 'email';
            else if (url.match(/\.(pdf|doc|docx|pptx?|xlsx?)(\?|$)/i)) linkType = 'file';
            const label = (a.textContent || a.title || '').trim().substring(0, 200);
            trackClick(profId, page, linkType, label, url);
        }, { once: false, passive: true });
    });
}
