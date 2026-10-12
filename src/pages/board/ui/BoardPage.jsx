import styles from './BoardPage.module.scss';

export default function BoardPage() {
  return (
    <main className={styles.page}>
      <p>WebSocket Task Board</p>
      <h1 className={styles.title}>Доска задач</h1>
      <p>Совместная работа над задачами. Синхронизация в реальном времени скоро появится.</p>
    </main>
  );
}
