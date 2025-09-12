'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // aqui ta as funções de Authentication
import { useRouter } from 'next/navigation';  // aqui e um "sistema de rota" do next 
import { Header } from '@/components/headers/HeaderHome';
import styles from '@/app/perfil/page.module.css'// esse @ server pra puxar na raiz

export default function Perfil() {

    const { user, signOut } = useAuth();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState({
        fullName: user?.user_metadata?.full_name || '',
        email: user?.email || '',
        phone: '',
    });

    const handleLogout = async () => {
        await signOut(); 
        router.push('/'); 
    };
    
    const displayName = user?.use || user?.email;
    
    return( 
        <div>
            <h1 className=''>Perfil</h1> 
            <p>
                Bem Vindo, {displayName}
            </p>
            <button onClick={handleLogout}>Logout</button>
        </div>
    )
}



