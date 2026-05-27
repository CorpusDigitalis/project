import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'


const SUPABASE_URL = 'https://recgvfcuxsonkhlyctrw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MS-dVMY2bgi4ljM4tDTIdg_t4YKb80o';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function getSlug() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('prof')) return urlParams.get('prof');
    const parts = window.location.hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
    return null;
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
        const conf = prof.config?.header || { home: true, courses: true, publications: true, interventions: true };
        const labels = prof.config?.nav_labels || {};
        const navOrder = prof.config?.nav_order || ['accueil', 'cours', 'publications', 'interventions'];

        // Masquage auto des sections vides si activé
        if (prof.config?.hide_empty_sections) {
            const [pubRes, coursRes, intervRes] = await Promise.all([
                supabase.from('publications').select('id', { count: 'exact', head: true }).eq('prof_id', prof.id),
                supabase.from('courses').select('id', { count: 'exact', head: true }).eq('prof_id', prof.id),
                supabase.from('interventions').select('id', { count: 'exact', head: true }).eq('prof_id', prof.id),
            ]);
            if ((pubRes.count || 0) === 0) conf.publications = false;
            if ((coursRes.count || 0) === 0) conf.courses = false;
            if ((intervRes.count || 0) === 0) conf.interventions = false;
        }

        const linkMap = {
            accueil:       conf.home          ? `<a href="/accueil/?prof=${slug}">${labels.home || 'Accueil'}</a>` : '',
            cours:         conf.courses       ? `<a href="/cours/?prof=${slug}">${labels.courses || 'Cours'}</a>` : '',
            publications:  conf.publications  ? `<a href="/publications/?prof=${slug}">${labels.publications || 'Publications'}</a>` : '',
            interventions: conf.interventions ? `<a href="/interventions/?prof=${slug}">${labels.interventions || 'Interventions'}</a>` : '',
        };
        headerMenu.innerHTML = navOrder.map(k => linkMap[k] || '').join('');
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

    // 6. Police du titre (config.title_font)
    const titleFont = prof.config?.title_font || 'Playfair Display';
    const fontMap = {
        'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap',
        'Lato':             'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap',
        'Raleway':          'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600;700&display=swap',
        'Merriweather':     'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap',
        'Source Serif 4':   'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,400&display=swap',
    };
    if (fontMap[titleFont] && !document.querySelector(`link[data-titlefont]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontMap[titleFont];
        link.dataset.titlefont = '1';
        document.head.appendChild(link);
    }
    document.querySelectorAll('.site-name, .prof-name, h1:not(.page-title)').forEach(el => {
        el.style.fontFamily = `'${titleFont}', serif`;
    });

    // 6b. Police du texte (config.body_font)
    const bodyFont = prof.config?.body_font;
    if (bodyFont) {
        if (!document.querySelector('link[data-bodyfont]')) {
            const bLink = document.createElement('link');
            bLink.rel = 'stylesheet';
            bLink.href = `https://fonts.googleapis.com/css2?family=${bodyFont.replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;1,400&display=swap`;
            bLink.dataset.bodyfont = '1';
            document.head.appendChild(bLink);
        }
        document.body.style.fontFamily = `'${bodyFont}', sans-serif`;
    }

    // 7. Couleur d'accent (config.accent_color)
    const accentColor = prof.config?.accent_color || '#0f172a';
    if (accentColor === '#ffffff') {
        // Mode blanc : header clair, accent sombre pour les boutons/liens
        document.documentElement.style.setProperty('--site-accent', '#0f172a');
        const headerEl = document.querySelector('header');
        if (headerEl) headerEl.classList.add('header-light');
    } else {
        document.documentElement.style.setProperty('--site-accent', accentColor);
    }

    // 8. Layout accueil (config.home_layout)
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        const layout = prof.config?.home_layout || 'card';
        heroSection.classList.add(`layout-${layout}`);
    }

    // 9. Style de l'en-tête (config.header_style)
    const headerEl = document.querySelector('header');
    if (headerEl && (prof.config?.header_style || 'dark') === 'light') {
        headerEl.classList.add('header-light');
    }

    // 10. Fond de page (config.page_bg)
    applyPageBg(prof.config?.page_bg);

    return prof;
}

// Applique la config visuellement sans rechargement (postMessage live preview)
export function applyConfig(config) {
    if (!config) return;

    // Accent
    if (config.accent_color) {
        document.documentElement.style.setProperty('--site-accent', config.accent_color);
    }

    // Fond de page
    if (config.page_bg) applyPageBg(config.page_bg);

    // Police titre
    if (config.title_font) {
        document.querySelectorAll('.site-name, .prof-name, h1:not(.page-title)').forEach(el => {
            el.style.fontFamily = `'${config.title_font}', serif`;
        });
        loadFontIfNeeded(config.title_font);
    }

    // Police corps
    if (config.body_font) {
        document.body.style.fontFamily = `'${config.body_font}', sans-serif`;
        loadFontIfNeeded(config.body_font);
    }
}

function applyPageBg(pageBg) {
    const bg = pageBg || 'cream';
    const bgMap = { cream: '#fafaf8', white: '#ffffff', 'blue-gray': '#f0f4f8', warm: '#f5f0eb' };
    let hex;
    if (bg.startsWith('custom:')) {
        hex = bg.replace('custom:', '');
    } else if (bg.startsWith('#')) {
        hex = bg;
    } else {
        hex = bgMap[bg] || '#fafaf8';
    }
    document.documentElement.style.setProperty('--bg-body-override', hex);
    document.body.style.backgroundColor = hex;
    if (bg === 'dark') document.documentElement.classList.add('page-dark');
}

const _loadedFonts = new Set();
function loadFontIfNeeded(fontName) {
    if (!fontName || fontName === 'Georgia' || fontName === 'Alata' || _loadedFonts.has(fontName)) return;
    _loadedFonts.add(fontName);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:ital,wght@0,400;0,600;0,700;1,400&display=swap`;
    document.head.appendChild(link);
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
