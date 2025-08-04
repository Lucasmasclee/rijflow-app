-- Fix subscription trigger probleem
-- Voer dit uit in Supabase SQL Editor

-- 1. Zoek de trigger functie
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- 2. Zoek alle triggers die deze functie gebruiken
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    event_object_schema,
    action_statement
FROM information_schema.triggers 
WHERE action_statement LIKE '%handle_new_user%';

-- 3. Verwijder de trigger (als deze bestaat)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Verwijder de functie (als deze bestaat)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 5. Controleer of er nog andere triggers zijn die auth.users beïnvloeden
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- 6. Controleer of er nog andere functies zijn die subscriptions gebruiken
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%subscriptions%'
AND routine_schema = 'public';

-- 7. Test registratie (na het uitvoeren van bovenstaande)
-- Probeer nu opnieuw te registreren via de app 