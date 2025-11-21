'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/Switch';
import { createClient } from '@/lib/supabase/client';
import {
  Type,
  Bell,
  Mail,
  Shield,
  Link as LinkIcon,
  Key,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import styles from './page.module.css';

export default function Configuracoes() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { fontSize, highContrast, reducedMotion, setFontSize, setHighContrast, setReducedMotion } = useAccessibility();
  
  // Estados mockados para notificações (será integrado com backend depois)
  const [medicationAlerts, setMedicationAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  
  // Estado para integração Alexa (verifica no banco de dados)
  const [alexaConnected, setAlexaConnected] = useState(false);
  const [isCheckingAlexa, setIsCheckingAlexa] = useState(true);

  // Verificar status da integração Alexa
  useEffect(() => {
    const checkAlexaStatus = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('user_integrations')
          .select('*')
          .eq('provider', 'amazon_alexa')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao verificar status da Alexa:', error);
        }

        setAlexaConnected(!!data);
      } catch (error) {
        console.error('Erro ao verificar integração Alexa:', error);
      } finally {
        setIsCheckingAlexa(false);
      }
    };

    checkAlexaStatus();
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair da sua conta?')) {
      try {
        await signOut();
        router.push('/(auth)/auth');
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao sair da conta. Tente novamente.');
      }
    }
  };

  const handleChangePassword = () => {
    router.push('/forgot-password');
  };

  return (
    <main className={styles.main}>
      <div className={styles.mainContent}>
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <h1 className={styles.content_title}>Configurações</h1>
          </div>
          
          <section className={styles.content_info}>
            <div className={styles.sectionsContainer}>
        {/* Seção 1: Acessibilidade & Visual */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIconWrapper}>
              <Type className={styles.sectionIcon} size={20} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Acessibilidade & Visual</h2>
              <p className={styles.sectionDescription}>
                Personalize a experiência visual para melhorar a leitura e navegação
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <label className={styles.settingLabel} htmlFor="font-size">
                  Tamanho do Texto
                </label>
                <p className={styles.settingDescription}>
                  Ajuste o tamanho da fonte para facilitar a leitura
                </p>
              </div>
              <div className={styles.fontSizeSelector} role="group" aria-label="Selecionar tamanho da fonte">
                <button
                  id="font-size-normal"
                  type="button"
                  onClick={() => setFontSize('normal')}
                  className={`${styles.fontSizeButton} ${fontSize === 'normal' ? styles.fontSizeButtonActive : ''}`}
                  aria-pressed={fontSize === 'normal'}
                  aria-label="Tamanho de fonte normal"
                >
                  <span className={styles.fontSizeButtonText}>A</span>
                </button>
                <button
                  id="font-size-large"
                  type="button"
                  onClick={() => setFontSize('large')}
                  className={`${styles.fontSizeButton} ${fontSize === 'large' ? styles.fontSizeButtonActive : ''}`}
                  aria-pressed={fontSize === 'large'}
                  aria-label="Tamanho de fonte grande"
                >
                  <span className={styles.fontSizeButtonText}>A+</span>
                </button>
                <button
                  id="font-size-extra-large"
                  type="button"
                  onClick={() => setFontSize('extra-large')}
                  className={`${styles.fontSizeButton} ${fontSize === 'extra-large' ? styles.fontSizeButtonActive : ''}`}
                  aria-pressed={fontSize === 'extra-large'}
                  aria-label="Tamanho de fonte extra grande"
                >
                  <span className={styles.fontSizeButtonText}>A++</span>
                </button>
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <label className={styles.settingLabel} htmlFor="high-contrast">
                  Alto Contraste
                </label>
                <p className={styles.settingDescription}>
                  Aumenta o contraste entre cores para facilitar a leitura
                </p>
              </div>
              <Switch
                id="high-contrast"
                checked={highContrast}
                onCheckedChange={setHighContrast}
                aria-label="Ativar modo de alto contraste"
                aria-describedby="high-contrast-description"
              />
            </div>
            <p id="high-contrast-description" className={styles.srOnly}>
              Quando ativado, aumenta o contraste entre cores para facilitar a leitura
            </p>

            <div className={styles.divider} />

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <label className={styles.settingLabel} htmlFor="reduced-motion">
                  Reduzir Movimento
                </label>
                <p className={styles.settingDescription}>
                  Desativa animações pesadas (recomendado para labirintite/tontura)
                </p>
              </div>
              <Switch
                id="reduced-motion"
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
                aria-label="Reduzir animações e movimentos"
                aria-describedby="reduced-motion-description"
              />
            </div>
            <p id="reduced-motion-description" className={styles.srOnly}>
              Quando ativado, desativa animações pesadas para reduzir tontura
            </p>
          </div>
        </section>

        {/* Seção 2: Emergência */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIconWrapper}>
              <AlertTriangle className={styles.sectionIcon} size={20} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>🚨 Emergência</h2>
              <p className={styles.sectionDescription}>
                Configure seu número de telefone para receber alertas de emergência
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabelWithIcon}>
                  <Phone className={styles.settingIcon} size={18} />
                  <label className={styles.settingLabel}>
                    Telefone de Emergência
                  </label>
                </div>
                <p className={styles.settingDescription}>
                  Este número será usado para enviar SMS quando o botão de pânico for acionado. Configure seu telefone na página de <a href="/perfil" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Perfil</a>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/perfil')}
                className={styles.actionButton}
                aria-label="Ir para página de perfil para configurar telefone"
              >
                <Phone className={styles.actionIcon} size={18} />
                <span>Configurar Telefone</span>
              </button>
            </div>
          </div>
        </section>

        {/* Seção 3: Notificações & Alertas */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIconWrapper}>
              <Bell className={styles.sectionIcon} size={20} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Notificações & Alertas</h2>
              <p className={styles.sectionDescription}>
                Configure como e quando você deseja receber notificações
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabelWithIcon}>
                  <Bell className={styles.settingIcon} size={18} />
                  <label className={styles.settingLabel} htmlFor="medication-alerts">
                    Alertas de Medicamentos
                  </label>
                </div>
                <p className={styles.settingDescription}>
                  Receber notificações push e por e-mail sobre horários de medicamentos
                </p>
              </div>
              <Switch
                id="medication-alerts"
                checked={medicationAlerts}
                onCheckedChange={setMedicationAlerts}
                aria-label="Ativar alertas de medicamentos"
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabelWithIcon}>
                  <Mail className={styles.settingIcon} size={18} />
                  <label className={styles.settingLabel} htmlFor="weekly-report">
                    Relatório Semanal
                  </label>
                </div>
                <p className={styles.settingDescription}>
                  Receber resumo semanal por e-mail com estatísticas de adesão
                </p>
              </div>
              <Switch
                id="weekly-report"
                checked={weeklyReport}
                onCheckedChange={setWeeklyReport}
                aria-label="Ativar relatório semanal por e-mail"
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabelWithIcon}>
                  <Shield className={styles.settingIcon} size={18} />
                  <label className={styles.settingLabel} htmlFor="security-alerts">
                    Alertas de Segurança
                  </label>
                </div>
                <p className={styles.settingDescription}>
                  Notificar se o idoso não confirmar um remédio crítico
                </p>
              </div>
              <Switch
                id="security-alerts"
                checked={securityAlerts}
                onCheckedChange={setSecurityAlerts}
                aria-label="Ativar alertas de segurança"
              />
            </div>
          </div>
        </section>

        {/* Seção 4: Integrações e Dispositivos */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIconWrapper}>
              <LinkIcon className={styles.sectionIcon} size={20} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Integrações e Dispositivos</h2>
              <p className={styles.sectionDescription}>
                Conecte serviços externos para expandir as funcionalidades
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabelWithIcon}>
                  <LinkIcon className={styles.settingIcon} size={18} />
                  <label className={styles.settingLabel}>
                    Amazon Alexa
                  </label>
                </div>
                <p className={styles.settingDescription}>
                  Conecte sua conta Amazon para usar comandos de voz
                </p>
              </div>
              <div className={styles.integrationStatus}>
                {isCheckingAlexa ? (
                  <div className={styles.connectedStatus}>
                    <span className={styles.statusText}>Verificando...</span>
                  </div>
                ) : alexaConnected ? (
                  <div className={styles.connectedStatus}>
                    <CheckCircle2 className={styles.statusIcon} size={20} />
                    <span className={styles.statusText}>Alexa Conectada</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push('/integracoes')}
                    className={styles.connectButton}
                    aria-label="Conectar conta Amazon Alexa"
                  >
                    Conectar
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Seção 5: Conta e Segurança */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIconWrapper}>
              <Shield className={styles.sectionIcon} size={20} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Conta e Segurança</h2>
              <p className={styles.sectionDescription}>
                Gerencie as configurações de segurança da sua conta
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <button
              type="button"
              onClick={handleChangePassword}
              className={styles.actionButton}
              aria-label="Alterar senha da conta"
            >
              <Key className={styles.actionIcon} size={18} />
              <span>Alterar Senha</span>
            </button>

            <div className={styles.divider} />

            <div className={styles.dangerZone}>
              <div className={styles.dangerZoneHeader}>
                <AlertCircle className={styles.dangerIcon} size={20} />
                <h3 className={styles.dangerZoneTitle}>Zona de Perigo</h3>
              </div>
              <p className={styles.dangerZoneDescription}>
                Ações nesta seção são irreversíveis. Proceda com cautela.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.dangerButton}
                aria-label="Sair da conta"
              >
                <LogOut className={styles.dangerButtonIcon} size={18} />
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
