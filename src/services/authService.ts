import { supabase } from '../lib/supabase';

export const checkUserExists = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'temp-password-check'
    });
    
    // Se retornar erro de credenciais inválidas, o usuário existe
    if (error && error.message.includes('Invalid login credentials')) {
      return true;
    }
    
    // Se não retornar erro, o usuário existe e a senha está correta
    if (data.user) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao verificar usuário:', error);
    return false;
  }
};

export const createUserProfile = async (userId: string, email: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: email,
          full_name: 'Erasmo Russo',
          role: 'admin',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar perfil:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
};