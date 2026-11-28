// Jediné stavy podporované tromi stĺpcami nástenky.
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export type TaskDependencyRef = {
  id: string
  title: string
  status: TaskStatus
}

export type TaskDependencyItem = {
  dependsOnId: string
  dependsOn: TaskDependencyRef
}

export type TaskDependentItem = {
  taskId: string
  task: TaskDependencyRef
}

// Údaje potrebné na zobrazenie jednej úlohy na nástenke.
export type Task = {
  // Jedinečné ID úlohy.
  id: string
  // Krátky názov úlohy.
  title: string
  // Voliteľný podrobnejší popis úlohy.
  description: string | null
  // Stĺpec, v ktorom sa úloha práve zobrazuje.
  status: TaskStatus
  // Priradený používateľ alebo null, ak úloha nemá priradenú osobu.
  assignee: { id: string; displayName: string } | null
  // Úlohy, od ktorých táto úloha závisí.
  dependencies?: TaskDependencyItem[]
  // Úlohy, ktoré závisia od tejto úlohy.
  dependents?: TaskDependentItem[]
}

// Priraď názov stĺpca ku každej hodnote stavu.
export const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'DONE', label: 'Done' },
]
