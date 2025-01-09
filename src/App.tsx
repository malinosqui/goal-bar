import { useState, useEffect } from 'react';
import { Container, TextInput, Button, Paper, Text, Checkbox, Group, Title, Stack, ActionIcon, Menu, Notification, Modal } from '@mantine/core';
import { useGoalsStore } from './store/goals';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

function App() {
  const [newGoal, setNewGoal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [impedimentModal, setImpedimentModal] = useState<{ isOpen: boolean; goalId: string | null; currentValue: string; }>({
    isOpen: false,
    goalId: null,
    currentValue: '',
  });
  const { goals, addGoal, toggleGoal, removeGoal, clearGoals, loadGoals, setImpediment } = useGoalsStore();

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
        impediments: g.impediments
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
        await addGoal(newGoal.trim());
        setNewGoal('');
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
          impediments: g.impediments
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

  return (
    <Container p="md" size="100%">
      <Modal
        opened={impedimentModal.isOpen}
        onClose={() => setImpedimentModal({ isOpen: false, goalId: null, currentValue: '' })}
        title="Adicionar Impedimento"
      >
        <Stack>
          <TextInput
            label="Impedimento"
            placeholder="Digite o impedimento..."
            value={impedimentModal.currentValue}
            onChange={(e) => setImpedimentModal(prev => ({ ...prev, currentValue: e.target.value }))}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setImpedimentModal({ isOpen: false, goalId: null, currentValue: '' })}>
              Cancelar
            </Button>
            <Button onClick={handleSaveImpediment}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="md">
        {error && (
          <Notification color="red" onClose={() => setError(null)}>
            {error}
          </Notification>
        )}

        <Group justify="space-between" align="center">
          <Title order={4}>Metas da Semana</Title>
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

        <Paper shadow="xs" p="md">
          <Group gap="sm">
            <TextInput
              placeholder="Adicionar nova meta..."
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ flex: 1 }}
            />
            <Button onClick={handleAddGoal} variant="filled" color="blue">
              Adicionar
            </Button>
          </Group>
        </Paper>

        {pendingGoals.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">
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
                      />
                      <Text lineClamp={2} style={{ flex: 1 }}>
                        {goal.title}
                      </Text>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
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
                        ×
                      </ActionIcon>
                    </Group>
                  </Group>
                  {goal.impediments && (
                    <Paper bg="red.0" p="xs" radius="sm">
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm" c="red" fw={500}>Bloqueado:</Text>
                        <Text size="sm" c="red.7" style={{ flex: 1 }}>
                          {goal.impediments}
                        </Text>
                      </Group>
                    </Paper>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {completedGoals.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">
              Concluídas
            </Text>
            {completedGoals.map((goal) => (
              <Paper key={goal.id} shadow="xs" p="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <Checkbox
                      checked={goal.completed}
                      onChange={() => handleToggleGoal(goal.id)}
                    />
                    <Text td="line-through" c="dimmed" lineClamp={2} style={{ flex: 1 }}>
                      {goal.title}
                    </Text>
                  </Group>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleRemoveGoal(goal.id)}
                  >
                    ×
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}

        {goals.length === 0 && (
          <Text c="dimmed" ta="center" size="sm" mt={20}>
            Nenhuma meta adicionada ainda. Comece adicionando sua primeira meta!
          </Text>
        )}
      </Stack>
    </Container>
  );
}

export default App;
