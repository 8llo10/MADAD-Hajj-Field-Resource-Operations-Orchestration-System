'use client';

import { useEffect, useState } from 'react';

import AppShell from '../../components/AppShell';

import { api } from '../../lib/api';

import styles from './inventory.module.css';

export default function Page() {
    const [r, s] = useState<any[]>([]);

    useEffect(() => {
        api<any[]>('/inventory').then(s)
    }, []);

    return (
        <AppShell>
            <section className={styles.page}>

                <header className={styles.topbar}>
                    <div>
                        <div className={styles.eyebrow}>
                            <span />
                            INVENTORY CONTROL
                        </div>

                        <h1 className={styles.title}>
                            المخزون التشغيلي
                        </h1>
                    </div>
                </header>

                <div className={styles.inventoryList}>
                    {r.map(x => (
                        <article
                            className={
                                x.quantity <= x.reorderLevel
                                    ? `${styles.item} ${styles.lowStock}`
                                    : styles.item
                            }
                            key={x.id}
                        >
                            <div className={styles.itemIdentity}>
                                <div className={styles.itemIcon}>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
                                        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
                                    </svg>
                                </div>

                                <div className={styles.itemInfo}>
                                    <span className={styles.sku}>
                                        {x.sku}
                                    </span>

                                    <h3>{x.name}</h3>
                                </div>
                            </div>

                            <div className={styles.stockData}>
                                <div className={styles.dataBlock}>
                                    <span className={styles.dataLabel}>
                                        الكمية الحالية
                                    </span>

                                    <div className={styles.quantity}>
                                        <strong>{x.quantity}</strong>
                                        <span>{x.unit}</span>
                                    </div>
                                </div>

                                <div className={styles.divider} />

                                <div className={styles.dataBlock}>
                                    <span className={styles.dataLabel}>
                                        حد إعادة الطلب
                                    </span>

                                    <strong className={styles.reorderLevel}>
                                        {x.reorderLevel}
                                    </strong>
                                </div>
                            </div>

                            <div className={styles.stockState}>
                                {x.quantity <= x.reorderLevel ? (
                                    <span className={styles.warning}>
                                        <span className={styles.warningDot} />
                                        يتطلب إعادة طلب
                                    </span>
                                ) : (
                                    <span className={styles.ready}>
                                        <span className={styles.readyDot} />
                                        المخزون جاهز
                                    </span>
                                )}
                            </div>

                        </article>
                    ))}
                </div>

            </section>
        </AppShell>
    )
}