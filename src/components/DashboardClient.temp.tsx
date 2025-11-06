'use client';

// ... (imports e tipos permanecem os mesmos)

export default function DashboardClient({ readOnly = false, idosoId }: { readOnly?: boolean; idosoId?: string }): React.ReactElement {
    // ... (todos os estados e funções permanecem os mesmos)

    return (
        <div className={styles.dashboard_client}>
            {/* Cards Container */}
            <div className={styles.cards_container}>
                {/* ... (cards section remains the same) ... */}
            </div>

            {/* Medicamentos Section */}
            <div className={styles.list_section}>
                <div className={styles.list_container}>
                    <div className={styles.list_header}>
                        <h3>Medicamentos de hoje</h3>
                    </div>
                    {medsHoje.length === 0 ? (
                        <p className={styles.empty_list}>Nenhum medicamento para hoje.</p>
                    ) : (
                        <ul className={styles.list}>
                            {medsHoje.map(m => {
                                const agenda_item = agendaDoDia.find(it => 
                                    it.tipo_evento === 'medicamento' && it.evento_id === m.id
                                );
                                const isDone = agenda_item?.status === 'confirmado';
                                const historicoId = getHistoricoIdForMedicamento(m.id);
                                
                                return (
                                    <li key={m.id} className={styles.list_item}>
                                        <div className={styles.item_info}>
                                            <strong>{m.nome}</strong>
                                            {m.dosagem && <span>{m.dosagem}</span>}
                                            {m.frequencia && (
                                                <span className={styles.frequencia}>
                                                    {formatarFrequencia(m.frequencia)}
                                                </span>
                                            )}
                                            <span className={styles.quantidade}>
                                                Quantidade: {m.quantidade}
                                            </span>
                                        </div>
                                        {!readOnly && (
                                            <div className={styles.item_actions}>
                                                <button
                                                    onClick={() => handleToggleStatus(m.id, historicoId)}
                                                    className={isDone ? styles.desfazer_btn : styles.concluir_btn}
                                                >
                                                    {isDone ? 'Desfazer' : 'Concluir'}
                                                </button>
                                                <button 
                                                    onClick={() => handleEditMedicamento(m)} 
                                                    className={styles.edit_btn}
                                                >
                                                    <FiEdit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => confirmarExclusao('medicamentos', m.id)} 
                                                    className={styles.delete_btn}
                                                >
                                                    <FiTrash size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Rotinas Section */}
                <div className={styles.list_container}>
                    <div className={styles.list_header}>
                        <h3>Rotinas de hoje</h3>
                    </div>
                    {rotinasHoje.length === 0 ? (
                        <p className={styles.empty_list}>Nenhuma rotina para hoje.</p>
                    ) : (
                        <ul className={styles.list}>
                            {rotinasHoje.map(r => {
                                const agenda_item = agendaDoDia.find(it => 
                                    it.tipo_evento === 'rotina' && it.evento_id === r.id
                                );
                                const isDone = agenda_item?.status === 'confirmado';
                                const historicoId = getHistoricoIdForRotina(r.id);
                                
                                return (
                                    <li key={r.id} className={styles.list_item}>
                                        <div className={styles.item_info}>
                                            <strong>{r.titulo}</strong>
                                            {r.descricao && <span>{r.descricao}</span>}
                                            {r.frequencia && (
                                                <span className={styles.frequencia}>
                                                    {formatarFrequencia(r.frequencia as any)}
                                                </span>
                                            )}
                                        </div>
                                        {!readOnly && (
                                            <div className={styles.item_actions}>
                                                <button
                                                    onClick={() => handleToggleRotinaStatus(r.id, historicoId)}
                                                    className={isDone ? styles.desfazer_btn : styles.concluir_btn}
                                                >
                                                    {isDone ? 'Desfazer' : 'Concluir'}
                                                </button>
                                                <button 
                                                    onClick={() => handleEditRotina(r)} 
                                                    className={styles.edit_btn}
                                                >
                                                    <FiEdit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => confirmarExclusao('rotinas', r.id)} 
                                                    className={styles.delete_btn}
                                                >
                                                    <FiTrash size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* Modal and Dialog */}
            {!readOnly && renderModal}
            {!readOnly && (
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText="Excluir"
                    cancelText="Cancelar"
                    onConfirm={confirmDialog.onConfirm || (() => {})}
                    onCancel={fecharConfirmacao}
                    danger
                />
            )}
        </div>
    );
}