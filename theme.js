import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://recgvfcuxsonkhlyctrw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MS-dVMY2bgi4ljM4tDTIdg_t4YKb80o';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function initLayout() {
    // 1. Détecter le profil (tristan par défaut)
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('prof') || 'tristan';

    const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', slug)
        .single();

    if (!prof) return;

    // 2. Remplir le Header
    const headerMenu = document.getElementById('header-menu');
    if (headerMenu && prof.header_menu) {
        headerMenu.innerHTML = prof.header_menu.map(item => 
            `<li><a href="${item.link}">${item.text}</a></li>`
        ).join('');
    }

    // 3. Remplir le Footer
    const footerMenu = document.getElementById('footer-list'); // Nommé selon ton style
    if (footerMenu && prof.footer_menu) {
        footerMenu.innerHTML = prof.footer_menu.map(item => 
            `<li><a href="${item.link}">${item.text}</a></li>`
        ).join('');
    }

    // 4. Mettre à jour les infos de base (Nom, Année)
    document.querySelectorAll('.site-name').forEach(el => el.innerText = prof.name);
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.innerText = new Date().getFullYear();
}
