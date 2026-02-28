import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://oxbrvyinmpbkllicaxqk.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YnJ2eWlubXBia2xsaWNheHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjYwMTMsImV4cCI6MjA4NzAwMjAxM30.ZLvQlsid_xhhMvRUB_kgsjBupl7WoTd8haPhdv8_Du0"

const supabase = createClient(supabaseUrl, supabaseKey)

async function setup() {
    console.log('Tentando cadastrar/confirmar usuário master...')
    const { data, error } = await supabase.auth.signUp({
        email: 'omniseenblog@gmail.com',
        password: 'OmniMaster2024!#'
    })

    if (error) {
        console.log('Erro ou Usuário já existe:', error.message)
        // Tenta apenas logar para ver se a senha bate
        const { data: L, error: E } = await supabase.auth.signInWithPassword({
            email: 'omniseenblog@gmail.com',
            password: 'OmniMaster2024!#'
        })
        if (E) console.log('Login falhou também:', E.message)
        else console.log('Login funcionou! Usuário pronto.')
    } else {
        console.log('Usuário cadastrado com sucesso:', data.user?.id)
    }
}

setup()
