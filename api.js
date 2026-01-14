<script type="module">
    // On importe directement la version ESM pour éviter les conflits
    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

    const SUPABASE_URL = 'https://recgvfcuxsonkhlyctrw.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_MS-dVMY2bgi4ljM4tDTIdg_t4YKb80o';
    
    // On initialise le client avec un nom différent
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

    const form = document.getElementById('login-form');
    const msg = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.style.color = "black";
        msg.innerText = "Vérification...";

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                msg.style.color = "red";
                msg.innerText = "Erreur : " + error.message;
            } else {
                msg.style.color = "green";
                msg.innerText = "Connexion réussie ! Redirection...";
                // Stockage du profil dans le navigateur
                localStorage.setItem('supabase.auth.token', data.session.access_token);
                window.location.href = 'admin.html';
            }
        } catch (err) {
            msg.innerText = "Une erreur technique est survenue.";
            console.error(err);
        }
    });
</script>
