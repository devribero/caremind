import Image from 'next/image';
import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContainer}>
                {/* Seção Superior do Rodapé */}
                <div className={styles.footerTop}>
                    {/* Coluna 1: Sobre a Empresa e Social */}
                    <div className={styles.footerColumnAbout}>
                        <Link href="/" className={styles.footerLogo}>
                            <Image src="/logo_coracao.png" alt="Logo CareMind" width={300} height={90} />
                        </Link>
                        <p className={styles.footerDescription}>
                            CareMind - tecnologia que aproxima, cuida e protege.
                        </p>
                    </div>

                    {/* Coluna 2: Links de Produto */}
                    <div className={styles.footerColumnLinks}>
                        <h4>Produto</h4>
                        <nav>
                            <ul>
                                <li><Link href="/funcionalidades">Funcionalidades</Link></li>
                                <li><Link href="/seguranca">Segurança</Link></li>
                            </ul>
                        </nav>
                    </div>

                    {/* Coluna 3: Links de Suporte */}
                    <div className={styles.footerColumnLinks}>
                        <h4>Suporte</h4>
                        <nav>
                            <ul>
                                <li><Link href="/ajuda">Central de Ajuda</Link></li>
                                <li><Link href="/contato">Contato</Link></li>
                                <li><Link href="/status">Status</Link></li>
                            </ul>
                        </nav>
                    </div>

                    {/* Coluna 4: Links da Empresa */}
                    <div className={styles.footerColumnLinks}>
                        <h4>Empresa</h4>
                        <nav>
                            <ul>
                                <li><Link href="/sobre">Sobre</Link></li>
                                <li><Link href="/blog">Blog</Link></li>
                                <li><Link href="/politica-privacidade">Privacidade</Link></li>
                            </ul>
                        </nav>
                    </div>
                </div>

                <hr className={styles.footerDivider} />

                {/* Seção Inferior do Rodapé */}
                <div className={styles.footerBottom}>
                    <p className={styles.footerCopyright}>© {new Date().getFullYear()} CareMind. Todos os direitos reservados.</p>
                    <div className={styles.footerLegalLinks}>
                        <Link href="/termos">Termos de Uso</Link>
                        <Link href="/politica-privacidade">Política de Privacidade</Link>
                        <Link href="/cookies">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}