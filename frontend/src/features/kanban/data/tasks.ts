// Importuj typ úlohy, aby ukážkové dáta mali správny tvar.
import type { Task } from '../types/task'

// Dočasné úlohy, ktoré sa používajú, kým nebude hotové API.
export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Návrh databázovej schémy',
    description: 'Tímy, používatelia, úlohy a závislosti.',
    status: 'DONE',
    teamId: 'team1',
    assignee: { id: 'u1', displayName: 'Jozef' },
  },
  {
    id: 't2',
    title: 'Tasks API',
    description: 'GET a PATCH endpointy pre úlohy.',
    status: 'IN_PROGRESS',
    teamId: 'team1',
    assignee: { id: 'u2', displayName: 'Marta' },
  },
  {
    id: 't3',
    title: 'Kanban nástenka',
    description: null,
    status: 'IN_PROGRESS',
    teamId: 'team1',
    assignee: { id: 'u3', displayName: 'Ty' },
  },
  {
    id: 't4',
    title: 'Discord webhook notifikácie',
    description: 'Hlásenie dokončenej úlohy do kanála.',
    status: 'TODO',
    teamId: 'team1',
    assignee: null,
  },
  {
    id: 't5',
    title: 'Prehľad tímov pre učiteľa',
    description: null,
    status: 'TODO',
    teamId: 'team1',
    assignee: null,
  },
]
