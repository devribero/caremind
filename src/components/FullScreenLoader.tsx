import styles from './FullScreenLoader.module.css';

export function FullScreenLoader() {
    return (
        <div className={styles.overlay}>
            <div className={styles.spinner}></div>
            <p className={styles.text}>Carregando...</p>
        </div>
    );
}