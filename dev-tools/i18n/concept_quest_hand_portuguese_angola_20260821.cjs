'use strict';

// Portuguese Angola shares the Portuguese UI vocabulary already reviewed for
// the Brazil/Portugal packs. Keep the wording neutral across Lusophone
// classrooms, with the few educator-facing labels adjusted to local usage.
const { portuguese_brazil } = require('./concept_quest_hand_portuguese_20260820.cjs');

module.exports = {
  portuguese_angola: {
    ...portuguese_brazil,
    teacher_heading: '🗺️ Quest dos Conceitos · co-GM do professor',
    publish_to_class: 'Publicar para a turma',
    event_published: 'Evento do GM publicado para todos os alunos.',
    teacher_created_enemy: 'Equívoco criado pelo professor',
    action_required: 'Aguarde pelo menos uma ação de aluno.',
    inventory_empty: 'Itens concedidos ou gerados pelo professor aparecerão aqui.'
  }
};
