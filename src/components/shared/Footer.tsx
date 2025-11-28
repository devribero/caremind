import Image from 'next/image';
import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContainer}>
                {/* Seção Superior do Rodapé */}
                <div className={styles.footerTop}>
                    {/* Coluna 1: Sobre o TCC */}
                    <div className={styles.footerColumnAbout}>
                        <Link href="/" className={styles.footerLogo}>
                            <Image
                                src="/icons/logo_coracao.png"
                                alt="Logo CareMind"
                                width={150}
                                height={45}
                                style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%' }}
                            />
                        </Link>
                        <p className={styles.footerDescription}>
                            Projeto desenvolvido como Trabalho de Conclusão de Curso (TCC).
                            <br />
                            Tecnologia a serviço do cuidado e da autonomia.
                        </p>
                    </div>

                    {/* Links Úteis (Reduzido) */}
                    <div className={styles.footerColumnLinks}>
                        <h4>Navegação</h4>
                        <nav>
                            <ul>
                                <li><Link href="#funcionalidades">Funcionalidades</Link></li>
                                <li><Link href="#como-funciona">Como Funciona</Link></li>
                                <li><Link href="/auth">Acessar Sistema</Link></li>
                            </ul>
                        </nav>
                    </div>

                    {/* Legal */}
                    <div className={styles.footerColumnLinks}>
                        <h4>Legal</h4>
                        <nav>
                            <ul>
                                <li><Link href="/politica-privacidade">Política de Privacidade</Link></li>
                                <li><Link href="/termos">Termos de Uso</Link></li>
                            </ul>
                        </nav>
                    </div>
                </div>

                <hr className={styles.footerDivider} />

                {/* Seção Inferior do Rodapé */}
                <div className={styles.footerBottom}>
                    <p className={styles.footerCopyright}>© {new Date().getFullYear()} CareMind - Projeto Acadêmico.</p>
                </div>
            </div>
        </footer>
    );
}
