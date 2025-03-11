import { useState, useEffect } from 'react';
import { Container, TextInput, Button, Paper, Text, Checkbox, Group, Title, Stack, ActionIcon, Menu, Notification, Modal, MantineProvider, Select } from '@mantine/core';
import { useGoalsStore } from './store/goals';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

function App() {
  const [newGoal, setNewGoal] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [error, setError] = useState<string | null>(null);
  const [impedimentModal, setImpedimentModal] = useState<{
    isOpen: boolean;
    goalId: string | null;
    currentValue: string;
  }>({
    isOpen: false,
    goalId: null,
    currentValue: '',
  });
  const { goals, addGoal, toggleGoal, removeGoal, clearGoals, loadGoals, setImpediment, setPriority } = useGoalsStore();

  // Carrega as metas ao iniciar
  useEffect(() => {
    console.log('Loading initial goals...');
    loadGoals().catch(err => {
      console.error('Error loading goals:', err);
      setError('Erro ao carregar metas. Por favor, tente novamente.');
    });
  }, [loadGoals]);

  // Atualiza o menu quando as metas mudam
  useEffect(() => {
    console.log('Updating menu with goals:', goals);
    invoke('update_tray_menu', { 
      goals: goals.map(g => ({
        id: g.id,
        title: g.title,
        completed: g.completed,
        impediments: g.impediments,
        priority: g.priority
      }))
    }).catch(err => {
      console.error('Error updating menu:', err);
      setError('Erro ao atualizar menu. Por favor, tente novamente.');
    });
  }, [goals]);

  // Escuta eventos do menu
  useEffect(() => {
    const unlisten = Promise.all([
      listen('toggle_goal', (event) => {
        const goalId = event.payload as string;
        handleToggleGoal(goalId);
      }),
      listen('remove_impediment', (event) => {
        const goalId = event.payload as string;
        setImpediment(goalId, null);
      }),
      listen('add_impediment', (event) => {
        const goalId = event.payload as string;
        handleAddImpediment(goalId);
      })
    ]);

    return () => {
      unlisten.then(unlisteners => {
        unlisteners.forEach(unlisten => unlisten());
      });
    };
  }, []);

  const handleAddGoal = async () => {
    if (newGoal.trim()) {
      console.log('Adding goal:', newGoal);
      try {
        await addGoal(newGoal.trim(), newGoalPriority);
        setNewGoal('');
        setNewGoalPriority('medium');
      } catch (error) {
        console.error('Error adding goal:', error);
        setError('Erro ao adicionar meta. Por favor, tente novamente.');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddGoal();
    }
  };

  const handleToggleGoal = async (id: string) => {
    console.log('Toggling goal:', id);
    try {
      await toggleGoal(id);
    } catch (error) {
      console.error('Error toggling goal:', error);
      setError('Erro ao atualizar meta. Por favor, tente novamente.');
    }
  };

  const handleRemoveGoal = async (id: string) => {
    console.log('Removing goal:', id);
    try {
      await removeGoal(id);
    } catch (error) {
      console.error('Error removing goal:', error);
      setError('Erro ao remover meta. Por favor, tente novamente.');
    }
  };

  const handleClearGoals = async () => {
    console.log('Clearing all goals');
    try {
      await clearGoals();
    } catch (error) {
      console.error('Error clearing goals:', error);
      setError('Erro ao limpar metas. Por favor, tente novamente.');
    }
  };

  const handleAddImpediment = (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    setImpedimentModal({
      isOpen: true,
      goalId: id,
      currentValue: goal.impediments || '',
    });
  };

  const handleSaveImpediment = async () => {
    if (!impedimentModal.goalId) return;

    try {
      console.log('Setting impediment:', { id: impedimentModal.goalId, impediment: impedimentModal.currentValue });
      await setImpediment(impedimentModal.goalId, impedimentModal.currentValue || null);
      
      // Atualiza o menu imediatamente com o novo estado
      const updatedGoals = goals.map(g => 
        g.id === impedimentModal.goalId ? { ...g, impediments: impedimentModal.currentValue || undefined } : g
      );
      
      console.log('Updating menu with:', updatedGoals);
      await invoke('update_tray_menu', { 
        goals: updatedGoals.map(g => ({
          id: g.id,
          title: g.title,
          completed: g.completed,
          impediments: g.impediments,
          priority: g.priority
        }))
      });

      setImpedimentModal({ isOpen: false, goalId: null, currentValue: '' });
    } catch (error) {
      console.error('Error setting impediment:', error);
      setError('Erro ao adicionar impedimento. Por favor, tente novamente.');
    }
  };

  const pendingGoals = goals.filter(goal => !goal.completed);
  const completedGoals = goals.filter(goal => goal.completed);

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'low':
        return 'blue';
      case 'medium':
        return 'yellow';
      case 'high':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getPriorityEmoji = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'low':
        return '🔵';
      case 'medium':
        return '🟡';
      case 'high':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <MantineProvider
      theme={{
        primaryColor: 'blue',
        components: {
          Button: {
            styles: {
              root: {
                borderRadius: '6px',
                fontWeight: 500,
              }
            }
          },
          TextInput: {
            styles: {
              input: {
                borderRadius: '6px',
                '&:focus': {
                  borderColor: 'var(--mantine-color-blue-6)',
                  boxShadow: '0 0 0 3px rgba(0, 113, 227, 0.2)',
                }
              }
            }
          },
          Paper: {
            styles: {
              root: {
                borderRadius: '10px',
                border: '1px solid var(--mantine-color-gray-3)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }
            }
          },
          Modal: {
            styles: {
              content: {
                borderRadius: '12px',
              },
              header: {
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                paddingBottom: '16px',
              }
            }
          },
          Checkbox: {
            styles: {
              input: {
                borderRadius: '4px',
                '&:checked': {
                  backgroundColor: 'var(--mantine-color-blue-6)',
                  borderColor: 'var(--mantine-color-blue-6)',
                }
              }
            }
          }
        }
      }}
    >
      <Container p="md" size="100%" style={{ maxWidth: '800px' }}>
        <Modal
          opened={impedimentModal.isOpen}
          onClose={() => setImpedimentModal({ isOpen: false, goalId: null, currentValue: '' })}
          title="Adicionar Impedimento"
          radius="md"
          padding="lg"
        >
          <Stack>
            <TextInput
              label="Impedimento"
              placeholder="Digite o impedimento..."
              value={impedimentModal.currentValue}
              onChange={(e) => setImpedimentModal(prev => ({ ...prev, currentValue: e.target.value }))}
              size="md"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setImpedimentModal({ isOpen: false, goalId: null, currentValue: '' })}>
                Cancelar
              </Button>
              <Button onClick={handleSaveImpediment}>
                Salvar
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Stack gap="lg">
          {error && (
            <Notification color="red" onClose={() => setError(null)} radius="md">
              {error}
            </Notification>
          )}

          <Group justify="space-between" align="center">
            <Title order={4} style={{ fontWeight: 600 }}>Metas da Semana</Title>
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="sm">
                  •••
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Ações</Menu.Label>
                <Menu.Item color="red" onClick={handleClearGoals}>
                  Limpar todas as metas
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          <Paper shadow="xs" p="lg" withBorder>
            <Stack gap="sm">
              <TextInput
                placeholder="Adicionar nova meta..."
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
                style={{ flex: 1 }}
                size="md"
              />
              <Group>
                <Select
                  value={newGoalPriority}
                  onChange={(value) => setNewGoalPriority(value as 'low' | 'medium' | 'high')}
                  data={[
                    { value: 'low', label: '🔵 Baixa' },
                    { value: 'medium', label: '🟡 Média' },
                    { value: 'high', label: '🔴 Alta' },
                  ]}
                  style={{ width: '150px' }}
                  size="md"
                />
                <Button onClick={handleAddGoal} variant="filled" color="blue" size="md" style={{ flex: 1 }}>
                  Adicionar
                </Button>
              </Group>
            </Stack>
          </Paper>

          {pendingGoals.length > 0 && (
            <Stack gap="md">
              <Text size="sm" fw={600} c="dimmed" style={{ letterSpacing: '0.3px' }}>
                Pendentes
              </Text>
              {pendingGoals.map((goal) => (
                <Paper key={goal.id} shadow="xs" p="md" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <Checkbox
                          checked={goal.completed}
                          onChange={() => handleToggleGoal(goal.id)}
                          size="md"
                        />
                        <Text lineClamp={2} style={{ flex: 1 }}>
                          {goal.title}
                        </Text>
                      </Group>
                      <Group gap="xs" wrap="nowrap">
                        <Menu shadow="md" position="bottom-end">
                          <Menu.Target>
                            <ActionIcon
                              color={getPriorityColor(goal.priority)}
                              variant="subtle"
                              title="Alterar prioridade"
                            >
                              {getPriorityEmoji(goal.priority)}
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Label>Prioridade</Menu.Label>
                            <Menu.Item onClick={() => setPriority(goal.id, 'low')}>
                              🔵 Baixa
                            </Menu.Item>
                            <Menu.Item onClick={() => setPriority(goal.id, 'medium')}>
                              🟡 Média
                            </Menu.Item>
                            <Menu.Item onClick={() => setPriority(goal.id, 'high')}>
                              🔴 Alta
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                        <ActionIcon
                          color={goal.impediments ? 'red' : 'gray'}
                          variant="subtle"
                          onClick={() => handleAddImpediment(goal.id)}
                          title={goal.impediments ? 'Editar impedimento' : 'Adicionar impedimento'}
                        >
                          🚫
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => handleRemoveGoal(goal.id)}
                        >
                          ✕
                        </ActionIcon>
                      </Group>
                    </Group>
                    {goal.impediments && (
                      <Text size="sm" c="red" style={{ marginLeft: '32px' }}>
                        Impedimento: {goal.impediments}
                      </Text>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          {completedGoals.length > 0 && (
            <Stack gap="md">
              <Text size="sm" fw={600} c="dimmed" style={{ letterSpacing: '0.3px' }}>
                Concluídas
              </Text>
              {completedGoals.map((goal) => (
                <Paper key={goal.id} shadow="xs" p="md" withBorder>
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      <Checkbox
                        checked={goal.completed}
                        onChange={() => handleToggleGoal(goal.id)}
                        size="md"
                      />
                      <Text lineClamp={2} style={{ flex: 1, textDecoration: 'line-through', color: 'var(--mantine-color-gray-6)' }}>
                        {goal.title}
                      </Text>
                    </Group>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => handleRemoveGoal(goal.id)}
                    >
                      ✕
                    </ActionIcon>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Container>
    </MantineProvider>
  );
}

export default App;
