'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useProfileManagement } from '@/hooks/useProfileManagement';
import { EditProfileModal } from '@/components/features/EditProfileModal';
import { ChangePasswordModal } from '@/components/features/ChangePasswordModal';
import pageStyles from './page.module.css';

export default function Perfil() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  
  const {
    profile,
    loading,
    error,
    uploadingPhoto,
    passwordLoading,
    showPasswordModal,
    showEditModal,
    setShowPasswordModal,
    setShowEditModal,
    handleLogout,
    handleSaveProfile,
    handleFileChange,
    handleSavePassword,
  } = useProfileManagement();

  if (loading) {
    return <div className={pageStyles.loading}>Carregando perfil...</div>;
  }

  if (error) {
    return <div className={pageStyles.error}>Erro ao carregar o perfil: {error.message}</div>;
  }

  if (!profile) {
    return <div className={pageStyles.error}>Perfil não encontrado</div>;
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  
  const handleEditClick = () => setShowEditModal(true);
  const handleChangePasswordClick = () => setShowPasswordModal(true);
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e);
  };
  
  const handleCloseEditModal = () => setShowEditModal(false);
  const handleClosePasswordModal = () => setShowPasswordModal(false);
  
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const PhotoViewer = () => (
    <div 
      className={pageStyles.modalOverlay} 
      onClick={() => setShowPhotoViewer(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div 
        style={{ 
          maxWidth: '90vw', 
          maxHeight: '90vh',
          position: 'relative' 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={profile.photoUrl}
          alt="Foto de Perfil"
          width={800}
          height={800}
          style={{ 
            width: '100%', 
            height: 'auto',
            maxHeight: '90vh',
            objectFit: 'contain' 
          }}
        />
        <button
          onClick={() => setShowPhotoViewer(false)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );

  return (
    <main className={pageStyles.main}>
      <div className={pageStyles.mainContent}>
        <div className={pageStyles.content}>
          
          <div className={pageStyles.pageHeader}>
            <h1 className={pageStyles.content_title}>Perfil</h1>
          </div>
          <section className={pageStyles.content_info}>
            <div className={pageStyles.profileSection}>
              <div className={pageStyles.profileHeader}>
                <div className={pageStyles.profileInfo}>
                  <div className={pageStyles.profilePhotoContainer}>
                    <Image
                      src={profile.photoUrl}
                      alt="Foto de Perfil"
                      className={pageStyles.profilePhoto}
                      width={100}
                      height={100}
                      key={profile.photoUrl}
                      onError={() => {
                        // setProfileData(prev => ({ ...prev, photoUrl: '/foto_padrao.png' }));
                      }}
                      onClick={() => setShowPhotoViewer(true)}
                      style={{ cursor: 'pointer' }}
                    />
                    <button 
                      className={pageStyles.uploadPhotoButton} 
                      onClick={handleUploadClick}
                      disabled={uploadingPhoto}
                      aria-label="Alterar foto de perfil"
                      title="Alterar foto de perfil"
                    >
                      {uploadingPhoto ? (
                        <svg className={pageStyles.spinner} viewBox="0 0 50 50">
                          <circle className={pageStyles.path} cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 9V3H9V9H3V12H9V18H12V12H18V9H12Z" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                      accept="image/png, image/jpeg"
                      disabled={uploadingPhoto}
                    />
                  </div>
                  <div className={pageStyles.profileText}>
                    <h2>{profile.fullName || 'Nome não informado'}</h2>
                    <p>{profile.email || 'Email não informado'}</p>
                    {profile.phone && <p>{profile.phone}</p>}
                  </div>
                </div>
                <div className={pageStyles.profileActions}>
                  <button 
                    className={pageStyles.actionButton} 
                    onClick={() => setShowPasswordModal(true)}
                    disabled={passwordLoading || uploadingPhoto}
                  >
                    Alterar Senha
                  </button>
                  <button className={pageStyles.logoutButton} onClick={handleLogout}>Logout</button>
                </div>
              </div>
              <div className={pageStyles.infoCard}>
                <h2 className={pageStyles.cardTitle}>Informações do Perfil</h2>
                <div className={pageStyles.infoGrid}>
                  <div className={pageStyles.infoField}>
                    <label htmlFor="fullName" className={pageStyles.fieldLabel}>Nome Completo</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={profile.fullName}
                      className={pageStyles.fieldInput}
                      disabled
                    />
                  </div>
                  <div className={pageStyles.infoField}>
                    <label htmlFor="email" className={pageStyles.fieldLabel}>Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profile.email}
                      className={pageStyles.fieldInput}
                      disabled
                    />
                  </div>
                  <div className={pageStyles.infoField}>
                    <label htmlFor="phone" className={pageStyles.fieldLabel}>Telefone</label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={profile.phone}
                      className={pageStyles.fieldInput}
                      disabled
                    />
                  </div>
                  <div className={pageStyles.infoField}>
                    <label htmlFor="dob" className={pageStyles.fieldLabel}>Data de Nascimento</label>
                    <input
                      type="date"
                      id="dob"
                      name="dob"
                      value={profile.dob}
                      className={pageStyles.fieldInput}
                      disabled
                    />
                  </div>
                </div>
                <div className={pageStyles.editButtonContainer}>
                  <button
                    className={pageStyles.editProfileButton}
                    onClick={handleEditClick}
                    disabled={uploadingPhoto || passwordLoading}
                    type="button"
                  >
                    Editar Perfil
                  </button>
                </div>
              </div>
            </div>
            <ChangePasswordModal 
              show={showPasswordModal} 
              onClose={() => setShowPasswordModal(false)} 
              onSave={handleSavePassword}
              loading={passwordLoading}
            />
            
            <EditProfileModal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              onSave={handleSaveProfile}
              initialData={{
                fullName: profile.fullName,
                phone: profile.phone,
                dob: profile.dob,
              }}
              loading={uploadingPhoto || passwordLoading}
            />
            {showPhotoViewer && <PhotoViewer />}
          </section>
        </div>
      </div>
    </main>
  );
}